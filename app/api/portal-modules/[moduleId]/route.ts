/**
 * Portal Modules — per-module assignment update.
 *
 * PUT /api/portal-modules/:moduleId → users-be /v1/portal-modules/:moduleId
 * Body: { portalScope: boolean, companyIds: string[], workspaceIds: string[] }
 */
import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ moduleId: string }> },
) {
  const token = readSessionToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { moduleId } = await ctx.params;
  const payload = await req.text();
  const r = await fetch(`${USERS_SERVICE_URL}/v1/portal-modules/${encodeURIComponent(moduleId)}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: payload,
    cache: "no-store",
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
