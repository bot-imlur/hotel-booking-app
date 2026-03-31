import { getDB } from "@/lib/db";
import { updateRoomSchema } from "@/lib/schema";
import { apiResponse, apiError } from "@/lib/utils";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = getDB();

    const room = await db
      .prepare("SELECT * FROM rooms WHERE id = ?")
      .bind(Number(id))
      .first();

    if (!room) {
      return apiError("Room not found", 404);
    }

    // Get upcoming bookings for this room
    const { results: bookings } = await db
      .prepare(`
        SELECT b.*, br.num_guests, br.extra_mattresses, br.rate_per_night, br.room_total
        FROM booking_rooms br
        JOIN bookings b ON b.id = br.booking_id
        WHERE br.room_id = ?
          AND b.status != 'cancelled'
          AND b.check_out_date >= date('now')
        ORDER BY b.check_in_date
      `)
      .bind(Number(id))
      .all();

    return apiResponse({ ...room, bookings });
  } catch (err) {
    console.error("Room detail error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateRoomSchema.safeParse(body);
    if (!result.success) {
      return apiError("Invalid input", 400, result.error.flatten().fieldErrors);
    }

    const db = getDB();
    const room = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(Number(id)).first();
    if (!room) {
      return apiError("Room not found", 404);
    }

    const updates = result.data;
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return apiError("No fields to update", 400);
    }

    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => updates[f]);

    await db
      .prepare(`UPDATE rooms SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
      .bind(...values, Number(id))
      .run();

    const updated = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(Number(id)).first();
    return apiResponse(updated);
  } catch (err) {
    console.error("Room update error:", err);
    return apiError("Internal server error", 500);
  }
}
