/**
 * Register proxy — portal-shell BFF (Sprint 1 5.18g).
 *
 * Forwards POST to users-be `/v1/auth/register`. No session is issued on
 * register — the user must verify their email first (handled by the
 * verify-email route). 200 returns { ok: true } regardless of whether
 * the email already exists (idempotent re-send of the verification link
 * on unverified accounts).
 */
import { NextRequest, NextResponse } from "next/server";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/auth/register`, {
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
