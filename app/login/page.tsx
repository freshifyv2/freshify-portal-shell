/**
 * /login — OTP sign-in page (Deploy 5.10).
 *
 * Server component. If the operator already has an sp_session cookie,
 * redirect immediately to the `next` query param (default /dashboard).
 * Otherwise render the two-step OtpLoginForm inside the standard
 * brand-panel split layout used by the marketing landing page.
 */
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import OtpLoginForm from "./OtpLoginForm";

export const dynamic = "force-dynamic";

function safeNext(input: string | string[] | undefined): string {
  const raw = Array.isArray(input) ? input[0] : input;
  if (!raw) return "/dashboard";
  // Only allow same-origin relative paths — no protocol-relative.
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const next = safeNext(searchParams?.next);
  const token = readSessionToken();
  if (token) {
    const claims = decodeClaims(token);
    // Cookie present and JWT decodes — we trust the upstream verifier; the
    // server-rendered downstream pages will redirect back here if the JWT
    // is actually expired.
    if (claims) redirect(next);
  }

  return (
    <div className="login-split">
      <aside className="login-brand-panel">
        <div className="login-brand-panel-logo">Sovereign Portal</div>
        <div>
          <h1 className="login-brand-panel-headline">
            Sign in to the<br />
            sovereign foundation.
          </h1>
          <p className="login-brand-panel-sub">
            One-time codes over SMS or email. No passwords to forget, no
            shared secrets to rotate. The Users module owns identity end
            to end — this form is just a thin shell on top.
          </p>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          Reference implementation by Freshify · Standard Module Interface v0.1
        </div>
      </aside>

      <main className="login-form-panel">
        <div className="login-form-card">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            Sign in
          </h2>
          <p style={{ color: "var(--muted)", margin: "0 0 32px" }}>
            We&apos;ll send you a one-time code.
          </p>

          <OtpLoginForm next={next} />
        </div>
      </main>
    </div>
  );
}
