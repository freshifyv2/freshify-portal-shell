/**
 * Sovereign Portal shell chrome — Portal v3 (Slice 5.18c — mockup-aligned)
 *
 * Rewritten to emit class names from the canonical mockup CSS
 * (portal-renders/pages/_shell.css → app/globals.css).
 *
 * Root container is .app, with .sidebar + .main inside.
 * Sidebar uses .brand, .tenant-switcher, .section-label, plain <nav><a> children,
 * and .foot. Topbar uses .crumbs / .right / .icon-btn.
 *
 * Public release styling = black/white/grey only. No ThemeToggle, no dark mode.
 * Drawer + logout modal are deferred to a later slice — the public release will
 * use the standard /api/logout form posted directly from the topbar pulldown.
 *
 * The ChromeProps interface and TenantOption/ActiveSection exports are kept
 * stable so existing dashboard pages compile unchanged.
 */

import type { ReactNode } from "react";

export type ActiveSection =
  | "dashboard"
  | "companies"
  | "workspaces"
  | "users"
  | "account"
  | "portal-settings"
  | "audit"
  | "invites"
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
  /** Renders a section label above this nav item */
  groupStart?: string;
  /** True = guide-only module (Projects/Tasks/Reports) */
  guideOnly?: boolean;
  /** Glyph emitted inside the <span class="icon"> */
  icon: string;
}

/* ------------------------------------------------------------------ */
/* Nav definition — glyphs match the mockup HTML samples.             */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "⌂", groupStart: "Modules" },
  { key: "companies", label: "Customers", href: "/dashboard/companies", icon: "◉" },
  { key: "workspaces", label: "Workspaces", href: "/dashboard/workspaces", icon: "◧" },
  { key: "users", label: "Users", href: "/dashboard/users/list", icon: "◐", operatorOnly: true },
  { key: "portal-settings", label: "Portal Settings", href: "/dashboard/portal-settings", icon: "⚙", operatorOnly: true, groupStart: "System" },
  { key: "audit", label: "Audit feed", href: "/dashboard/audit", icon: "≡", operatorOnly: true },
  { key: "invites", label: "Invites", href: "/dashboard/invites", icon: "✉", operatorOnly: true },
  // Service modules — guide-only
  { key: "projects", label: "Projects", href: "/dashboard/projects", icon: "▤", guideOnly: true, groupStart: "Service" },
  { key: "tasks", label: "Tasks", href: "/dashboard/tasks", icon: "▣", guideOnly: true },
  { key: "reports", label: "Reports", href: "/dashboard/reports", icon: "▦", guideOnly: true },
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
  const aggregateLabel = "All Companies";
  const summaryLabel = activeCompany?.name ?? (isOperator ? aggregateLabel : "Sovereign Portal");
  const hintLabel = isOperator ? (activeCompany?.companyId ? "Impersonating" : "Operator scope") : "Tenant";

  if (!isOperator) {
    // Non-operator: visible but inert chip
    return (
      <div className="tenant-switcher" aria-disabled="true" title="Locked to your company">
        <div className="label">
          <span className="hint">{hintLabel}</span>
          <span>{summaryLabel}</span>
        </div>
        <span className="chev">▾</span>
      </div>
    );
  }

  // Operator: pure-CSS <details> dropdown
  return (
    <details className="tenant-switcher-details">
      <summary className="tenant-switcher">
        <div className="label">
          <span className="hint">{hintLabel}</span>
          <span>{summaryLabel}</span>
        </div>
        <span className="chev">▾</span>
      </summary>
      <div className="overlay" role="menu" style={{ marginTop: 6 }}>
        <div className="section-label">Operator scope</div>
        <form action="/api/admin/active-tenant" method="post" style={{ margin: 0 }}>
          <button
            type="submit"
            name="companyId"
            value=""
            className={`row ${!activeCompany?.companyId ? "active" : ""}`}
            style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span className="dot" aria-hidden />
            <div className="body">
              <div className="title">All Companies</div>
            </div>
            <span className="right">Aggregate</span>
          </button>
        </form>

        <div className="sep-line" />
        <div className="section-label">Impersonate</div>
        {tenantOptions.length === 0 ? (
          <div className="row" style={{ color: "var(--fg-subtle)" }}>No tenants available</div>
        ) : (
          tenantOptions.map((t) => (
            <form key={t.companyId} action="/api/admin/active-tenant" method="post" style={{ margin: 0 }}>
              <button
                type="submit"
                name="companyId"
                value={t.companyId}
                className={`row ${activeCompany?.companyId === t.companyId ? "active" : ""}`}
                style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              >
                <span className="dot" aria-hidden />
                <div className="body">
                  <div className="title">{t.name}</div>
                </div>
              </button>
            </form>
          ))
        )}
      </div>
    </details>
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
  const isImpersonating = isOperator && Boolean(activeCompany?.companyId);
  const visibleNav = NAV_ITEMS.filter((it) => !it.operatorOnly || isOperator);
  const displayName = user.displayName ?? "Signed in";
  const roleLabel = isImpersonating
    ? `Operator · ${activeCompany?.name ?? ""}`
    : isOperator
    ? "Operator"
    : activeCompany?.name ?? "";

  // Group nav items by groupStart so we can interleave <div class="section-label">
  // + <nav> blocks the way the mockup does.
  const groups: { label: string; items: NavItem[] }[] = [];
  for (const it of visibleNav) {
    if (it.groupStart || groups.length === 0) {
      groups.push({ label: it.groupStart ?? "Modules", items: [it] });
    } else {
      groups[groups.length - 1]!.items.push(it);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">S</div>
          <div>Sovereign Portal</div>
        </div>

        <TenantSwitcher
          isOperator={isOperator}
          activeCompany={activeCompany}
          tenantOptions={tenantOptions}
        />

        {groups.map((grp, gi) => (
          <span key={`${grp.label}-${gi}`} style={{ display: "contents" }}>
            <div className="section-label">{grp.label}</div>
            <nav aria-label={grp.label}>
              {grp.items.map((it) => (
                <a
                  key={it.key}
                  href={it.href}
                  className={(active === it.key || (active === "account" && it.key === "users")) ? "active" : ""}
                >
                  <span className="icon" aria-hidden>{it.icon}</span>
                  {it.label}
                  {it.guideOnly && <span className="badge">Guide</span>}
                </a>
              ))}
            </nav>
          </span>
        ))}

        <div className="foot">
          <div className="avatar">{initials(displayName)}</div>
          <div className="who">
            <span className="name">{displayName}</span>
            {roleLabel && <span className="role">{roleLabel}</span>}
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="crumbs">
            {activeCompany?.name && (
              <>
                <span>{activeCompany.name}</span>
                <span className="sep">/</span>
              </>
            )}
            <span className="current">{pageTitle}</span>
            {isImpersonating && (
              <span
                className="tag"
                style={{ marginLeft: 8 }}
                title="Operator impersonating"
              >
                OPERATOR MODE
              </span>
            )}
          </div>
          <div className="right">
            <button type="button" className="icon-btn has-dot" title="Notifications" aria-label="Notifications">◔</button>
            <details className="topbar-user-menu">
              <summary
                className="icon-btn"
                aria-label="Account menu"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, paddingLeft: 8, paddingRight: 8, width: "auto" }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#0f0f0f",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {initials(user.displayName)}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{user.displayName ?? "Signed in"}</span>
              </summary>
              <div className="overlay" role="menu" style={{ position: "absolute", right: 24, top: 56, minWidth: 200 }}>
                <a
                  href="/dashboard/users/account"
                  className="row"
                  role="menuitem"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="body">
                    <div className="title">Account</div>
                  </div>
                </a>
                <div className="sep-line" />
                <form action="/api/logout" method="post" style={{ margin: 0 }}>
                  <button
                    type="submit"
                    className="row"
                    role="menuitem"
                    style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", padding: "8px 10px", cursor: "pointer", color: "var(--danger)" }}
                  >
                    <div className="body">
                      <div className="title">Log out</div>
                    </div>
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}
