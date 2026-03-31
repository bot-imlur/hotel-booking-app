-- ============================================================
-- USERS TABLE (admin-only, seeded)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ROOMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number          TEXT NOT NULL UNIQUE,
    room_type            TEXT NOT NULL CHECK (room_type IN ('triple', 'double')),
    base_capacity        INTEGER NOT NULL,
    max_extra_mattresses INTEGER NOT NULL DEFAULT 2,
    default_rate         REAL NOT NULL,
    description          TEXT,
    is_active            INTEGER NOT NULL DEFAULT 1,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name      TEXT NOT NULL,
    guest_phone     TEXT,
    guest_email     TEXT,
    guest_id_type   TEXT,
    guest_id_number TEXT,
    check_in_date   TEXT NOT NULL,
    check_out_date  TEXT NOT NULL,
    num_nights      INTEGER NOT NULL,
    source          TEXT NOT NULL CHECK (source IN ('mmt', 'airbnb', 'offline', 'agent')),
    extra_charges   TEXT NOT NULL DEFAULT '[]',
    total_amount    REAL NOT NULL DEFAULT 0,
    advance_paid    REAL NOT NULL DEFAULT 0,
    balance_due     REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'confirmed'
                    CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- BOOKING_ROOMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_rooms (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id       INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_id          INTEGER NOT NULL REFERENCES rooms(id),
    num_guests       INTEGER NOT NULL DEFAULT 1,
    extra_mattresses INTEGER NOT NULL DEFAULT 0,
    rate_per_night   REAL NOT NULL DEFAULT 0,
    room_total       REAL NOT NULL DEFAULT 0,
    UNIQUE(booking_id, room_id)
);

-- ============================================================
-- ROOM_DAY_BOOKINGS TABLE (conflict prevention)
-- ============================================================
CREATE TABLE IF NOT EXISTS room_day_bookings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id         INTEGER NOT NULL REFERENCES rooms(id),
    date            TEXT NOT NULL,
    booking_id      INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    booking_room_id INTEGER NOT NULL REFERENCES booking_rooms(id) ON DELETE CASCADE,
    UNIQUE(room_id, date)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rdb_date ON room_day_bookings(date);
CREATE INDEX IF NOT EXISTS idx_rdb_room_date ON room_day_bookings(room_id, date);
CREATE INDEX IF NOT EXISTS idx_rdb_booking ON room_day_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_checkin ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_checkout ON bookings(check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
