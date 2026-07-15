/**
 * Portal Modules admin API proxy — portal-shell BFF.
 *
 * Forwards GET /v1/portal-modules/admin (list all modules with assignments)
 * to users-be using the operator's session token.
 */
import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-modules/admin`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
