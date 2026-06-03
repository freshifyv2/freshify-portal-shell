"use client";

import { useState } from "react";

export interface PortalSettings {
  branding: {
    appName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    accentColor: string;
    backgroundTone: string;
    sidebarStyle: "light" | "dark" | "inverted";
    defaultTheme: "system" | "light" | "dark";
    allowUserThemeOverride: boolean;
  };
  email: {
    provider: "freshify-comms" | "smtp" | "none";
    senderName: string;
    senderAddress: string;
    replyTo: string | null;
  };
  sms: {
    provider: "twilio" | "none";
    senderId: string | null;
    twilioVerifyServiceSid: string | null;
  };
  auth: {
    allowEmailPassword: boolean;
    allowPhoneOtp: boolean;
    requireEmailVerification: boolean;
    sessionTtlHours: number;
  };
  invites: {
    expiryHours: number;
    defaultCompanyRole: "admin" | "member";
  };
  catalog: {
    companyTypes: string[];
    workspaceTypes: string[];
  };
  audit: {
    retentionDays: number;
  };
}

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "ok" } | { kind: "err"; msg: string };

const SECTION_STYLE: React.CSSProperties = { marginBottom: 20 };
const ROW_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr)",
  gap: 16,
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid var(--line)",
};
const LABEL_STYLE: React.CSSProperties = { color: "var(--fg-2)", fontSize: 14 };
const HINT_STYLE: React.CSSProperties = { color: "var(--muted)", fontSize: 12, marginTop: 4 };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={ROW_STYLE}>
      <div>
        <div style={LABEL_STYLE}>{label}</div>
        {hint ? <div style={HINT_STYLE}>{hint}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="card" style={SECTION_STYLE}>
      <header style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        <p style={{ ...HINT_STYLE, marginTop: 4 }}>{description}</p>
      </header>
      <div>{children}</div>
    </section>
  );
}

const inputCls = "ps-input";

export function PortalSettingsForm({ initial }: { initial: PortalSettings }) {
  const [s, setS] = useState<PortalSettings>(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function setGroup<K extends keyof PortalSettings>(group: K, patch: Partial<PortalSettings[K]>) {
    setS((prev) => ({ ...prev, [group]: { ...(prev[group] as object), ...(patch as object) } as PortalSettings[K] }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving" });
    try {
      const r = await fetch("/api/portal-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!r.ok) {
        const t = await r.text();
        setStatus({ kind: "err", msg: `Save failed (${r.status}): ${t.slice(0, 200)}` });
        return;
      }
      // Broadcast the new settings so other in-page consumers (ThemeProvider /
      // ThemeToggle) can react without a full reload. We only ship the
      // fields anyone listens to today; expand as needed.
      try {
        window.dispatchEvent(
          new CustomEvent("portal-settings-changed", {
            detail: {
              branding: {
                defaultTheme: s.branding.defaultTheme,
                allowUserThemeOverride: s.branding.allowUserThemeOverride,
              },
            },
          }),
        );
      } catch {
        /* CustomEvent unavailable in very old browsers — ignore. */
      }
      setStatus({ kind: "ok" });
    } catch (err: any) {
      setStatus({ kind: "err", msg: err?.message || "Network error" });
    }
  }

  return (
    <form onSubmit={onSave}>
      <style>{`
        .ps-input {
          width: 100%; padding: 8px 10px;
          background: var(--surface-2); color: var(--fg);
          border: 1px solid var(--line); border-radius: 6px;
          font-size: 14px; font-family: inherit;
        }
        .ps-input:focus { outline: none; border-color: var(--violet); }
        .ps-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
        .ps-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 999px;
          background: var(--surface-2); border: 1px solid var(--line);
          font-size: 12px; color: var(--fg-2); margin: 2px 4px 2px 0;
        }
        .ps-pill button {
          background: transparent; border: 0; cursor: pointer;
          color: var(--muted); padding: 0 0 0 4px; font-size: 14px; line-height: 1;
        }
        .ps-actions {
          position: sticky; bottom: 0; z-index: 5;
          margin-top: 16px; padding: 12px 16px;
          background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
          display: flex; align-items: center; gap: 12px; justify-content: flex-end;
        }
        .ps-save {
          background: var(--violet); color: white; border: 0;
          padding: 9px 18px; border-radius: 8px; font-weight: 600;
          font-size: 14px; cursor: pointer;
        }
        .ps-save[disabled] { opacity: 0.6; cursor: wait; }
        .ps-status-ok { color: var(--beige); font-size: 13px; }
        .ps-status-err { color: var(--fg-2); font-size: 13px; }
      `}</style>

      {/* ── Branding ────────────────────────────────────────────────── */}
      <SectionCard title="Branding" description="App identity, theme defaults, and visual tone.">
        <Field label="App name">
          <input className={inputCls} value={s.branding.appName} onChange={(e) => setGroup("branding", { appName: e.target.value })} />
        </Field>
        <Field label="Logo URL" hint="Optional; use a square PNG/SVG hosted on a public CDN.">
          <input className={inputCls} value={s.branding.logoUrl ?? ""} onChange={(e) => setGroup("branding", { logoUrl: e.target.value || null })} />
        </Field>
        <Field label="Favicon URL" hint="32×32 ICO or PNG.">
          <input className={inputCls} value={s.branding.faviconUrl ?? ""} onChange={(e) => setGroup("branding", { faviconUrl: e.target.value || null })} />
        </Field>
        <Field label="Accent color" hint="Used for primary actions and active states.">
          <input className={inputCls} value={s.branding.accentColor} onChange={(e) => setGroup("branding", { accentColor: e.target.value })} style={{ maxWidth: 160 }} />
        </Field>
        <Field label="Background tone">
          <input className={inputCls} value={s.branding.backgroundTone} onChange={(e) => setGroup("branding", { backgroundTone: e.target.value })} style={{ maxWidth: 160 }} />
        </Field>
        <Field label="Sidebar style">
          <select className={inputCls} value={s.branding.sidebarStyle} onChange={(e) => setGroup("branding", { sidebarStyle: e.target.value as any })} style={{ maxWidth: 200 }}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="inverted">Inverted</option>
          </select>
        </Field>
        <Field label="Default theme" hint="Applies to every user who hasn't set their own preference.">
          <select className={inputCls} value={s.branding.defaultTheme} onChange={(e) => setGroup("branding", { defaultTheme: e.target.value as any })} style={{ maxWidth: 200 }}>
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <Field label="Allow theme override" hint="If off, the topbar theme toggle is hidden and the default theme is enforced.">
          <label className="ps-toggle">
            <input type="checkbox" checked={s.branding.allowUserThemeOverride} onChange={(e) => setGroup("branding", { allowUserThemeOverride: e.target.checked })} />
            <span>{s.branding.allowUserThemeOverride ? "Allowed" : "Locked"}</span>
          </label>
        </Field>
      </SectionCard>

      {/* ── Email ──────────────────────────────────────────────────── */}
      <SectionCard title="Email" description="Outbound notification delivery and sender identity.">
        <Field label="Provider">
          <select className={inputCls} value={s.email.provider} onChange={(e) => setGroup("email", { provider: e.target.value as any })} style={{ maxWidth: 240 }}>
            <option value="freshify-comms">Freshify Comms (managed)</option>
            <option value="smtp">SMTP (BYO)</option>
            <option value="none">Disabled</option>
          </select>
        </Field>
        <Field label="Sender name">
          <input className={inputCls} value={s.email.senderName} onChange={(e) => setGroup("email", { senderName: e.target.value })} />
        </Field>
        <Field label="Sender address">
          <input className={inputCls} value={s.email.senderAddress} onChange={(e) => setGroup("email", { senderAddress: e.target.value })} />
        </Field>
        <Field label="Reply-to" hint="Optional; defaults to the sender address.">
          <input className={inputCls} value={s.email.replyTo ?? ""} onChange={(e) => setGroup("email", { replyTo: e.target.value || null })} />
        </Field>
      </SectionCard>

      {/* ── SMS ────────────────────────────────────────────────────── */}
      <SectionCard title="SMS" description="Provider for one-time codes and notifications.">
        <Field label="Provider">
          <select className={inputCls} value={s.sms.provider} onChange={(e) => setGroup("sms", { provider: e.target.value as any })} style={{ maxWidth: 200 }}>
            <option value="twilio">Twilio</option>
            <option value="none">Disabled</option>
          </select>
        </Field>
        <Field label="Sender ID" hint="Friendly name shown on the device (carrier permitting).">
          <input className={inputCls} value={s.sms.senderId ?? ""} onChange={(e) => setGroup("sms", { senderId: e.target.value || null })} />
        </Field>
        <Field label="Twilio Verify SID" hint="Optional; required to use Twilio Verify instead of plain SMS.">
          <input className={inputCls} value={s.sms.twilioVerifyServiceSid ?? ""} onChange={(e) => setGroup("sms", { twilioVerifyServiceSid: e.target.value || null })} />
        </Field>
      </SectionCard>

      {/* ── Authentication ─────────────────────────────────────────── */}
      <SectionCard title="Authentication" description="Which sign-in methods are accepted, and session lifetime.">
        <Field label="Email + password">
          <label className="ps-toggle">
            <input type="checkbox" checked={s.auth.allowEmailPassword} onChange={(e) => setGroup("auth", { allowEmailPassword: e.target.checked })} />
            <span>{s.auth.allowEmailPassword ? "Allowed" : "Off"}</span>
          </label>
        </Field>
        <Field label="Phone one-time code">
          <label className="ps-toggle">
            <input type="checkbox" checked={s.auth.allowPhoneOtp} onChange={(e) => setGroup("auth", { allowPhoneOtp: e.target.checked })} />
            <span>{s.auth.allowPhoneOtp ? "Allowed" : "Off"}</span>
          </label>
        </Field>
        <Field label="Require email verification" hint="Block sign-in until the email has been verified.">
          <label className="ps-toggle">
            <input type="checkbox" checked={s.auth.requireEmailVerification} onChange={(e) => setGroup("auth", { requireEmailVerification: e.target.checked })} />
            <span>{s.auth.requireEmailVerification ? "Required" : "Optional"}</span>
          </label>
        </Field>
        <Field label="Session lifetime (hours)" hint="How long a session remains valid before re-auth.">
          <input className={inputCls} type="number" min={1} max={8760} value={s.auth.sessionTtlHours} onChange={(e) => setGroup("auth", { sessionTtlHours: Math.max(1, parseInt(e.target.value || "0", 10) || 1) })} style={{ maxWidth: 160 }} />
        </Field>
      </SectionCard>

      {/* ── Invites ────────────────────────────────────────────────── */}
      <SectionCard title="Invites" description="Defaults applied when an operator mints a new portal invite.">
        <Field label="Expiry (hours)" hint="How long an unaccepted invite remains valid.">
          <input className={inputCls} type="number" min={1} max={8760} value={s.invites.expiryHours} onChange={(e) => setGroup("invites", { expiryHours: Math.max(1, parseInt(e.target.value || "0", 10) || 1) })} style={{ maxWidth: 160 }} />
        </Field>
        <Field label="Default company role">
          <select className={inputCls} value={s.invites.defaultCompanyRole} onChange={(e) => setGroup("invites", { defaultCompanyRole: e.target.value as any })} style={{ maxWidth: 200 }}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </SectionCard>

      {/* ── Catalog ────────────────────────────────────────────────── */}
      <SectionCard title="Catalog" description="Picklist values shown when creating companies and workspaces.">
        <Field label="Company types">
          <TagEditor items={s.catalog.companyTypes} onChange={(items) => setGroup("catalog", { companyTypes: items })} />
        </Field>
        <Field label="Workspace types">
          <TagEditor items={s.catalog.workspaceTypes} onChange={(items) => setGroup("catalog", { workspaceTypes: items })} />
        </Field>
      </SectionCard>

      {/* ── Audit ──────────────────────────────────────────────────── */}
      <SectionCard title="Audit" description="How long audit history is retained.">
        <Field label="Retention (days)" hint="Audit entries older than this are eligible for purge.">
          <input className={inputCls} type="number" min={1} max={3650} value={s.audit.retentionDays} onChange={(e) => setGroup("audit", { retentionDays: Math.max(1, parseInt(e.target.value || "0", 10) || 1) })} style={{ maxWidth: 160 }} />
        </Field>
      </SectionCard>

      {/* Sticky save bar */}
      <div className="ps-actions">
        {status.kind === "ok" ? <span className="ps-status-ok">Saved.</span> : null}
        {status.kind === "err" ? <span className="ps-status-err">{status.msg}</span> : null}
        <button className="ps-save" type="submit" disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function TagEditor({ items, onChange }: { items: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    if (items.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...items, v]);
    setDraft("");
  }
  function remove(i: number) {
    const next = items.slice();
    next.splice(i, 1);
    onChange(next);
  }
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {items.map((it, i) => (
          <span key={`${it}-${i}`} className="ps-pill">
            {it}
            <button type="button" onClick={() => remove(i)} aria-label={`Remove ${it}`}>×</button>
          </span>
        ))}
        {items.length === 0 ? <span style={{ color: "var(--muted)", fontSize: 12 }}>No values yet.</span> : null}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="ps-input"
          placeholder="Add value and press Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={add}
          style={{
            padding: "8px 14px",
            background: "var(--surface-2)",
            color: "var(--fg)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
