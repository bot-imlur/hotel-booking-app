import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return apiError("Not authenticated", 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return apiError("Server auth not configured", 500);
    }
    const payload = await verifyToken(token, secret);

    if (!payload) {
      return apiError("Invalid or expired token", 401);
    }

    return Response.json({
      user: {
        id: payload.userId,
        username: payload.username,
      },
    });
  } catch (err) {
    console.error("Auth check error:", err);
    return apiError("Internal server error", 500);
  }
}
