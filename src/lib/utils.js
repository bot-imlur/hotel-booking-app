import { addDays, differenceInDays, format, parseISO } from "date-fns";

/**
 * Expand a date range into individual dates.
 * Check-out date is NOT included (standard hotel convention).
 * "2026-04-01" to "2026-04-04" → ["2026-04-01", "2026-04-02", "2026-04-03"]
 */
export function expandDateRange(checkInDate, checkOutDate) {
  const start = parseISO(checkInDate);
  const end = parseISO(checkOutDate);
  const days = differenceInDays(end, start);

  if (days <= 0) return [];

  const dates = [];
  for (let i = 0; i < days; i++) {
    dates.push(format(addDays(start, i), "yyyy-MM-dd"));
  }
  return dates;
}

/**
 * Calculate number of nights between two dates.
 */
export function calculateNights(checkInDate, checkOutDate) {
  return differenceInDays(parseISO(checkOutDate), parseISO(checkInDate));
}

/**
 * Format amount in INR.
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get the first and last day of a month in YYYY-MM-DD format.
 * Input: "2026-04" → { start: "2026-04-01", end: "2026-05-01" }
 */
export function getMonthRange(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  const start = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
  const end = format(new Date(year, month, 1), "yyyy-MM-dd"); // first of next month
  return { start, end };
}

/**
 * Get today's date in YYYY-MM-DD format (IST).
 */
export function getTodayIST() {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return format(istDate, "yyyy-MM-dd");
}

/**
 * Get current month in YYYY-MM format (IST).
 */
export function getCurrentMonthIST() {
  const today = getTodayIST();
  return today.substring(0, 7);
}

/**
 * Create a standardized API response.
 */
export function apiResponse(data, status = 200) {
  return Response.json(data, { status });
}

/**
 * Create a standardized error response.
 */
export function apiError(message, status = 400, details = null) {
  const body = { error: message };
  if (details) body.details = details;
  return Response.json(body, { status });
}

/**
 * Universal Enum Constants
 */
export const BOOKING_SOURCES = ["mmt", "airbnb", "offline", "agent"];
export const BOOKING_STATUSES = ["confirmed", "checked_in", "checked_out", "cancelled"];
export const ROOM_TYPES = ["triple", "double"];

/**
 * Source display names and colors.
 */
export const SOURCE_CONFIG = {
  mmt: { label: "MakeMyTrip", color: "#e23744" },
  airbnb: { label: "Airbnb", color: "#ff5a5f" },
  offline: { label: "Offline", color: "#6366f1" },
  agent: { label: "Agent", color: "#f59e0b" },
};

/**
 * Status display names and colors.
 */
export const STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "#6366f1" },
  checked_in: { label: "Checked In", color: "#22c55e" },
  checked_out: { label: "Checked Out", color: "#8888a0" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
};
