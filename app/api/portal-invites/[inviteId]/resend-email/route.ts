/**
 * Portal invite resend-email proxy — portal-shell BFF (Deploy 5.8).
 *
 * Forwards POST to users-be `/v1/portal-invites/:inviteId/_resend-email`.
 * Retries the comms send without rotating the token. Returns {ok, messageId}
 * or {ok:false, error}. Operator-only at users-be.
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
    `${USERS_SERVICE_URL}/v1/portal-invites/${inviteId}/_resend-email`,
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
