"use client";

/**
 * Verify-email client — Sprint 1 5.18g.
 *
 * Auto-posts the token on mount. On success the proxy sets sp_session,
 * then we redirect to /dashboard. On failure we render a friendly state
 * with a CTA to either request a new link or sign in.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type State = "verifying" | "success" | "invalid_token" | "token_expired" | "unknown";

export default function VerifyEmailClient({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("verifying");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (r.ok) {
          setState("success");
          // Small delay so the success banner is visible before redirect.
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 800);
          return;
        }
        try {
          const body = (await r.json()) as { error?: string };
          if (body.error === "invalid_token") setState("invalid_token");
          else if (body.error === "token_expired") setState("token_expired");
          else setState("unknown");
        } catch {
          setState("unknown");
        }
      } catch {
        if (!cancelled) setState("unknown");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (state === "verifying") {
    return (
      <>
        <div className="banner">Verifying your email…</div>
      </>
    );
  }
  if (state === "success") {
    return (
      <>
        <div className="banner success">Email verified. Signing you in…</div>
      </>
    );
  }

  const msg =
    state === "invalid_token"
      ? "This verification link is no longer valid."
      : state === "token_expired"
        ? "This verification link has expired."
        : "We couldn't verify your email. Please try again.";

  return (
    <>
      <div className="banner danger">{msg}</div>
      <div className="actions">
        <a href="/signup" className="btn primary" style={{ textAlign: "center" }}>
          Request a new link
        </a>
        <a href="/login" className="btn" style={{ textAlign: "center" }}>
          Back to sign in
        </a>
      </div>
    </>
  );
}
