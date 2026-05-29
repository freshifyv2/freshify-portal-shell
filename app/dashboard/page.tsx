import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const token = readSessionToken();
  if (!token) redirect("/login");

  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">Sovereign Portal</div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link active">Dashboard</Link>
            <Link href="/dashboard/companies" className="nav-link">Companies</Link>
            <Link href="/dashboard/workspaces" className="nav-link">Workspaces</Link>
            <Link href="/dashboard/users/account" className="nav-link">Account</Link>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="stack" style={{ gap: 24 }}>
          <div>
            <div className="kicker">Welcome back</div>
            <h1 style={{ marginTop: 8 }}>
              {claims.displayName || claims.email}
            </h1>
            <p className="muted" style={{ marginTop: 8 }}>
              Three sovereign modules, composed into one portal.
            </p>
          </div>

          <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
            <Link href="/dashboard/users/account" style={{ flex: "1 1 280px", textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <div className="kicker">01 · Users</div>
                <h2 style={{ marginTop: 8 }}>Your account</h2>
                <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                  Profile, claims, role assignments across all four layers.
                </p>
              </div>
            </Link>
            <Link href="/dashboard/companies" style={{ flex: "1 1 280px", textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <div className="kicker">02 · Companies</div>
                <h2 style={{ marginTop: 8 }}>Your companies</h2>
                <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                  Personal + organization companies. Add members.
                </p>
              </div>
            </Link>
            <Link href="/dashboard/workspaces" style={{ flex: "1 1 280px", textDecoration: "none" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <div className="kicker">03 · Workspaces</div>
                <h2 style={{ marginTop: 8 }}>Workspaces</h2>
                <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                  Scoped to your active company. Create, manage, invite.
                </p>
              </div>
            </Link>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 8 }}>Session</h2>
            <table>
              <tbody>
                <tr><th style={{ width: 200 }}>User ID</th><td><code style={{ fontSize: 13 }}>{claims.userId}</code></td></tr>
                <tr><th>Active company</th><td>{claims.companyName || claims.companyId || "—"}</td></tr>
                <tr><th>Active workspace</th><td>{claims.workspaceName || claims.workspaceId || "—"}</td></tr>
                <tr><th>Expires</th><td>{claims.exp ? new Date(claims.exp * 1000).toLocaleString() : "—"}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
