import { getDB } from "@/lib/db";
import { updateBookingSchema } from "@/lib/schema";
import { apiResponse, apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = getDB();

    const booking = await db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .bind(Number(id))
      .first();

    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const { results: rooms } = await db
      .prepare(
        `SELECT br.*, r.room_number, r.room_type, r.base_capacity
         FROM booking_rooms br
         JOIN rooms r ON r.id = br.room_id
         WHERE br.booking_id = ?`
      )
      .bind(Number(id))
      .all();

    return apiResponse({ ...booking, extra_charges: JSON.parse(booking.extra_charges || "[]"), rooms });
  } catch (err) {
    console.error("Booking detail error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateBookingSchema.safeParse(body);
    if (!result.success) {
      return apiError("Invalid input", 400, result.error.flatten().fieldErrors);
    }

    const db = getDB();
    const booking = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(Number(id)).first();
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const updates = result.data;

    // Recalculate extra_charges & totals if extra_charges are provided
    if (updates.extra_charges !== undefined) {
      const oldExtra = JSON.parse(booking.extra_charges || '[]');
      const oldExtraTotal = oldExtra.reduce((s, c) => s + c.amount, 0);
      const newExtraTotal = updates.extra_charges.reduce((s, c) => s + c.amount, 0);
      const difference = newExtraTotal - oldExtraTotal;

      updates.total_amount = booking.total_amount + difference;
      // We set booking.total_amount to updates.total_amount so balance calc below works right
      booking.total_amount = updates.total_amount; 
      updates.extra_charges = JSON.stringify(updates.extra_charges);
    }

    // Handle cancellation — free the room-day entries
    if (updates.status === "cancelled" && booking.status !== "cancelled") {
      await db.batch([
        db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").bind(Number(id)),
        db.prepare("DELETE FROM room_day_bookings WHERE booking_id = ?").bind(Number(id)),
      ]);
      const updated = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(Number(id)).first();
      return apiResponse({ ...updated, extra_charges: JSON.parse(updated.extra_charges || "[]") });
    }

    // Handle payment update
    if (updates.advance_paid !== undefined) {
      updates.balance_due = booking.total_amount - updates.advance_paid;
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return apiError("No fields to update", 400);
    }

    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => updates[f]);

    await db
      .prepare(`UPDATE bookings SET ${setClause}, updated_at = datetime('now') WHERE id = ?`)
      .bind(...values, Number(id))
      .run();

    const updated = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(Number(id)).first();
    const { results: rooms } = await db
      .prepare(
        `SELECT br.*, r.room_number, r.room_type, r.base_capacity
         FROM booking_rooms br JOIN rooms r ON r.id = br.room_id
         WHERE br.booking_id = ?`
      )
      .bind(Number(id))
      .all();

    return apiResponse({ ...updated, extra_charges: JSON.parse(updated.extra_charges || "[]"), rooms });
  } catch (err) {
    console.error("Booking update error:", err);
    return apiError("Internal server error", 500);
  }
}
