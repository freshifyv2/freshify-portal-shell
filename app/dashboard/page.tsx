/**
 * UAM01 — Dashboard (operator-aware).
 *
 * For operators: aggregate metric cards (real counts), outstanding invites,
 * and quick links into the sovereign modules.
 * For tenants: greeting + their session context.
 */
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { Chrome } from "@freshifyv2/portal-shell-ui";
import { loadChromeContext } from "@freshifyv2/portal-shell-ui";
import { RecentActivity, type AuditEntry } from "./RecentActivity";

export const dynamic = "force-dynamic";

const USERS_URL = process.env.USERS_SERVICE_URL || "https://freshify-users-sbzaekoo4q-uc.a.run.app";
const COMPANIES_URL = process.env.COMPANIES_SERVICE_URL || "https://freshify-companies-sbzaekoo4q-uc.a.run.app";
const WORKSPACES_URL = process.env.WORKSPACES_SERVICE_URL || "https://freshify-workspaces-sbzaekoo4q-uc.a.run.app";

interface UsersStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  operators: number;
}
interface CompaniesStats {
  total: number;
  active: number;
  inactive: number;
}
interface WorkspacesStats {
  total: number;
  byType?: Record<string, number>;
}
interface AdminUserRow {
  userId: string;
  displayName: string | null;
  email: string;
  handle: string | null;
  title: string | null;
  lastActiveAt: string | null;
  createdAt: string | null;
  status: "active" | "pending" | "inactive";
  assignedCompanies: Array<{ companyId: string; name: string }>;
}
interface AdminWorkspaceRow {
  workspaceId: string;
  name: string;
  companyId: string;
  companyName: string | null;
  workspaceType?: string | null;
  createdAt: string;
}
interface PortalInvite {
  inviteId: string;
  email: string;
  companyId: string | null;
  companyName?: string | null;
  workspaceId: string | null;
  workspaceName?: string | null;
  role: string;
  invitedBy: string;
  invitedByName?: string | null;
  createdAt: string;
  expiresAt: string;
  status: string;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function handleFromEmail(email?: string | null): string {
  if (!email) return "user";
  // Synthetic phone-only users have email of form `phone+<E164>@users.freshify.io`.
  // Render the E.164 phone (with single leading +), not the literal `phone+` prefix.
  const phoneMatch = email.match(/^phone\+?(\+?\d+)/);
  if (phoneMatch) return `+${phoneMatch[1].replace(/[^0-9]/g, "")}`;
  if (email.startsWith("+")) return email;
  return email.split("@")[0] || email;
}

async function fetchJSON<T>(url: string, token: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const delta = Date.now() - then;
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function Dashboard() {
  const token = readSessionToken();
  if (!token) redirect("/login");

  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const chromeCtx = await loadChromeContext();

  const displayName = claims.displayName || claims.email || "there";
  const firstName = (claims.displayName || "").split(/\s+/)[0] || displayName;
  const handle = handleFromEmail(claims.email);
  const isOperator = Boolean((claims as any).operator);
  const daysLeft = claims.exp
    ? Math.max(0, Math.round((claims.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Operator-only aggregate fetches.
  let usersStats: UsersStats | null = null;
  let companiesStats: CompaniesStats | null = null;
  let workspacesStats: WorkspacesStats | null = null;
  let invites: PortalInvite[] = [];
  let auditEntries: AuditEntry[] = [];
  let userRows: AdminUserRow[] = [];
  let workspaceRows: AdminWorkspaceRow[] = [];
  if (isOperator) {
    const [u, c, w, i, a, uu, ww] = await Promise.all([
      fetchJSON<UsersStats>(`${USERS_URL}/v1/admin/users-stats`, token),
      fetchJSON<CompaniesStats>(`${COMPANIES_URL}/v1/admin/companies/stats`, token),
      fetchJSON<WorkspacesStats>(`${WORKSPACES_URL}/v1/admin/workspaces/stats`, token),
      fetchJSON<{ invites: PortalInvite[] }>(`${USERS_URL}/v1/portal-invites`, token),
      fetchJSON<{ entries: AuditEntry[] }>(`${USERS_URL}/v1/admin/audit-feed?limit=20`, token),
      fetchJSON<{ users: AdminUserRow[] }>(`${USERS_URL}/v1/admin/users`, token),
      fetchJSON<{ workspaces: AdminWorkspaceRow[] }>(`${WORKSPACES_URL}/v1/admin/workspaces`, token),
    ]);
    usersStats = u;
    companiesStats = c;
    workspacesStats = w;
    invites = i?.invites || [];
    auditEntries = a?.entries || [];
    userRows = uu?.users || [];
    workspaceRows = ww?.workspaces || [];
  }

  // Sort user rows into two views: newest by createdAt, and most-recently-
  // active by lastActiveAt. Nulls sink to the bottom in both cases.
  const newUsers = [...userRows]
    .sort((a, b) => {
      const av = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bv = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bv - av;
    })
    .slice(0, 5);
  const currentUsers = [...userRows]
    .filter((u) => u.status === "active")
    .sort((a, b) => {
      const av = a.lastActiveAt ? Date.parse(a.lastActiveAt) : 0;
      const bv = b.lastActiveAt ? Date.parse(b.lastActiveAt) : 0;
      return bv - av;
    })
    .slice(0, 5);
  const recentWorkspaces = [...workspaceRows]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);

  return (
    <Chrome
      active="dashboard"
      pageTitle="Dashboard"
      user={chromeCtx?.user ?? { userId: claims.userId, displayName, handle, isOperator }}
      activeCompany={chromeCtx?.activeCompany ?? (claims.companyName ? { name: claims.companyName } : null)}
      tenantOptions={chromeCtx?.tenantOptions ?? []}
    >
      <h1 className="page-greeting">{`${greeting()} ${firstName}!`}</h1>

      {/* Aggregate metric row */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◇</span>
            <span className="metric-card-badge is-violet">{isOperator ? "ALL ACCESS" : "ACTIVE"}</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Customers</p>
            <p className="metric-card-value">{isOperator ? (companiesStats?.total ?? "—") : "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◉</span>
            <span className="metric-card-badge is-violet">{isOperator ? "ALL ACCESS" : "AVAILABLE"}</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Workspaces</p>
            <p className="metric-card-value">{isOperator ? (workspacesStats?.total ?? "—") : "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◐</span>
            <span className="metric-card-badge">{isOperator ? "ALL ACCESS" : "MEMBER"}</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Users</p>
            <p className="metric-card-value">{isOperator ? (usersStats?.total ?? "—") : "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◔</span>
            <span className="metric-card-badge">ACTIVE</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Session days left</p>
            <p className="metric-card-value">{daysLeft ?? "—"}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◧</span>
            <span className="metric-card-badge is-gray">SMI v0.2</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Module spec</p>
            <p className="metric-card-value">v0.2</p>
          </div>
        </div>
      </div>

      {/* Operator-only: outstanding invites */}
      {isOperator && (
        <div className="list-card" style={{ marginBottom: 20 }}>
          <div className="list-card-header">
            <h3 className="list-card-title">Outstanding Invites</h3>
            <span className="user-cell-handle">{invites.length} pending</span>
          </div>
          <div className="list-card-body">
            {invites.length === 0 ? (
              <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>
                No outstanding invites. Mint a new one from the Users module.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Scope</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.slice(0, 10).map((iv) => (
                    <tr key={iv.inviteId}>
                      <td><strong>{iv.email}</strong></td>
                      <td>
                        {iv.companyId
                          ? <span className="pill is-violet">Company</span>
                          : iv.workspaceId
                            ? <span className="pill is-violet">Workspace</span>
                            : <span className="pill is-gray">Portal</span>}
                      </td>
                      <td>{iv.role}</td>
                      <td>{relativeTime(iv.createdAt)}</td>
                      <td>{relativeTime(iv.expiresAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Three operator-only recent lists: New Users, Current Users, Recent Workspaces. */}
      {isOperator && (
        <div className="lists-grid">
          <div className="list-card">
            <div className="list-card-header">
              <h3 className="list-card-title">New Users</h3>
              <Link href="/dashboard/users/list" className="list-card-link">View all →</Link>
            </div>
            <div className="list-card-body">
              {newUsers.length === 0 ? (
                <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>No users yet.</p>
              ) : (
                <table className="data-table">
                  <tbody>
                    {newUsers.map((u) => (
                      <tr key={u.userId}>
                        <td>
                          <div className="data-table-strong">{u.displayName || u.email}</div>
                          <div className="data-table-sub">{u.email}</div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div>{relativeTime(u.createdAt)}</div>
                          <div className="user-cell-handle">{u.assignedCompanies[0]?.name ?? "—"}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="list-card">
            <div className="list-card-header">
              <h3 className="list-card-title">Current Users</h3>
              <Link href="/dashboard/users/list" className="list-card-link">View all →</Link>
            </div>
            <div className="list-card-body">
              {currentUsers.length === 0 ? (
                <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>No active users.</p>
              ) : (
                <table className="data-table">
                  <tbody>
                    {currentUsers.map((u) => (
                      <tr key={u.userId}>
                        <td>
                          <div className="data-table-strong">{u.displayName || u.email}</div>
                          <div className="data-table-sub">{u.assignedCompanies[0]?.name ?? "—"}</div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div>{relativeTime(u.lastActiveAt)}</div>
                          <div className="user-cell-handle">Last active</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="list-card">
            <div className="list-card-header">
              <h3 className="list-card-title">Recent Workspaces</h3>
              <Link href="/dashboard/workspaces" className="list-card-link">View all →</Link>
            </div>
            <div className="list-card-body">
              {recentWorkspaces.length === 0 ? (
                <p style={{ color: "var(--muted)", margin: 0, padding: 16 }}>No workspaces yet.</p>
              ) : (
                <table className="data-table">
                  <tbody>
                    {recentWorkspaces.map((w) => (
                      <tr key={w.workspaceId}>
                        <td>
                          <div className="data-table-strong">{w.name}</div>
                          <div className="data-table-sub">{w.companyName ?? "—"}</div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div>{relativeTime(w.createdAt)}</div>
                          <div className="user-cell-handle">{w.workspaceType ?? "workspace"}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent activity moved to the bottom of the dashboard. */}
      {isOperator && <RecentActivity initialEntries={auditEntries} />}
    </Chrome>
  );
}
