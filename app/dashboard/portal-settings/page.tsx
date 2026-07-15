/**
 * Portal Settings — operator-only.
 *
 * Server component reads operator session, fetches current portal_settings
 * via the BFF proxy /api/portal-settings, and renders the form client.
 * Non-operators get a 403 view (we don't redirect — we tell them why).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { Chrome } from "@freshifyv2/portal-shell-ui";
import { loadChromeContext } from "@freshifyv2/portal-shell-ui";
import { PortalSettingsForm, type PortalSettings, type CompanyOption } from "./PortalSettingsForm";

export const dynamic = "force-dynamic";

const DEFAULTS: PortalSettings = {
  branding: {
    appName: "Sovereign Portal",
    logoUrl: null,
    faviconUrl: null,
    accentColor: "#0F0F0F",
    backgroundTone: "#0F0F0F",
    sidebarStyle: "dark",
    defaultTheme: "system",
    allowUserThemeOverride: true,
  },
  email: {
    provider: "freshify-comms",
    senderName: "Sovereign Portal",
    senderAddress: "noreply@freshify.io",
    replyTo: null,
  },
  sms: {
    provider: "twilio",
    senderId: null,
    twilioVerifyServiceSid: null,
  },
  auth: {
    allowEmailPassword: true,
    allowPhoneOtp: true,
    requireEmailVerification: false,
    sessionTtlHours: 168,
  },
  invites: {
    expiryHours: 168,
    defaultCompanyRole: "member",
  },
  catalog: {
    companyTypes: ["Enterprise", "Client", "Sub-Contractor", "Partner", "Affiliate"],
    workspaceTypes: ["Operations", "Development", "Marketing", "Sales", "Support", "Other"],
  },
  audit: {
    retentionDays: 365,
  },
  governance: {
    portalOwnerCompanyId: null,
  },
};

async function loadSettings(): Promise<PortalSettings> {
  // Inside the same Next.js process we can call the BFF route via absolute
  // URL using the forwarded host. Simpler: hit users-be directly from the
  // server side using the same token. We use the proxy so all settings I/O
  // funnels through one place.
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  if (!host) return DEFAULTS;
  const cookie = h.get("cookie") || "";
  try {
    const r = await fetch(`${proto}://${host}/api/portal-settings`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!r.ok) return DEFAULTS;
    const data = (await r.json()) as Partial<PortalSettings>;
    // Deep-merge with defaults so missing groups render with sane values.
    return {
      branding: { ...DEFAULTS.branding, ...(data.branding ?? {}) },
      email: { ...DEFAULTS.email, ...(data.email ?? {}) },
      sms: { ...DEFAULTS.sms, ...(data.sms ?? {}) },
      auth: { ...DEFAULTS.auth, ...(data.auth ?? {}) },
      invites: { ...DEFAULTS.invites, ...(data.invites ?? {}) },
      catalog: { ...DEFAULTS.catalog, ...(data.catalog ?? {}) },
      audit: { ...DEFAULTS.audit, ...(data.audit ?? {}) },
      governance: { ...DEFAULTS.governance, ...(data.governance ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

export default async function PortalSettingsPage() {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const chromeCtx = await loadChromeContext();
  const displayName = claims.displayName || claims.email || "operator";
  const handle = (claims.email || "").split("@")[0] || "operator";
  const isOperator = Boolean(claims.operator);

  // Non-operator → 403 view inside the chrome.
  if (!isOperator) {
    return (
      <Chrome
        active="portal-settings"
        pageTitle="Portal Settings"
        portalWide
        user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: false }}
        activeCompany={chromeCtx?.activeCompany ?? null}
        tenantOptions={chromeCtx?.tenantOptions ?? []}
        portalOwnerCompanyId={chromeCtx?.portalOwnerCompanyId ?? null}
      >
        <div className="card" style={{ maxWidth: 640 }}>
          <h2 style={{ marginTop: 0 }}>Operator access required</h2>
          <p style={{ color: "var(--muted)" }}>
            Portal Settings can only be viewed and changed by portal operators.
            If you believe you should have access, contact your portal administrator.
          </p>
        </div>
      </Chrome>
    );
  }

  const settings = await loadSettings();
  // Portal Settings is operator-only. chromeCtx.tenantOptions already returns
  // the full company list for operators, so we reuse it as the picker options.
  const companies: CompanyOption[] = chromeCtx?.tenantOptions ?? [];

  return (
    <Chrome
      active="portal-settings"
      pageTitle="Portal Settings"
      portalWide
      user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: true }}
      activeCompany={chromeCtx?.activeCompany ?? null}
      tenantOptions={chromeCtx?.tenantOptions ?? []}
      portalOwnerCompanyId={chromeCtx?.portalOwnerCompanyId ?? null}
    >
      <div className="page-hero">
        <div>
          <h1 className="page-greeting" style={{ margin: 0 }}>Portal Settings</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
            Branding, communications, authentication, invites, and catalog defaults for the entire portal.
            Changes apply portal-wide and are audit-logged.
          </p>
        </div>
      </div>

      <PortalSettingsForm initial={settings} companies={companies} />
    </Chrome>
  );
}
