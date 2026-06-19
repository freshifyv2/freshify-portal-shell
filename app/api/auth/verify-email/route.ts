/**
 * Email-verification proxy — portal-shell BFF (Sprint 1 5.18g).
 *
 * Forwards POST to users-be `/v1/auth/verify-email`. On success, users-be
 * issues a no-context session token (no company/workspace selected yet) —
 * we set the sp_session cookie so the verify-email page can redirect the
 * user straight into the dashboard tenant-picker.
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
  const r = await fetch(`${USERS_SERVICE_URL}/v1/auth/verify-email`, {
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
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  const res = new NextResponse(text, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  if (parsed.sessionToken) {
    res.cookies.set(SESSION_COOKIE, parsed.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  return res;
}
