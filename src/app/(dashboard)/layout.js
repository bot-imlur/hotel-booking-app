"use client";

import { useRouter, usePathname } from "next/navigation";
import styles from "./layout.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/rooms", label: "Rooms", icon: "🏠" },
  { href: "/bookings", label: "Bookings", icon: "📋" },
  { href: "/bookings/new", label: "New Booking", icon: "➕" },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={styles.layout}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoIcon}>RK</div>
          <div>
            <h1 className={styles.brandName}>Rajmandir Kunj</h1>
            <p className={styles.brandSub}>Hotel Manager</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`${styles.navItem} ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? styles.navItemActive
                  : ""
              }`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>{children}</main>

      {/* Mobile Bottom Nav */}
      <nav className={styles.mobileNav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`${styles.mobileNavItem} ${
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? styles.mobileNavItemActive
                : ""
            }`}
          >
            <span className={styles.mobileNavIcon}>{item.icon}</span>
            <span className={styles.mobileNavLabel}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
