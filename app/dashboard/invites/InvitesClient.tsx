"use client";

/**
 * InvitesClient — operator-only invite management UI (Deploy 5.4).
 *
 * Renders:
 *   - inline "Mint invite" form (email + role + optional companyId/workspaceId)
 *   - table of outstanding pending invites with checkbox column
 *   - per-row copy-invite-link, revoke
 *   - sticky bulk action bar when any rows are selected (revoke selected)
 *
 * All mutations go through the portal-shell BFF (which forwards to users-be
 * with the operator's session token). The server returns the new list shape
 * on every action so we keep client state in sync without router.refresh.
 */
import { useMemo, useState } from "react";

// Deploy 5.7 — client-side narrowing of the invites list. Server still
// returns every outstanding invite (operator-only, capped); the operator
// just needs a way to focus the table once volume grows.
type RowScope = "all" | "portal" | "customer" | "workspace";

// Deploy 5.12 — membership status derived server-side from the latest
// portal.membership_* audit event for each invite.
export type MembershipStatus =
  | "pending"
  | "granted"
  | "already_member"
  | "failed"
  | "missing"
  | "n/a";

export interface InviteRow {
  inviteId: string;
  email: string;
  token: string;
  companyId: string | null;
  companyName?: string | null;
  workspaceId: string | null;
  workspaceName?: string | null;
  invitedByName?: string | null;
  acceptedByName?: string | null;
  role: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  resentCount?: number;
  emailSentAt?: string | null;
  emailSendError?: string | null;
  emailProvider?: string | null;
  membershipStatus?: MembershipStatus;
  membershipEventAt?: string | null;
  membershipError?: string | null;
}

interface BatchResult {
  requested?: number;
  revoked?: number;
  alreadyRevoked?: number;
  failed?: number;
  results?: Array<{ inviteId: string; ok: boolean; status?: string; error?: string }>;
}

function buildInviteLink(token: string): string {
  if (typeof window === "undefined") return `/signup?token=${token}`;
  return `${window.location.origin}/signup?token=${token}`;
}

export function InvitesClient({ initialInvites }: { initialInvites: InviteRow[] }) {
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [resentInviteId, setResentInviteId] = useState<string | null>(null);

  // Deploy 5.7 — narrowing filters (purely client-side over the loaded set).
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<RowScope>("all");
  const [resentOnly, setResentOnly] = useState(false);
  // Deploy 5.12 — "needs attention" = accepted invite with no granted/
  // already_member event (i.e. failed or missing) so the operator can
  // spot invites that need a membership backfill.
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);

  // Mint form state
  const [mintEmail, setMintEmail] = useState("");
  const [mintRole, setMintRole] = useState("member");
  const [mintCompanyId, setMintCompanyId] = useState("");
  const [mintWorkspaceId, setMintWorkspaceId] = useState("");

  const lock = busy !== null;

  const filteredInvites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invites.filter((inv) => {
      if (resentOnly && !(inv.resentCount && inv.resentCount > 0)) return false;
      if (needsAttentionOnly) {
        const s = inv.membershipStatus;
        if (s !== "failed" && s !== "missing") return false;
      }
      if (scopeFilter === "portal" && (inv.companyId || inv.workspaceId)) return false;
      if (scopeFilter === "customer" && !(inv.companyId && !inv.workspaceId)) return false;
      if (scopeFilter === "workspace" && !inv.workspaceId) return false;
      if (!q) return true;
      const hay = [
        inv.email,
        inv.role,
        inv.companyId ?? "",
        inv.workspaceId ?? "",
        inv.inviteId,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [invites, searchQuery, scopeFilter, resentOnly, needsAttentionOnly]);

  const hasFilters =
    searchQuery !== "" ||
    scopeFilter !== "all" ||
    resentOnly ||
    needsAttentionOnly;

  // Deploy 5.12 — count of invites that need backfill, surfaced in the
  // filter bar so the operator can see at a glance how much is outstanding.
  const needsAttentionCount = useMemo(
    () =>
      invites.filter(
        (i) =>
          i.membershipStatus === "failed" || i.membershipStatus === "missing",
      ).length,
    [invites],
  );

  // Deploy 5.14 — count of invites whose email delivery failed because the
  // COMMS_SHARED_SECRET is not configured in the runtime. Surfaced as a single
  // top-of-page notice so the operator understands every "Failed" badge in
  // the email column comes from the same missing-config root cause, not a
  // per-invite bug. Operator action: set the secret in Cloud Run (out-of-band).
  const commsSecretMissingCount = useMemo(
    () =>
      invites.filter((i) => i.emailSendError === "comms_secret_not_configured")
        .length,
    [invites],
  );

  // Selection-aware aggregates work against the *filtered* set so "select all"
  // means "all visible", which is what the operator expects when narrowing.
  // Deploy 5.12 — accepted invites can't be revoked, so they're excluded
  // from selection state.
  const selectableInvites = useMemo(
    () => filteredInvites.filter((i) => i.status === "pending"),
    [filteredInvites],
  );
  const allSelected = useMemo(
    () =>
      selectableInvites.length > 0 &&
      selectableInvites.every((i) => selected.has(i.inviteId)),
    [selectableInvites, selected],
  );
  const someSelected =
    !allSelected && selectableInvites.some((i) => selected.has(i.inviteId));

  function toggleOne(inviteId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(inviteId)) next.delete(inviteId);
      else next.add(inviteId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      // If all visible-and-selectable rows are already selected, deselect
      // just those (keep hidden-row selections intact). Otherwise add every
      // visible selectable row. Accepted rows are excluded because
      // revoke-batch only operates on pending invites.
      const visibleIds = selectableInvites.map((i) => i.inviteId);
      const allVisibleSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  async function refreshList() {
    const r = await fetch("/api/portal-invites", { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json().catch(() => ({}));
    if (Array.isArray(data.invites)) setInvites(data.invites);
  }

  async function mintInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!mintEmail.trim()) return;
    setBusy("mint");
    setError(null);
    setInfo(null);
    try {
      const body: Record<string, unknown> = {
        email: mintEmail.trim(),
        role: mintRole,
      };
      if (mintCompanyId.trim()) body.companyId = mintCompanyId.trim();
      if (mintWorkspaceId.trim()) body.workspaceId = mintWorkspaceId.trim();
      const r = await fetch("/api/portal-invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `mint failed: ${r.status}`);
      setMintEmail("");
      setMintCompanyId("");
      setMintWorkspaceId("");
      setInfo(`Invite minted for ${j.email || body.email}. Use the copy link in the row to share.`);
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(inviteId: string, token: string) {
    const link = buildInviteLink(token);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        setCopiedInviteId(inviteId);
        setTimeout(() => setCopiedInviteId((cur) => (cur === inviteId ? null : cur)), 2000);
      } else {
        // Fallback: select+show
        window.prompt("Copy invite link", link);
      }
    } catch {
      window.prompt("Copy invite link", link);
    }
  }

  async function resendEmailOnly(inviteId: string) {
    setBusy(`resend-email:${inviteId}`);
    setError(null);
    setInfo(null);
    try {
      const r = await fetch(
        `/api/portal-invites/${encodeURIComponent(inviteId)}/resend-email`,
        { method: "POST" },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(j.error || `resend-email failed: ${r.status}`);
      }
      if (j.ok === false) {
        throw new Error(j.error || "send failed");
      }
      setInfo(
        `Re-sent invite email${j.messageId ? ` (${j.messageId})` : ""}.`,
      );
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resendInvite(inviteId: string) {
    setBusy(`resend:${inviteId}`);
    setError(null);
    setInfo(null);
    try {
      const r = await fetch(
        `/api/portal-invites/${encodeURIComponent(inviteId)}/resend`,
        { method: "POST" },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `resend failed: ${r.status}`);
      // Auto-copy the freshly minted link so the operator can paste it
      // immediately. New expiresAt is in j.expiresAt.
      const link = buildInviteLink(j.token);
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(link);
        }
      } catch {
        // Non-fatal — the link is still visible in the row after refresh.
      }
      setResentInviteId(inviteId);
      setTimeout(() => setResentInviteId((cur) => (cur === inviteId ? null : cur)), 2500);
      const newExpiry = j.expiresAt ? new Date(j.expiresAt).toLocaleString() : "updated expiry";
      setInfo(
        `Resent invite for ${j.email}. New link copied to clipboard. Expires ${newExpiry}.`,
      );
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeOne(inviteId: string) {
    setBusy(`revoke:${inviteId}`);
    setError(null);
    setInfo(null);
    try {
      const r = await fetch(`/api/portal-invites/${encodeURIComponent(inviteId)}`, {
        method: "DELETE",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `revoke failed: ${r.status}`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeBatch() {
    const inviteIds = Array.from(selected);
    if (inviteIds.length === 0) return;
    setBusy("batch:revoke");
    setError(null);
    setInfo(null);
    try {
      const r = await fetch("/api/portal-invites/revoke-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteIds }),
      });
      const j: BatchResult = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error((j as { error?: string }).error || `batch revoke failed: ${r.status}`);
      }
      const revoked = j.revoked ?? 0;
      const alreadyRevoked = j.alreadyRevoked ?? 0;
      const failed = j.failed ?? 0;
      const parts: string[] = [];
      if (revoked > 0) parts.push(`${revoked} revoked`);
      if (alreadyRevoked > 0) parts.push(`${alreadyRevoked} already revoked`);
      if (failed > 0) parts.push(`${failed} failed`);
      setInfo(parts.length ? parts.join(" · ") : "Batch revoke complete.");
      setSelected(new Set());
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Deploy 5.13 — per-row backfill: write the missing membership row for
  // an accepted invite. Idempotent on the backend; we just refresh the
  // list to pick up the new badge state.
  async function backfillOne(inviteId: string) {
    setBusy(`backfill:${inviteId}`);
    setError(null);
    setInfo(null);
    try {
      const r = await fetch(
        `/api/portal-invites/${encodeURIComponent(inviteId)}/backfill-membership`,
        { method: "POST" },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          (j as { error?: string }).error || `backfill failed: ${r.status}`,
        );
      }
      const action = (j as { action?: string }).action ?? "";
      if (action === "granted") setInfo("Membership row written.");
      else if (action === "already_present")
        setInfo("Already a member — no change needed.");
      else if (action === "failed")
        setError(
          `Backfill failed: ${(j as { error?: string }).error ?? "unknown"}`,
        );
      else if (action === "skipped")
        setInfo("Portal-level invite — no membership row needed.");
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Deploy 5.13 — bulk backfill across every accepted invite in the last
  // 90 days whose membership status is missing/failed. The backend caps
  // each call; if hasMore is returned we prompt the operator to run again.
  async function backfillAll() {
    setBusy("batch:backfill");
    setError(null);
    setInfo(null);
    try {
      const r = await fetch("/api/portal-invites/backfill-memberships", {
        method: "POST",
      });
      const j = (await r.json().catch(() => ({}))) as {
        scanned?: number;
        attempted?: number;
        granted?: number;
        alreadyPresent?: number;
        failed?: number;
        hasMore?: boolean;
        error?: string;
      };
      if (!r.ok) throw new Error(j.error || `bulk backfill failed: ${r.status}`);
      const parts: string[] = [];
      if (j.granted) parts.push(`${j.granted} granted`);
      if (j.alreadyPresent) parts.push(`${j.alreadyPresent} already a member`);
      if (j.failed) parts.push(`${j.failed} failed`);
      if (!parts.length) parts.push("Nothing to backfill.");
      if (j.hasMore) parts.push("more remaining — click again to continue");
      setInfo(parts.join(" · "));
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Mint form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Mint invite</h3>
        <form onSubmit={mintInvite} style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(220px, 1fr) 140px minmax(180px, 1fr) minmax(180px, 1fr) auto" }}>
          <input
            type="email"
            required
            placeholder="email@company.com"
            value={mintEmail}
            onChange={(e) => setMintEmail(e.target.value)}
            disabled={lock}
            className="input"
            style={inputStyle}
          />
          <select
            value={mintRole}
            onChange={(e) => setMintRole(e.target.value)}
            disabled={lock}
            style={inputStyle}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="operator">operator</option>
          </select>
          <input
            type="text"
            placeholder="companyId (optional)"
            value={mintCompanyId}
            onChange={(e) => setMintCompanyId(e.target.value)}
            disabled={lock}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="workspaceId (optional)"
            value={mintWorkspaceId}
            onChange={(e) => setMintWorkspaceId(e.target.value)}
            disabled={lock}
            style={inputStyle}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={lock || !mintEmail.trim()}
          >
            {busy === "mint" ? "Minting…" : "Mint invite"}
          </button>
        </form>
      </div>

      {info && (
        <div
          style={{
            margin: "0 0 12px",
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            color: "var(--fg)",
            fontSize: 13,
          }}
        >
          {info}
        </div>
      )}
      {error && (
        <div className="warning-banner" style={{ margin: "0 0 12px" }}>
          <span className="warning-banner-icon" aria-hidden>⚠</span>
          {error}
        </div>
      )}

      {commsSecretMissingCount > 0 && (
        <div
          style={{
            margin: "0 0 12px",
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            color: "var(--fg)",
            fontSize: 13,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
          role="note"
        >
          <span style={{ color: "var(--muted)", fontWeight: 600, flexShrink: 0 }}>
            Email delivery
          </span>
          <span style={{ color: "var(--muted)" }}>
            {commsSecretMissingCount} {commsSecretMissingCount === 1 ? "invite has" : "invites have"}{" "}
            <code style={{ background: "var(--surface-1)", padding: "1px 4px", borderRadius: 4 }}>
              comms_secret_not_configured
            </code>{" "}
            in the Email delivery column. This is a runtime configuration
            issue — the <code style={{ background: "var(--surface-1)", padding: "1px 4px", borderRadius: 4 }}>COMMS_SHARED_SECRET</code>{" "}
            environment variable is not set on the users-be service. Set the
            secret in Cloud Run and resend the affected invites to clear the
            flag. Acceptance links remain valid; only the email send failed.
          </span>
        </div>
      )}

      {/* Sticky bulk bar */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            margin: "0 0 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
            {selected.size} selected
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={lock}
            onClick={revokeBatch}
          >
            {busy === "batch:revoke" ? "Revoking…" : `Revoke ${selected.size}`}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={lock}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {/* Narrowing filters (Deploy 5.7) */}
      {invites.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            padding: "10px 14px",
            margin: "0 0 12px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--surface-1)",
          }}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, role, company, workspace, invite id"
            style={{ ...inputStyle, minWidth: 280, flex: 1 }}
          />
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as RowScope)}
            style={inputStyle}
          >
            <option value="all">All scopes</option>
            <option value="portal">Portal-level only</option>
            <option value="customer">Customer-scoped</option>
            <option value="workspace">Workspace-scoped</option>
          </select>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--fg-2)",
            }}
          >
            <input
              type="checkbox"
              checked={resentOnly}
              onChange={(e) => setResentOnly(e.target.checked)}
            />
            Resent only
          </label>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--fg-2)",
            }}
            title="Accepted invites with no membership granted — needs backfill"
          >
            <input
              type="checkbox"
              checked={needsAttentionOnly}
              onChange={(e) => setNeedsAttentionOnly(e.target.checked)}
            />
            Needs attention
            {needsAttentionCount > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  fontSize: 11,
                  color: "var(--fg)",
                }}
              >
                {needsAttentionCount}
              </span>
            )}
          </label>
          {needsAttentionCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={backfillAll}
              disabled={lock}
              title="Write missing membership rows for every accepted invite that needs one"
            >
              {busy === "batch:backfill"
                ? "Backfilling all…"
                : `Backfill all (${needsAttentionCount})`}
            </button>
          )}
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
            {filteredInvites.length} of {invites.length}
          </span>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery("");
                setScopeFilter("all");
                setResentOnly(false);
                setNeedsAttentionOnly(false);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrap">
        {invites.length === 0 ? (
          <p style={{ color: "var(--muted)", padding: 16, margin: 0 }}>
            No outstanding invites.
          </p>
        ) : filteredInvites.length === 0 ? (
          <p style={{ color: "var(--muted)", padding: 16, margin: 0 }}>
            No invites match the current filters.
          </p>
        ) : (
          <table className="data-table data-table--invites">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    aria-label={allSelected ? "Deselect all" : "Select all"}
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    disabled={lock}
                  />
                </th>
                <th>Email</th>
                <th>Role</th>
                <th>Scope</th>
                <th>Invited</th>
                <th>Expires</th>
                <th>Email</th>
                <th>Acceptance</th>
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map((inv) => {
                const isSelected = selected.has(inv.inviteId);
                const isRevoking = busy === `revoke:${inv.inviteId}`;
                const justCopied = copiedInviteId === inv.inviteId;
                // Deploy 5.15 — prefer hydrated names from the backend; fall
                // back to the truncated ID label so older entries still render.
                const scope =
                  inv.workspaceId
                    ? (inv.workspaceName ??
                      `wsp ${inv.workspaceId.slice(0, 12)}…`)
                    : inv.companyId
                      ? (inv.companyName ?? `cmp ${inv.companyId.slice(0, 12)}…`)
                      : "portal";
                const isAccepted = inv.status === "accepted";
                return (
                  <tr
                    key={inv.inviteId}
                    style={isAccepted ? { opacity: 0.85 } : undefined}
                  >
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select invite for ${inv.email}`}
                        checked={isSelected}
                        onChange={() => toggleOne(inv.inviteId)}
                        disabled={lock || isAccepted}
                        title={
                          isAccepted
                            ? "Accepted invites can't be revoked"
                            : undefined
                        }
                      />
                    </td>
                    <td>
                      <div className="invite-email-cell">
                        <span className="data-table-strong">{inv.email}</span>
                        <div className="invite-email-meta">
                          <span title={inv.inviteId}>
                            {inv.inviteId.slice(0, 12)}…
                          </span>
                          {inv.resentCount && inv.resentCount > 0 ? (
                            <span
                              className="invite-resent-badge"
                              title={`Resent ${inv.resentCount} time${inv.resentCount === 1 ? "" : "s"}`}
                            >
                              resent ×{inv.resentCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>{inv.role}</td>
                    <td>
                      <span className="data-table-sub">{scope}</span>
                    </td>
                    <td>
                      <span className="data-table-sub">
                        {new Date(inv.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="data-table-sub">
                        {new Date(inv.expiresAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      {inv.emailSentAt ? (
                        <span
                          className="data-table-sub"
                          title={`Provider: ${inv.emailProvider ?? "unknown"}`}
                        >
                          Sent {new Date(inv.emailSentAt).toLocaleString()}
                        </span>
                      ) : inv.emailSendError ? (
                        <span
                          className="data-table-sub"
                          title={inv.emailSendError}
                          style={{ color: "var(--fg-2)" }}
                        >
                          Failed — {inv.emailSendError.slice(0, 32)}
                          {inv.emailSendError.length > 32 ? "…" : ""}
                        </span>
                      ) : (
                        <span className="data-table-sub" style={{ color: "var(--fg-2)" }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <MembershipBadge invite={inv} />
                        {(inv.membershipStatus === "missing" ||
                          inv.membershipStatus === "failed") && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => backfillOne(inv.inviteId)}
                            disabled={lock}
                            title="Write the missing membership row for this accepted invite"
                          >
                            {busy === `backfill:${inv.inviteId}`
                              ? "Backfilling…"
                              : "Backfill"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {isAccepted ? (
                        <span
                          className="data-table-sub"
                          style={{ color: "var(--fg-2)" }}
                          title={
                            inv.acceptedAt
                              ? `Accepted ${new Date(inv.acceptedAt).toLocaleString()}`
                              : "Accepted"
                          }
                        >
                          Accepted
                          {inv.acceptedAt
                            ? ` · ${new Date(inv.acceptedAt).toLocaleDateString()}`
                            : ""}
                        </span>
                      ) : (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => copyLink(inv.inviteId, inv.token)}
                            disabled={lock}
                          >
                            {justCopied ? "Copied" : "Copy link"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => resendEmailOnly(inv.inviteId)}
                            disabled={lock}
                            title="Retry the email send without rotating the token"
                          >
                            {busy === `resend-email:${inv.inviteId}`
                              ? "Sending…"
                              : "Retry email"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => resendInvite(inv.inviteId)}
                            disabled={lock}
                            title="Generate a new token + extend expiry, then copy the new link"
                          >
                            {busy === `resend:${inv.inviteId}`
                              ? "Resending…"
                              : resentInviteId === inv.inviteId
                                ? "Resent"
                                : "Resend"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => revokeOne(inv.inviteId)}
                            disabled={lock}
                          >
                            {isRevoking ? "Revoking…" : "Revoke"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Deploy 5.12 — surface the membership outcome for each invite. Uses
// neutral palette tokens only (no red/green/amber) per the white/purple/
// grey/beige rule. "Failed" and "missing" carry a beige tone to flag
// that operator attention is needed; granted/already_member are quiet.
function MembershipBadge({ invite }: { invite: InviteRow }) {
  const status = invite.membershipStatus ?? "pending";
  const tones: Record<
    string,
    { label: string; bg: string; fg: string; border: string }
  > = {
    granted: {
      label: "Granted",
      bg: "var(--violet-soft)",
      fg: "var(--violet-text)",
      border: "var(--violet-soft)",
    },
    already_member: {
      label: "Already member",
      bg: "var(--surface-2)",
      fg: "var(--fg-2)",
      border: "var(--line)",
    },
    failed: {
      label: "Failed",
      bg: "var(--beige-soft)",
      fg: "var(--beige-text)",
      border: "var(--beige-soft)",
    },
    missing: {
      label: "Missing — backfill",
      bg: "var(--beige-soft)",
      fg: "var(--beige-text)",
      border: "var(--beige-soft)",
    },
    pending: {
      label: "—",
      bg: "transparent",
      fg: "var(--muted)",
      border: "transparent",
    },
    "n/a": {
      label: "Portal",
      bg: "var(--surface-2)",
      fg: "var(--fg-2)",
      border: "var(--line)",
    },
  };
  const tone = tones[status] ?? tones.pending;
  const title = (() => {
    if (status === "failed" && invite.membershipError) {
      return `Membership write failed: ${invite.membershipError}`;
    }
    if (status === "missing") {
      return "Accepted but no membership audit event found — backfill required";
    }
    if (invite.membershipEventAt) {
      return `Recorded ${new Date(invite.membershipEventAt).toLocaleString()}`;
    }
    if (status === "pending") return "Invite not yet accepted";
    if (status === "n/a") return "Portal-level invite — no membership row needed";
    return undefined;
  })();
  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {tone.label}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--line)",
  background: "var(--surface-1)",
  color: "var(--fg)",
  fontSize: 13,
  fontFamily: "inherit",
};
