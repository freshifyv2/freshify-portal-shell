/**
 * Email + password login proxy — portal-shell BFF (Sprint 1 5.18g).
 *
 * Forwards POST to users-be `/v1/auth/login`. On 200 sets the sp_session
 * cookie httpOnly + secure. Mirrors the otp/verify proxy contract so the
 * downstream session middleware does not care which adapter was used.
 *
 * 401 invalid_credentials / 403 email_not_verified / 403 user_disabled
 * pass through verbatim so the client form can branch on them (e.g. show
 * the "resend verification" CTA on email_not_verified).
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/auth/login`, {
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
      JSON.stringify({ error: "unparseable_login_response" }),
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
