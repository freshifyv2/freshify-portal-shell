/**
 * Portal invites bulk-revoke proxy — portal-shell BFF (Deploy 5.4).
 *
 * Forwards POST to users-be `/v1/portal-invites/_batch/revoke`. The backend
 * fans out to revokeInviteV3 per invite, returns per-invite results.
 * Operator-only at the users-be layer.
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.text();
  const r = await fetch(
    `${USERS_SERVICE_URL}/v1/portal-invites/_batch/revoke`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body,
      cache: "no-store",
    },
  );
  const out = await r.text();
  return new NextResponse(out, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
