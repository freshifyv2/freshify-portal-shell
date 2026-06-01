import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { Chrome } from "@/lib/Chrome";
import { loadChromeContext } from "@/lib/chromeContext";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function handleFromEmail(email?: string | null): string {
  if (!email) return "user";
  if (email.startsWith("+")) return email.replace(/[^0-9]/g, "");
  return email.split("@")[0] || email;
}

export default async function Dashboard() {
  const token = readSessionToken();
  if (!token) redirect("/login");

  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const displayName = claims.displayName || claims.email || "there";
  const firstName = (claims.displayName || "").split(/\s+/)[0] || displayName;
  const handle = handleFromEmail(claims.email);
  const isOperator = Boolean((claims as any).operator);
  const daysLeft = claims.exp
    ? Math.max(0, Math.round((claims.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <Chrome
      active="dashboard"
      pageTitle="Dashboard"
      user={{
        userId: claims.userId,
        displayName,
        handle,
        isOperator,
      }}
      activeCompany={claims.companyName ? { name: claims.companyName } : null}
    >
      <h1 className="page-greeting">{greeting()} {firstName}!</h1>

      {/* RAS metric row — icon-chip LEFT, badge TOP-RIGHT, label, BIG NUMBER */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◇</span>
            <span className="metric-card-badge is-violet">{isOperator ? "ALL ACCESS" : "ACTIVE"}</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Companies</p>
            <p className="metric-card-value">{isOperator ? "4" : "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon is-cyan" aria-hidden>◉</span>
            <span className="metric-card-badge is-violet">{isOperator ? "ALL ACCESS" : "AVAILABLE"}</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Workspaces</p>
            <p className="metric-card-value">{isOperator ? "8" : "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon is-green" aria-hidden>◐</span>
            <span className="metric-card-badge">{isOperator ? "ALL ACCESS" : "MEMBER"}</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Users</p>
            <p className="metric-card-value">{isOperator ? "16" : "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon is-amber" aria-hidden>◔</span>
            <span className="metric-card-badge">ACTIVE</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Session days left</p>
            <p className="metric-card-value">{daysLeft ?? "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◧</span>
            <span className="metric-card-badge is-gray">SMI v0.1</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Module spec</p>
            <p className="metric-card-value">v0.1</p>
          </div>
        </div>
      </div>

      {/* RAS 2x2 list cards */}
      <div className="lists-grid">
        <div className="list-card">
          <div className="list-card-header">
            <h3 className="list-card-title">Active Session</h3>
            <a href="/dashboard/users/account" className="list-card-link">View account →</a>
          </div>
          <div className="list-card-body">
            <table className="data-table">
              <tbody>
                <tr>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>USER</td>
                  <td>
                    <div className="user-cell">
                      <div className="user-cell-text">
                        <div className="user-cell-name">{displayName}</div>
                        <div className="user-cell-handle">@{handle}</div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>ACTIVE COMPANY</td>
                  <td>{claims.companyName || <span className="muted">—</span>}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>ACTIVE WORKSPACE</td>
                  <td>{claims.workspaceName || <span className="muted">—</span>}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>ROLE</td>
                  <td>
                    <span className="pill is-violet">{claims.roles?.[0]?.role || "member"}</span>
                    {isOperator && (
                      <span className="pill is-green" style={{ marginLeft: 8 }}>operator</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card">
          <div className="list-card-header">
            <h3 className="list-card-title">Sovereign Modules</h3>
            <a href="/dashboard/companies" className="list-card-link">Open Companies →</a>
          </div>
          <div className="list-card-body">
            <table className="data-table">
              <tbody>
                <tr className="is-clickable" onClick={undefined}>
                  <td>
                    <a href="/dashboard/companies" className="data-table-strong" style={{ color: "var(--fg)" }}>Companies</a>
                    <div className="data-table-sub">Sovereign tenant module</div>
                  </td>
                  <td><span className="status-pill is-active">Live</span></td>
                </tr>
                <tr>
                  <td>
                    <a href="/dashboard/workspaces" className="data-table-strong" style={{ color: "var(--fg)" }}>Workspaces</a>
                    <div className="data-table-sub">Per-tenant workspace module</div>
                  </td>
                  <td><span className="status-pill is-active">Live</span></td>
                </tr>
                <tr>
                  <td>
                    <a href="/dashboard/users/account" className="data-table-strong" style={{ color: "var(--fg)" }}>Users</a>
                    <div className="data-table-sub">Identity + auth module</div>
                  </td>
                  <td><span className="status-pill is-active">Live</span></td>
                </tr>
                {isOperator && (
                  <tr>
                    <td>
                      <a href="/dashboard/users/list" className="data-table-strong" style={{ color: "var(--fg)" }}>Users (cross-tenant)</a>
                      <div className="data-table-sub">Operator-only view</div>
                    </td>
                    <td><span className="status-pill is-active">Live</span></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Chrome>
  );
}
