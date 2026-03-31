-- WARNING: This will permanently delete all bookings!
-- Execute carefully. It leaves Users and Rooms intact.

PRAGMA defer_foreign_keys=TRUE;

DELETE FROM room_day_bookings;
DELETE FROM booking_rooms;
DELETE FROM bookings;

-- Reset the Auto-Increment IDs so the next new booking starts at ID 1 again
UPDATE sqlite_sequence SET seq = 0 WHERE name = 'bookings';
UPDATE sqlite_sequence SET seq = 0 WHERE name = 'booking_rooms';
UPDATE sqlite_sequence SET seq = 0 WHERE name = 'room_day_bookings';
