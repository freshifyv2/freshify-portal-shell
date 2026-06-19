"use client";

/**
 * RLG — Reset Password form.
 *
 * Reads :token from the URL. Posts {token, password} to
 * /api/auth/password-reset/consume which proxies users-be
 * /v1/auth/password-reset/consume. On success users-be deletes all
 * existing sessions for the user and issues a fresh one — the
 * portal-shell route sets sp_session, then this form redirects to
 * /dashboard.
 *
 * Sprint 1 5.18g.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

type ErrorCode =
  | "password_mismatch"
  | "password_policy"
  | "invalid_token"
  | "token_expired"
  | "unknown";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

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
      const r = await fetch("/api/auth/password-reset/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (r.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      let code: ErrorCode = "unknown";
      try {
        const body = (await r.json()) as { error?: string };
        if (body.error === "password_policy") code = "password_policy";
        else if (body.error === "invalid_token") code = "invalid_token";
        else if (body.error === "token_expired") code = "token_expired";
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

  const banner =
    errorCode === "password_mismatch"
      ? "Passwords don't match."
      : errorCode === "password_policy"
        ? "Password must be at least 8 characters."
        : errorCode === "invalid_token"
          ? "This reset link is no longer valid. Request a new one."
          : errorCode === "token_expired"
            ? "This reset link has expired. Request a new one."
            : errorCode === "unknown"
              ? "Something went wrong. Please try again."
              : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {banner ? <div className="banner danger">{banner}</div> : null}

      <div className="field">
        <label htmlFor="rp-password">New password</label>
        <input
          id="rp-password"
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
        <label htmlFor="rp-confirm">Confirm new password</label>
        <input
          id="rp-confirm"
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
          {submitting ? "Updating…" : "Update password"}
        </button>
      </div>

      {errorCode === "invalid_token" || errorCode === "token_expired" ? (
        <div className="alt">
          <a href="/forgot-password">Request a new reset link</a>
        </div>
      ) : (
        <div className="alt">
          Remembered it? <a href="/login">Back to sign in</a>
        </div>
      )}
    </form>
  );
}
