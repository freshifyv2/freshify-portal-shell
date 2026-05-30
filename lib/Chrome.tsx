/**
 * Sovereign Portal shell chrome — RAS-style sidebar + topbar.
 *
 * Layout matches RAS Figma reference exactly:
 * - LEFT: Dark navy sidebar with brand wordmark + dropdown, nav items, log out at bottom
 * - TOP: White topbar with page title + bell icon + circular avatar + name
 * - MAIN: Light grey content surface (#f4f4f5)
 *
 * Color rule: RAS red → Freshify violet (#6c47ff). Everything else preserved.
 *
 * The "Users" nav item is operator-only — only rendered when user.isOperator is true.
 */

import type { ReactNode } from "react";

export type ActiveSection =
  | "dashboard"
  | "companies"
  | "workspaces"
  | "users"
  | "account"
  | null;

export interface ChromeProps {
  active: ActiveSection;
  pageTitle: string;
  /** User claims read from the JWT in the server component above */
  user: {
    userId: string;
    displayName?: string;
    handle?: string;
    /** Operator role grants access to cross-tenant Users module */
    isOperator?: boolean;
  };
  /** Active company context if known (read from claims or BE call) */
  activeCompany?: { name: string } | null;
  children: ReactNode;
}

interface NavItem {
  key: ActiveSection;
  label: string;
  href: string;
  glyph: string;
  /** If true, only renders when user.isOperator */
  operatorOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", glyph: "◧" },
  { key: "companies", label: "Companies", href: "/dashboard/companies", glyph: "◇" },
  { key: "workspaces", label: "Workspaces", href: "/dashboard/workspaces", glyph: "◉" },
  { key: "users", label: "Users", href: "/dashboard/users-list", glyph: "◐", operatorOnly: true },
];

function initials(name?: string, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Chrome({ active, pageTitle, user, activeCompany, children }: ChromeProps) {
  const visibleNav = NAV_ITEMS.filter((it) => !it.operatorOnly || user.isOperator);

  // Brand label in sidebar: active company name if present, else "Sovereign Portal"
  const brandLabel = activeCompany?.name ?? "Sovereign Portal";

  return (
    <div className="shell">
      <aside className="sidebar">
        {/* Brand wordmark + accent circle (RAS R.A.S. logo position) */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark" aria-hidden>
            <span className="sidebar-logo-mark-inner">SP</span>
          </span>
        </div>

        {/* Company switcher — dropdown affordance below logo */}
        <div className="sidebar-switcher" role="button" tabIndex={0}>
          <span className="sidebar-switcher-label">{brandLabel}</span>
          <span className="sidebar-switcher-chevron" aria-hidden>⌄</span>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {visibleNav.map((it) => (
            <a
              key={it.key}
              href={it.href}
              className={`sidebar-nav-item ${active === it.key ? "is-active" : ""}`}
            >
              <span className="sidebar-nav-icon" aria-hidden>{it.glyph}</span>
              <span className="sidebar-nav-label">{it.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <form action="/api/logout" method="post" className="sidebar-logout-form">
            <button type="submit" className="sidebar-logout">
              <span className="sidebar-nav-icon" aria-hidden>↪</span>
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1 className="topbar-title">{pageTitle}</h1>
          <div className="topbar-actions">
            <button type="button" className="topbar-bell" aria-label="Notifications">
              <span aria-hidden>🔔</span>
              <span className="topbar-bell-dot" aria-hidden />
            </button>
            <a
              href="/dashboard/users/account"
              className={`topbar-user ${active === "account" ? "is-active" : ""}`}
              aria-label="Account"
            >
              <span className="topbar-avatar" aria-hidden>
                {initials(user.displayName)}
              </span>
              <span className="topbar-user-name">{user.displayName ?? "Signed in"}</span>
            </a>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
