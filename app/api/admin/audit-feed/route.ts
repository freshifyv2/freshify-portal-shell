/**
 * Admin audit-feed proxy — portal-shell BFF.
 *
 * Forwards GET to users-be /v1/admin/audit-feed using the operator's
 * session token from the sp_session cookie. Server-only — keeps the bearer
 * out of the browser. Used by the dashboard Recent Activity card for
 * client-side filter changes (initial render is server-side).
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.toString();
  const url = `${USERS_SERVICE_URL}/v1/admin/audit-feed${search ? `?${search}` : ""}`;
  const r = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
