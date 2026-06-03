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
  const url = new URL(next, req.nextUrl.origin);
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
