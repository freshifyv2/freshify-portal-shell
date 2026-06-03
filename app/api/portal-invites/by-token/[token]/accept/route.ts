/**
 * Invite acceptance proxy — portal-shell BFF (Deploy 5.9).
 *
 * Forwards POST to users-be `/v1/portal-invites/:token/accept`. Requires the
 * sp_session cookie; users-be enforces that the session email matches the
 * invite email (case-insensitive). On success flips status -> accepted and
 * stamps acceptedBy + acceptedAt.
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const session = readSessionToken();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = encodeURIComponent(params.token || "");
  const r = await fetch(
    `${USERS_SERVICE_URL}/v1/portal-invites/${token}/accept`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${session}` },
      cache: "no-store",
    },
  );
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
