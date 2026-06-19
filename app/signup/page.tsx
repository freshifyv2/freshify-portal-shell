/**
 * /signup — RLG01 Create Account.
 *
 * Sprint 1 5.18g. Pre-auth screen. Posts to /api/auth/register which
 * proxies users-be /v1/auth/register. Verification email is sent
 * best-effort by users-be; the success state asks the user to check
 * their inbox.
 */
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const token = readSessionToken();
  if (token) {
    const claims = decodeClaims(token);
    if (claims) redirect("/dashboard");
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-row">
          <span className="mark">SP</span>
          Sovereign Portal
        </div>
        <h1>Create your account</h1>
        <p className="sub">It only takes a minute. We'll send a verification link.</p>
        <SignupForm />
      </div>
    </div>
  );
}
