"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isToday,
} from "date-fns";
import styles from "./page.module.css";
import { formatCurrency, SOURCE_CONFIG } from "@/lib/utils";
import BookingModal from "@/components/BookingModal/BookingModal";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateBookings, setDateBookings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [modalBookingId, setModalBookingId] = useState(null);

  const monthStr = format(currentMonth, "yyyy-MM");
  const totalRooms = calendarData?.total_rooms || 9;

  useEffect(() => {
    fetchCalendar();
  }, [monthStr]);

  async function fetchCalendar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${monthStr}`);
      const json = await res.json();
      setCalendarData(json);
    } catch (err) {
      console.error("Calendar fetch error:", err);
    }
    setLoading(false);
  }

  async function handleDateClick(dateStr) {
    setSelectedDate(dateStr);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/calendar/${dateStr}`);
      const json = await res.json();
      setDateBookings(json);
    } catch (err) {
      console.error("Date detail error:", err);
    }
    setDrawerLoading(false);
  }

  function changeMonth(delta) {
    setCurrentMonth(prev => addMonths(prev, delta));
    setSelectedDate(null);
    setDateBookings(null);
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const weeks = [];
  let day = calStart;
  while (day <= calEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(day));
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const days = calendarData?.days || {};
  const selectedDateBooked = selectedDate ? days[selectedDate] || 0 : 0;
  const canAddBooking = selectedDate && selectedDateBooked < totalRooms;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Calendar</h2>
        <div className={styles.monthNav}>
          <button onClick={() => changeMonth(-1)} className="btn btn-ghost btn-sm">←</button>
          <span className={styles.monthLabel}>{format(currentMonth, "MMMM yyyy")}</span>
          <button onClick={() => changeMonth(1)} className="btn btn-ghost btn-sm">→</button>
        </div>
      </div>

      <div className={styles.calendarWrapper}>
        {/* Calendar Grid */}
        <div className={styles.calendar}>
          {/* Day headers */}
          <div className={styles.dayHeaders}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className={styles.dayHeader}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className={styles.week}>
              {week.map((d) => {
                const dateStr = format(d, "yyyy-MM-dd");
                const inMonth = isSameMonth(d, currentMonth);
                const today = isToday(d);
                const booked = days[dateStr] || 0;
                const pct = (booked / totalRooms) * 100;

                let occupancyClass = "";
                if (booked > 0) {
                  if (pct >= 100) occupancyClass = styles.cellFull;
                  else if (pct >= 90) occupancyClass = styles.cellHigh;
                  else if (pct >= 50) occupancyClass = styles.cellMedium;
                  else occupancyClass = styles.cellLow;
                }

                return (
                  <button
                    key={dateStr}
                    className={`${styles.cell} ${!inMonth ? styles.cellOutside : ""} ${today ? styles.cellToday : ""} ${occupancyClass} ${selectedDate === dateStr ? styles.cellSelected : ""}`}
                    onClick={() => inMonth && handleDateClick(dateStr)}
                    disabled={!inMonth}
                  >
                    <span className={styles.cellDay}>{format(d, "d")}</span>
                    {inMonth && booked > 0 && (
                      <span className={styles.cellBadge}>
                        {booked}/{totalRooms}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Date Detail Drawer */}
        {selectedDate && (
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h3>{format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}</h3>
              <button onClick={() => { setSelectedDate(null); setDateBookings(null); }} className="btn btn-ghost btn-sm">✕</button>
            </div>

            {drawerLoading ? (
              <div style={{ padding: "var(--space-md)" }}>
                {[1, 2].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 10 }} />
                ))}
              </div>
            ) : dateBookings?.bookings?.length > 0 ? (
              <>
                <p className={styles.drawerSummary}>
                  {dateBookings.rooms_booked}/{totalRooms} rooms booked · {dateBookings.bookings.length} booking(s)
                </p>
                {canAddBooking && (
                  <Link href={`/bookings/new?checkIn=${selectedDate}`} className={`btn btn-primary btn-sm ${styles.addBookingBtn}`}>
                    + Add Booking
                  </Link>
                )}
                <div className={styles.bookingList}>
                  {dateBookings.bookings.map((b) => (
                    <div key={b.id} className={`card card-clickable ${styles.bookingCard}`}
                      onClick={() => setModalBookingId(b.id)}>
                      <div className={styles.bookingHeader}>
                        <span className={styles.guestName}>{b.guest_name}</span>
                        <span className={`badge badge-${b.source}`}>
                          {SOURCE_CONFIG[b.source]?.label}
                        </span>
                      </div>
                      <p className={styles.bookingDates}>
                        {b.check_in_date} → {b.check_out_date} · {b.num_nights} night(s)
                      </p>
                      <div className={styles.bookingRooms}>
                        {b.rooms.map((r) => (
                          <span key={r.room_id} className={styles.roomChip}>
                            {r.room_number}
                            <small>{r.num_guests}👤{r.extra_mattresses > 0 ? ` +${r.extra_mattresses}🛏️` : ""}</small>
                          </span>
                        ))}
                      </div>
                      <div className={styles.bookingFooter}>
                        <span>{formatCurrency(b.total_amount)}</span>
                        {b.balance_due > 0 && (
                          <span style={{ color: "var(--accent-warning)", fontSize: "0.75rem" }}>
                            Due: {formatCurrency(b.balance_due)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {canAddBooking && (
                  <Link href={`/bookings/new?checkIn=${selectedDate}`} className={`btn btn-primary btn-sm ${styles.addBookingBtn}`}>
                    + Add Booking
                  </Link>
                )}
                <p className={styles.noBookings}>No bookings for this date</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {modalBookingId && (
        <BookingModal
          bookingId={modalBookingId}
          onClose={() => setModalBookingId(null)}
          onStatusChange={() => {
            fetchCalendar();
            if (selectedDate) handleDateClick(selectedDate);
          }}
        />
      )}
    </div>
  );
}
