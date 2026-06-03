/**
 * Portal Settings API proxy \u2014 portal-shell BFF.
 *
 * Forwards GET and PUT to users-be /v1/portal-settings using the operator's
 * session token from the sp_session cookie. Server-only \u2014 keeps the bearer
 * out of the browser.
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
  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-settings`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}

export async function PUT(req: Request) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const payload = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-settings`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: payload,
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
