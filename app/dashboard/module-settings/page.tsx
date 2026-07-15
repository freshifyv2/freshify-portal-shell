/**
 * Module Settings — Sovereign Corp admins only.
 *
 * Server component reads the operator session, fetches the full portal-
 * modules registry (with current assignments) plus the full company and
 * workspace catalogs, then renders the client-side assignment editor.
 *
 * The users-be endpoint gates on Sovereign Corp admin membership — if the
 * caller is a regular operator (not a Sovereign Corp admin) they get a 403
 * on the fetch and we render a "not authorized" view.
 */
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { Chrome } from "@freshifyv2/portal-shell-ui";
import { loadChromeContext } from "@freshifyv2/portal-shell-ui";
import { ModuleSettingsForm, type PortalModule, type Company, type Workspace } from "./ModuleSettingsForm";

export const dynamic = "force-dynamic";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";
const COMPANIES_SERVICE_URL =
  process.env.COMPANIES_SERVICE_URL ||
  "https://freshify-companies-sbzaekoo4q-uc.a.run.app";
const WORKSPACES_SERVICE_URL =
  process.env.WORKSPACES_SERVICE_URL ||
  "https://freshify-workspaces-sbzaekoo4q-uc.a.run.app";

async function fetchJson<T>(url: string, token: string): Promise<{ status: number; data: T | null }> {
  const r = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return { status: r.status, data: null };
  return { status: r.status, data: (await r.json()) as T };
}

export default async function ModuleSettingsPage() {
  const token = readSessionToken();
  if (!token) redirect("/login?next=/dashboard/module-settings");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login?next=/dashboard/module-settings");
  if (!claims.operator) redirect("/dashboard");

  const chromeCtx = await loadChromeContext();
  const displayName = chromeCtx?.user.displayName ?? claims.email ?? "Operator";
  const handle = chromeCtx?.user.handle ?? "operator";

  // Fetch admin module list, all companies, and all workspaces in parallel.
  const [modulesRes, companiesRes, workspacesRes] = await Promise.all([
    fetchJson<{ modules: PortalModule[] }>(
      `${USERS_SERVICE_URL}/v1/portal-modules/admin`,
      token,
    ),
    fetchJson<{ companies: Company[] }>(
      `${COMPANIES_SERVICE_URL}/v1/companies`,
      token,
    ),
    fetchJson<{ workspaces: Workspace[] }>(
      `${WORKSPACES_SERVICE_URL}/v1/admin/workspaces`,
      token,
    ),
  ]);

  // 403 → caller is an operator but not a Sovereign Corp admin.
  if (modulesRes.status === 403) {
    return (
      <Chrome
        active="module-settings"
        pageTitle="Module Settings"
        user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: true }}
        activeCompany={chromeCtx?.activeCompany ?? null}
        tenantOptions={chromeCtx?.tenantOptions ?? []}
        visibleModuleKeys={chromeCtx?.visibleModuleKeys}
        portalWide
      >
        <div className="page-header">
          <h1>Module Settings</h1>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Not authorized</div>
          <div style={{ color: "var(--muted)" }}>
            Module Settings can only be edited by admins of the portal-owning
            company (Sovereign Corp). Ask a Sovereign Corp admin to grant you
            access if you need it.
          </div>
        </div>
      </Chrome>
    );
  }

  const modules = modulesRes.data?.modules ?? [];
  const companies = companiesRes.data?.companies ?? [];
  const workspaces = workspacesRes.data?.workspaces ?? [];

  return (
    <Chrome
      active="module-settings"
      pageTitle="Module Settings"
      user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: true }}
      activeCompany={chromeCtx?.activeCompany ?? null}
      tenantOptions={chromeCtx?.tenantOptions ?? []}
      visibleModuleKeys={chromeCtx?.visibleModuleKeys}
      portalWide
    >
      <div className="page-header">
        <h1>Module Settings</h1>
        <div className="lede" style={{ maxWidth: 720 }}>
          Assign each module to the portal, to specific companies, and to
          specific workspaces. Portal scope means the module is visible in
          the aggregate view and to Sovereign Corp. Company and workspace
          assignments make the module visible when scoped into that tenant.
        </div>
      </div>
      <ModuleSettingsForm
        initialModules={modules}
        companies={companies}
        workspaces={workspaces}
      />
    </Chrome>
  );
}
