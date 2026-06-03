/**
 * Invite acceptance page — Deploy 5.9.
 *
 * Public-readable invite preview + state-aware UI:
 *
 *   - pending + no session         -> "Sign in to accept"  (deep-links /login?next=)
 *   - pending + session + match    -> "Accept invitation"  (calls BFF, redirects /dashboard)
 *   - pending + session + mismatch -> "This invite is for X" + logout link
 *   - accepted                     -> "Already accepted"   (CTA -> /dashboard)
 *   - revoked                      -> "Invite revoked"
 *   - expired                      -> "Invite expired"
 *   - 404                          -> "Invite not found"
 *
 * Why no signup form: portal v3 uses OTP login keyed off phone, and
 * acceptInviteV3 binds the invite to whichever user is signed in. The
 * recipient simply signs in with their phone (their email must already
 * match the invite). Wiring real account creation from an invite token
 * is a separate Deploy.
 */
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import AcceptInviteAction from "./AcceptInviteAction";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

interface InvitePreview {
  inviteId: string;
  email: string;
  companyId: string | null;
  workspaceId: string | null;
  role: string;
  status: string;
  expiresAt: string;
}

async function fetchPreview(token: string): Promise<
  | { ok: true; invite: InvitePreview }
  | { ok: false; status: number; error: string }
> {
  const enc = encodeURIComponent(token);
  try {
    const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-invites/by-token/${enc}`, {
      cache: "no-store",
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return { ok: false, status: r.status, error: body?.error ?? `http_${r.status}` };
    }
    const invite = (await r.json()) as InvitePreview;
    return { ok: true, invite };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: (err as Error).message || "fetch_failed",
    };
  }
}

function scopeLabel(invite: InvitePreview): string {
  if (invite.workspaceId) return `workspace ${invite.workspaceId}`;
  if (invite.companyId) return `customer ${invite.companyId}`;
  return "the Sovereign Portal";
}

function formatExpires(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function InviteAcceptPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const result = await fetchPreview(token);

  // ---- Error cases ----
  if (!result.ok) {
    const title =
      result.status === 404 ? "Invite not found" : "Unable to load invite";
    const body =
      result.status === 404
        ? "This invitation link is invalid or has been removed. Ask whoever invited you to send a fresh one."
        : `Something went wrong loading the invitation. Try again in a moment. (${result.error})`;
    return (
      <InviteShell>
        <StateCard title={title} body={body} tone="muted" />
      </InviteShell>
    );
  }

  const invite = result.invite;
  const sessionToken = readSessionToken();
  const claims = sessionToken ? decodeClaims(sessionToken) : null;
  const sessionEmail = claims?.email?.toLowerCase() ?? null;
  const inviteEmail = invite.email.toLowerCase();
  const emailMatches = sessionEmail !== null && sessionEmail === inviteEmail;

  // ---- Terminal states ----
  if (invite.status === "accepted") {
    return (
      <InviteShell>
        <StateCard
          title="Already accepted"
          body={`This invitation has already been redeemed. Sign in to continue.`}
          tone="muted"
        >
          <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        </StateCard>
      </InviteShell>
    );
  }
  if (invite.status === "revoked") {
    return (
      <InviteShell>
        <StateCard
          title="Invite revoked"
          body="This invitation was revoked by an operator. Ask whoever invited you for a new one."
          tone="muted"
        />
      </InviteShell>
    );
  }
  if (invite.status === "expired") {
    return (
      <InviteShell>
        <StateCard
          title="Invite expired"
          body={`This invitation expired on ${formatExpires(invite.expiresAt)}. Ask whoever invited you to resend it.`}
          tone="muted"
        />
      </InviteShell>
    );
  }

  // ---- Pending: render details + appropriate action ----
  const detailRows = [
    { label: "Invited email", value: invite.email },
    { label: "Role", value: invite.role },
    { label: "Scope", value: scopeLabel(invite) },
    { label: "Expires", value: formatExpires(invite.expiresAt) },
  ];

  return (
    <InviteShell>
      <div className="section-card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="section-card-header">
          <h1 className="section-card-title" style={{ fontSize: 22 }}>
            You&apos;re invited to the Sovereign Portal
          </h1>
        </div>
        <div style={{ padding: "16px 0", display: "grid", gap: 12 }}>
          {detailRows.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                borderBottom: "1px solid var(--border)",
                paddingBottom: 8,
              }}
            >
              <span style={{ color: "var(--muted)" }}>{r.label}</span>
              <span style={{ fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          {!sessionEmail ? (
            <SignInPrompt token={token} inviteEmail={invite.email} />
          ) : emailMatches ? (
            <AcceptInviteAction token={token} />
          ) : (
            <EmailMismatchPanel
              sessionEmail={sessionEmail}
              inviteEmail={invite.email}
            />
          )}
        </div>
      </div>
    </InviteShell>
  );
}

// -------------------- Layout + sub-views --------------------

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "var(--bg)",
      }}
    >
      {children}
    </div>
  );
}

function StateCard({
  title,
  body,
  tone,
  children,
}: {
  title: string;
  body: string;
  tone: "muted" | "primary";
  children?: React.ReactNode;
}) {
  return (
    <div
      className="section-card"
      style={{ maxWidth: 480, width: "100%", textAlign: "center" }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 12px",
        }}
      >
        {title}
      </h1>
      <p style={{ color: "var(--muted)", margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
        {body}
      </p>
      {children ?? (
        <Link href="/" className="btn btn-secondary">
          Back to portal
        </Link>
      )}
    </div>
  );
}

function SignInPrompt({ token, inviteEmail }: { token: string; inviteEmail: string }) {
  const next = `/invite/${encodeURIComponent(token)}`;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
        Sign in with the phone number tied to <strong>{inviteEmail}</strong> to accept this invitation.
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center" }}
      >
        Sign in to accept
      </Link>
    </div>
  );
}

function EmailMismatchPanel({
  sessionEmail,
  inviteEmail,
}: {
  sessionEmail: string;
  inviteEmail: string;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
        You are signed in as <strong>{sessionEmail}</strong>, but this invitation is for{" "}
        <strong>{inviteEmail}</strong>. Sign out and sign back in with the matching account to accept.
      </p>
      <Link
        href={`/api/auth/logout?next=/invite/${encodeURIComponent(inviteEmail)}`}
        className="btn btn-secondary"
        style={{ width: "100%", justifyContent: "center" }}
      >
        Sign out
      </Link>
    </div>
  );
}
