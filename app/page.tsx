import Link from "next/link";
import { readSessionToken } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Landing() {
  const token = readSessionToken();
  if (token) redirect("/dashboard");

  return (
    <div className="container" style={{ paddingTop: 80, maxWidth: 760 }}>
      <div className="stack" style={{ gap: 32 }}>
        <div>
          <div className="kicker">Sovereign Portal · Reference Implementation</div>
          <h1 style={{ marginTop: 12 }}>
            Three sovereign modules.
            <br />
            One working portal.
          </h1>
          <p className="muted" style={{ marginTop: 16, fontSize: 17, lineHeight: 1.6 }}>
            Users, Companies, and Workspaces are the framework&apos;s foundation —
            each a first-class sovereign module with its own backend, frontend,
            data store, and lifecycle. This portal composes them through
            server-side rewrites: independently deployed, jointly experienced.
          </p>
        </div>

        <div>
          <Link href="/login">
            <button className="primary">Sign in to the demo</button>
          </Link>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 16 }}>What runs underneath</h2>
          <table>
            <thead>
              <tr>
                <th>Layer</th>
                <th>Backend</th>
                <th>Frontend</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Users</td>
                <td><code style={{ fontSize: 12 }}>freshify-users</code></td>
                <td><code style={{ fontSize: 12 }}>freshify-users-fe</code></td>
              </tr>
              <tr>
                <td>Companies</td>
                <td><code style={{ fontSize: 12 }}>freshify-companies</code></td>
                <td><code style={{ fontSize: 12 }}>freshify-companies-fe</code></td>
              </tr>
              <tr>
                <td>Workspaces</td>
                <td><code style={{ fontSize: 12 }}>freshify-workspaces</code></td>
                <td><code style={{ fontSize: 12 }}>freshify-workspaces-fe</code></td>
              </tr>
              <tr>
                <td>Shell</td>
                <td>—</td>
                <td><code style={{ fontSize: 12 }}>freshify-portal-shell</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="muted" style={{ fontSize: 13, textAlign: "center" }}>
          Built by Freshify · the Sovereign Module reference architecture
        </div>
      </div>
    </div>
  );
}
