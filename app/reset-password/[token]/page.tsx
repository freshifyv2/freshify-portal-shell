/**
 * /reset-password/[token] — RLG Password Reset consume.
 *
 * Sprint 1 5.18g. The token is the random string minted by users-be when
 * the user clicked "Send reset link". The form posts {token, password}
 * which the BE validates against pending_password_resets, hashes the new
 * password, deletes every existing session for that user, and issues a
 * fresh one. The form then drops the user into /dashboard.
 */
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-row">
          <span className="mark">SP</span>
          Sovereign Portal
        </div>
        <h1>Choose a new password</h1>
        <p className="sub">Pick a password you haven't used before.</p>
        <ResetPasswordForm token={params.token} />
      </div>
    </div>
  );
}
