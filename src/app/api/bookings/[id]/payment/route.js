import { getDB } from "@/lib/db";
import { updatePaymentSchema } from "@/lib/schema";
import { apiResponse, apiError } from "@/lib/utils";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updatePaymentSchema.safeParse(body);
    if (!result.success) {
      return apiError("Invalid input", 400, result.error.flatten().fieldErrors);
    }

    const db = getDB();
    const booking = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(Number(id)).first();
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const { advance_paid } = result.data;
    const balance_due = booking.total_amount - advance_paid;

    await db
      .prepare(
        "UPDATE bookings SET advance_paid = ?, balance_due = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(advance_paid, balance_due, Number(id))
      .run();

    const updated = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(Number(id)).first();
    return apiResponse(updated);
  } catch (err) {
    console.error("Payment update error:", err);
    return apiError("Internal server error", 500);
  }
}
