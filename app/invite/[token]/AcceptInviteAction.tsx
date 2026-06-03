"use client";

/**
 * Client-side Accept button — Deploy 5.9.
 *
 * Calls the BFF redemption endpoint. On success forwards to /dashboard. On
 * 410 (already accepted / revoked / expired) refreshes the page so the
 * server component re-renders the appropriate terminal state.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInviteAction({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/portal-invites/by-token/${encodeURIComponent(token)}/accept`,
        { method: "POST" },
      );
      if (r.status === 410) {
        // Already accepted / revoked / expired since the page loaded.
        router.refresh();
        return;
      }
      if (r.status === 401 || r.status === 403) {
        const j = await r.json().catch(() => ({}));
        throw new Error(
          j.error === "email_mismatch"
            ? "This invitation belongs to a different account."
            : j.error || "Sign in to accept this invitation.",
        );
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `accept failed: ${r.status}`);
      }
      router.push("/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={accept}
        disabled={busy}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {busy ? "Accepting…" : "Accept invitation"}
      </button>
      {error ? (
        <p
          role="alert"
          style={{ color: "var(--fg-2)", fontSize: 13, margin: 0, lineHeight: 1.5 }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
