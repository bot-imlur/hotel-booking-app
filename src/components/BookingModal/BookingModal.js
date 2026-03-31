"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, SOURCE_CONFIG, STATUS_CONFIG } from "@/lib/utils";
import ConfirmModal from "../ConfirmModal/ConfirmModal";
import styles from "./BookingModal.module.css";

export default function BookingModal({ bookingId, onClose, onStatusChange }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  function getApiErrorMessage(data, fallback = "Something went wrong. Please try again.") {
    if (!data) return fallback;
    if (typeof data.error === "string" && data.error.trim()) {
      const details = data.details;
      if (details && typeof details === "object") {
        const detailParts = Object.entries(details)
          .flatMap(([field, messages]) =>
            (Array.isArray(messages) ? messages : [messages]).map((msg) =>
              String(msg || "")
            )
          )
          .filter(Boolean);
        if (detailParts.length > 0) {
          return `${data.error}: ${detailParts.join(", ")}`;
        }
      }
      return data.error;
    }
    return fallback;
  }

  function startEdit() {
    setActionError(null);
    setEditForm({
      guest_name: booking.guest_name || "",
      guest_phone: booking.guest_phone || "",
      guest_email: booking.guest_email || "",
      guest_id_type: booking.guest_id_type || "",
      guest_id_number: booking.guest_id_number || "",
      advance_paid: booking.advance_paid || 0,
      notes: booking.notes || "",
      extra_charges: JSON.parse(JSON.stringify(booking.extra_charges || [])),
    });
    setIsEditing(true);
  }

  async function saveEdit() {
    setSavingEdit(true);
    setActionError(null);
    
    // Clean up empty lines
    const payload = {
      ...editForm,
      advance_paid: editForm.advance_paid === "" ? 0 : Number(editForm.advance_paid) || 0,
      extra_charges: (editForm.extra_charges || []).filter(c => c.item.trim() !== "" || Number(c.amount) > 0).map(c => ({
        item: c.item.trim(),
        amount: Number(c.amount) || 0
      }))
    };

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setBooking(updated);
        setIsEditing(false);
        onStatusChange?.();
      } else {
        const data = await res.json();
        setActionError(getApiErrorMessage(data, "Failed to update booking."));
      }
    } catch (err) {
      console.error("Save edit error:", err);
      setActionError("Network error while saving booking. Please retry.");
    }
    setSavingEdit(false);
  }

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) throw new Error("Booking not found");
      const json = await res.json();
      setBooking(json);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleStatusChange(newStatus) {
    setUpdatingStatus(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBooking((prev) => ({ ...prev, ...updated }));
        onStatusChange?.();
      } else {
        const errData = await res.json();
        setActionError(getApiErrorMessage(errData, "Failed to update status."));
      }
    } catch (err) {
      console.error("Status update error:", err);
      setActionError("Network error while updating status. Please retry.");
    }
    setUpdatingStatus(false);
  }

  const nights =
    booking
      ? Math.round(
          (new Date(booking.check_out_date) - new Date(booking.check_in_date)) /
            86400000
        )
      : 0;

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span className={styles.bookingIdLabel}>Booking #{bookingId}</span>
            {booking && (
              <span
                className={`badge badge-${booking.status.replace("_", "-")}`}
                style={{ marginLeft: 8 }}
              >
                {STATUS_CONFIG[booking.status]?.label || booking.status}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {booking && !isEditing && booking.status !== "cancelled" && (
              <button onClick={startEdit} className="btn btn-secondary btn-sm" disabled={updatingStatus}>
                ✏️ Edit
              </button>
            )}
            <button onClick={onClose} className={`btn btn-ghost btn-sm ${styles.closeBtn}`}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {loading && (
            <div className={styles.skeletons}>
              {[80, 60, 100, 80].map((h, i) => (
                <div key={i} className="skeleton" style={{ height: h, borderRadius: 10 }} />
              ))}
            </div>
          )}

          {error && (
            <p className={styles.errorMsg}>⚠ {error}</p>
          )}
          {actionError && (
            <p className={styles.errorMsg}>⚠ {actionError}</p>
          )}

          {booking && !loading && (
            isEditing ? (
              <div className={styles.editForm} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <section className={styles.section}>
                  <h4 className={styles.sectionTitle}>Guest Details</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input className="form-input" value={editForm.guest_name} onChange={e => setEditForm({...editForm, guest_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-input" value={editForm.guest_phone} onChange={e => setEditForm({...editForm, guest_phone: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-input" value={editForm.guest_email} onChange={e => setEditForm({...editForm, guest_email: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ID Type</label>
                      <select className="form-input" value={editForm.guest_id_type} onChange={e => setEditForm({...editForm, guest_id_type: e.target.value})}>
                        <option value="">None</option>
                        <option value="aadhaar">Aadhaar</option>
                        <option value="passport">Passport</option>
                        <option value="dl">Driving License</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: "16px" }}>
                    <label className="form-label">ID Number</label>
                    <input className="form-input" value={editForm.guest_id_number} onChange={e => setEditForm({...editForm, guest_id_number: e.target.value})} />
                  </div>
                </section>

                <section className={styles.section}>
                  <h4 className={styles.sectionTitle}>Extra Charges (Food, Water, etc.)</h4>
                  {editForm.extra_charges?.map((charge, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <input 
                        className="form-input" 
                        placeholder="Item (e.g. Tea)" 
                        value={charge.item} 
                        onChange={e => {
                          const newCharges = [...editForm.extra_charges];
                          newCharges[i].item = e.target.value;
                          setEditForm({ ...editForm, extra_charges: newCharges });
                        }}
                        style={{ flex: 2 }}
                      />
                      <input 
                        type="number" 
                        min="0"
                        className="form-input" 
                        placeholder="Amount (₹)" 
                        value={charge.amount} 
                        onChange={e => {
                          const newCharges = [...editForm.extra_charges];
                          // Allow empty string while typing, else parse number
                          newCharges[i].amount = e.target.value === "" ? "" : Number(e.target.value);
                          setEditForm({ ...editForm, extra_charges: newCharges });
                        }}
                        style={{ flex: 1 }}
                      />
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => {
                          const newCharges = editForm.extra_charges.filter((_, index) => index !== i);
                          setEditForm({ ...editForm, extra_charges: newCharges });
                        }}
                        style={{ color: "var(--accent-danger)", fontSize: "1rem" }}
                      >✕</button>
                    </div>
                  ))}
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setEditForm({ ...editForm, extra_charges: [...(editForm.extra_charges || []), { item: "", amount: 0 }] })}
                  >+ Add Charge</button>
                </section>

                <section className={styles.section}>
                  <h4 className={styles.sectionTitle}>Payment & Notes</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="form-group">
                      <label className="form-label">Advance Paid (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={editForm.advance_paid}
                        onChange={e => setEditForm({ ...editForm, advance_paid: e.target.value === "" ? "" : Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: "16px" }}>
                    <label className="form-label">Notes</label>
                    <textarea className="form-input" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={3} />
                  </div>
                </section>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)} disabled={savingEdit}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
            ) : (
            <>
              {/* Guest */}
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Guest</h4>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Name</span>
                    <span className={styles.infoValue}>{booking.guest_name}</span>
                  </div>
                  {booking.guest_phone && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Phone</span>
                      <span className={styles.infoValue}>{booking.guest_phone}</span>
                    </div>
                  )}
                  {booking.guest_email && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Email</span>
                      <span className={styles.infoValue}>{booking.guest_email}</span>
                    </div>
                  )}
                  {booking.guest_id_type && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>ID</span>
                      <span className={styles.infoValue}>
                        {booking.guest_id_type.toUpperCase()} — {booking.guest_id_number || "—"}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Stay */}
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Stay</h4>
                <div className={styles.stayRow}>
                  <div className={styles.dateBlock}>
                    <span className={styles.infoLabel}>Check-in</span>
                    <span className={styles.dateValue}>{booking.check_in_date}</span>
                  </div>
                  <span className={styles.stayArrow}>→</span>
                  <div className={styles.dateBlock}>
                    <span className={styles.infoLabel}>Check-out</span>
                    <span className={styles.dateValue}>{booking.check_out_date}</span>
                  </div>
                  <div className={styles.nightsBadge}>{nights} night{nights !== 1 ? "s" : ""}</div>
                  <span className={`badge badge-${booking.source}`}>
                    {SOURCE_CONFIG[booking.source]?.label || booking.source}
                  </span>
                </div>
              </section>

              {/* Rooms */}
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Rooms</h4>
                <div className={styles.roomsTable}>
                  <div className={`${styles.roomsRow} ${styles.roomsHead}`}>
                    <span>Room</span>
                    <span>Type</span>
                    <span>Guests</span>
                    <span>Extra Mattresses</span>
                    <span>Rate/Night</span>
                    <span>Subtotal</span>
                  </div>
                  {booking.rooms.map((r) => (
                    <div key={r.room_id} className={styles.roomsRow}>
                      <span className={styles.roomNum}>{r.room_number}</span>
                      <span>
                        <span className={`badge badge-${r.room_type}`}>{r.room_type}</span>
                      </span>
                      <span>{r.num_guests} 👤</span>
                      <span>{r.extra_mattresses > 0 ? `+${r.extra_mattresses} 🛏️` : "—"}</span>
                      <span>{formatCurrency(r.rate_per_night)}</span>
                      <span className={styles.subtotal}>{formatCurrency(r.room_total)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Payment */}
              <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Payment</h4>
                <div className={styles.paymentGrid}>
                  {booking.extra_charges?.length > 0 && (
                    <>
                      <div className={styles.paymentRow} style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        <span>Room Subtotal</span>
                        <span>{formatCurrency(booking.total_amount - booking.extra_charges.reduce((s, c) => s + c.amount, 0))}</span>
                      </div>
                      {booking.extra_charges.map((c, i) => (
                        <div key={i} className={styles.paymentRow} style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          <span>+ {c.item}</span>
                          <span>{formatCurrency(c.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}
                  <div className={styles.paymentRow}>
                    <span>Total Amount</span>
                    <span className={styles.totalAmt}>{formatCurrency(booking.total_amount)}</span>
                  </div>
                  <div className={styles.paymentRow}>
                    <span>Advance Paid</span>
                    <span style={{ color: "var(--accent-success)" }}>
                      {formatCurrency(booking.advance_paid)}
                    </span>
                  </div>
                  <div className={`${styles.paymentRow} ${styles.paymentRowBold}`}>
                    <span>Balance Due</span>
                    <span
                      style={{
                        color:
                          booking.balance_due > 0
                            ? "var(--accent-warning)"
                            : "var(--accent-success)",
                      }}
                    >
                      {formatCurrency(booking.balance_due)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Notes */}
              {booking.notes && (
                <section className={styles.section}>
                  <h4 className={styles.sectionTitle}>Notes</h4>
                  <p className={styles.notes}>{booking.notes}</p>
                </section>
              )}
            </>
            )
          )}
        </div>

        {/* Footer — Status Actions */}
        {booking && !loading && !isEditing && booking.status !== "cancelled" && (
          <div className={styles.modalFooter}>
            <span className={styles.footerLabel}>Update Status:</span>
            <div className={styles.statusActions}>
              {booking.status !== "confirmed" && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleStatusChange("confirmed")}
                  disabled={updatingStatus}
                >
                  Confirm
                </button>
              )}
              {booking.status !== "checked_in" && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleStatusChange("checked_in")}
                  disabled={updatingStatus}
                >
                  ✓ Check In
                </button>
              )}
              {booking.status !== "checked_out" && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleStatusChange("checked_out")}
                  disabled={updatingStatus}
                >
                  ✓ Check Out
                </button>
              )}
              <button
                className={`btn btn-sm ${styles.cancelBtn}`}
                onClick={() => setShowCancelConfirm(true)}
                disabled={updatingStatus}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <ConfirmModal
          title="Cancel Booking"
          message={`Are you sure you want to cancel booking #${bookingId}? This action cannot be undone.`}
          confirmText="Yes, Cancel"
          cancelText="Go Back"
          isDestructive={true}
          onConfirm={() => {
            handleStatusChange("cancelled");
            setShowCancelConfirm(false);
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}
