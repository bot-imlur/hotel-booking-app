import { getDB } from "@/lib/db";
import { apiResponse, apiError, expandDateRange } from "@/lib/utils";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");

    if (!checkIn || !checkOut) {
      return apiError("checkIn and checkOut are required", 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
      return apiError("Invalid date format. Use YYYY-MM-DD", 400);
    }

    if (checkOut <= checkIn) {
      return apiError("checkOut must be after checkIn", 400);
    }

    const dates = expandDateRange(checkIn, checkOut);
    if (dates.length === 0) {
      return apiError("Invalid date range", 400);
    }

    const db = getDB();
    const placeholders = dates.map(() => "?").join(",");

    // Find rooms that are booked on any of the dates
    const { results: bookedRoomIds } = await db
      .prepare(
        `SELECT DISTINCT rdb.room_id
         FROM room_day_bookings rdb
         JOIN bookings b ON b.id = rdb.booking_id
         WHERE rdb.date IN (${placeholders})
           AND b.status != 'cancelled'`
      )
      .bind(...dates)
      .all();

    const bookedIds = new Set(bookedRoomIds.map((r) => r.room_id));

    // Get all active rooms
    const { results: allRooms } = await db
      .prepare("SELECT * FROM rooms WHERE is_active = 1 ORDER BY room_number")
      .all();

    // Mark availability
    const rooms = allRooms.map((room) => ({
      ...room,
      available: !bookedIds.has(room.id),
    }));

    return apiResponse({
      check_in: checkIn,
      check_out: checkOut,
      nights: dates.length,
      rooms,
      available_count: rooms.filter((r) => r.available).length,
    });
  } catch (err) {
    console.error("Availability error:", err);
    return apiError("Internal server error", 500);
  }
}
