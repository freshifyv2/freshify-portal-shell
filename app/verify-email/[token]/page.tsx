/**
 * /verify-email/[token] — RLG email verification consume.
 *
 * Sprint 1 5.18g. The token is the random string emailed by users-be on
 * registration. We auto-post it on mount; on success the BE issues a
 * no-context session and we drop the user into /dashboard.
 */
import VerifyEmailClient from "./VerifyEmailClient";

export const dynamic = "force-dynamic";

export default function VerifyEmailPage({ params }: { params: { token: string } }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-row">
          <span className="mark">SP</span>
          Sovereign Portal
        </div>
        <h1>Verifying your email</h1>
        <p className="sub">Just a moment.</p>
        <VerifyEmailClient token={params.token} />
      </div>
    </div>
  );
}
