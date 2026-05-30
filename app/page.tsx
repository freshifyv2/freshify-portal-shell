import Link from "next/link";
import { readSessionToken } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Landing() {
  const token = readSessionToken();
  if (token) redirect("/dashboard");

  return (
    <div className="login-split">
      <aside className="login-brand-panel">
        <div className="login-brand-panel-logo">Sovereign Portal</div>
        <div>
          <h1 className="login-brand-panel-headline">
            Three sovereign modules.<br />
            One working portal.
          </h1>
          <p className="login-brand-panel-sub">
            Users, Companies, and Workspaces are the framework&apos;s foundation —
            each a first-class sovereign module with its own backend, frontend,
            data store, and lifecycle. Composed by a shell, independently deployed,
            jointly experienced.
          </p>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          Reference implementation by Freshify · Standard Module Interface v0.1
        </div>
      </aside>

      <main className="login-form-panel">
        <div className="login-form-card">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>
            Welcome
          </h2>
          <p style={{ color: "var(--muted)", margin: "0 0 32px" }}>
            The sovereign foundation, demonstrated end-to-end.
          </p>

          <div className="section-card" style={{ marginBottom: 24 }}>
            <div className="section-card-header">
              <h3 className="section-card-title">What runs underneath</h3>
            </div>
            <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Users</span>
                <span className="pill is-violet">freshify-users + -fe</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Companies</span>
                <span className="pill is-violet">freshify-companies + -fe</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Workspaces</span>
                <span className="pill is-violet">freshify-workspaces + -fe</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Shell</span>
                <span className="pill is-pink">freshify-portal-shell</span>
              </div>
            </div>
          </div>

          <Link href="/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Sign in to the demo →
          </Link>
        </div>
      </main>
    </div>
  );
}
