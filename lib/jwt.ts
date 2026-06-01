/**
 * JWT decode (no verification — server already verified upstream).
 * We just need to read claims for display.
 */
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
  iat?: number;
}

export function decodeJwt(token: string): SessionClaims | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as SessionClaims;
  } catch {
    return null;
  }
}
