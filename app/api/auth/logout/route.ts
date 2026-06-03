/**
 * Logout — portal-shell BFF (Deploy 5.10).
 *
 * Clears the sp_session cookie and 302-redirects to the `next` query param
 * (defaults to /). Pure session teardown; the JWT itself remains valid
 * server-side until its exp, but without the cookie the browser stops
 * presenting it.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

function safeNext(input: string | null): string {
  if (!input) return "/";
  // Only allow same-origin redirects.
  if (input.startsWith("/") && !input.startsWith("//")) return input;
  return "/";
}

export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  // Prefer the public host from forwarded headers so we don't leak the
  // Cloud Run internal listen address (0.0.0.0:8080) into the redirect.
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  const base = fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin;
  const url = new URL(next, base);
  const res = NextResponse.redirect(url);
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST(req: NextRequest) {
  return GET(req);
}
