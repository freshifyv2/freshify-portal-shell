/**
 * Portal invite resend proxy — portal-shell BFF (Deploy 5.5).
 *
 * Forwards POST to users-be `/v1/portal-invites/:inviteId/resend`. The
 * backend regenerates the token and pushes expiresAt out by the configured
 * expiryHours. Returns the new token so the UI can immediately surface a
 * fresh copy-link to the operator.
 *
 * Operator-only at the users-be layer.
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { inviteId: string } },
) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inviteId = encodeURIComponent(params.inviteId || "");
  const r = await fetch(
    `${USERS_SERVICE_URL}/v1/portal-invites/${inviteId}/resend`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
