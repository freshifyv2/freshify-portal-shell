/**
 * OTP verify proxy — portal-shell BFF (Deploy 5.10).
 *
 * Forwards POST to users-be `/v1/otp/verify`. On 200 sets the sp_session
 * cookie httpOnly + secure so the client can never read the JWT directly.
 * Returns the verify payload to the client so it can route on isNewUser
 * if needed.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

// 30 days — matches the typical session lifetime issued by users-be. The
// JWT itself has its own exp; the cookie just controls how long the
// browser keeps presenting it.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/otp/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  const text = await r.text();

  if (!r.ok) {
    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": "application/json" },
    });
  }

  let parsed: { sessionToken?: string } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    return new NextResponse(
      JSON.stringify({ error: "unparseable_verify_response" }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
  const token = parsed.sessionToken;
  if (!token) {
    return new NextResponse(
      JSON.stringify({ error: "missing_session_token" }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const res = new NextResponse(text, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
