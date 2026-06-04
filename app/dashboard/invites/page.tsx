/**
 * Portal Invites — operator-only standalone page (Deploy 5.4).
 *
 * Server component reads operator session, SSR-fetches the outstanding
 * portal invites via the BFF proxy, then mounts InvitesClient which adds:
 *   - copy-invite-link per row
 *   - single revoke per row
 *   - checkbox + sticky bulk revoke bar
 *   - mint new invite (inline form)
 *
 * Non-operators see a 403 view inside the chrome.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { Chrome } from "@/lib/Chrome";
import { loadChromeContext } from "@/lib/chromeContext";
import { InvitesClient, type InviteRow } from "./InvitesClient";

export const dynamic = "force-dynamic";

interface InvitesResponse {
  invites: InviteRow[];
}

async function loadInitialInvites(): Promise<InviteRow[]> {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  if (!host) return [];
  const cookie = h.get("cookie") || "";
  try {
    const r = await fetch(`${proto}://${host}/api/portal-invites`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!r.ok) return [];
    const data = (await r.json()) as Partial<InvitesResponse>;
    return Array.isArray(data.invites) ? data.invites : [];
  } catch {
    return [];
  }
}

export default async function InvitesPage() {
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
        active="invites"
        pageTitle="Invites"
        user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: false }}
        activeCompany={chromeCtx?.activeCompany ?? null}
        tenantOptions={chromeCtx?.tenantOptions ?? []}
      >
        <div className="card" style={{ maxWidth: 640 }}>
          <h2 style={{ marginTop: 0 }}>Operator access required</h2>
          <p style={{ color: "var(--muted)" }}>
            Portal invite management is restricted to portal operators. If you
            believe you should have access, contact your portal administrator.
          </p>
        </div>
      </Chrome>
    );
  }

  const invites = await loadInitialInvites();

  return (
    <Chrome
      active="invites"
      pageTitle="Invites"
      user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator: true }}
      activeCompany={chromeCtx?.activeCompany ?? null}
      tenantOptions={chromeCtx?.tenantOptions ?? []}
    >
      <div className="page-hero">
        <div>
          <h1 className="page-greeting" style={{ margin: 0 }}>Invites</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
            Outstanding portal invites plus recently accepted (last 30 days).
            Mint new invites, copy links, revoke pending ones. The Acceptance
            column shows the membership outcome — use the Needs attention
            filter to surface accepted invites that need a backfill.
          </p>
        </div>
      </div>

      <InvitesClient initialInvites={invites} />
    </Chrome>
  );
}
