"use client";
/**
 * Module Settings client form.
 *
 * Table of modules × [Portal | Companies | Workspaces]. Each row expands
 * into a checkbox picker for the two multi-scope columns. Save is per-row
 * so a mistake on one row does not block another.
 */
import { useState, useTransition } from "react";

export interface PortalModule {
  moduleId: string;
  label: string;
  href: string;
  group: string;
  operatorOnly: boolean;
  guideOnly: boolean;
  portalScope: boolean;
  companyIds: string[];
  workspaceIds: string[];
  updatedAt?: string;
}

export interface Company {
  companyId: string;
  name: string;
}

export interface Workspace {
  workspaceId: string;
  name: string;
  companyId: string;
  companyName?: string;
}

interface FormProps {
  initialModules: PortalModule[];
  companies: Company[];
  workspaces: Workspace[];
}

export function ModuleSettingsForm({ initialModules, companies, workspaces }: FormProps) {
  const [modules, setModules] = useState<PortalModule[]>(initialModules);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<Record<string, "idle" | "saving" | "ok" | "err">>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update(moduleId: string, patch: Partial<PortalModule>): void {
    setModules((prev) =>
      prev.map((m) => (m.moduleId === moduleId ? { ...m, ...patch } : m)),
    );
  }

  function toggleInList(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function save(moduleId: string): Promise<void> {
    const m = modules.find((x) => x.moduleId === moduleId);
    if (!m) return;
    setSaveState((s) => ({ ...s, [moduleId]: "saving" }));
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/portal-modules/${encodeURIComponent(moduleId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          portalScope: m.portalScope,
          companyIds: m.companyIds,
          workspaceIds: m.workspaceIds,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        setSaveState((s) => ({ ...s, [moduleId]: "err" }));
        setErrorMsg(`${moduleId}: ${res.status} ${body || res.statusText}`);
        return;
      }
      setSaveState((s) => ({ ...s, [moduleId]: "ok" }));
      setTimeout(() => {
        setSaveState((s) => ({ ...s, [moduleId]: "idle" }));
      }, 2000);
    } catch (err) {
      setSaveState((s) => ({ ...s, [moduleId]: "err" }));
      setErrorMsg(`${moduleId}: ${(err as Error).message}`);
    }
  }

  return (
    <div className="stack" style={{ display: "grid", gap: 16 }}>
      {errorMsg && (
        <div
          className="card"
          style={{
            padding: 12,
            borderColor: "var(--danger, #b03434)",
            color: "var(--danger, #b03434)",
          }}
        >
          {errorMsg}
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Module</th>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Group</th>
              <th style={{ textAlign: "center", padding: "10px 12px" }}>Portal scope</th>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Companies</th>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Workspaces</th>
              <th style={{ textAlign: "right", padding: "10px 12px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => {
              const isOpen = openId === m.moduleId;
              const state = saveState[m.moduleId] ?? "idle";
              return (
                <ModuleRow
                  key={m.moduleId}
                  m={m}
                  isOpen={isOpen}
                  state={state}
                  companies={companies}
                  workspaces={workspaces}
                  onToggleOpen={() => setOpenId(isOpen ? null : m.moduleId)}
                  onPortalScopeChange={(v) => update(m.moduleId, { portalScope: v })}
                  onToggleCompany={(id) =>
                    update(m.moduleId, {
                      companyIds: toggleInList(m.companyIds, id),
                    })
                  }
                  onToggleWorkspace={(id) =>
                    update(m.moduleId, {
                      workspaceIds: toggleInList(m.workspaceIds, id),
                    })
                  }
                  onSave={() => startTransition(() => save(m.moduleId))}
                  saveDisabled={pending}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModuleRow(props: {
  m: PortalModule;
  isOpen: boolean;
  state: "idle" | "saving" | "ok" | "err";
  companies: Company[];
  workspaces: Workspace[];
  onToggleOpen: () => void;
  onPortalScopeChange: (v: boolean) => void;
  onToggleCompany: (id: string) => void;
  onToggleWorkspace: (id: string) => void;
  onSave: () => void;
  saveDisabled: boolean;
}) {
  const { m, isOpen, state, companies, workspaces } = props;
  const stateLabel =
    state === "saving" ? "Saving…" : state === "ok" ? "Saved ✓" : state === "err" ? "Error" : "";

  return (
    <>
      <tr style={{ borderTop: "1px solid var(--border)" }}>
        <td style={{ padding: "10px 12px" }}>
          <div style={{ fontWeight: 600 }}>{m.label}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{m.moduleId}</div>
        </td>
        <td style={{ padding: "10px 12px" }}>{m.group}</td>
        <td style={{ textAlign: "center", padding: "10px 12px" }}>
          <input
            type="checkbox"
            checked={m.portalScope}
            onChange={(e) => props.onPortalScopeChange(e.target.checked)}
            disabled={m.guideOnly}
            aria-label={`Portal scope for ${m.label}`}
          />
        </td>
        <td style={{ padding: "10px 12px", color: "var(--muted)" }}>
          {m.companyIds.length === 0 ? "None" : `${m.companyIds.length} selected`}
        </td>
        <td style={{ padding: "10px 12px", color: "var(--muted)" }}>
          {m.workspaceIds.length === 0 ? "None" : `${m.workspaceIds.length} selected`}
        </td>
        <td style={{ textAlign: "right", padding: "10px 12px" }}>
          <button
            type="button"
            className="btn"
            onClick={props.onToggleOpen}
            style={{ marginRight: 6 }}
          >
            {isOpen ? "Hide" : "Edit"}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={props.onSave}
            disabled={props.saveDisabled || state === "saving"}
          >
            Save
          </button>
          {stateLabel && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                color:
                  state === "ok"
                    ? "var(--success, #2f7a2f)"
                    : state === "err"
                    ? "var(--danger, #b03434)"
                    : "var(--muted)",
              }}
            >
              {stateLabel}
            </span>
          )}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6} style={{ padding: "0 12px 16px 12px" }}>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Companies</div>
                <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6, padding: 8 }}>
                  {companies.length === 0 && (
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>No companies</div>
                  )}
                  {companies.map((c) => (
                    <label
                      key={c.companyId}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
                    >
                      <input
                        type="checkbox"
                        checked={m.companyIds.includes(c.companyId)}
                        onChange={() => props.onToggleCompany(c.companyId)}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Workspaces</div>
                <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6, padding: 8 }}>
                  {workspaces.length === 0 && (
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>No workspaces</div>
                  )}
                  {workspaces.map((w) => (
                    <label
                      key={w.workspaceId}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
                    >
                      <input
                        type="checkbox"
                        checked={m.workspaceIds.includes(w.workspaceId)}
                        onChange={() => props.onToggleWorkspace(w.workspaceId)}
                      />
                      <span>
                        {w.name}
                        {w.companyName && (
                          <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>
                            · {w.companyName}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
