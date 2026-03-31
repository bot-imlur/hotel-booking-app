"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import { formatCurrency, STATUS_CONFIG, BOOKING_SOURCES, SOURCE_CONFIG } from "@/lib/utils";
import BookingModal from "@/components/BookingModal/BookingModal";

export default function BookingsListPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  // Applied Filters state
  const [filterDate, setFilterDate] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterGuests, setFilterGuests] = useState("");
  const [filterMattresses, setFilterMattresses] = useState("");
  const [filterRate, setFilterRate] = useState("");
  const [filterAmount, setFilterAmount] = useState("");
  const [filterSources, setFilterSources] = useState([]);

  // Draft Filters state (input fields)
  const [draftDate, setDraftDate] = useState("");
  const [draftRoom, setDraftRoom] = useState("");
  const [draftGuests, setDraftGuests] = useState("");
  const [draftMattresses, setDraftMattresses] = useState("");
  const [draftRate, setDraftRate] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftSources, setDraftSources] = useState([]);

  const activeFiltersCount = [filterDate, filterRoom, filterGuests, filterMattresses, filterRate, filterAmount].filter(Boolean).length + (filterSources.length > 0 ? 1 : 0);

  const handleApplyFilters = () => {
    setFilterDate(draftDate);
    setFilterRoom(draftRoom);
    setFilterGuests(draftGuests);
    setFilterMattresses(draftMattresses);
    setFilterRate(draftRate);
    setFilterAmount(draftAmount);
    setFilterSources([...draftSources]);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setDraftDate("");
    setDraftRoom("");
    setDraftGuests("");
    setDraftMattresses("");
    setDraftRate("");
    setDraftAmount("");
    setDraftSources([]);

    setFilterDate("");
    setFilterRoom("");
    setFilterGuests("");
    setFilterMattresses("");
    setFilterRate("");
    setFilterAmount("");
    setFilterSources([]);
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    // Parse room filter once (e.g. "101,102", "101-106, 108")
    let allowedRooms = null;
    if (filterRoom) {
      allowedRooms = new Set();
      const parts = filterRoom.split(',').map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= end; i++) {
              allowedRooms.add(i.toString());
            }
          } else {
            allowedRooms.add(part.toLowerCase());
          }
        } else {
          allowedRooms.add(part.toLowerCase());
        }
      }
    }

    return bookings.filter((b) => {
      // 1. Search Query: Name or Phone
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = b.guest_name?.toLowerCase().includes(q);
        const phoneMatch = b.guest_phone?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }

      // 2. Filter Date
      if (filterDate) {
        // Match if the filter date falls strictly between check-in and check-out, or matches either.
        if (filterDate < b.check_in_date || filterDate > b.check_out_date) {
          return false;
        }
      }

      // 3. Amount Filter
      if (filterAmount && b.total_amount !== Number(filterAmount)) {
        return false;
      }

      // 4. Source Filter
      if (filterSources.length > 0 && !filterSources.includes(b.source)) {
        return false;
      }

      // Deep filters via rooms array
      if (filterRoom || filterGuests || filterMattresses || filterRate) {
        const hasMatchingRoom = b.rooms && b.rooms.some((r) => {
          let matches = true;
          if (allowedRooms && !allowedRooms.has(r.room_number.toLowerCase())) matches = false;
          if (filterGuests && r.num_guests !== Number(filterGuests)) matches = false;
          if (filterMattresses && r.extra_mattresses !== Number(filterMattresses)) matches = false;
          if (filterRate && r.rate_per_night < Number(filterRate)) matches = false;
          return matches;
        });
        if (!hasMatchingRoom) return false;
      }

      return true;
    });
  }, [bookings, searchQuery, filterDate, filterRoom, filterGuests, filterMattresses, filterRate, filterAmount, filterSources]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>All Bookings</h2>
        <div className={styles.resultsCount}>
          {filteredBookings.length} {filteredBookings.length === 1 ? "booking" : "bookings"}
        </div>
      </div>

      <div className={styles.searchTopBar}>
        <div className={styles.searchBar}>
          <span style={{ opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder="Search by Guest Name or Phone..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterContainer}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className={`btn ${activeFiltersCount > 0 ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ border: "1px solid var(--border)", display: "flex", gap: "8px", alignItems: "center" }}
              onClick={() => {
                if (!showFilters) {
                  setDraftDate(filterDate);
                  setDraftRoom(filterRoom);
                  setDraftGuests(filterGuests);
                  setDraftMattresses(filterMattresses);
                  setDraftRate(filterRate);
                  setDraftAmount(filterAmount);
                  setDraftSources([...filterSources]);
                }
                setShowFilters(!showFilters);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Filters {activeFiltersCount > 0 && <span className={styles.filterBadge}>{activeFiltersCount}</span>}
            </button>

            {activeFiltersCount > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={handleClearFilters}
                title="Clear all filters"
              >
                ✕
              </button>
            )}
          </div>

          {showFilters && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterDropdownHeader}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Filter Bookings</h4>
                {activeFiltersCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className={styles.filterDropdownBody}>
                <div className={styles.filterGroup} style={{ gridColumn: "1 / -1" }}>
                  <span className={styles.filterLabel}>Source</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "4px" }}>
                    {BOOKING_SOURCES.map((src) => (
                      <label key={src} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-primary)" }}>
                        <input
                          type="checkbox"
                          checked={draftSources.includes(src)}
                          onChange={(e) => {
                            if (e.target.checked) setDraftSources([...draftSources, src]);
                            else setDraftSources(draftSources.filter((s) => s !== src));
                          }}
                          style={{ width: "16px", height: "16px", accentColor: "var(--accent-primary)" }}
                        />
                        {SOURCE_CONFIG[src]?.label || src}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Date filter</span>
                  <input
                    type="date"
                    className="form-input"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Amount Total</span>
                  <ClearableInput
                    type="number"
                    placeholder="Total ₹"
                    value={draftAmount}
                    onChange={(e) => setDraftAmount(e.target.value)}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Room No.</span>
                  <ClearableInput
                    type="text"
                    placeholder="e.g. 101, 103-105"
                    value={draftRoom}
                    onChange={(e) => setDraftRoom(e.target.value)}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Guests</span>
                  <ClearableInput
                    type="number"
                    placeholder="Guests per room"
                    value={draftGuests}
                    onChange={(e) => setDraftGuests(e.target.value)}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Extra Mattresses</span>
                  <ClearableInput
                    type="number"
                    placeholder="Mattresses"
                    value={draftMattresses}
                    onChange={(e) => setDraftMattresses(e.target.value)}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Min Rate / Night</span>
                  <ClearableInput
                    type="number"
                    placeholder="Min Rate ₹"
                    value={draftRate}
                    onChange={(e) => setDraftRate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "8px", background: "var(--bg-secondary)", borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)" }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleApplyFilters}>Apply Filters</button>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Dates</th>
              <th className={styles.th}>Guest</th>
              <th className={styles.th}>Rooms Included</th>
              <th className={styles.th}>Financials</th>
              <th className={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={`skeleton-${i}`} className={styles.tr}>
                  <td className={styles.td} data-label="Dates"><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                  <td className={styles.td} data-label="Guest"><div className="skeleton" style={{ height: 20, width: "60%" }} /></td>
                  <td className={styles.td} data-label="Rooms"><div className="skeleton" style={{ height: 20, width: "90%" }} /></td>
                  <td className={styles.td} data-label="Financials"><div className="skeleton" style={{ height: 20, width: "70%" }} /></td>
                  <td className={styles.td} data-label="Status"><div className="skeleton" style={{ height: 20, width: "50%" }} /></td>
                </tr>
              ))
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.emptyState}>
                  No bookings match your filters.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className={styles.tr} onClick={() => setSelectedBookingId(b.id)}>
                  <td className={styles.td} data-label="Dates">
                    <div className={styles.tdContent}>
                      <div className={styles.tdPrimary}>{b.check_in_date}</div>
                      <div>to {b.check_out_date}</div>
                    </div>
                  </td>
                  <td className={styles.td} data-label="Guest">
                    <div className={styles.tdContent}>
                      <div className={styles.tdPrimary}>{b.guest_name}</div>
                      {b.guest_phone && <div>{b.guest_phone}</div>}
                    </div>
                  </td>
                  <td className={styles.td} data-label="Rooms">
                    <div className={styles.tdContent}>
                      <div className={styles.badgeGroup}>
                        {b.rooms && b.rooms.map((r, i) => (
                          <span key={i} className="badge badge-secondary" title={`${r.num_guests} guests, ${r.extra_mattresses} mattress`}>
                            {r.room_number} ({formatCurrency(r.rate_per_night)})
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className={styles.td} data-label="Financials">
                    <div className={styles.tdContent}>
                      <div className={styles.tdPrimary}>{formatCurrency(b.total_amount)} total</div>
                      {b.balance_due > 0 && <div style={{ color: "var(--accent-warning)" }}>Bal: {formatCurrency(b.balance_due)}</div>}
                    </div>
                  </td>
                  <td className={styles.td} data-label="Status">
                    <div className={styles.tdContent}>
                      <span className={`badge badge-${b.status.replace("_", "-")}`}>
                        {STATUS_CONFIG[b.status]?.label || b.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedBookingId && (
        <BookingModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onStatusChange={fetchBookings}
        />
      )}
    </div>
  );
}

function ClearableInput({ type = "text", value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        type={type}
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ width: "100%", paddingRight: value ? "28px" : "14px" }}
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: "" } })}
          style={{
            position: "absolute",
            right: "6px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            fontSize: "1rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Clear input"
          title="Clear"
        >
          ✕
        </button>
      )}
    </div>
  );
}
