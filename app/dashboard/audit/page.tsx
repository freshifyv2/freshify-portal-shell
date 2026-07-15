/**
 * Audit Log — operator-only standalone page (Deploy 5.3).
 *
 * Server component reads operator session, fetches the first page of the
 * unified audit feed via the BFF proxy, then mounts AuditFeedClient which
 * adds filter chips, an actor filter, and cursor-based "Load more".
 * Non-operators see a 403 view inside the chrome.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { Chrome } from "@freshifyv2/portal-shell-ui";
import { loadChromeContext } from "@freshifyv2/portal-shell-ui";
import { AuditFeedClient, type AuditEntry } from "./AuditFeedClient";

export const dynamic = "force-dynamic";

interface FeedResponse {
  entries: AuditEntry[];
  nextCursor: string | null;
}

async function loadInitialFeed(): Promise<FeedResponse> {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  if (!host) return { entries: [], nextCursor: null };
  const cookie = h.get("cookie") || "";
  try {
    const r = await fetch(`${proto}://${host}/api/admin/audit-feed?limit=50`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!r.ok) return { entries: [], nextCursor: null };
    const data = (await r.json()) as Partial<FeedResponse>;
    return {
      entries: Array.isArray(data.entries) ? data.entries : [],
      nextCursor: data.nextCursor ?? null,
    };
  } catch {
    return { entries: [], nextCursor: null };
  }
}

export default async function AuditPage() {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const chromeCtx = await loadChromeContext();
  const displayName = claims.displayName || claims.email || "operator";
  const handle = (claims.email || "").split("@")[0] || "operator";
  const isOperator = Boolean(claims.operator);

  if (!isOperator) {
    return (
      <Chrome
        active="audit"
        pageTitle="Audit Log"
        user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: false }}
        activeCompany={chromeCtx?.activeCompany ?? null}
        tenantOptions={chromeCtx?.tenantOptions ?? []}
        portalOwnerCompanyId={chromeCtx?.portalOwnerCompanyId ?? null}
      >
        <div className="card" style={{ maxWidth: 640 }}>
          <h2 style={{ marginTop: 0 }}>Operator access required</h2>
          <p style={{ color: "var(--muted)" }}>
            The portal-wide audit log is restricted to portal operators. If
            you believe you should have access, contact your portal
            administrator.
          </p>
        </div>
      </Chrome>
    );
  }

  const feed = await loadInitialFeed();

  return (
    <Chrome
      active="audit"
      pageTitle="Audit Log"
      user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: true }}
      activeCompany={chromeCtx?.activeCompany ?? null}
      tenantOptions={chromeCtx?.tenantOptions ?? []}
      portalOwnerCompanyId={chromeCtx?.portalOwnerCompanyId ?? null}
    >
      <div className="page-hero">
        <div>
          <h1 className="page-greeting" style={{ margin: 0 }}>Audit Log</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
            Portal-wide operator activity, unioned across portal, customers,
            and workspaces. Newest first. Retained per the portal audit
            retention setting (default 365 days).
          </p>
        </div>
      </div>

      <AuditFeedClient initialEntries={feed.entries} initialCursor={feed.nextCursor} />
    </Chrome>
  );
}
