DROP TABLE IF EXISTS room_day_bookings_temp;
DROP TABLE IF EXISTS booking_rooms_temp;
DROP TABLE IF EXISTS bookings_temp;
DROP TABLE IF EXISTS rooms_temp;
DROP TABLE IF EXISTS users_temp;

CREATE TABLE users_temp AS SELECT * FROM users;
CREATE TABLE rooms_temp AS SELECT * FROM rooms;
CREATE TABLE bookings_temp AS SELECT * FROM bookings;
CREATE TABLE booking_rooms_temp AS SELECT * FROM booking_rooms;
CREATE TABLE room_day_bookings_temp AS SELECT * FROM room_day_bookings;

PRAGMA defer_foreign_keys=TRUE;
DROP TABLE IF EXISTS room_day_bookings;
DROP TABLE IF EXISTS booking_rooms;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;
