"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import styles from "./ExportModal.module.css";
import { generateExcelReport } from "@/lib/exportReport";

/**
 * ExportModal
 *
 * Props:
 *   currentMonth – "YYYY-MM" string from the dashboard (used to seed defaults)
 *   onClose      – callback to dismiss the modal
 */
export default function ExportModal({ currentMonth, onClose }) {
  // ── Derive default dates from currentMonth ────────────────────────────
  const [y, m] = currentMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();           // last day of month
  const defaultFrom = `${currentMonth}-01`;
  const defaultTo   = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;

  // ── State ─────────────────────────────────────────────────────────────
  const [reportName, setReportName]   = useState("");
  const [isCustomName, setIsCustomName] = useState(false);
  const [from,       setFrom]         = useState(defaultFrom);
  const [to,         setTo]           = useState(defaultTo);
  const [tabs,       setTabs]       = useState({ incomeSummary: true, bookings: true });
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // ── Dynamic Report Name ───────────────────────────────────────────────
  useEffect(() => {
    if (!isCustomName) {
      try {
        if (!from || !to) return;
        const fStr = format(parseISO(from), "ddMMMyy");
        const tStr = format(parseISO(to), "ddMMMyy");
        setReportName(`Rajmandir Kunj Report ${fStr}-${tStr}`);
      } catch (err) {
        // ignore invalid dates
      }
    }
  }, [from, to, isCustomName]);

  // ── Escape key handler ────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const anyTabSelected = tabs.incomeSummary || tabs.bookings;

  function toggleTab(tab) {
    setTabs((prev) => ({ ...prev, [tab]: !prev[tab] }));
  }

  function handleFromChange(nextFrom) {
    setFrom(nextFrom);
    if (!nextFrom) return;

    let fromDate;
    try {
      fromDate = parseISO(nextFrom);
      if (Number.isNaN(fromDate.getTime())) return;
    } catch {
      return;
    }

    if (!to) {
      setTo(nextFrom);
      return;
    }

    let toDate;
    try {
      toDate = parseISO(to);
      if (Number.isNaN(toDate.getTime())) {
        setTo(nextFrom);
        return;
      }
    } catch {
      setTo(nextFrom);
      return;
    }

    const fromYear = fromDate.getFullYear();
    const fromMonth = fromDate.getMonth();
    const isSameMonth =
      toDate.getFullYear() === fromYear && toDate.getMonth() === fromMonth;
    if (isSameMonth) return;

    const toDay = toDate.getDate();
    const lastDayOfFromMonth = new Date(fromYear, fromMonth + 1, 0).getDate();
    const safeDay = Math.min(toDay, lastDayOfFromMonth);
    const adjustedToDate = new Date(fromYear, fromMonth, safeDay);
    const adjustedTo = format(adjustedToDate, "yyyy-MM-dd");

    setTo(adjustedTo < nextFrom ? nextFrom : adjustedTo);
  }

  // ── Generate ─────────────────────────────────────────────────────────
  async function handleGenerate() {
    setError(null);

    if (!anyTabSelected) {
      setError("Please select at least one tab to include in the report.");
      return;
    }
    if (!from || !to || from > to) {
      setError("Please choose a valid date range (From must be on or before To).");
      return;
    }
    if (!reportName.trim()) {
      setError("Please enter a report name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/export?from=${from}&to=${to}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to fetch report data.");
      }
      const data = await res.json();

      await generateExcelReport({
        reportName: reportName.trim(),
        from,
        to,
        tabs,
        data,
      });

      onClose();
    } catch (err) {
      console.error("Export error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Generate Report">

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>📊</span>
            <span className={styles.headerTitle}>Generate Report</span>
          </div>
          <button
            className={`btn btn-ghost btn-sm ${styles.closeBtn}`}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Report Name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="export-report-name">Report Name</label>
            <input
              id="export-report-name"
              type="text"
              className={`form-input ${styles.textInput}`}
              value={reportName}
              onChange={(e) => {
                setReportName(e.target.value);
                setIsCustomName(true);
              }}
              placeholder="Enter report name…"
              disabled={loading}
            />
          </div>

          {/* Date Range */}
          <div className={styles.field}>
            <label className={styles.label}>Date Range</label>
            <div className={styles.dateRow}>
              <div className={styles.dateField}>
                <span className={styles.dateLabel}>From</span>
                <input
                  id="export-from"
                  type="date"
                  className={`form-input ${styles.dateInput}`}
                  value={from}
                  onChange={(e) => handleFromChange(e.target.value)}
                  disabled={loading}
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <span className={styles.dateSep}>→</span>
              <div className={styles.dateField}>
                <span className={styles.dateLabel}>To</span>
                <input
                  id="export-to"
                  type="date"
                  className={`form-input ${styles.dateInput}`}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={loading}
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>
          </div>

          {/* Tab selection */}
          <div className={styles.field}>
            <label className={styles.label}>Include in Report</label>
            <div className={styles.tabList}>

              <label
                className={`${styles.tabOption} ${tabs.incomeSummary ? styles.tabChecked : styles.tabUnchecked}`}
                htmlFor="tab-income"
              >
                <input
                  id="tab-income"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={tabs.incomeSummary}
                  onChange={() => toggleTab("incomeSummary")}
                  disabled={loading}
                />
                <div className={styles.tabInfo}>
                  <span className={styles.tabIcon}>💰</span>
                  <div className={styles.tabText}>
                    <span className={styles.tabName}>Income Summary</span>
                    <span className={styles.tabDesc}>Revenue totals, source breakdown & payment analysis</span>
                  </div>
                </div>
              </label>

              <label
                className={`${styles.tabOption} ${tabs.bookings ? styles.tabChecked : styles.tabUnchecked}`}
                htmlFor="tab-bookings"
              >
                <input
                  id="tab-bookings"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={tabs.bookings}
                  onChange={() => toggleTab("bookings")}
                  disabled={loading}
                />
                <div className={styles.tabInfo}>
                  <span className={styles.tabIcon}>🏨</span>
                  <div className={styles.tabText}>
                    <span className={styles.tabName}>Bookings Detail</span>
                    <span className={styles.tabDesc}>All bookings sorted by date & name, top 5 highlighted</span>
                  </div>
                </div>
              </label>

            </div>
          </div>

          {/* Error */}
          {error && <div className={styles.error}>{error}</div>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`btn btn-sm ${styles.generateBtn}`}
            onClick={handleGenerate}
            disabled={loading || !anyTabSelected}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Generating…
              </>
            ) : (
              <>📥 Generate Report</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
