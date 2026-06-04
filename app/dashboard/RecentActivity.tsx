/**
 * RecentActivity — Deploy 5 dashboard card.
 *
 * Operator-only. Renders the most recent ~20 portal-wide audit events with
 * source filter chips (All / Portal / Customers / Workspaces). Initial data
 * is hydrated from a server prop; subsequent filter changes hit the BFF
 * proxy at /api/admin/audit-feed.
 *
 * Palette stays in the sanctioned range (black/purple/grey/beige). No
 * red/green/yellow/amber indicators — pill variants are violet or gray.
 */
"use client";
import { useEffect, useState } from "react";
import { eventSummary, sourceLabel, type AuditEntry, type AuditSource } from "./audit/eventSummary";

export type { AuditEntry, AuditSource };

interface Props {
  initialEntries: AuditEntry[];
}

type Filter = "all" | AuditSource;

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

export function RecentActivity({ initialEntries }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [entries, setEntries] = useState<AuditEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial render uses the SSR-hydrated entries. Skip refetch when filter
    // is "all" on first mount.
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ limit: "20" });
        if (filter !== "all") qs.set("source", filter);
        const r = await fetch(`/api/admin/audit-feed?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`request failed (${r.status})`);
        const json = (await r.json()) as { entries: AuditEntry[] };
        if (!cancelled) setEntries(json.entries || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    // Only fetch when filter changes away from initial render.
    if (filter !== "all" || entries !== initialEntries) {
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "portal", label: "Portal" },
    { key: "company", label: "Customers" },
    { key: "workspace", label: "Workspaces" },
  ];

  return (
    <div className="list-card" style={{ marginBottom: 20 }}>
      <div className="list-card-header">
        <h3 className="list-card-title">Recent Activity</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`pill ${filter === c.key ? "is-violet" : "is-gray"}`}
              style={{
                cursor: "pointer",
                border: "none",
                fontSize: 12,
                padding: "4px 10px",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="list-card-body">
        {error ? (
          <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>
            Couldn&apos;t load activity — {error}
          </p>
        ) : entries.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>
            {loading ? "Loading…" : "No activity yet for this filter."}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Source</th>
                <th>Event</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={`${e.at}-${i}`}>
                  <td>{relativeTime(e.at)}</td>
                  <td>
                    <span className="pill is-violet">{sourceLabel(e.source)}</span>
                  </td>
                  <td>{eventSummary(e)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>
                    {e.actorUserId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
