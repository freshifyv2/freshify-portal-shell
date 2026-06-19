"use client";

/**
 * RLG06 — Login form (email + password).
 *
 * Posts to the portal-shell BFF `/api/auth/login` which proxies users-be
 * `/v1/auth/login` and sets sp_session on success. Branches on the
 * upstream error code:
 *
 *   invalid_credentials  → vague "Email or password is incorrect."
 *   email_not_verified   → CTA to resend verification email
 *   user_disabled        → contact support copy
 *
 * Sprint 1 5.18g — rebuilt against .auth-shell / .field / .banner.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  next: string;
}

type ErrorCode =
  | "invalid_credentials"
  | "email_not_verified"
  | "user_disabled"
  | "password_policy"
  | "unknown";

export default function LoginForm({ next }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorCode(null);
    setResendSent(false);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (r.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      let code: ErrorCode = "unknown";
      try {
        const body = (await r.json()) as { error?: string };
        if (body.error === "invalid_credentials") code = "invalid_credentials";
        else if (body.error === "email_not_verified") code = "email_not_verified";
        else if (body.error === "user_disabled") code = "user_disabled";
        else if (body.error === "password_policy") code = "password_policy";
      } catch {
        /* ignore */
      }
      setErrorCode(code);
    } catch {
      setErrorCode("unknown");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendBusy || !email.trim()) return;
    setResendBusy(true);
    try {
      // Re-posting register on an unverified account re-mints the token
      // and triggers a fresh email — designed for this exact CTA.
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password || "placeholder12345" }),
      });
      setResendSent(true);
    } finally {
      setResendBusy(false);
    }
  }

  const banner =
    errorCode === "invalid_credentials"
      ? "Email or password is incorrect."
      : errorCode === "email_not_verified"
        ? "This email isn't verified yet. Check your inbox for the verification link."
        : errorCode === "user_disabled"
          ? "This account has been disabled. Contact your portal administrator."
          : errorCode === "password_policy"
            ? "Password must be at least 8 characters."
            : errorCode === "unknown"
              ? "Something went wrong. Please try again."
              : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {banner ? (
        <div className={`banner ${errorCode === "email_not_verified" ? "" : "danger"}`}>
          {banner}
          {errorCode === "email_not_verified" ? (
            <>
              {" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendBusy || !email.trim()}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "inherit",
                  textDecoration: "underline",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                {resendBusy ? "Sending…" : "Resend it"}
              </button>
              .
            </>
          ) : null}
        </div>
      ) : null}
      {resendSent ? (
        <div className="banner success">Verification email sent. Check your inbox.</div>
      ) : null}

      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="actions">
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <a className="btn" href="/forgot-password" style={{ textAlign: "center" }}>
          Forgot password?
        </a>
      </div>

      <div className="alt">
        New here? <a href="/signup">Create an account</a>
      </div>
    </form>
  );
}
