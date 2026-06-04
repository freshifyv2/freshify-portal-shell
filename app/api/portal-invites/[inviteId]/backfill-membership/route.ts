/**
 * Portal invite membership backfill proxy — portal-shell BFF (Deploy 5.13).
 *
 * Forwards POST to users-be
 * `/v1/portal-invites/:inviteId/_backfill-membership`. Operator-only at the
 * users-be layer. Used by the invites table's per-row "Backfill" button when
 * an accepted invite shows membershipStatus = "missing" or "failed".
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
    `${USERS_SERVICE_URL}/v1/portal-invites/${inviteId}/_backfill-membership`,
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
