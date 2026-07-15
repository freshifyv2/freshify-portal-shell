/**
 * Logout — clears the session + active-tenant cookies and redirects to /login.
 *
 * Deploy 5.19 (post-fix): every FE app in the portal shell family exposes
 * this route at the same path so the Chrome topbar's <form action="/api/logout">
 * always resolves to a 303 back to /login, regardless of which FE service is
 * currently serving the page. Previously only users-fe had a /api/logout and
 * it returned JSON, so form-POST logout dumped the browser on a blank page.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const ACTIVE_TENANT_COOKIE = "sp_active_tenant";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  // Use forwarded host so the redirect resolves to the public URL and never
  // leaks the Cloud Run listen address (0.0.0.0:8080) into Location.
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  const base = fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin;
  const url = new URL("/login", base);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set({
    name: ACTIVE_TENANT_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
