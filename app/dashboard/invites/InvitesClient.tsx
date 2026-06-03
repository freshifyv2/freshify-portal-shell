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

export interface InviteRow {
  inviteId: string;
  email: string;
  token: string;
  companyId: string | null;
  workspaceId: string | null;
  role: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: string;
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

  // Mint form state
  const [mintEmail, setMintEmail] = useState("");
  const [mintRole, setMintRole] = useState("member");
  const [mintCompanyId, setMintCompanyId] = useState("");
  const [mintWorkspaceId, setMintWorkspaceId] = useState("");

  const lock = busy !== null;

  const allSelected = useMemo(
    () => invites.length > 0 && selected.size === invites.length,
    [invites.length, selected.size],
  );
  const someSelected = selected.size > 0 && !allSelected;

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
      if (prev.size === invites.length) return new Set();
      return new Set(invites.map((i) => i.inviteId));
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

      {/* Table */}
      <div className="data-table-wrap">
        {invites.length === 0 ? (
          <p style={{ color: "var(--muted)", padding: 16, margin: 0 }}>
            No outstanding invites.
          </p>
        ) : (
          <table className="data-table">
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
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const isSelected = selected.has(inv.inviteId);
                const isRevoking = busy === `revoke:${inv.inviteId}`;
                const justCopied = copiedInviteId === inv.inviteId;
                const scope =
                  inv.workspaceId
                    ? `wsp ${inv.workspaceId.slice(0, 12)}…`
                    : inv.companyId
                      ? `cmp ${inv.companyId.slice(0, 12)}…`
                      : "portal";
                return (
                  <tr key={inv.inviteId}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select invite for ${inv.email}`}
                        checked={isSelected}
                        onChange={() => toggleOne(inv.inviteId)}
                        disabled={lock}
                      />
                    </td>
                    <td>
                      <span className="data-table-strong">{inv.email}</span>
                      <div className="data-table-sub" style={{ fontSize: 11 }}>
                        {inv.inviteId}
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
                      <div style={{ display: "flex", gap: 8 }}>
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
                          onClick={() => revokeOne(inv.inviteId)}
                          disabled={lock}
                        >
                          {isRevoking ? "Revoking…" : "Revoke"}
                        </button>
                      </div>
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

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--line)",
  background: "var(--surface-1)",
  color: "var(--fg)",
  fontSize: 13,
  fontFamily: "inherit",
};
