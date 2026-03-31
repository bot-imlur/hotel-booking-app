"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { formatCurrency, SOURCE_CONFIG, BOOKING_SOURCES } from "@/lib/utils";

const STEPS = ["Guest Details", "Dates & Source", "Select Rooms", "Review & Pay"];
const DEFAULT_MATTRESS_RATE = 500;

export default function NewBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [guest, setGuest] = useState({ guest_name: "", guest_phone: "", guest_email: "", guest_id_type: "", guest_id_number: "" });
  const [dates, setDates] = useState({ check_in_date: "", check_out_date: "", source: "offline" });
  const [availability, setAvailability] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState({});
  const [payment, setPayment] = useState({ advance_paid: 0, notes: "" });

  function toNumber(value, fallback = 0) {
    if (value === "" || value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  // Calculate nights
  const nights = dates.check_in_date && dates.check_out_date && dates.check_out_date > dates.check_in_date
    ? Math.round((new Date(dates.check_out_date) - new Date(dates.check_in_date)) / 86400000)
    : 0;

  // Calculate total
  const totalAmount = Object.values(selectedRooms).reduce((sum, r) => {
    const extraMattresses = toNumber(r.extra_mattresses, 0);
    const mattressRate = toNumber(r.mattress_rate_per_night, 0);
    const roomRate = toNumber(r.rate_per_night, 0);
    const mattressCostPerNight = extraMattresses * mattressRate;
    return sum + (roomRate + mattressCostPerNight) * nights;
  }, 0);
  const balanceDue = totalAmount - toNumber(payment.advance_paid, 0);

  async function fetchAvailability() {
    if (!dates.check_in_date || !dates.check_out_date || nights <= 0) return;
    try {
      const res = await fetch(`/api/availability?checkIn=${dates.check_in_date}&checkOut=${dates.check_out_date}`);
      const json = await res.json();
      setAvailability(json);
    } catch (err) {
      console.error("Availability error:", err);
    }
  }

  function toggleRoom(room) {
    const id = room.id;
    if (selectedRooms[id]) {
      const next = { ...selectedRooms };
      delete next[id];
      setSelectedRooms(next);
    } else {
      setSelectedRooms({
        ...selectedRooms,
        [id]: {
          room_id: id,
          num_guests: 1,
          extra_mattresses: 0,
          mattress_rate_per_night: DEFAULT_MATTRESS_RATE,
          rate_per_night: room.default_rate,
          room,
        },
      });
    }
  }

  function updateRoomConfig(roomId, field, value) {
    setSelectedRooms({
      ...selectedRooms,
      [roomId]: { ...selectedRooms[roomId], [field]: value === "" ? "" : Number(value) },
    });
  }

  function nextStep() {
    setError("");
    if (step === 0 && !guest.guest_name.trim()) {
      setError("Guest name is required");
      return;
    }
    if (step === 1) {
      if (!dates.check_in_date || !dates.check_out_date) {
        setError("Both dates are required");
        return;
      }
      if (nights <= 0) {
        setError("Check-out must be after check-in");
        return;
      }
      fetchAvailability();
    }
    if (step === 2 && Object.keys(selectedRooms).length === 0) {
      setError("Select at least one room");
      return;
    }
    setStep(step + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const body = {
        ...guest,
        ...dates,
        advance_paid: toNumber(payment.advance_paid, 0),
        notes: payment.notes,
        rooms: Object.values(selectedRooms).map(({ room, ...rest }) => ({
          room_id: rest.room_id,
          num_guests: Math.max(1, toNumber(rest.num_guests, 1)),
          extra_mattresses: Math.max(0, toNumber(rest.extra_mattresses, 0)),
          mattress_rate_per_night: Math.max(0, toNumber(rest.mattress_rate_per_night, DEFAULT_MATTRESS_RATE)),
          rate_per_night: Math.max(0, toNumber(rest.rate_per_night, 0)),
        })),
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Booking failed");
        if (data.details?.conflicts) {
          setError(`Conflict: ${data.details.conflicts.join(", ")}`);
        }
        setSubmitting(false);
        return;
      }

      router.push("/calendar");
    } catch (err) {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <h2>New Booking</h2>

      {/* Progress Stepper */}
      <div className={styles.stepper}>
        {STEPS.map((label, i) => (
          <div key={i} className={`${styles.step} ${i <= step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}>
            <div className={styles.stepCircle}>{i < step ? "✓" : i + 1}</div>
            <span className={styles.stepLabel}>{label}</span>
          </div>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Step 1: Guest Details */}
      {step === 0 && (
        <div className={`card ${styles.stepContent}`}>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Guest Name *</label>
              <input type="text" className="form-input" placeholder="Full name" value={guest.guest_name}
                onChange={(e) => setGuest({ ...guest, guest_name: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" placeholder="Phone number" value={guest.guest_phone}
                onChange={(e) => setGuest({ ...guest, guest_phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="Email address" value={guest.guest_email}
                onChange={(e) => setGuest({ ...guest, guest_email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">ID Type</label>
              <select className="form-input" value={guest.guest_id_type}
                onChange={(e) => setGuest({ ...guest, guest_id_type: e.target.value })}>
                <option value="">Select...</option>
                <option value="aadhaar">Aadhaar</option>
                <option value="passport">Passport</option>
                <option value="dl">Driving License</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">ID Number</label>
              <input type="text" className="form-input" placeholder="ID number" value={guest.guest_id_number}
                onChange={(e) => setGuest({ ...guest, guest_id_number: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Dates & Source */}
      {step === 1 && (
        <div className={`card ${styles.stepContent}`}>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Check-in Date *</label>
              <input type="date" className="form-input" value={dates.check_in_date}
                onChange={(e) => setDates({ ...dates, check_in_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Check-out Date *</label>
              <input type="date" className="form-input" value={dates.check_out_date}
                min={dates.check_in_date}
                onChange={(e) => setDates({ ...dates, check_out_date: e.target.value })} />
            </div>
          </div>
          {nights > 0 && <p className={styles.nightsInfo}>{nights} night(s)</p>}
          <div className={styles.sourceSelect}>
            <label className="form-label">Booking Source *</label>
            <div className={styles.sourceChips}>
              {BOOKING_SOURCES.map((src) => (
                <button key={src}
                  className={`${styles.sourceChip} ${dates.source === src ? styles.sourceChipActive : ""}`}
                  style={dates.source === src ? { borderColor: SOURCE_CONFIG[src].color, background: `${SOURCE_CONFIG[src].color}20` } : {}}
                  onClick={() => setDates({ ...dates, source: src })}>
                  {SOURCE_CONFIG[src].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Room Selection */}
      {step === 2 && (
        <div className={`card ${styles.stepContent}`}>
          {availability ? (
            <>
              <p className={styles.availInfo}>{availability.available_count} of {availability.rooms.length} rooms available</p>
              <div className={styles.roomGrid}>
                {availability.rooms.map((room) => {
                  const selected = !!selectedRooms[room.id];
                  return (
                    <div key={room.id} className={`${styles.roomOption} ${!room.available ? styles.roomUnavailable : ""} ${selected ? styles.roomSelected : ""}`}>
                      <button className={styles.roomOptionHeader} onClick={() => room.available && toggleRoom(room)} disabled={!room.available}>
                        <span className={styles.roomNum}>{room.room_number}</span>
                        <span className={`badge badge-${room.room_type}`}>{room.room_type}</span>
                        {!room.available && <span className={styles.bookedLabel}>Booked</span>}
                        {selected && <span className={styles.checkMark}>✓</span>}
                      </button>
                      <div className={styles.roomMeta}>
                        <span>{room.base_capacity} guests · {formatCurrency(room.default_rate)}/night</span>
                      </div>

                      {selected && (
                        <div className={styles.roomConfig}>
                          <div className={`form-group ${styles.compactPairGroup}`}>
                            <label className="form-label">Guests / Room Rate</label>
                            <div className={styles.compactPair}>
                              <input
                                type="number"
                                className={`form-input ${styles.countInput}`}
                                min={1}
                                max={room.base_capacity + toNumber(selectedRooms[room.id]?.extra_mattresses, 0)}
                                value={selectedRooms[room.id].num_guests}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateRoomConfig(room.id, "num_guests", e.target.value)}
                                aria-label="Number of guests"
                              />
                              <span className={styles.compactPairSeparator}>/</span>
                              <input
                                type="number"
                                className={`form-input ${styles.rateInput}`}
                                min={0}
                                value={selectedRooms[room.id].rate_per_night}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateRoomConfig(room.id, "rate_per_night", e.target.value)}
                                aria-label="Room rate per night"
                              />
                            </div>
                          </div>
                          <div className={`form-group ${styles.compactPairGroup}`}>
                            <label className="form-label">Mattress (Count / Rate)</label>
                            <div className={styles.compactPair}>
                              <input
                                type="number"
                                className={`form-input ${styles.countInput}`}
                                min={0}
                                max={room.max_extra_mattresses}
                                value={selectedRooms[room.id].extra_mattresses}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateRoomConfig(room.id, "extra_mattresses", e.target.value)}
                                aria-label="Extra mattresses count"
                              />
                              <span className={styles.compactPairSeparator}>/</span>
                              <input
                                type="number"
                                className={`form-input ${styles.rateInput}`}
                                min={0}
                                value={selectedRooms[room.id].mattress_rate_per_night}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updateRoomConfig(room.id, "mattress_rate_per_night", e.target.value)}
                                aria-label="Mattress rate per night"
                              />
                            </div>
                          </div>
                          <div className={styles.roomSubtotal}>
                            Subtotal: {formatCurrency(
                              (toNumber(selectedRooms[room.id].rate_per_night, 0) +
                                toNumber(selectedRooms[room.id].extra_mattresses, 0) *
                                  toNumber(selectedRooms[room.id].mattress_rate_per_night, 0)) *
                                nights
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>Loading availability...</p>
          )}
        </div>
      )}

      {/* Step 4: Review & Payment */}
      {step === 3 && (
        <div className={`card ${styles.stepContent}`}>
          <h3 className={styles.reviewTitle}>Booking Summary</h3>

          <div className={styles.reviewSection}>
            <h4>Guest</h4>
            <p>{guest.guest_name} {guest.guest_phone && `· ${guest.guest_phone}`}</p>
          </div>

          <div className={styles.reviewSection}>
            <h4>Stay</h4>
            <p>{dates.check_in_date} → {dates.check_out_date} · {nights} night(s)</p>
            <span className={`badge badge-${dates.source}`}>{SOURCE_CONFIG[dates.source]?.label}</span>
          </div>

          <div className={styles.reviewSection}>
            <h4>Rooms</h4>
            <div className={styles.reviewTable}>
              <div className={styles.reviewTableRow} style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                <span>Room</span><span>Guests</span><span>Rate + Mattress/Night</span><span>Subtotal</span>
              </div>
              {Object.values(selectedRooms).map((r) => (
                <div key={r.room_id} className={styles.reviewTableRow}>
                  <span>{r.room?.room_number}</span>
                  <span>{toNumber(r.num_guests, 0)}👤 {toNumber(r.extra_mattresses, 0) > 0 ? `+${toNumber(r.extra_mattresses, 0)}🛏️` : ""}</span>
                  <span>
                    {formatCurrency(toNumber(r.rate_per_night, 0))}
                    {toNumber(r.extra_mattresses, 0) > 0 && ` + ${formatCurrency(toNumber(r.extra_mattresses, 0) * toNumber(r.mattress_rate_per_night, 0))}`}
                  </span>
                  <span>{formatCurrency((toNumber(r.rate_per_night, 0) + toNumber(r.extra_mattresses, 0) * toNumber(r.mattress_rate_per_night, 0)) * nights)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.totalSection}>
            <div className={styles.totalRow}><span>Grand Total</span><span className={styles.grandTotal}>{formatCurrency(totalAmount)}</span></div>
          </div>

          <div className={styles.paymentInputs}>
            <div className="form-group">
              <label className="form-label">Advance Paid (₹)</label>
              <input type="number" className="form-input" min={0} max={totalAmount}
                value={payment.advance_paid}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPayment({ ...payment, advance_paid: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
            <div className={styles.balanceInfo}>
              <span>Balance Due</span>
              <span className={styles.balanceAmount} style={{ color: balanceDue > 0 ? "var(--accent-warning)" : "var(--accent-success)" }}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={3} placeholder="Any special requests..."
              value={payment.notes}
              onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className={styles.nav}>
        {step > 0 && (
          <button onClick={() => { setStep(step - 1); setError(""); }} className="btn btn-secondary">← Back</button>
        )}
        <div style={{ flex: 1 }} />
        {step < 3 ? (
          <button onClick={nextStep} className="btn btn-primary">Next →</button>
        ) : (
          <button onClick={handleSubmit} className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? "Creating..." : "✓ Confirm Booking"}
          </button>
        )}
      </div>
    </div>
  );
}
