import { getDB } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/utils";

export async function GET(request, { params }) {
  try {
    const { date } = await params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return apiError("Invalid date format. Use YYYY-MM-DD", 400);
    }

    const db = getDB();

    // Get all bookings for this date with room details
    const { results } = await db
      .prepare(
        `SELECT DISTINCT b.*,
                br.room_id, br.num_guests, br.extra_mattresses, br.rate_per_night, br.room_total,
                r.room_number, r.room_type, r.base_capacity
         FROM room_day_bookings rdb
         JOIN bookings b ON b.id = rdb.booking_id
         JOIN booking_rooms br ON br.id = rdb.booking_room_id
         JOIN rooms r ON r.id = rdb.room_id
         WHERE rdb.date = ?
           AND b.status != 'cancelled'
         ORDER BY r.room_number`
      )
      .bind(date)
      .all();

    // Group by booking
    const bookingMap = {};
    for (const row of results) {
      if (!bookingMap[row.id]) {
        bookingMap[row.id] = {
          id: row.id,
          guest_name: row.guest_name,
          guest_phone: row.guest_phone,
          guest_email: row.guest_email,
          check_in_date: row.check_in_date,
          check_out_date: row.check_out_date,
          num_nights: row.num_nights,
          source: row.source,
          total_amount: row.total_amount,
          advance_paid: row.advance_paid,
          balance_due: row.balance_due,
          status: row.status,
          notes: row.notes,
          rooms: [],
        };
      }
      bookingMap[row.id].rooms.push({
        room_id: row.room_id,
        room_number: row.room_number,
        room_type: row.room_type,
        num_guests: row.num_guests,
        extra_mattresses: row.extra_mattresses,
        rate_per_night: row.rate_per_night,
        room_total: row.room_total,
      });
    }

    return apiResponse({
      date,
      bookings: Object.values(bookingMap),
      rooms_booked: new Set(results.map((r) => r.room_id)).size,
    });
  } catch (err) {
    console.error("Calendar date error:", err);
    return apiError("Internal server error", 500);
  }
}
