// Seed test bookings via the API
// Run: node scripts/seed-bookings.mjs

const BASE_URL = "http://localhost:3000";
const SEED_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME;
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

// First login to get the auth cookie
async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: SEED_ADMIN_USERNAME, password: SEED_ADMIN_PASSWORD }),
  });
  const cookie = res.headers.get("set-cookie");
  if (!res.ok) throw new Error("Login failed");
  return cookie;
}

async function createBooking(cookie, booking) {
  const res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(booking),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ❌ Failed: ${data.error}`, data.details || "");
    return null;
  }
  console.log(`  ✅ Booking #${data.id}: ${booking.guest_name} (${booking.check_in_date} → ${booking.check_out_date})`);
  return data;
}

async function main() {
  if (!SEED_ADMIN_USERNAME || !SEED_ADMIN_PASSWORD) {
    throw new Error(
      "Missing required env vars: SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD"
    );
  }

  console.log("🔑 Logging in...");
  const cookie = await login();
  console.log("✅ Logged in\n");

  const bookings = [
    // ── March bookings (past/current) ──
    {
      guest_name: "Guest 01",
      guest_phone: "9000000001",
      guest_email: "guest01@example.test",
      guest_id_type: "aadhaar",
      guest_id_number: "0000-0000-0001",
      check_in_date: "2026-03-25",
      check_out_date: "2026-03-28",
      source: "mmt",
      advance_paid: 4800,
      notes: "Early check-in requested",
      rooms: [
        { room_id: 1, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
      ],
    },
    {
      guest_name: "Guest 02",
      guest_phone: "9000000002",
      check_in_date: "2026-03-26",
      check_out_date: "2026-03-30",
      source: "airbnb",
      advance_paid: 6000,
      notes: "Leisure stay",
      rooms: [
        { room_id: 3, num_guests: 3, extra_mattresses: 0, rate_per_night: 2000 },
      ],
    },
    {
      guest_name: "Guest 03",
      guest_phone: "9000000003",
      check_in_date: "2026-03-28",
      check_out_date: "2026-04-01",
      source: "offline",
      advance_paid: 10000,
      notes: "Family gathering",
      rooms: [
        { room_id: 2, num_guests: 2, extra_mattresses: 1, rate_per_night: 1600 },
        { room_id: 4, num_guests: 3, extra_mattresses: 0, rate_per_night: 2000 },
        { room_id: 5, num_guests: 2, extra_mattresses: 0, rate_per_night: 2000 },
      ],
    },
    {
      guest_name: "Guest 04",
      guest_phone: "9000000004",
      check_in_date: "2026-03-29",
      check_out_date: "2026-04-02",
      source: "mmt",
      advance_paid: 3200,
      notes: "",
      rooms: [
        { room_id: 6, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 7, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
      ],
    },
    {
      guest_name: "Guest 05",
      guest_phone: "9000000005",
      check_in_date: "2026-03-30",
      check_out_date: "2026-04-03",
      source: "airbnb",
      advance_paid: 5000,
      notes: "Dietary preference noted",
      rooms: [
        { room_id: 8, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 9, num_guests: 2, extra_mattresses: 1, rate_per_night: 1600 },
      ],
    },

    // ── March 30 is now heavily booked — Room 1, 3 free only ──

    // ── April bookings ──
    {
      guest_name: "Guest 06",
      guest_phone: "9000000006",
      check_in_date: "2026-04-01",
      check_out_date: "2026-04-03",
      source: "offline",
      advance_paid: 3200,
      notes: "Returning guest",
      rooms: [
        { room_id: 1, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
      ],
    },
    {
      guest_name: "Guest 07",
      guest_phone: "9000000007",
      check_in_date: "2026-04-05",
      check_out_date: "2026-04-10",
      source: "mmt",
      advance_paid: 20000,
      notes: "Group booking",
      rooms: [
        { room_id: 1, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 2, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 3, num_guests: 3, extra_mattresses: 0, rate_per_night: 2000 },
        { room_id: 4, num_guests: 3, extra_mattresses: 0, rate_per_night: 2000 },
        { room_id: 5, num_guests: 3, extra_mattresses: 0, rate_per_night: 2000 },
        { room_id: 6, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 7, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 8, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 9, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
      ],
    },
    {
      guest_name: "Guest 08",
      guest_phone: "9000000008",
      check_in_date: "2026-04-12",
      check_out_date: "2026-04-14",
      source: "airbnb",
      advance_paid: 4000,
      notes: "Business trip",
      rooms: [
        { room_id: 3, num_guests: 2, extra_mattresses: 0, rate_per_night: 2000 },
        { room_id: 4, num_guests: 2, extra_mattresses: 0, rate_per_night: 2000 },
      ],
    },
    {
      guest_name: "Guest 09",
      guest_phone: "9000000009",
      check_in_date: "2026-04-15",
      check_out_date: "2026-04-18",
      source: "offline",
      advance_paid: 2000,
      notes: "",
      rooms: [
        { room_id: 1, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 5, num_guests: 3, extra_mattresses: 1, rate_per_night: 2000 },
      ],
    },
    {
      guest_name: "Guest 10",
      guest_phone: "9000000010",
      check_in_date: "2026-04-20",
      check_out_date: "2026-04-25",
      source: "mmt",
      advance_paid: 8000,
      notes: "Extended stay",
      rooms: [
        { room_id: 2, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
        { room_id: 6, num_guests: 2, extra_mattresses: 1, rate_per_night: 1600 },
        { room_id: 9, num_guests: 2, extra_mattresses: 0, rate_per_night: 1600 },
      ],
    },
  ];

  console.log(`📦 Creating ${bookings.length} test bookings...\n`);

  for (const booking of bookings) {
    await createBooking(cookie, booking);
  }

  console.log("\n🎉 Done! Refresh the calendar to see the bookings.");
}

main().catch(console.error);
