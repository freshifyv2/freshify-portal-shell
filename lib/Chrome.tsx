/**
 * Sovereign Portal shell chrome — sidebar + topbar.
 *
 * Every FE (users / companies / workspaces) and the portal-shell itself
 * renders the same Chrome on authenticated pages. This is a server
 * component — it reads the JWT claims from the cookie and renders the
 * user's display name + active nav state.
 *
 * Each FE ships its own copy via the shared library convention. When
 * we lift this into @freshifyv2/portal-ui, this file disappears from
 * every FE.
 */

import type { ReactNode } from "react";

export type ActiveSection = "dashboard" | "companies" | "workspaces" | "account" | null;

export interface ChromeProps {
  active: ActiveSection;
  pageTitle: string;
  /** User claims read from the JWT in the server component above */
  user: {
    userId: string;
    displayName?: string;
    handle?: string;
  };
  /** Active company context if known (read from claims or BE call) */
  activeCompany?: { name: string } | null;
  children: ReactNode;
}

const NAV_ITEMS: Array<{
  key: ActiveSection;
  label: string;
  href: string;
  glyph: string;
}> = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", glyph: "◧" },
  { key: "companies", label: "Companies", href: "/dashboard/companies", glyph: "◇" },
  { key: "workspaces", label: "Workspaces", href: "/dashboard/workspaces", glyph: "◉" },
  { key: "account", label: "Account", href: "/dashboard/users/account", glyph: "◔" },
];

function initials(name?: string, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Chrome({ active, pageTitle, user, activeCompany, children }: ChromeProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" aria-hidden />
          Sovereign Portal
        </div>

        <div className="workspace-switcher" role="button" tabIndex={0}>
          <div>
            <span className="label">Active company</span>
            <div>{activeCompany?.name ?? "No active company"}</div>
          </div>
          <span aria-hidden style={{ color: "var(--muted)" }}>⌄</span>
        </div>

        <nav className="nav" aria-label="Primary">
          {NAV_ITEMS.map((it) => (
            <a
              key={it.key}
              href={it.href}
              className={`nav-item ${active === it.key ? "active" : ""}`}
            >
              <span className="nav-item-icon" aria-hidden>{it.glyph}</span>
              {it.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <form action="/api/logout" method="post">
            <button type="submit" className="nav-item" style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}>
              <span className="nav-item-icon" aria-hidden>↪</span>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{pageTitle}</div>
          <div className="topbar-user">
            <div style={{ textAlign: "right", lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{user.displayName ?? "Signed in"}</div>
              {user.handle && (
                <div style={{ color: "var(--muted)", fontSize: 11 }}>@{user.handle}</div>
              )}
            </div>
            <span className="avatar" aria-hidden>
              {initials(user.displayName)}
            </span>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}
