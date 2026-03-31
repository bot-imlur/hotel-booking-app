PRAGMA defer_foreign_keys=TRUE;

INSERT INTO users SELECT * FROM users_temp;
INSERT INTO rooms SELECT * FROM rooms_temp;
INSERT INTO bookings (
  id, guest_name, guest_phone, guest_email, guest_id_type, guest_id_number,
  check_in_date, check_out_date, num_nights, source,
  total_amount, advance_paid, balance_due, status, notes,
  created_at, updated_at
) SELECT * FROM bookings_temp;
INSERT INTO booking_rooms SELECT * FROM booking_rooms_temp;
INSERT INTO room_day_bookings SELECT * FROM room_day_bookings_temp;

DROP TABLE users_temp;
DROP TABLE rooms_temp;
DROP TABLE bookings_temp;
DROP TABLE booking_rooms_temp;
DROP TABLE room_day_bookings_temp;
