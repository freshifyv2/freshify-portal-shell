"use client";

/**
 * RLG09 — Forgot Password form.
 *
 * Email field only. Posts to /api/auth/password-reset/request which
 * proxies users-be /v1/auth/password-reset/request. Upstream always
 * returns 200 ok regardless of whether the email exists — we always
 * show the success banner. Email-enumeration is prevented at the BE.
 *
 * Sprint 1 5.18g.
 */
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always show the success banner — BE intentionally returns 200 either way.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <div className="banner success">
          If an account exists for <strong>{email}</strong>, we sent a password reset link. Check
          your inbox.
        </div>
        <div className="actions">
          <a href="/login" className="btn primary" style={{ textAlign: "center" }}>
            Back to sign in
          </a>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="fp-email">Email</label>
        <input
          id="fp-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="actions">
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </div>
      <div className="alt">
        Remembered it? <a href="/login">Back to sign in</a>
      </div>
    </form>
  );
}
