import Link from "next/link";
import { readSessionToken } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Landing() {
  const token = readSessionToken();
  if (token) redirect("/dashboard");

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <div className="auth-brand-content">
          <div className="auth-brand-mark">
            <span className="auth-brand-mark-glyph" aria-hidden />
            Sovereign Portal
          </div>
          <h1>Three sovereign modules. One working portal.</h1>
          <p className="lede">
            Users, Companies, and Workspaces are the framework&apos;s foundation —
            each a first-class sovereign module with its own backend, frontend,
            data store, and lifecycle. This portal composes them through
            server-side rewrites: independently deployed, jointly experienced.
          </p>
          <ul className="auth-bullets">
            <li>Pluggable auth — Twilio OTP reference + Auth0 / Okta / Cognito / Clerk adapters</li>
            <li>Conforms to the Standard Module Interface v0.1 spec</li>
            <li>Independently deployed FE / BE pairs, composed by a shell</li>
            <li>Self-hosted on your cloud. Always.</li>
          </ul>
        </div>
      </aside>

      <main className="auth-form-pane">
        <div className="auth-form-card">
          <h2>Welcome</h2>
          <p className="sub">
            The sovereign foundation, demonstrated end-to-end.
          </p>

          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>What runs underneath</div>
            <div className="stack stack-sm" style={{ fontSize: 13 }}>
              <div className="spread">
                <span style={{ fontWeight: 600 }}>Users</span>
                <span className="pill cyan">freshify-users + -fe</span>
              </div>
              <div className="spread">
                <span style={{ fontWeight: 600 }}>Companies</span>
                <span className="pill cyan">freshify-companies + -fe</span>
              </div>
              <div className="spread">
                <span style={{ fontWeight: 600 }}>Workspaces</span>
                <span className="pill cyan">freshify-workspaces + -fe</span>
              </div>
              <div className="spread">
                <span style={{ fontWeight: 600 }}>Shell</span>
                <span className="pill violet">freshify-portal-shell</span>
              </div>
            </div>
          </div>

          <Link href="/login" className="btn btn-primary btn-block">
            Sign in to the demo →
          </Link>

          <p className="fineprint">
            Reference implementation built by Freshify · The Sovereign Module architecture
          </p>
        </div>
      </main>
    </div>
  );
}
