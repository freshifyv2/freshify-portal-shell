/**
 * Password-reset request proxy — portal-shell BFF (Sprint 1 5.18g).
 *
 * Forwards POST to users-be `/v1/auth/password-reset/request`. Always 200
 * { ok: true } from upstream regardless of whether the email exists —
 * prevents email-enumeration via this endpoint.
 */
import { NextRequest, NextResponse } from "next/server";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/auth/password-reset/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
