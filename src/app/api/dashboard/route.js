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

    // Total revenue, advance, balance, bookings count
    const totals = await db
      .prepare(
        `SELECT
           COALESCE(SUM(total_amount), 0) as total_revenue,
           COALESCE(SUM(advance_paid), 0) as total_advance,
           COALESCE(SUM(balance_due), 0) as total_balance,
           COUNT(*) as total_bookings
         FROM bookings
         WHERE check_in_date >= ? AND check_in_date < ?
           AND status != 'cancelled'`
      )
      .bind(start, end)
      .first();

    // Revenue by source
    const { results: sourceData } = await db
      .prepare(
        `SELECT source,
                COALESCE(SUM(total_amount), 0) as revenue,
                COALESCE(SUM(advance_paid), 0) as advance,
                COALESCE(SUM(balance_due), 0) as balance,
                COUNT(*) as booking_count
         FROM bookings
         WHERE check_in_date >= ? AND check_in_date < ?
           AND status != 'cancelled'
         GROUP BY source`
      )
      .bind(start, end)
      .all();

    const revenueBySource = {};
    for (const row of sourceData) {
      revenueBySource[row.source] = {
        revenue: row.revenue,
        advance: row.advance,
        balance: row.balance,
        bookings: row.booking_count,
      };
    }

    // Get total active rooms
    const totalRoomsResult = await db
      .prepare("SELECT COUNT(*) as count FROM rooms WHERE is_active = 1")
      .first();
    const totalRooms = totalRoomsResult.count;

    // Full-house days
    const { results: fullHouseDays } = await db
      .prepare(
        `SELECT date, COUNT(DISTINCT room_id) as rooms_booked
         FROM room_day_bookings rdb
         JOIN bookings b ON b.id = rdb.booking_id
         WHERE rdb.date >= ? AND rdb.date < ?
           AND b.status != 'cancelled'
         GROUP BY date
         HAVING rooms_booked = ?`
      )
      .bind(start, end, totalRooms)
      .all();

    // Daily occupancy
    const { results: dailyOccupancy } = await db
      .prepare(
        `SELECT rdb.date, COUNT(DISTINCT rdb.room_id) as rooms_booked
         FROM room_day_bookings rdb
         JOIN bookings b ON b.id = rdb.booking_id
         WHERE rdb.date >= ? AND rdb.date < ?
           AND b.status != 'cancelled'
         GROUP BY rdb.date
         ORDER BY rdb.date`
      )
      .bind(start, end)
      .all();

    const dailyData = dailyOccupancy.map((d) => ({
      date: d.date,
      rooms_booked: d.rooms_booked,
      occupancy_pct: Math.round((d.rooms_booked / totalRooms) * 1000) / 10,
    }));

    // Average occupancy
    const totalOccupiedDays = dailyOccupancy.reduce((sum, d) => sum + d.rooms_booked, 0);
    const daysInMonth = dailyOccupancy.length || 1;
    const avgOccupancy = Math.round((totalOccupiedDays / (daysInMonth * totalRooms)) * 1000) / 10;

    return apiResponse({
      month,
      total_revenue: totals.total_revenue,
      total_advance: totals.total_advance,
      total_balance: totals.total_balance,
      total_bookings: totals.total_bookings,
      full_house_days: fullHouseDays.length,
      full_house_dates: fullHouseDays.map((d) => d.date),
      avg_occupancy_pct: avgOccupancy,
      revenue_by_source: revenueBySource,
      daily_occupancy: dailyData,
      total_rooms: totalRooms,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return apiError("Internal server error", 500);
  }
}
