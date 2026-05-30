import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { Chrome } from "@/lib/Chrome";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const token = readSessionToken();
  if (!token) redirect("/login");

  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const name = claims.displayName || claims.email || "there";
  const firstName = (claims.displayName || "").split(/\s+/)[0] || name;

  return (
    <Chrome
      active="dashboard"
      pageTitle="Dashboard"
      user={{ userId: claims.userId, displayName: claims.displayName || claims.email }}
      activeCompany={claims.companyName ? { name: claims.companyName } : null}
    >
      <div className="page-header">
        <div className="page-header-left">
          <div className="kicker">Welcome back</div>
          <h1>{greeting()}, {firstName}</h1>
          <div className="sub">Three sovereign modules, composed into one portal.</div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric-icon" aria-hidden>◇</span>
          <span className="metric-trend neutral">Foundation</span>
          <span className="metric-label">Companies</span>
          <span className="metric-value">—</span>
        </div>
        <div className="metric">
          <span className="metric-icon cyan" aria-hidden>◉</span>
          <span className="metric-trend neutral">Foundation</span>
          <span className="metric-label">Workspaces</span>
          <span className="metric-value">—</span>
        </div>
        <div className="metric">
          <span className="metric-icon" aria-hidden>◔</span>
          <span className="metric-trend green">Active</span>
          <span className="metric-label">Session</span>
          <span className="metric-value">{claims.exp ? Math.max(0, Math.round((claims.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24))) : "—"}<span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500, marginLeft: 6 }}>days left</span></span>
        </div>
        <div className="metric">
          <span className="metric-icon" aria-hidden>◧</span>
          <span className="metric-trend neutral">Standard Module Interface</span>
          <span className="metric-label">SMI version</span>
          <span className="metric-value">v0.1</span>
        </div>
      </div>

      <div className="row-2">
        <div className="card card-pad">
          <div className="cluster" style={{ marginBottom: 12 }}>
            <span className="kicker">02 · Companies</span>
          </div>
          <h2 style={{ marginBottom: 6 }}>Your companies</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
            Personal and organization companies. Each company is a sovereign tenant
            with its own member list and admin role table.
          </p>
          <a href="/dashboard/companies" className="btn btn-primary btn-sm">
            Open companies →
          </a>
        </div>

        <div className="card card-pad">
          <div className="cluster" style={{ marginBottom: 12 }}>
            <span className="kicker">03 · Workspaces</span>
          </div>
          <h2 style={{ marginBottom: 6 }}>Workspaces</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
            Scoped to your active company. Create separate workspaces for design,
            build, and operations engagements — each with their own member roles.
          </p>
          <a href="/dashboard/workspaces" className="btn btn-primary btn-sm">
            Open workspaces →
          </a>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Session</div>
          <span className="pill green dot">Active</span>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <td className="table-id" style={{ width: 200, color: "var(--muted)" }}>USER ID</td>
              <td><code style={{ fontSize: 13 }}>{claims.userId}</code></td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)" }}>ACTIVE COMPANY</td>
              <td>{claims.companyName || claims.companyId || <span className="muted">—</span>}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)" }}>ACTIVE WORKSPACE</td>
              <td>{claims.workspaceName || claims.workspaceId || <span className="muted">—</span>}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)" }}>EXPIRES</td>
              <td>{claims.exp ? new Date(claims.exp * 1000).toLocaleString() : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Chrome>
  );
}
