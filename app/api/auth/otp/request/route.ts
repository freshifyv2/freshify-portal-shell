/**
 * OTP request proxy — portal-shell BFF (Deploy 5.10).
 *
 * Forwards POST to users-be `/v1/otp/request`. No auth required. The
 * users-be adapter (Twilio Verify in prod, console-log in dev) handles
 * actual code delivery; we just relay the request and return the
 * challengeId.
 */
import { NextRequest, NextResponse } from "next/server";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/otp/request`, {
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
