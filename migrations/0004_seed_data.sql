-- ============================================================
-- SEED: Admin User (admin / admin123)
-- Password hashed with PBKDF2 (100K iterations, SHA-256)
-- ============================================================
INSERT OR IGNORE INTO users (username, password_hash) 
VALUES ('admin', 'YFKqA6KwQI4IGIAtuIT2Fw==:sbonoKyI1b5DKLNtM3yUFR5iblfoa6iKLZSg5mGHPAE=');

-- ============================================================
-- SEED: Rooms (101-109)
-- 103, 104, 105 = Triple (₹2000/night)
-- 101, 102, 106-109 = Double (₹1600/night)
-- ============================================================
INSERT OR IGNORE INTO rooms (room_number, room_type, base_capacity, max_extra_mattresses, default_rate, description) VALUES
('101', 'double', 2, 2, 1600, 'Double room - Ground floor'),
('102', 'double', 2, 2, 1600, 'Double room - Ground floor'),
('103', 'triple', 3, 2, 2000, 'Triple room - First floor'),
('104', 'triple', 3, 2, 2000, 'Triple room - First floor'),
('105', 'triple', 3, 2, 2000, 'Triple room - First floor'),
('106', 'double', 2, 2, 1600, 'Double room - Second floor'),
('107', 'double', 2, 2, 1600, 'Double room - Second floor'),
('108', 'double', 2, 2, 1600, 'Double room - Second floor'),
('109', 'double', 2, 2, 1600, 'Double room - Second floor');
