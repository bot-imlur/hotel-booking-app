import { getDB } from "@/lib/db";
import { apiResponse, apiError } from "@/lib/utils";

export async function GET() {
  try {
    const db = getDB();
    const { results } = await db
      .prepare("SELECT * FROM rooms ORDER BY room_number")
      .all();

    return apiResponse(results);
  } catch (err) {
    console.error("Rooms list error:", err);
    return apiError("Internal server error", 500);
  }
}
