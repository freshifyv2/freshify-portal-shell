"use client";

/**
 * RLG01 — Create Account form.
 *
 * Email + password + confirm. On submit posts to /api/auth/register
 * which proxies users-be /v1/auth/register. Success always lands on
 * the "Check your email" state — verification email is best-effort
 * delivered by users-be.
 *
 * Sprint 1 5.18g.
 */
import { useState } from "react";

type ErrorCode = "password_mismatch" | "password_policy" | "invalid_email" | "unknown";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErrorCode(null);

    if (password !== confirm) {
      setErrorCode("password_mismatch");
      return;
    }
    if (password.length < 8) {
      setErrorCode("password_policy");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (r.ok) {
        setSent(true);
        return;
      }
      let code: ErrorCode = "unknown";
      try {
        const body = (await r.json()) as { error?: string };
        if (body.error === "password_policy") code = "password_policy";
        else if (body.error === "invalid_email") code = "invalid_email";
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

  if (sent) {
    return (
      <>
        <div className="banner success">
          We sent a verification link to <strong>{email}</strong>. Click it to finish setting up your
          account.
        </div>
        <div className="actions">
          <a href="/login" className="btn primary" style={{ textAlign: "center" }}>
            Back to sign in
          </a>
        </div>
        <div className="alt">
          Didn't get it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
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
            try a different email
          </button>
          .
        </div>
      </>
    );
  }

  const banner =
    errorCode === "password_mismatch"
      ? "Passwords don't match."
      : errorCode === "password_policy"
        ? "Password must be at least 8 characters."
        : errorCode === "invalid_email"
          ? "Enter a valid email address."
          : errorCode === "unknown"
            ? "Something went wrong. Please try again."
            : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {banner ? <div className="banner danger">{banner}</div> : null}

      <div className="field">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="field">
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
        <span className="hint">At least 8 characters.</span>
      </div>
      <div className="field">
        <label htmlFor="signup-confirm">Confirm password</label>
        <input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="actions">
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </div>

      <div className="alt">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </form>
  );
}
