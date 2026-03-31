import { z } from "zod";
import { BOOKING_SOURCES, BOOKING_STATUSES, ROOM_TYPES } from "./utils";

/**
 * Login request validation
 */
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Room in a booking request
 */
const bookingRoomSchema = z.object({
  room_id: z.number().int().positive(),
  num_guests: z.number().int().min(1).max(5),
  extra_mattresses: z.number().int().min(0).max(2),
  rate_per_night: z.number().min(0),
});

/**
 * Create booking request validation
 */
export const createBookingSchema = z.object({
  guest_name: z.string().min(1, "Guest name is required").max(200),
  guest_phone: z.string().max(20).optional().default(""),
  guest_email: z.string().email().optional().or(z.literal("")).default(""),
  guest_id_type: z.enum(["aadhaar", "passport", "dl", "other", ""]).optional().default(""),
  guest_id_number: z.string().max(50).optional().default(""),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  source: z.enum(BOOKING_SOURCES),
  advance_paid: z.number().min(0).default(0),
  notes: z.string().max(1000).optional().default(""),
  extra_charges: z.array(z.object({ item: z.string(), amount: z.number().min(0) })).optional().default([]),
  rooms: z.array(bookingRoomSchema).min(1, "At least one room is required"),
}).refine(
  (data) => data.check_out_date > data.check_in_date,
  { message: "Check-out date must be after check-in date", path: ["check_out_date"] }
);

/**
 * Update booking request validation
 */
export const updateBookingSchema = z.object({
  guest_name: z.string().min(1).max(200).optional(),
  guest_phone: z.string().max(20).optional(),
  guest_email: z.string().email().optional().or(z.literal("")),
  guest_id_type: z.enum(["aadhaar", "passport", "dl", "other", ""]).optional(),
  guest_id_number: z.string().max(50).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  advance_paid: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  extra_charges: z.array(z.object({ item: z.string(), amount: z.number().min(0) })).optional(),
});

/**
 * Update room request validation
 */
export const updateRoomSchema = z.object({
  room_type: z.enum(ROOM_TYPES).optional(),
  base_capacity: z.number().int().min(1).max(6).optional(),
  max_extra_mattresses: z.number().int().min(0).max(4).optional(),
  default_rate: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
});

/**
 * Payment update validation
 */
export const updatePaymentSchema = z.object({
  advance_paid: z.number().min(0, "Advance paid must be non-negative"),
});
