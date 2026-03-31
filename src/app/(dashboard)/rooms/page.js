"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import { formatCurrency, SOURCE_CONFIG, ROOM_TYPES } from "@/lib/utils";
import BookingModal from "@/components/BookingModal/BookingModal";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetail, setRoomDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [modalBookingId, setModalBookingId] = useState(null);
  const detailRef = useRef(null);
  const scrolledRoomRef = useRef(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (roomDetail && detailRef.current && selectedRoom !== scrolledRoomRef.current) {
      if (window.innerWidth <= 768) {
        detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      scrolledRoomRef.current = selectedRoom;
    }
  }, [roomDetail, selectedRoom]);

  async function fetchRooms() {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms");
      const json = await res.json();
      setRooms(json);
    } catch (err) {
      console.error("Rooms fetch error:", err);
    }
    setLoading(false);
  }

  async function handleRoomClick(roomId) {
    if (selectedRoom === roomId) {
      setSelectedRoom(null);
      setRoomDetail(null);
      scrolledRoomRef.current = null;
      return;
    }
    setSelectedRoom(roomId);
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const json = await res.json();
      setRoomDetail(json);
    } catch (err) {
      console.error("Room detail error:", err);
    }
  }

  async function refreshRoomDetail(roomId) {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const json = await res.json();
      setRoomDetail(json);
    } catch (err) {
      console.error("Room refresh error:", err);
    }
  }

  function startEdit() {
    setEditing(true);
    setEditData({
      room_type: roomDetail.room_type,
      base_capacity: roomDetail.base_capacity,
      max_extra_mattresses: roomDetail.max_extra_mattresses,
      default_rate: roomDetail.default_rate,
    });
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${selectedRoom}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        setRoomDetail({ ...roomDetail, ...updated });
        setRooms(rooms.map((r) => (r.id === selectedRoom ? { ...r, ...updated } : r)));
        setEditing(false);
      }
    } catch (err) {
      console.error("Room save error:", err);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <h2>Rooms</h2>
        <div className={styles.grid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2>Rooms</h2>

      <div className={styles.grid}>
        {rooms.map((room) => (
          <button
            key={room.id}
            className={`card card-clickable ${styles.roomCard} ${selectedRoom === room.id ? styles.roomCardActive : ""}`}
            onClick={() => handleRoomClick(room.id)}
          >
            <div className={styles.roomHeader}>
              <span className={styles.roomNumber}>{room.room_number}</span>
              <span className={`badge badge-${room.room_type}`}>
                {room.room_type}
              </span>
            </div>
            <div className={styles.roomInfo}>
              <span>{room.base_capacity} guests · {room.max_extra_mattresses} mattress max</span>
              <span className={styles.roomRate}>{formatCurrency(room.default_rate)}/night</span>
            </div>
          </button>
        ))}
      </div>

      {/* Room Detail Panel */}
      {selectedRoom && roomDetail && (
        <div className={`card ${styles.detail}`} ref={detailRef}>
          <div className={styles.detailHeader}>
            <div>
              <h3>Room {roomDetail.room_number}</h3>
              <span className={`badge badge-${roomDetail.room_type}`} style={{ marginLeft: 8 }}>
                {roomDetail.room_type}
              </span>
            </div>
            {!editing && (
              <button onClick={startEdit} className="btn btn-secondary btn-sm">✏️ Edit</button>
            )}
          </div>

          {editing ? (
            <div className={styles.editForm}>
              <div className="form-group">
                <label className="form-label">Room Type</label>
                <select
                  className="form-input"
                  value={editData.room_type}
                  onChange={(e) => setEditData({ ...editData, room_type: e.target.value })}
                >
                  {ROOM_TYPES.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Base Capacity</label>
                <input
                  type="number"
                  className="form-input"
                  value={editData.base_capacity}
                  onChange={(e) => setEditData({ ...editData, base_capacity: Number(e.target.value) })}
                  min={1}
                  max={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Max Extra Mattresses</label>
                <input
                  type="number"
                  className="form-input"
                  value={editData.max_extra_mattresses}
                  onChange={(e) => setEditData({ ...editData, max_extra_mattresses: Number(e.target.value) })}
                  min={0}
                  max={4}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Default Rate (₹/night)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editData.default_rate}
                  onChange={(e) => setEditData({ ...editData, default_rate: Number(e.target.value) })}
                  min={0}
                />
              </div>
              <div className={styles.editActions}>
                <button onClick={saveEdit} className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className={styles.detailInfo}>
              <div className={styles.detailRow}>
                <span>Capacity</span>
                <span>{roomDetail.base_capacity} guests + up to {roomDetail.max_extra_mattresses} mattress(es)</span>
              </div>
              <div className={styles.detailRow}>
                <span>Default Rate</span>
                <span>{formatCurrency(roomDetail.default_rate)}/night</span>
              </div>
            </div>
          )}

          {/* Bookings for this room */}
          {roomDetail.bookings?.length > 0 && (
            <div className={styles.bookingsSection}>
              <h4>Upcoming Bookings</h4>
              <div className={styles.bookingTable}>
                <div className={styles.tableHeader}>
                  <span>Check-in</span>
                  <span>Check-out</span>
                  <span>Guest</span>
                  <span>Source</span>
                  <span>Rate</span>
                  <span>Status</span>
                </div>
                {roomDetail.bookings.map((b) => (
                  <div key={b.id} className={`${styles.tableRow} ${styles.tableRowClickable}`}
                    onClick={() => setModalBookingId(b.id)}>
                    <span>{b.check_in_date}</span>
                    <span>{b.check_out_date}</span>
                    <span className={styles.guestName}>{b.guest_name}</span>
                    <span><span className={`badge badge-${b.source}`}>{b.source}</span></span>
                    <span>{formatCurrency(b.rate_per_night)}</span>
                    <span><span className={`badge badge-${b.status.replace("_", "-")}`}>{b.status}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {roomDetail.bookings?.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No upcoming bookings for this room.</p>
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {modalBookingId && (
        <BookingModal
          bookingId={modalBookingId}
          onClose={() => setModalBookingId(null)}
          onStatusChange={() => {
            if (selectedRoom) refreshRoomDetail(selectedRoom);
          }}
        />
      )}
    </div>
  );
}
