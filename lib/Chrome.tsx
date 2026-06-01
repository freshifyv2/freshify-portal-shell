/**
 * Sovereign Portal shell chrome — Portal v3
 *
 * - Dark sidebar (collapses to off-canvas drawer < 900px)
 * - Tenant switcher: operator → all companies + "All Companies"; non-operator → disabled chip showing own company
 * - Generic SVG icons next to each module name
 * - Module groups: Foundation (Dashboard / Companies / Workspaces / Users) and Service (Projects / Tasks / Reports — guide-only)
 * - Account entry in sidebar; topbar avatar links here too
 * - Generic footer with Privacy / Terms / Support / Status / About / © year
 *
 * No client JS dependency for the drawer — uses a sibling-selector CSS pattern keyed off a hidden checkbox.
 */

import type { ReactNode } from "react";

export type ActiveSection =
  | "dashboard"
  | "companies"
  | "workspaces"
  | "users"
  | "account"
  | "projects"
  | "tasks"
  | "reports"
  | null;

export interface TenantOption {
  companyId: string;
  name: string;
}

export interface ChromeProps {
  active: ActiveSection;
  pageTitle: string;
  user: {
    userId: string;
    displayName?: string;
    handle?: string;
    isOperator?: boolean;
  };
  /** Active tenant scoped view. For non-operators this is fixed to their own company. */
  activeCompany?: { companyId?: string; name: string } | null;
  /** Operator-only: list of all customer companies they can switch into. Non-operators receive [] and the switcher renders disabled. */
  tenantOptions?: TenantOption[];
  children: ReactNode;
}

interface NavItem {
  key: ActiveSection;
  label: string;
  href: string;
  /** If true, only renders when user.isOperator */
  operatorOnly?: boolean;
  /** Renders a divider above this nav item */
  groupStart?: string;
  /** True = guide-only module (Projects/Tasks/Reports) */
  guideOnly?: boolean;
  icon: ReactNode;
}

/* ------------------------------------------------------------------ */
/* Inline SVG icons (no external deps).                               */
/* All icons are 18×18, stroke=currentColor, 1.6px, rounded.          */
/* ------------------------------------------------------------------ */
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconDashboard = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
const IconCompanies = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <path d="M3 21V8a1 1 0 0 1 1-1h7v14" />
    <path d="M11 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" />
    <path d="M6 11h2M6 14h2M6 17h2M15 7h2M15 10h2M15 13h2M15 16h2" />
  </svg>
);
const IconWorkspaces = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M3 9h18M8 18v3M16 18v3M6 21h12" />
  </svg>
);
const IconUsers = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="10" r="2.4" />
    <path d="M14.5 20c0-2.5 1.6-4.6 3.5-5.3 1.9.7 3.5 2.8 3.5 5.3" />
  </svg>
);
const IconAccount = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);
const IconProjects = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M8 13h8M8 16h5" />
  </svg>
);
const IconTasks = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 9l2 2 4-4M8 15l2 2 4-4" />
  </svg>
);
const IconReports = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <path d="M14 3v5h5M8 13l2.5 2.5L13 13l3 3" />
  </svg>
);
const IconLogout = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17l-5-5 5-5M5 12h12" />
  </svg>
);
const IconChevron = (
  <svg viewBox="0 0 24 24" width="14" height="14" {...stroke}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const IconBell = (
  <svg viewBox="0 0 24 24" width="18" height="18" {...stroke}>
    <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 6 2 7H4c.5-1 2-3 2-7z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);
const IconMenu = (
  <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: IconDashboard },
  { key: "companies", label: "Companies", href: "/dashboard/companies", icon: IconCompanies },
  { key: "workspaces", label: "Workspaces", href: "/dashboard/workspaces", icon: IconWorkspaces },
  { key: "users", label: "Users", href: "/dashboard/users/list", icon: IconUsers, operatorOnly: true },
  { key: "account", label: "Account", href: "/dashboard/users/account", icon: IconAccount },
  // Service modules — guide-only, separated by divider
  { key: "projects", label: "Projects", href: "/dashboard/projects", icon: IconProjects, guideOnly: true, groupStart: "Service Modules" },
  { key: "tasks", label: "Tasks", href: "/dashboard/tasks", icon: IconTasks, guideOnly: true },
  { key: "reports", label: "Reports", href: "/dashboard/reports", icon: IconReports, guideOnly: true },
];

function initials(name?: string, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function TenantSwitcher({
  isOperator,
  activeCompany,
  tenantOptions,
}: {
  isOperator: boolean;
  activeCompany?: { companyId?: string; name: string } | null;
  tenantOptions: TenantOption[];
}) {
  const label = activeCompany?.name ?? (isOperator ? "All Companies" : "Sovereign Portal");

  if (!isOperator) {
    // Non-operator: visible but disabled chip
    return (
      <div className="sidebar-switcher is-disabled" aria-disabled="true" title="Locked to your company">
        <span className="sidebar-switcher-label">{label}</span>
        <span className="sidebar-switcher-chevron" aria-hidden>
          {IconChevron}
        </span>
      </div>
    );
  }

  // Operator: details/summary for a no-JS pure-CSS dropdown
  return (
    <details className="sidebar-switcher-details">
      <summary className="sidebar-switcher">
        <span className="sidebar-switcher-label">{label}</span>
        <span className="sidebar-switcher-chevron" aria-hidden>
          {IconChevron}
        </span>
      </summary>
      <div className="sidebar-switcher-menu" role="menu">
        <form action="/api/admin/active-tenant" method="post" className="sidebar-switcher-form">
          <button
            type="submit"
            name="companyId"
            value=""
            className={`sidebar-switcher-item ${!activeCompany?.companyId ? "is-active" : ""}`}
          >
            All Companies
          </button>
        </form>
        <div className="sidebar-switcher-sep" />
        {tenantOptions.map((t) => (
          <form key={t.companyId} action="/api/admin/active-tenant" method="post" className="sidebar-switcher-form">
            <button
              type="submit"
              name="companyId"
              value={t.companyId}
              className={`sidebar-switcher-item ${activeCompany?.companyId === t.companyId ? "is-active" : ""}`}
            >
              {t.name}
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/support">Support</a>
          <a href="/status">Status</a>
          <a href="/about">About</a>
        </div>
        <div className="footer-copy">© {year} Sovereign Portal</div>
      </div>
    </footer>
  );
}

export function Chrome({
  active,
  pageTitle,
  user,
  activeCompany,
  tenantOptions = [],
  children,
}: ChromeProps) {
  const isOperator = Boolean(user.isOperator);
  const visibleNav = NAV_ITEMS.filter((it) => !it.operatorOnly || isOperator);

  return (
    <div className="shell">
      {/* Hidden checkbox drives mobile drawer open/close — no client JS needed */}
      <input type="checkbox" id="drawer-toggle" className="drawer-toggle" aria-hidden />
      <label htmlFor="drawer-toggle" className="drawer-backdrop" aria-hidden />

      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark" aria-hidden>
            <span className="sidebar-logo-mark-inner">SP</span>
          </span>
        </div>

        <TenantSwitcher
          isOperator={isOperator}
          activeCompany={activeCompany}
          tenantOptions={tenantOptions}
        />

        <nav className="sidebar-nav" aria-label="Primary">
          {visibleNav.map((it) => (
            <span key={it.key} style={{ display: "contents" }}>
              {it.groupStart && (
                <div className="sidebar-nav-group">
                  <span>{it.groupStart}</span>
                </div>
              )}
              <a
                href={it.href}
                className={`sidebar-nav-item ${active === it.key ? "is-active" : ""}`}
              >
                <span className="sidebar-nav-icon" aria-hidden>{it.icon}</span>
                <span className="sidebar-nav-label">{it.label}</span>
                {it.guideOnly && <span className="sidebar-nav-tag">Guide</span>}
              </a>
            </span>
          ))}
        </nav>

        <div className="sidebar-footer">
          <form action="/api/logout" method="post" className="sidebar-logout-form">
            <button type="submit" className="sidebar-logout">
              <span className="sidebar-nav-icon" aria-hidden>{IconLogout}</span>
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <label htmlFor="drawer-toggle" className="topbar-menu" aria-label="Open menu">
            {IconMenu}
          </label>
          <h1 className="topbar-title">{pageTitle}</h1>
          <div className="topbar-actions">
            <button type="button" className="topbar-bell" aria-label="Notifications">
              {IconBell}
              <span className="topbar-bell-dot" aria-hidden />
            </button>
            <a
              href="/dashboard/users/account"
              className={`topbar-user ${active === "account" ? "is-active" : ""}`}
              aria-label="Account"
            >
              <span className="topbar-avatar" aria-hidden>{initials(user.displayName)}</span>
              <span className="topbar-user-name">{user.displayName ?? "Signed in"}</span>
            </a>
          </div>
        </header>

        <div className="content">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
