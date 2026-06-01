import { cookies } from "next/headers";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "sp_session";
export const ACTIVE_TENANT_COOKIE = "sp_active_tenant";

/** Returns the operator's chosen tenant scope, if any. */
export function readActiveTenant(): string | null {
  return cookies().get(ACTIVE_TENANT_COOKIE)?.value ?? null;
}

export interface SessionClaims {
  userId: string;
  email: string;
  displayName: string;
  companyId: string | null;
  companyName: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  roles: Array<{ layer: string; scopeId: string | null; role: string }>;
  operator?: { operatorId: string; reason: string } | null;
  exp?: number;
}

export function readSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export function decodeClaims(token: string): SessionClaims | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
  } catch {
    return null;
  }
}
