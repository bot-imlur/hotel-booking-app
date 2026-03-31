import { getDB } from "@/lib/db";
import { createBookingSchema } from "@/lib/schema";
import { apiResponse, apiError, expandDateRange, calculateNights } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = "SELECT * FROM bookings WHERE 1=1";
    const binds = [];

    if (status) {
      query += " AND status = ?";
      binds.push(status);
    }
    if (source) {
      query += " AND source = ?";
      binds.push(source);
    }
    if (from) {
      query += " AND check_in_date >= ?";
      binds.push(from);
    }
    if (to) {
      query += " AND check_in_date < ?";
      binds.push(to);
    }

    query += " ORDER BY check_in_date DESC, guest_name ASC LIMIT 500";

    const stmt = db.prepare(query);
    const { results } = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all();

    if (results.length === 0) return apiResponse([]);

    // Fetch rooms for all these bookings
    const bookingIds = results.map(b => b.id);
    const placeholders = bookingIds.map(() => "?").join(",");
    const { results: allRooms } = await db
      .prepare(`SELECT br.*, r.room_number, r.room_type
                FROM booking_rooms br
                JOIN rooms r ON r.id = br.room_id
                WHERE br.booking_id IN (${placeholders})`)
      .bind(...bookingIds)
      .all();

    const roomsByBooking = {};
    for (const r of allRooms) {
      if (!roomsByBooking[r.booking_id]) roomsByBooking[r.booking_id] = [];
      roomsByBooking[r.booking_id].push(r);
    }

    const enhancedResults = results.map(b => ({
      ...b,
      extra_charges: JSON.parse(b.extra_charges || "[]"),
      rooms: roomsByBooking[b.id] || []
    }));

    return apiResponse(enhancedResults);
  } catch (err) {
    console.error("Bookings list error:", err);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate input
    const result = createBookingSchema.safeParse(body);
    if (!result.success) {
      return apiError("Invalid input", 400, result.error.flatten().fieldErrors);
    }

    const data = result.data;
    const db = getDB();

    // Calculate nights
    const numNights = calculateNights(data.check_in_date, data.check_out_date);
    if (numNights <= 0) {
      return apiError("Check-out must be after check-in", 400);
    }

    // Expand date range
    const dates = expandDateRange(data.check_in_date, data.check_out_date);

    // Validate each room
    const roomIds = data.rooms.map((r) => r.room_id);
    const placeholders = roomIds.map(() => "?").join(",");
    const { results: rooms } = await db
      .prepare(`SELECT * FROM rooms WHERE id IN (${placeholders}) AND is_active = 1`)
      .bind(...roomIds)
      .all();

    if (rooms.length !== roomIds.length) {
      return apiError("One or more rooms not found or inactive", 400);
    }

    // Validate capacity constraints
    const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));
    for (const br of data.rooms) {
      const room = roomMap[br.room_id];
      if (!room) {
        return apiError(`Room ${br.room_id} not found`, 400);
      }
      if (br.extra_mattresses > room.max_extra_mattresses) {
        return apiError(
          `Room ${room.room_number}: max ${room.max_extra_mattresses} extra mattresses allowed`,
          400
        );
      }
      if (br.num_guests > room.base_capacity + br.extra_mattresses) {
        return apiError(
          `Room ${room.room_number}: max ${room.base_capacity + br.extra_mattresses} guests with ${br.extra_mattresses} extra mattress(es)`,
          400
        );
      }
    }

    // Pre-check conflicts (Layer 1 — application level)
    const datePlaceholders = dates.map(() => "?").join(",");
    const { results: conflicts } = await db
      .prepare(
        `SELECT rdb.room_id, rdb.date, r.room_number
         FROM room_day_bookings rdb
         JOIN rooms r ON r.id = rdb.room_id
         JOIN bookings b ON b.id = rdb.booking_id
         WHERE rdb.room_id IN (${placeholders})
           AND rdb.date IN (${datePlaceholders})
           AND b.status != 'cancelled'`
      )
      .bind(...roomIds, ...dates)
      .all();

    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(
        (c) => `Room ${c.room_number} on ${c.date}`
      );
      return apiError("Rooms already booked", 409, {
        conflicts: conflictDetails,
      });
    }

    // Build batch of statements for atomic transaction
    const statements = [];

    // Calculate totals
    const extraChargesList = data.extra_charges || [];
    const extraTotal = extraChargesList.reduce((sum, c) => sum + c.amount, 0);
    const extraChargesJson = JSON.stringify(extraChargesList);

    let totalAmount = extraTotal;
    const roomTotals = data.rooms.map((br) => {
      const mattressRate = br.mattress_rate_per_night ?? 500;
      const roomTotal =
        (br.rate_per_night + br.extra_mattresses * mattressRate) * numNights;
      totalAmount += roomTotal;
      return roomTotal;
    });
    const balanceDue = totalAmount - data.advance_paid;

    // 1. Insert booking
    statements.push(
      db
        .prepare(
          `INSERT INTO bookings (guest_name, guest_phone, guest_email, guest_id_type, guest_id_number,
           check_in_date, check_out_date, num_nights, source, extra_charges, total_amount, advance_paid, balance_due, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          data.guest_name,
          data.guest_phone,
          data.guest_email,
          data.guest_id_type,
          data.guest_id_number,
          data.check_in_date,
          data.check_out_date,
          numNights,
          data.source,
          extraChargesJson,
          totalAmount,
          data.advance_paid,
          balanceDue,
          data.notes
        )
    );

    // Execute booking insert first to get the ID
    // D1 batch executes all at once, but we need booking_id for subsequent inserts
    // So we use a two-phase approach
    const bookingResult = await statements[0].run();
    const bookingId = bookingResult.meta.last_row_id;

    // 2. Insert booking_rooms and get IDs
    const bookingRoomStatements = [];
    for (let i = 0; i < data.rooms.length; i++) {
      const br = data.rooms[i];
      bookingRoomStatements.push(
        db
          .prepare(
            `INSERT INTO booking_rooms (booking_id, room_id, num_guests, extra_mattresses, rate_per_night, room_total)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(bookingId, br.room_id, br.num_guests, br.extra_mattresses, br.rate_per_night, roomTotals[i])
      );
    }

    const brResults = await db.batch(bookingRoomStatements);

    // 3. Insert room_day_bookings (the conflict prevention rows)
    const dayStatements = [];
    for (let i = 0; i < data.rooms.length; i++) {
      const br = data.rooms[i];
      const bookingRoomId = brResults[i].meta.last_row_id;
      for (const date of dates) {
        dayStatements.push(
          db
            .prepare(
              `INSERT INTO room_day_bookings (room_id, date, booking_id, booking_room_id)
               VALUES (?, ?, ?, ?)`
            )
            .bind(br.room_id, date, bookingId, bookingRoomId)
        );
      }
    }

    if (dayStatements.length > 0) {
      await db.batch(dayStatements);
    }

    // Fetch the complete booking
    const booking = await db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .bind(bookingId)
      .first();

    const { results: bookingRooms } = await db
      .prepare(
        `SELECT br.*, r.room_number, r.room_type, r.base_capacity
         FROM booking_rooms br
         JOIN rooms r ON r.id = br.room_id
         WHERE br.booking_id = ?`
      )
      .bind(bookingId)
      .all();

    return apiResponse({ ...booking, extra_charges: JSON.parse(booking.extra_charges || "[]"), rooms: bookingRooms }, 201);
  } catch (err) {
    console.error("Create booking error:", err);
    // Check if it's a UNIQUE constraint violation (Layer 2 — DB level)
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      return apiError(
        "Double booking detected. One or more rooms are already booked for the selected dates.",
        409
      );
    }
    return apiError("Internal server error", 500);
  }
}
