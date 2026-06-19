/**
 * /forgot-password — RLG09 Password Recovery request.
 *
 * Sprint 1 5.18g. Pre-auth screen. The upstream BE returns 200 ok
 * regardless of whether the email matches an account — UI always
 * shows the same success state.
 */
import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-row">
          <span className="mark">SP</span>
          Sovereign Portal
        </div>
        <h1>Reset your password</h1>
        <p className="sub">Enter your email and we'll send a reset link.</p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
