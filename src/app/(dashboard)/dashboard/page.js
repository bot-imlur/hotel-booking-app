"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import styles from "./page.module.css";
import { formatCurrency, SOURCE_CONFIG, BOOKING_SOURCES } from "@/lib/utils";
import ExportModal from "@/components/ExportModal/ExportModal";

export default function DashboardPage() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [month]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${month}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
    setLoading(false);
  }

  function changeMonth(delta) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(format(d, "yyyy-MM"));
  }

  const monthLabel = (() => {
    const [y, m] = month.split("-").map(Number);
    return format(new Date(y, m - 1, 1), "MMMM yyyy");
  })();

  if (loading && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Dashboard</h2>
        </div>
        <div className={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`card ${styles.statCard}`}>
              <div className="skeleton" style={{ height: 16, width: "50%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 32, width: "70%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with month nav */}
      <div className={styles.header}>
        <h2>Dashboard</h2>
        <div className={styles.headerRight}>
          <div className={styles.monthNav}>
            <button onClick={() => changeMonth(-1)} className="btn btn-ghost btn-sm">
              ←
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="btn btn-ghost btn-sm">
              →
            </button>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: "var(--accent-primary)", color: "white", display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setShowExport(true)}
            id="btn-export-report"
          >
            📥 Export
          </button>
        </div>
      </div>

      {showExport && (
        <ExportModal
          currentMonth={month}
          onClose={() => setShowExport(false)}
        />
      )}

      {data && (
        <>
          {/* Stat Cards */}
          <div className={styles.grid}>
            <div className={`card ${styles.statCard}`}>
              <p className={styles.statLabel}>Monthly Revenue</p>
              <p className={styles.statValue}>{formatCurrency(data.total_revenue)}</p>
              <p className={styles.statSub}>
                Advance: {formatCurrency(data.total_advance)} · Due: {formatCurrency(data.total_balance)}
              </p>
            </div>

            <div className={`card ${styles.statCard}`}>
              <p className={styles.statLabel}>Total Bookings</p>
              <p className={styles.statValue}>{data.total_bookings}</p>
              <div className={styles.sourceBreakdown}>
                {Object.entries(data.revenue_by_source || {}).map(([src, info]) => (
                  <span key={src} className={`badge badge-${src}`}>
                    {SOURCE_CONFIG[src]?.label}: {info.bookings}
                  </span>
                ))}
              </div>
            </div>

            <div className={`card ${styles.statCard}`}>
              <p className={styles.statLabel}>Full House Days</p>
              <p className={styles.statValue}>{data.full_house_days}</p>
              <p className={styles.statSub}>
                {data.full_house_days > 0
                  ? `All ${data.total_rooms} rooms booked`
                  : "No full house days yet"}
              </p>
            </div>

            <div className={`card ${styles.statCard}`}>
              <p className={styles.statLabel}>Avg Occupancy</p>
              <p className={styles.statValue}>{data.avg_occupancy_pct}%</p>
              <div className={styles.occupancyBar}>
                <div
                  className={styles.occupancyFill}
                  style={{ width: `${Math.min(data.avg_occupancy_pct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Source Revenue Breakdown */}
          <div className={styles.sectionGrid}>
            <div className={`card ${styles.section}`}>
              <h3 className={styles.sectionTitle}>Revenue by Source</h3>
              <div className={styles.sourceList}>
                {BOOKING_SOURCES.map((src) => {
                  const info = data.revenue_by_source?.[src] || { revenue: 0, bookings: 0 };
                  const pct = data.total_revenue > 0 ? (info.revenue / data.total_revenue) * 100 : 0;
                  return (
                    <div key={src} className={styles.sourceRow}>
                      <div className={styles.sourceInfo}>
                        <span
                          className={styles.sourceDot}
                          style={{ background: SOURCE_CONFIG[src]?.color }}
                        />
                        <span className={styles.sourceName}>{SOURCE_CONFIG[src]?.label}</span>
                        <span className={styles.sourceBookings}>{info.bookings} bookings</span>
                      </div>
                      <div className={styles.sourceRight}>
                        <span className={styles.sourceAmount}>{formatCurrency(info.revenue)}</span>
                        <div className={styles.sourceBar}>
                          <div
                            className={styles.sourceBarFill}
                            style={{
                              width: `${pct}%`,
                              background: SOURCE_CONFIG[src]?.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`card ${styles.section}`}>
              <h3 className={styles.sectionTitle}>Payment Summary</h3>
              <div className={styles.paymentGrid}>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Total Billed</span>
                  <span className={styles.paymentValue}>{formatCurrency(data.total_revenue)}</span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Advance Received</span>
                  <span className={styles.paymentValue} style={{ color: "var(--accent-success)" }}>
                    {formatCurrency(data.total_advance)}
                  </span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Balance Pending</span>
                  <span className={styles.paymentValue} style={{ color: "var(--accent-warning)" }}>
                    {formatCurrency(data.total_balance)}
                  </span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Collection Rate</span>
                  <span className={styles.paymentValue}>
                    {data.total_revenue > 0
                      ? Math.round((data.total_advance / data.total_revenue) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Occupancy */}
          {data.daily_occupancy?.length > 0 && (
            <div className={`card ${styles.section}`}>
              <h3 className={styles.sectionTitle}>Daily Occupancy</h3>
              <div className={styles.occupancyGrid}>
                {data.daily_occupancy.map((day) => {
                  const pct = day.occupancy_pct;
                  let colorClass = "occupancy-low";
                  if (pct >= 100) colorClass = "occupancy-full";
                  else if (pct >= 90) colorClass = "occupancy-high";
                  else if (pct >= 50) colorClass = "occupancy-medium";
                  return (
                    <div key={day.date} className={styles.occupancyDay}>
                      <span className={styles.occupancyDate}>
                        {format(new Date(day.date + "T00:00:00"), "d")}
                      </span>
                      <span className={`occupancy-badge ${colorClass}`}>
                        {day.rooms_booked}/{data.total_rooms}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
