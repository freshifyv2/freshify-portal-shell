/**
 * Portal invites bulk-backfill proxy — portal-shell BFF (Deploy 5.13).
 *
 * Forwards POST to users-be `/v1/portal-invites/_backfill-memberships`.
 * Operator-only at the users-be layer. Used by the invites page's
 * "Backfill all" action when one or more invites show membershipStatus
 * = "missing" or "failed".
 *
 * Response includes a `hasMore` sentinel so the UI can prompt for another
 * pass if the candidate set exceeded the per-call cap.
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const r = await fetch(
    `${USERS_SERVICE_URL}/v1/portal-invites/_backfill-memberships`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
  );
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
