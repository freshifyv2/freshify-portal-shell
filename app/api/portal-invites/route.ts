/**
 * Portal invites collection proxy — portal-shell BFF.
 *
 * GET  — list outstanding portal invites (operator-only at the users-be layer).
 * POST — mint a new portal invite (operator-only at the users-be layer).
 *
 * Forwards to users-be `/v1/portal-invites` with the operator's bearer token
 * read from the `sp_session` cookie. Server-only — keeps the bearer out of
 * the browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-invites`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-invites`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body,
    cache: "no-store",
  });
  const out = await r.text();
  return new NextResponse(out, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
