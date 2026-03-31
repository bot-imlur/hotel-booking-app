import { getDB } from "@/lib/db";
import { verifyPassword, createToken, AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth";
import { loginSchema } from "@/lib/schema";
import { apiError } from "@/lib/utils";

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return apiError("Invalid input", 400, result.error.flatten().fieldErrors);
    }

    const { username, password } = result.data;
    const db = getDB();

    // Find user
    const user = await db
      .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
      .bind(username)
      .first();

    if (!user) {
      return apiError("Invalid username or password", 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return apiError("Invalid username or password", 401);
    }

    // Create JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return apiError("Server auth not configured", 500);
    }
    const token = await createToken(user, secret);

    // Set cookie and return
    const response = Response.json({
      success: true,
      user: { id: user.id, username: user.username },
    });

    // Set auth cookie
    const cookieOptions = getAuthCookieOptions();
    const cookieStr = `${AUTH_COOKIE_NAME}=${token}; Path=${cookieOptions.path}; Max-Age=${cookieOptions.maxAge}; HttpOnly; SameSite=${cookieOptions.sameSite}${cookieOptions.secure ? "; Secure" : ""}`;

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieStr,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return apiError("Internal server error", 500);
  }
}
