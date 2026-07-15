/**
 * Active tenant switcher — portal-shell BFF.
 *
 * The tenant switcher in Chrome POSTs here with a form field `companyId`.
 *   - companyId = "" (empty)  → clear active tenant, return to "All Companies"
 *   - companyId = "cmp_..."   → scope the session to that company
 *
 * We forward to users-be `/v1/session/select`, which is the sovereign
 * authority for session context. It:
 *   - verifies the caller is a member of that company (or is an operator)
 *   - mints a NEW JWT with companyId/companyName/roles populated for the
 *     selected tenant, preserving the operator claim if present
 *   - returns the new sessionToken
 *
 * We then swap the `sp_session` cookie with the new token and redirect
 * back to the dashboard. Every downstream request now carries the scoped
 * JWT — BE list endpoints will filter by `identity.company.companyId`
 * naturally, without any cookie plumbing.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
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
    // Session/select failed (e.g. 403 not_a_member). Surface as a redirect
    // back to dashboard with an error query param the FE can display.
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("switch_error", String(r.status));
    return NextResponse.redirect(url, { status: 303 });
  }

  const parsed = (await r.json().catch(() => ({}))) as { sessionToken?: string };
  const newToken = parsed.sessionToken;
  if (!newToken) {
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("switch_error", "no_token");
    return NextResponse.redirect(url, { status: 303 });
  }

  // Redirect back to dashboard root. Preserve nothing else — the FE will
  // re-render every server component with the new scoped JWT.
  const res = NextResponse.redirect(new URL("/dashboard", req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
