/**
 * eventSummary — Deploy 5.14 shared audit event pretty-printer.
 *
 * Single source of truth for turning a raw audit event tag + payload into
 * an operator-facing one-liner. Used by both the dashboard's Recent Activity
 * card and the full /dashboard/audit feed.
 *
 * Covers every portal.* event emitted by users-be as of 5.14:
 *   - portal.settings_updated
 *   - portal.admin_user_{created,updated,deleted}
 *   - portal.invite_{created,resent,revoked,accepted}
 *   - portal.invite_email_{sent,failed}
 *   - portal.membership_{granted,already_present,backfilled,write_failed}
 * Falls back to a sensible default for company.* / workspace.* and the raw
 * event tag for anything else.
 */

export type AuditSource = "portal" | "company" | "workspace";

export interface AuditEntry {
  at: string;
  source: AuditSource;
  actorUserId: string | null;
  event: string;
  payload: Record<string, unknown>;
  companyId?: string | null;
  workspaceId?: string | null;
}

function s(v: unknown, fallback = "unknown"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function targetLabel(p: Record<string, unknown>): string {
  // For membership events: payload.target is "company" | "workspace".
  const t = s(p.target, "");
  if (t === "company") return "customer";
  if (t === "workspace") return "workspace";
  return "scope";
}

export function eventSummary(entry: AuditEntry): string {
  const ev = entry.event;
  const p = entry.payload || {};

  // ── Portal settings ───────────────────────────────────────────────────
  if (ev === "portal.settings_updated") {
    const groups = Array.isArray(p.groups) ? (p.groups as string[]).join(", ") : "settings";
    return `Updated portal settings (${groups})`;
  }

  // ── Admin users ───────────────────────────────────────────────────────
  if (ev === "portal.admin_user_created") {
    return `Created user ${s(p.email ?? p.userId)}`;
  }
  if (ev === "portal.admin_user_updated") {
    const changed = Array.isArray(p.changed) ? (p.changed as string[]).join(", ") : "fields";
    return `Updated user ${s(p.userId)} (${changed})`;
  }
  if (ev === "portal.admin_user_deleted") {
    return `Deleted user ${s(p.userId)}`;
  }

  // ── Invites ───────────────────────────────────────────────────────────
  if (ev === "portal.invite_created") {
    return `Created invite for ${s(p.email)} as ${s(p.role, "member")}`;
  }
  if (ev === "portal.invite_resent") {
    const count = typeof p.resentCount === "number" ? ` (×${p.resentCount})` : "";
    return `Resent invite for ${s(p.email)}${count}`;
  }
  if (ev === "portal.invite_revoked") {
    return `Revoked invite for ${s(p.email)}`;
  }
  if (ev === "portal.invite_accepted") {
    return `Invite accepted by ${s(p.userId)}`;
  }

  // ── Invite email delivery (Deploy 5.14: new pretty-prints) ────────────
  if (ev === "portal.invite_email_sent") {
    return `Sent invite email to ${s(p.email)}`;
  }
  if (ev === "portal.invite_email_failed") {
    return `Invite email failed for ${s(p.email)} — ${s(p.error, "unknown error")}`;
  }

  // ── Membership write-through (Deploy 5.14: new pretty-prints) ─────────
  if (ev === "portal.membership_granted") {
    return `Granted ${targetLabel(p)} membership to ${s(p.userId)}`;
  }
  if (ev === "portal.membership_already_present") {
    return `Membership already present for ${s(p.userId)} in ${targetLabel(p)}`;
  }
  if (ev === "portal.membership_backfilled") {
    // Operator-initiated repair. Surface that distinction.
    return `Backfilled ${targetLabel(p)} membership for ${s(p.userId)}`;
  }
  if (ev === "portal.membership_write_failed") {
    return `Membership write failed for ${s(p.userId)} in ${targetLabel(p)} — ${s(p.error, "unknown error")}`;
  }

  // ── Company / workspace fall-throughs ────────────────────────────────
  if (ev.startsWith("company.")) {
    const verb = ev.slice("company.".length).replace(/_/g, " ");
    return `Customer ${verb}`;
  }
  if (ev.startsWith("workspace.")) {
    const verb = ev.slice("workspace.".length).replace(/_/g, " ");
    return `Workspace ${verb}`;
  }
  return ev;
}

export function sourceLabel(src: AuditSource): string {
  return src === "company" ? "Customer" : src === "workspace" ? "Workspace" : "Portal";
}
