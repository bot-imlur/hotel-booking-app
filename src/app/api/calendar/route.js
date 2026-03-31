import { getDB } from "@/lib/db";
import { apiResponse, apiError, getMonthRange } from "@/lib/utils";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return apiError("Invalid month format. Use YYYY-MM", 400);
    }

    const { start, end } = getMonthRange(month);
    const db = getDB();

    // Get rooms booked per day
    const { results } = await db
      .prepare(
        `SELECT rdb.date, COUNT(DISTINCT rdb.room_id) as rooms_booked
         FROM room_day_bookings rdb
         JOIN bookings b ON b.id = rdb.booking_id
         WHERE rdb.date >= ? AND rdb.date < ?
           AND b.status != 'cancelled'
         GROUP BY rdb.date`
      )
      .bind(start, end)
      .all();

    // Get total active rooms
    const totalRooms = await db
      .prepare("SELECT COUNT(*) as count FROM rooms WHERE is_active = 1")
      .first();

    const dayMap = {};
    for (const row of results) {
      dayMap[row.date] = row.rooms_booked;
    }

    return apiResponse({
      month,
      total_rooms: totalRooms.count,
      days: dayMap,
    });
  } catch (err) {
    console.error("Calendar error:", err);
    return apiError("Internal server error", 500);
  }
}
