/**
 * AuditFeedClient — Deploy 5.3 standalone audit log explorer.
 *
 * Full-page client for /dashboard/audit. Adds actor-id filter and "Load more"
 * cursor pagination on top of the Recent Activity card's filter chips.
 * Initial entries are hydrated from the server; subsequent loads hit the BFF
 * proxy at /api/admin/audit-feed.
 *
 * Palette: sanctioned (black / purple / grey / beige). No red/green/amber.
 */
"use client";

import { useEffect, useRef, useState } from "react";

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

type Filter = "all" | AuditSource;

const PAGE_SIZE = 50;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const delta = Date.now() - then;
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sourceLabel(s: AuditSource): string {
  return s === "company" ? "Customer" : s === "workspace" ? "Workspace" : "Portal";
}

function eventSummary(entry: AuditEntry): string {
  const ev = entry.event;
  const p = entry.payload || {};
  if (ev === "portal.settings_updated") {
    const groups = Array.isArray(p.groups) ? (p.groups as string[]).join(", ") : "settings";
    return `Updated portal settings (${groups})`;
  }
  if (ev === "portal.invite_created") {
    return `Created invite for ${String(p.email ?? "unknown")} as ${String(p.role ?? "member")}`;
  }
  if (ev === "portal.invite_revoked") {
    return `Revoked invite for ${String(p.email ?? "unknown")}`;
  }
  if (ev === "portal.invite_accepted") {
    return `Invite accepted by ${String(p.userId ?? "unknown")}`;
  }
  if (ev === "portal.admin_user_created") {
    return `Created user ${String(p.email ?? p.userId ?? "unknown")}`;
  }
  if (ev === "portal.admin_user_updated") {
    const changed = Array.isArray(p.changed) ? (p.changed as string[]).join(", ") : "fields";
    return `Updated user ${String(p.userId ?? "unknown")} (${changed})`;
  }
  if (ev === "portal.admin_user_deleted") {
    return `Deleted user ${String(p.userId ?? "unknown")}`;
  }
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

interface Props {
  initialEntries: AuditEntry[];
  initialCursor: string | null;
}

export function AuditFeedClient({ initialEntries, initialCursor }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [actorDraft, setActorDraft] = useState("");
  const [actor, setActor] = useState<string>("");
  const [entries, setEntries] = useState<AuditEntry[]>(initialEntries);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitial = useRef(true);

  async function load(opts: { append?: boolean } = {}) {
    const append = !!opts.append;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (filter !== "all") qs.set("source", filter);
      if (actor) qs.set("actorUserId", actor);
      if (append && cursor) qs.set("cursor", cursor);
      const r = await fetch(`/api/admin/audit-feed?${qs.toString()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`request failed (${r.status})`);
      const json = (await r.json()) as { entries: AuditEntry[]; nextCursor: string | null };
      const next = json.entries || [];
      setEntries((prev) => (append ? prev.concat(next) : next));
      setCursor(json.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Refetch from scratch whenever the filter or applied actor changes (after first mount).
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, actor]);

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "portal", label: "Portal" },
    { key: "company", label: "Customers" },
    { key: "workspace", label: "Workspaces" },
  ];

  function applyActor(e: React.FormEvent) {
    e.preventDefault();
    setActor(actorDraft.trim());
  }

  function clearActor() {
    setActorDraft("");
    setActor("");
  }

  return (
    <div className="list-card">
      <div className="list-card-header" style={{ flexWrap: "wrap", gap: 12 }}>
        <h3 className="list-card-title" style={{ marginRight: "auto" }}>Audit Log</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`pill ${filter === c.key ? "is-violet" : "is-gray"}`}
              style={{ cursor: "pointer", border: "none", fontSize: 12, padding: "4px 10px" }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <form onSubmit={applyActor} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Filter by actor userId"
            value={actorDraft}
            onChange={(e) => setActorDraft(e.target.value)}
            style={{
              padding: "6px 10px",
              background: "var(--surface-2)",
              color: "var(--fg)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              fontSize: 13,
              minWidth: 240,
            }}
          />
          <button
            type="submit"
            className="pill is-violet"
            style={{ cursor: "pointer", border: "none", fontSize: 12, padding: "4px 10px" }}
          >
            Apply
          </button>
          {actor && (
            <button
              type="button"
              onClick={clearActor}
              className="pill is-gray"
              style={{ cursor: "pointer", border: "none", fontSize: 12, padding: "4px 10px" }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="list-card-body">
        {error ? (
          <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>
            Couldn&apos;t load activity — {error}
          </p>
        ) : entries.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>
            {loading ? "Loading…" : "No activity for this filter."}
          </p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>When</th>
                  <th style={{ width: 120 }}>Source</th>
                  <th>Event</th>
                  <th style={{ width: 260 }}>Actor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.at}-${i}`}>
                    <td title={e.at}>{relativeTime(e.at)}</td>
                    <td>
                      <span className="pill is-violet">{sourceLabel(e.source)}</span>
                    </td>
                    <td>{eventSummary(e)}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13, fontFamily: "monospace" }}>
                      {e.actorUserId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "center" }}>
              {cursor ? (
                <button
                  type="button"
                  onClick={() => load({ append: true })}
                  disabled={loadingMore}
                  className="pill is-gray"
                  style={{ cursor: "pointer", border: "none", fontSize: 13, padding: "8px 18px" }}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              ) : entries.length >= PAGE_SIZE ? (
                <span style={{ color: "var(--muted)", fontSize: 12 }}>End of history.</span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
