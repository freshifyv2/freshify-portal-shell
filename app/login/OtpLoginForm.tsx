"use client";

/**
 * OtpLoginForm — two-step OTP sign-in (Deploy 5.10).
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
 * router to `next`. Styling is driven by .login-* classes in globals.css.
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
      <form onSubmit={onRequest} style={{ display: "grid", gap: 20 }}>
        <div className="login-field">
          <label htmlFor="channel" className="login-field-label">
            Delivery channel
          </label>
          <select
            id="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="field-input field-select"
            disabled={submitting}
          >
            <option value="sms">Text message (SMS)</option>
            <option value="email">Email</option>
          </select>
        </div>

        <div className="login-field">
          <label htmlFor="identifier" className="login-field-label">
            {channel === "sms" ? "Phone number" : "Email address"}
          </label>
          <input
            id="identifier"
            type={channel === "sms" ? "tel" : "email"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              channel === "sms" ? "+16085550100" : "you@example.com"
            }
            className="field-input"
            autoComplete={channel === "sms" ? "tel" : "email"}
            disabled={submitting}
            required
          />
        </div>

        {error && (
          <div role="alert" className="login-banner-alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={submitting || !identifier.trim()}
        >
          {submitting ? "Sending…" : "Send code"}
        </button>

        <p className="login-helper">
          One-time codes only. No passwords. This portal is a reference
          implementation of the Sovereign Modular Architecture.
        </p>
      </form>
    );
  }

  // Step: code
  return (
    <form onSubmit={onVerify} style={{ display: "grid", gap: 20 }}>
      <div className="login-identity-banner">
        <span>
          Signing in as <strong>{identifier}</strong>
        </span>
        <button
          type="button"
          onClick={reset}
          className="login-link-button"
          disabled={submitting}
        >
          Change
        </button>
      </div>

      <div className="login-field">
        <label htmlFor="code" className="login-field-label">
          One-time code
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          maxLength={8}
          className="field-input login-code-input"
          disabled={submitting}
          required
          autoFocus
        />
      </div>

      <div className="login-field">
        <label htmlFor="displayName" className="login-field-label">
          Display name <span className="optional">(first-time sign-in only)</span>
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional"
          className="field-input"
          disabled={submitting}
        />
      </div>

      {info && !error && (
        <div role="status" className="login-banner-info">
          {info}
        </div>
      )}

      {error && (
        <div role="alert" className="login-banner-alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center" }}
        disabled={submitting || !code.trim()}
      >
        {submitting ? "Verifying…" : "Verify and sign in"}
      </button>
    </form>
  );
}
