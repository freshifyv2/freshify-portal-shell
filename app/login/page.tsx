/**
 * /login — RLG06 sign-in page.
 *
 * Sprint 1 5.18g rebuilt this against the email + password flow as the
 * default auth path. Sprint 3 restored the OTP form alongside it behind
 * a tab — the underlying /api/auth/otp/{request,verify} routes have been
 * live the entire time and continue to work. The actual tab toggling
 * lives in the LoginTabs client component; this page stays a server
 * component so the already-signed-in redirect can use server-side
 * session cookies.
 */
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import LoginTabs from "./LoginTabs";

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
        <LoginTabs next={next} />
      </div>
    </div>
  );
}
