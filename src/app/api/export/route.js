import { getDB } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (
      !from || !to ||
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to)
    ) {
      return apiError("Invalid date format. Use YYYY-MM-DD", 400);
    }

    if (from > to) {
      return apiError("'from' date must be on or before 'to' date", 400);
    }

    const db = getDB();

    // ── Income totals (non-cancelled bookings with check_in in range) ──────
    const totals = await db
      .prepare(
        `SELECT
           COALESCE(SUM(total_amount), 0)  AS total_revenue,
           COALESCE(SUM(advance_paid), 0)  AS total_advance,
           COALESCE(SUM(balance_due), 0)   AS total_balance,
           COUNT(*)                         AS total_bookings
         FROM bookings
         WHERE check_in_date >= ? AND check_in_date <= ?
           AND status != 'cancelled'`
      )
      .bind(from, to)
      .first();

    // ── Revenue by source ─────────────────────────────────────────────────
    const { results: sourceData } = await db
      .prepare(
        `SELECT source,
                COALESCE(SUM(total_amount), 0)  AS revenue,
                COALESCE(SUM(advance_paid), 0)  AS advance,
                COALESCE(SUM(balance_due), 0)   AS balance,
                COUNT(*)                         AS booking_count
         FROM bookings
         WHERE check_in_date >= ? AND check_in_date <= ?
           AND status != 'cancelled'
         GROUP BY source`
      )
      .bind(from, to)
      .all();

    // ── Occupancy stats ───────────────────────────────────────────────────
    const totalRoomsResult = await db
      .prepare("SELECT COUNT(*) AS count FROM rooms WHERE is_active = 1")
      .first();
    const totalRooms = totalRoomsResult.count;

    const { results: fullHouseDays } = await db
      .prepare(
        `SELECT date, COUNT(DISTINCT room_id) AS rooms_booked
         FROM room_day_bookings rdb
         JOIN bookings b ON b.id = rdb.booking_id
         WHERE rdb.date >= ? AND rdb.date <= ?
           AND b.status != 'cancelled'
         GROUP BY date
         HAVING rooms_booked = ?`
      )
      .bind(from, to, totalRooms)
      .all();

    const { results: dailyOccupancy } = await db
      .prepare(
        `SELECT rdb.date, COUNT(DISTINCT rdb.room_id) AS rooms_booked
         FROM room_day_bookings rdb
         JOIN bookings b ON b.id = rdb.booking_id
         WHERE rdb.date >= ? AND rdb.date <= ?
           AND b.status != 'cancelled'
         GROUP BY rdb.date`
      )
      .bind(from, to)
      .all();

    const totalOccupied = dailyOccupancy.reduce((s, d) => s + d.rooms_booked, 0);
    const daysInRange = dailyOccupancy.length || 1;
    const avgOccupancy =
      Math.round((totalOccupied / (daysInRange * totalRooms)) * 1000) / 10;

    // ── All bookings (including cancelled) with room numbers ──────────────
    const { results: bookings } = await db
      .prepare(
        `SELECT b.*,
                GROUP_CONCAT(r.room_number, ', ') AS room_numbers
         FROM bookings b
         LEFT JOIN booking_rooms br ON br.booking_id = b.id
         LEFT JOIN rooms r ON r.id = br.room_id
         WHERE b.check_in_date >= ? AND b.check_in_date <= ?
         GROUP BY b.id
         ORDER BY b.check_in_date ASC, b.guest_name ASC`
      )
      .bind(from, to)
      .all();

    return apiResponse({
      period: { from, to },
      income: {
        total_revenue: totals.total_revenue,
        total_advance: totals.total_advance,
        total_balance: totals.total_balance,
        total_bookings: totals.total_bookings,
        full_house_days: fullHouseDays.length,
        avg_occupancy_pct: avgOccupancy,
        total_rooms: totalRooms,
        revenue_by_source: sourceData,
      },
      bookings,
    });
  } catch (err) {
    console.error("Export API error:", err);
    return apiError("Internal server error", 500);
  }
}
