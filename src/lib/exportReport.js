/**
 * Client-side Excel report generator for Rajmandir Kunj.
 * Requires xlsx-js-style (MIT-compatible fork of SheetJS with style support).
 */
import XLSX from "xlsx-js-style";
import { format, parseISO } from "date-fns";

// ── Color palette (hex, no #) ────────────────────────────────────────────────
const C = {
  DARK:         "1E293B",
  DARK_TEXT:    "F1F5F9",
  SECTION:      "1E293B",
  SECTION_TEXT: "F8FAFC",
  COL_HDR:      "334155",
  COL_HDR_TEXT: "FFFFFF",
  WHITE:        "FFFFFF",
  LIGHT:        "F1F5F9",
  BORDER:       "CBD5E1",
  TEXT:         "0F172A",
  SUBTEXT:      "334155",
  // Top-5 highlight
  GOLD_BG:      "FFFBEB",
  GOLD_TEXT:    "92400E",
  // Cancelled highlight
  CANCEL_BG:    "FEF2F2",
  CANCEL_TEXT:  "991B1B",
  // Source row tints
  SRC_MMT:      "FEE2E2",
  SRC_AIRBNB:   "FFE4E6",
  SRC_OFFLINE:  "EDE9FE",
  SRC_AGENT:    "FEF3C7",
  // Total row
  TOTAL_BG:     "1E293B",
  TOTAL_TEXT:   "F1F5F9",
};

const SOURCE_LABELS = { mmt: "MakeMyTrip", airbnb: "Airbnb", offline: "Offline / Walk-in", agent: "Agent" };
const SOURCE_BG     = { mmt: C.SRC_MMT, airbnb: C.SRC_AIRBNB, offline: C.SRC_OFFLINE, agent: C.SRC_AGENT };
const STATUS_LABELS = { confirmed: "Confirmed", checked_in: "Checked In", checked_out: "Checked Out", cancelled: "Cancelled" };

// ── Cell factory ─────────────────────────────────────────────────────────────
function mkCell(value, opts = {}) {
  const {
    bold    = false,
    italic  = false,
    sz      = 10,
    color   = C.TEXT,
    bgColor = null,
    align   = "left",
    numFmt  = null,
    border  = false,
    wrap    = false,
  } = opts;

  const s = {
    font:      { bold, italic, sz, color: { rgb: color } },
    alignment: { horizontal: align, vertical: "center", wrapText: wrap },
  };
  if (bgColor) s.fill = { patternType: "solid", fgColor: { rgb: bgColor } };
  if (numFmt)  s.numFmt = numFmt;
  if (border)  s.border = {
    top:    { style: "thin", color: { rgb: C.BORDER } },
    bottom: { style: "thin", color: { rgb: C.BORDER } },
    left:   { style: "thin", color: { rgb: C.BORDER } },
    right:  { style: "thin", color: { rgb: C.BORDER } },
  };
  return { v: value, t: typeof value === "number" ? "n" : "s", s };
}

function setCell(ws, col, row, cell) {
  ws[XLSX.utils.encode_cell({ c: col, r: row })] = cell;
}

function merge(ws, r1, c1, r2, c2, templateCell = null) {
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });

  if (templateCell) {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cellRef = XLSX.utils.encode_cell({ c, r });
        if (!ws[cellRef]) {
          ws[cellRef] = { v: "", t: "s", s: templateCell.s };
        }
      }
    }
  }
}

function fmtDate(iso) {
  try { return format(parseISO(iso + "T00:00:00"), "dd MMM yyyy"); }
  catch { return iso; }
}

// ── Sheet 1: Income Summary ──────────────────────────────────────────────────
function buildIncomeSummarySheet(income, period, reportName) {
  const ws  = {};
  const NUM_COLS = 6; // A–G (indices 0–6)
  let   row = 0;

  // ── Title ─────────────────────────────────────────────────────────────
  const title1 = mkCell(reportName, { bold: true, sz: 14, color: C.DARK_TEXT, bgColor: C.DARK });
  setCell(ws, 0, row, title1);
  merge(ws, row, 0, row, NUM_COLS, title1); row++;

  const title2 = mkCell(`Period: ${fmtDate(period.from)}  →  ${fmtDate(period.to)}`, { italic: true, sz: 10, color: C.TEXT });
  setCell(ws, 0, row, title2);
  merge(ws, row, 0, row, NUM_COLS, title2); row++;

  const title3 = mkCell(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, { italic: true, sz: 9, color: C.SUBTEXT });
  setCell(ws, 0, row, title3);
  merge(ws, row, 0, row, NUM_COLS, title3); row++;

  row++; // blank

  // ── Section: Revenue Summary ───────────────────────────────────────────
  const sec1 = mkCell("REVENUE SUMMARY", { bold: true, sz: 11, color: C.SECTION_TEXT, bgColor: C.SECTION });
  setCell(ws, 0, row, sec1);
  merge(ws, row, 0, row, NUM_COLS, sec1); row++;

  const collectionRate = income.total_revenue > 0
    ? income.total_advance / income.total_revenue : 0;

  const summaryRows = [
    ["Total Revenue (excl. cancelled)",        income.total_revenue,      "\"₹\"#,##0"],
    ["Advance Received",                        income.total_advance,      "\"₹\"#,##0"],
    ["Balance Pending",                         income.total_balance,      "\"₹\"#,##0"],
    ["Total Bookings (excl. cancelled)",        income.total_bookings,     "0"],
    ["Full House Days",                         income.full_house_days,    "0"],
    ["Average Occupancy",                       income.avg_occupancy_pct / 100, "0.0%"],
    ["Collection Rate (Advance / Total)",       collectionRate,            "0.0%"],
  ];

  for (const [label, value, fmt] of summaryRows) {
    const lblCell = mkCell(label,  { sz: 10, bold: true, color: C.TEXT, bgColor: C.LIGHT, border: true });
    setCell(ws, 0, row, lblCell);
    merge(ws, row, 0, row, 4, lblCell);
    
    const valCell = mkCell(value,  { sz: 10, bold: true, color: C.TEXT, align: "center", numFmt: fmt, bgColor: C.WHITE, border: true });
    setCell(ws, 5, row, valCell);
    merge(ws, row, 5, row, NUM_COLS, valCell);
    row++;
  }

  row++; // blank

  // ── Section: Revenue by Source ─────────────────────────────────────────
  const sec2 = mkCell("REVENUE BY SOURCE", { bold: true, sz: 11, color: C.SECTION_TEXT, bgColor: C.SECTION });
  setCell(ws, 0, row, sec2);
  merge(ws, row, 0, row, NUM_COLS, sec2); row++;

  // Column headers
  const srcCols = ["Source", "Bookings", "Revenue", "% of Total", "Visual Share", "Advance", "Balance"];
  const srcAligns = ["left", "center", "center", "center", "left", "center", "center"];
  srcCols.forEach((h, c) =>
    setCell(ws, c, row, mkCell(h, { bold: true, sz: 10, color: C.COL_HDR_TEXT, bgColor: C.COL_HDR, align: srcAligns[c], border: true }))
  );
  row++;

  const totalRev = income.total_revenue || 1;
  const srcMap   = Object.fromEntries(income.revenue_by_source.map(s => [s.source, s]));

  for (const src of ["mmt", "airbnb", "offline", "agent"]) {
    const s   = srcMap[src];
    if (!s) continue;
    const bg  = SOURCE_BG[src];
    const pct = s.revenue / totalRev;
    const barLength = Math.round(pct * 25);
    const barStr = "█".repeat(barLength) || (pct > 0 ? "▏" : "");

    setCell(ws, 0, row, mkCell(SOURCE_LABELS[src], { sz: 10, bgColor: bg, border: true }));
    setCell(ws, 1, row, mkCell(s.booking_count,    { sz: 10, bgColor: bg, align: "center", border: true }));
    setCell(ws, 2, row, mkCell(s.revenue,          { sz: 10, bgColor: bg, align: "center", numFmt: "\"₹\"#,##0", border: true }));
    setCell(ws, 3, row, mkCell(pct,                { sz: 10, bgColor: bg, align: "center", numFmt: "0.0%",        border: true }));
    setCell(ws, 4, row, mkCell(barStr,             { sz: 10, bgColor: bg, align: "left",   color: C.COL_HDR, border: true }));
    setCell(ws, 5, row, mkCell(s.advance,          { sz: 10, bgColor: bg, align: "center", numFmt: "\"₹\"#,##0", border: true }));
    setCell(ws, 6, row, mkCell(s.balance,          { sz: 10, bgColor: bg, align: "center", numFmt: "\"₹\"#,##0", border: true }));
    row++;
  }

  // Totals row
  setCell(ws, 0, row, mkCell("TOTAL",                { bold: true, sz: 10, color: C.TOTAL_TEXT,  bgColor: C.TOTAL_BG, border: true }));
  setCell(ws, 1, row, mkCell(income.total_bookings,  { bold: true, sz: 10, color: C.TOTAL_TEXT,  bgColor: C.TOTAL_BG, align: "center", border: true }));
  setCell(ws, 2, row, mkCell(income.total_revenue,   { bold: true, sz: 10, color: C.TOTAL_TEXT,  bgColor: C.TOTAL_BG, align: "center", numFmt: "\"₹\"#,##0", border: true }));
  setCell(ws, 3, row, mkCell(1,                      { bold: true, sz: 10, color: C.TOTAL_TEXT,  bgColor: C.TOTAL_BG, align: "center", numFmt: "0.0%",        border: true }));
  setCell(ws, 4, row, mkCell("",                     { bold: true, sz: 10, color: C.TOTAL_TEXT,  bgColor: C.TOTAL_BG, align: "left",   border: true }));
  setCell(ws, 5, row, mkCell(income.total_advance,   { bold: true, sz: 10, color: C.TOTAL_TEXT,  bgColor: C.TOTAL_BG, align: "center", numFmt: "\"₹\"#,##0", border: true }));
  setCell(ws, 6, row, mkCell(income.total_balance,   { bold: true, sz: 10, color: C.TOTAL_TEXT,  bgColor: C.TOTAL_BG, align: "center", numFmt: "\"₹\"#,##0", border: true }));
  row++;

  ws["!ref"]  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: NUM_COLS } });
  ws["!cols"] = [{ wpx: 220 }, { wpx: 80 }, { wpx: 110 }, { wpx: 80 }, { wpx: 180 }, { wpx: 110 }, { wpx: 110 }];
  ws["!rows"] = [{ hpx: 36 }, {}, {}, {}, { hpx: 24 }];

  return ws;
}

// ── Sheet 2: Bookings Detail ─────────────────────────────────────────────────
function buildBookingsSheet(bookings, period, reportName) {
  const ws      = {};
  const NUM_COLS = 14; // 0–14
  let   row     = 0;

  // ── Title ─────────────────────────────────────────────────────────────
  const title1 = mkCell(reportName, { bold: true, sz: 14, color: C.DARK_TEXT, bgColor: C.DARK });
  setCell(ws, 0, row, title1);
  merge(ws, row, 0, row, NUM_COLS, title1); row++;

  const title2 = mkCell(`Period: ${fmtDate(period.from)}  →  ${fmtDate(period.to)}`, { italic: true, sz: 10, color: C.TEXT });
  setCell(ws, 0, row, title2);
  merge(ws, row, 0, row, NUM_COLS, title2); row++;

  const title3 = mkCell(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, { italic: true, sz: 9, color: C.SUBTEXT });
  setCell(ws, 0, row, title3);
  merge(ws, row, 0, row, NUM_COLS, title3); row++;

  // Notice about highlights
  const noticeRow = mkCell("★  Top 5 bookings by amount are highlighted in gold", { italic: true, sz: 9, color: C.GOLD_TEXT, bgColor: C.GOLD_BG });
  setCell(ws, 0, row, noticeRow);
  merge(ws, row, 0, row, NUM_COLS, noticeRow); row++;

  row++; // blank

  // ── Column headers ────────────────────────────────────────────────────
  const headers = ["#", "Guest Name", "Phone", "Check-in", "Check-out", "Nights", "Rooms", "Source", "Status", "Room Total (₹)", "Extras (₹)", "Extra Items", "Total (₹)", "Advance (₹)", "Balance (₹)"];
  const hAligns = ["center", "left", "left", "center", "center", "center", "center", "left", "left", "right", "right", "left", "right", "right", "right"];
  headers.forEach((h, c) =>
    setCell(ws, c, row, mkCell(h, { bold: true, sz: 10, color: C.COL_HDR_TEXT, bgColor: C.COL_HDR, align: hAligns[c], border: true }))
  );
  row++;

  // ── Find top-5 IDs ────────────────────────────────────────────────────
  const top5Ids = new Set(
    [...bookings]
      .filter(b => b.status !== "cancelled")
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5)
      .map(b => b.id)
  );

  // ── Data rows ─────────────────────────────────────────────────────────
  bookings.forEach((b, idx) => {
    const isTop5      = top5Ids.has(b.id);
    const isCancelled = b.status === "cancelled";
    const isAlt       = !isTop5 && !isCancelled && idx % 2 === 0;
    
    let bg = C.WHITE;
    let textColor = C.TEXT;
    
    if (isCancelled) {
      bg = C.CANCEL_BG;
      textColor = C.CANCEL_TEXT;
    } else if (isTop5) {
      bg = C.GOLD_BG;
      textColor = C.GOLD_TEXT;
    } else if (isAlt) {
      bg = C.LIGHT;
    }

    const rc = (val, align = "left", numFmt = null) =>
      mkCell(val, { sz: 10, color: textColor, bgColor: bg, align, numFmt, border: true, bold: isTop5 && typeof val === "number" });

    const extrasObj = typeof b.extra_charges === "string" ? JSON.parse(b.extra_charges || "[]") : (b.extra_charges || []);
    const extraTotal = extrasObj.reduce((s, c) => s + c.amount, 0);
    const extraDesc = extrasObj.map(c => `${c.item} (${c.amount})`).join(", ");
    const roomTotal = b.total_amount - extraTotal;

    setCell(ws, 0,  row, rc(idx + 1, "center"));
    setCell(ws, 1,  row, rc(isTop5 ? `★ ${b.guest_name}` : b.guest_name, "left"));
    setCell(ws, 2,  row, rc(b.guest_phone || "—"));
    setCell(ws, 3,  row, rc(fmtDate(b.check_in_date), "center"));
    setCell(ws, 4,  row, rc(fmtDate(b.check_out_date), "center"));
    setCell(ws, 5,  row, rc(b.num_nights, "center"));
    setCell(ws, 6,  row, rc(b.room_numbers || "—", "center"));
    setCell(ws, 7,  row, rc(SOURCE_LABELS[b.source] || b.source));
    setCell(ws, 8,  row, rc(STATUS_LABELS[b.status]  || b.status));
    setCell(ws, 9,  row, rc(roomTotal,       "right", "\"₹\"#,##0"));
    setCell(ws, 10, row, rc(extraTotal,      "right", "\"₹\"#,##0"));
    setCell(ws, 11, row, rc(extraDesc || "—", "left"));
    setCell(ws, 12, row, rc(b.total_amount,  "right", "\"₹\"#,##0"));
    setCell(ws, 13, row, rc(b.advance_paid,  "right", "\"₹\"#,##0"));
    setCell(ws, 14, row, rc(b.balance_due,   "right", "\"₹\"#,##0"));
    row++;
  });

  // ── Totals row ────────────────────────────────────────────────────────
  const active = bookings.filter(b => b.status !== "cancelled");
  const sumRoomTotal = active.reduce((s, b) => {
    const arr = typeof b.extra_charges === "string" ? JSON.parse(b.extra_charges || "[]") : (b.extra_charges || []);
    return s + (b.total_amount - arr.reduce((sum, c) => sum + c.amount, 0));
  }, 0);
  const sumExt = active.reduce((s, b) => {
    const arr = typeof b.extra_charges === "string" ? JSON.parse(b.extra_charges || "[]") : (b.extra_charges || []);
    return s + arr.reduce((sum, c) => sum + c.amount, 0);
  }, 0);
  const sumAmt = active.reduce((s, b) => s + b.total_amount, 0);
  const sumAdv = active.reduce((s, b) => s + b.advance_paid, 0);
  const sumBal = active.reduce((s, b) => s + b.balance_due,  0);

  const tc = (v, align = "left", numFmt = null) =>
    mkCell(v, { bold: true, sz: 10, color: C.TOTAL_TEXT, bgColor: C.TOTAL_BG, align, numFmt, border: true });

  const tcCell = mkCell(`TOTAL  (${active.length} bookings)`, { bold: true, sz: 10, color: C.TOTAL_TEXT, bgColor: C.TOTAL_BG, align: "left", border: true });
  setCell(ws, 0,  row, tcCell);
  merge(ws, row, 0, row, 8, tcCell);
  setCell(ws, 9,  row, tc(sumRoomTotal, "right", "\"₹\"#,##0"));
  setCell(ws, 10, row, tc(sumExt,       "right", "\"₹\"#,##0"));
  setCell(ws, 11, row, tc("",           "left"));
  setCell(ws, 12, row, tc(sumAmt,       "right", "\"₹\"#,##0"));
  setCell(ws, 13, row, tc(sumAdv,       "right", "\"₹\"#,##0"));
  setCell(ws, 14, row, tc(sumBal,       "right", "\"₹\"#,##0"));
  row++;

  ws["!ref"]  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row, c: NUM_COLS } });
  ws["!cols"] = [
    { wpx: 35  }, // #
    { wpx: 160 }, // Guest Name
    { wpx: 105 }, // Phone
    { wpx: 95  }, // Check-in
    { wpx: 95  }, // Check-out
    { wpx: 55  }, // Nights
    { wpx: 70  }, // Rooms
    { wpx: 105 }, // Source
    { wpx: 90  }, // Status
    { wpx: 105 }, // Room Total
    { wpx: 85  }, // Extras
    { wpx: 180 }, // Extra Items
    { wpx: 105 }, // Total Amount
    { wpx: 105 }, // Advance
    { wpx: 105 }, // Balance
  ];
  ws["!rows"] = [{ hpx: 36 }];

  return ws;
}

// ── Public entry point ───────────────────────────────────────────────────────
export async function generateExcelReport({ reportName, from, to, tabs, data }) {
  const wb = XLSX.utils.book_new();

  if (tabs.incomeSummary) {
    const ws = buildIncomeSummarySheet(data.income, data.period, reportName);
    XLSX.utils.book_append_sheet(wb, ws, "Income Summary");
  }

  if (tabs.bookings) {
    const ws = buildBookingsSheet(data.bookings, data.period, reportName);
    XLSX.utils.book_append_sheet(wb, ws, "Bookings Detail");
  }

  const safeName = (reportName || "Report").replace(/[<>:"/\\|?*]/g, "").trim();
  XLSX.writeFile(wb, `${safeName}.xlsx`);
}
