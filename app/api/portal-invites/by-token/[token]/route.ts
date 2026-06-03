/**
 * Public invite preview proxy — portal-shell BFF (Deploy 5.9).
 *
 * Forwards GET to users-be `/v1/portal-invites/by-token/:token`. No auth.
 * Returns the safe surface (email, role, scope, status, expiresAt) used to
 * render the invite acceptance page before the user has logged in.
 */
import { NextRequest, NextResponse } from "next/server";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const token = encodeURIComponent(params.token || "");
  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-invites/by-token/${token}`, {
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
