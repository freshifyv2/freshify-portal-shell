/**
 * Shared helper to populate Chrome's tenant-switcher props.
 *
 * For operators, fetches the full company list from companies-be.
 * For non-operators, returns an empty options array — the switcher
 * renders disabled and shows the user's own company.
 *
 * The active tenant override comes from the sp_active_tenant cookie
 * (set by /api/admin/active-tenant on the users-fe). If a non-operator
 * has a cookie set (which shouldn't happen — the endpoint rejects them),
 * we still ignore it here as a defensive measure.
 */

import { readSessionToken, readActiveTenant } from "./session";
import { decodeJwt } from "./jwt";

const COMPANIES_URL =
  process.env.COMPANIES_SERVICE_URL ||
  "https://freshify-companies-sbzaekoo4q-uc.a.run.app";

export interface TenantOption {
  companyId: string;
  name: string;
}

export interface ChromeContext {
  token: string | null;
  user: {
    userId: string;
    displayName?: string;
    handle?: string;
    isOperator?: boolean;
  };
  activeCompany: { companyId?: string; name: string } | null;
  tenantOptions: TenantOption[];
  /** Effective scope to filter list/detail queries by. null = all (operator mode). */
  effectiveCompanyId: string | null;
}

export async function loadChromeContext(): Promise<ChromeContext | null> {
  const token = readSessionToken();
  if (!token) return null;
  const claims = decodeJwt(token);
  if (!claims) return null;

  const isOperator = Boolean(claims.operator);
  const activeTenantId = readActiveTenant();

  let activeCompany: { companyId?: string; name: string } | null = null;
  let tenantOptions: TenantOption[] = [];
  let effectiveCompanyId: string | null = null;

  if (isOperator) {
    // Try to load the full company list. Fail-soft: if BE is down, render
    // with no options and let the user retry.
    try {
      const res = await fetch(`${COMPANIES_URL}/v1/companies`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const body = (await res.json()) as { companies?: Array<{ companyId: string; name: string }> };
        tenantOptions = (body.companies ?? []).map((c) => ({
          companyId: c.companyId,
          name: c.name,
        }));
      }
    } catch {
      tenantOptions = [];
    }

    if (activeTenantId) {
      const match = tenantOptions.find((c) => c.companyId === activeTenantId);
      activeCompany = match ? { companyId: match.companyId, name: match.name } : null;
      effectiveCompanyId = activeTenantId;
    } else {
      activeCompany = null; // "All Companies"
      effectiveCompanyId = null;
    }
  } else {
    // Non-operator: locked to own company
    if (claims.companyId && claims.companyName) {
      activeCompany = { companyId: claims.companyId, name: claims.companyName };
      effectiveCompanyId = claims.companyId;
    }
    tenantOptions = [];
  }

  const displayName = claims.displayName || claims.email || "there";
  const handle = ((): string => {
    const e = claims.email;
    if (!e) return "user";
    if (e.startsWith("+")) return e.replace(/[^0-9]/g, "");
    return e.split("@")[0] || e;
  })();

  return {
    token,
    user: {
      userId: claims.userId,
      displayName,
      handle,
      isOperator,
    },
    activeCompany,
    tenantOptions,
    effectiveCompanyId,
  };
}
