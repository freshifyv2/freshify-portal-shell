/**
 * Active tenant switcher — used by all portal FE apps.
 *
 * The tenant switcher in Chrome POSTs here with a form field `companyId`.
 *   - companyId = "" (empty)  → clear active tenant, back to "All Companies"
 *   - companyId = "cmp_..."   → scope the session to that company
 *
 * We forward to users-be /v1/session/select — the sovereign authority for
 * session context. Users BE mints a new JWT with companyId/companyName/roles
 * populated for the selected tenant (preserving the operator claim), which
 * becomes the new sp_session cookie. Downstream BE list endpoints scope
 * naturally off identity.company.companyId.
 *
 * We also clear the legacy sp_active_tenant cookie so any FE code still
 * reading it (older bundled chromeContext) doesn't fight the JWT.
 *
 * Redirect base URL is built from x-forwarded-host / x-forwarded-proto so we
 * don't leak the Cloud Run internal listen address (0.0.0.0:8080) into the
 * browser Location header.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

const ACTIVE_TENANT_COOKIE = "sp_active_tenant";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const dynamic = "force-dynamic";

function publicBase(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  return fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const base = publicBase(req);
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", base), { status: 303 });
  }

  // Accept form-encoded (default from <form> POST) or JSON.
  let companyId: string | null = null;
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { companyId?: string | null };
    companyId = body.companyId ?? null;
  } else {
    const form = await req.formData();
    const raw = form.get("companyId");
    companyId = typeof raw === "string" && raw.length > 0 ? raw : null;
  }

  const r = await fetch(`${USERS_SERVICE_URL}/v1/session/select`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ companyId }),
    cache: "no-store",
  });

  if (!r.ok) {
    const url = new URL("/dashboard", base);
    url.searchParams.set("switch_error", String(r.status));
    return NextResponse.redirect(url, { status: 303 });
  }

  const parsed = (await r.json().catch(() => ({}))) as { sessionToken?: string };
  const newToken = parsed.sessionToken;
  if (!newToken) {
    const url = new URL("/dashboard", base);
    url.searchParams.set("switch_error", "no_token");
    return NextResponse.redirect(url, { status: 303 });
  }

  const res = NextResponse.redirect(new URL("/dashboard", base), { status: 303 });
  res.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Keep the legacy display cookie in sync with the JWT so old code paths
  // reading readActiveTenant() don't fight the source of truth. Clear when
  // switching to "All Companies".
  if (companyId) {
    res.cookies.set(ACTIVE_TENANT_COOKIE, companyId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } else {
    res.cookies.set({
      name: ACTIVE_TENANT_COOKIE,
      value: "",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return res;
}
