"use client";

/**
 * OtpLoginForm — two-step OTP sign-in (phone or email).
 *
 * Step 1 (identifier): operator types an E.164 phone or email, picks a
 *   channel, hits "Send code". We POST /api/auth/otp/request and stash
 *   the returned challengeId.
 *
 * Step 2 (code): operator types the 6-digit code (and optionally a
 *   display name for first-time accounts). We POST /api/auth/otp/verify
 *   with {identifier, channel, code, displayName?} — the backend
 *   re-checks identifier+channel, so they must be in the verify payload.
 *
 * On verify success the BFF sets the sp_session cookie; we just push the
 * router to `next`.
 *
 * Sprint 3 — restyled against .auth-shell / .field / .banner vocabulary
 * (the older .login-* classes were dropped in 5.18g). Mounted again on
 * /login behind a tab via app/login/LoginTabs.tsx.
 */

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Channel = "sms" | "email";
type Step = "identifier" | "code";

interface Props {
  next: string;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function looksLikePhone(s: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(s);
}

export default function OtpLoginForm({ next }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmed = identifier.trim();
    if (channel === "sms" && !looksLikePhone(trimmed)) {
      setError("Phone must be in E.164 format, e.g. +16085550100.");
      return;
    }
    if (channel === "email" && !looksLikeEmail(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: trimmed, channel }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        challengeId?: string;
        error?: string;
        message?: string;
      };
      if (!r.ok) {
        setError(data.error || data.message || `Request failed (${r.status}).`);
        return;
      }
      if (!data.challengeId) {
        setError("Server did not return a challenge.");
        return;
      }
      setChallengeId(data.challengeId);
      setStep("code");
      setInfo(
        channel === "sms"
          ? `Code sent to ${trimmed}.`
          : `Code emailed to ${trimmed}.`,
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmedCode = code.trim();
    if (!/^\d{4,8}$/.test(trimmedCode)) {
      setError("Enter the numeric code from your message.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        identifier: identifier.trim(),
        channel,
        code: trimmedCode,
      };
      if (displayName.trim()) payload.displayName = displayName.trim();
      if (challengeId) payload.challengeId = challengeId;

      const r = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await r.json().catch(() => ({}))) as {
        sessionToken?: string;
        isNewUser?: boolean;
        error?: string;
        message?: string;
      };
      if (!r.ok) {
        setError(data.error || data.message || `Verification failed (${r.status}).`);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep("identifier");
    setCode("");
    setChallengeId(null);
    setError(null);
    setInfo(null);
  }

  if (step === "identifier") {
    return (
      <form onSubmit={onRequest} noValidate>
        {error ? <div className="banner danger">{error}</div> : null}

        <div className="field">
          <label htmlFor="otp-channel">Delivery channel</label>
          <select
            id="otp-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            disabled={submitting}
          >
            <option value="sms">Text message (SMS)</option>
            <option value="email">Email</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="otp-identifier">
            {channel === "sms" ? "Phone number" : "Email address"}
          </label>
          <input
            id="otp-identifier"
            type={channel === "sms" ? "tel" : "email"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              channel === "sms" ? "+16085550100" : "you@example.com"
            }
            autoComplete={channel === "sms" ? "tel" : "email"}
            disabled={submitting}
            required
          />
        </div>

        <div className="actions">
          <button
            type="submit"
            className="btn primary"
            disabled={submitting || !identifier.trim()}
          >
            {submitting ? "Sending…" : "Send code"}
          </button>
        </div>

        <p className="auth-helper">
          One-time codes only. Codes are delivered via your configured Twilio
          adapter; the dev adapter accepts the bypass code printed by the
          users service logs.
        </p>
      </form>
    );
  }

  // Step: code
  return (
    <form onSubmit={onVerify} noValidate>
      <div className="auth-identity-banner">
        <span>
          Signing in as <strong>{identifier}</strong>
        </span>
        <button
          type="button"
          onClick={reset}
          className="auth-link-button"
          disabled={submitting}
        >
          Change
        </button>
      </div>

      {info && !error ? <div className="banner success">{info}</div> : null}
      {error ? <div className="banner danger">{error}</div> : null}

      <div className="field">
        <label htmlFor="otp-code">One-time code</label>
        <input
          id="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          maxLength={8}
          className="auth-code-input"
          disabled={submitting}
          required
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="otp-display-name">
          Display name (first-time sign-in only)
        </label>
        <input
          id="otp-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional"
          disabled={submitting}
        />
      </div>

      <div className="actions">
        <button
          type="submit"
          className="btn primary"
          disabled={submitting || !code.trim()}
        >
          {submitting ? "Verifying…" : "Verify and sign in"}
        </button>
      </div>
    </form>
  );
}
