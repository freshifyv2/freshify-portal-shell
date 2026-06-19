/**
 * /login — RLG06 password sign-in page.
 *
 * Sprint 1 5.18g rebuild — replaces the Deploy-5.10 OTP-only flow with
 * email + password (RAS Reg/Login v1.0 default). The OtpLoginForm
 * component is retained in this directory for the demo/dev Twilio adapter
 * path but is no longer mounted on /login.
 *
 * Server component. If sp_session is already present and decodes, redirect
 * to `next` (default /dashboard).
 */
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

function safeNext(input: string | string[] | undefined): string {
  const raw = Array.isArray(input) ? input[0] : input;
  if (!raw) return "/dashboard";
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
    if (claims) redirect(next);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-row">
          <span className="mark">SP</span>
          Sovereign Portal
        </div>
        <h1>Sign in</h1>
        <p className="sub">Welcome back. Use your email and password.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
