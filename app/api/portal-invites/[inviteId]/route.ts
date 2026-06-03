/**
 * Portal invite single-revoke proxy — portal-shell BFF.
 *
 * DELETE forwards to users-be `/v1/portal-invites/:inviteId`, which is
 * idempotent (already_revoked returns 200) and returns 409 if the invite
 * has already been accepted.
 */
import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { inviteId: string } },
) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const inviteId = encodeURIComponent(params.inviteId || "");
  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-invites/${inviteId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
