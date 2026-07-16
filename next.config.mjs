/**
 * Sovereign Portal shell — composition via server-side rewrites.
 *
 * Each sovereign module FE runs in its own Cloud Run service. The shell
 * mounts them under /dashboard/* and forwards all sub-paths via rewrite.
 *
 * /login is owned by users-fe but lives at the shell root so the user
 * sees a single hostname.
 *
 * Multi-zone static assets:
 *   Each FE is built with assetPrefix=/_<module>-fe so its static chunks
 *   live in their own URL space. The shell forwards those prefixed paths
 *   to the right FE service. Without this, Next.js page chunks 404 on
 *   the shell origin and React never hydrates the rewritten pages
 *   (forms stay frozen, buttons stay disabled).
 */

const USERS_FE = process.env.USERS_FE_URL || "https://freshify-users-fe-sbzaekoo4q-uc.a.run.app";
const COMPANIES_FE = process.env.COMPANIES_FE_URL || "https://freshify-companies-fe-sbzaekoo4q-uc.a.run.app";
const WORKSPACES_FE = process.env.WORKSPACES_FE_URL || "https://freshify-workspaces-fe-sbzaekoo4q-uc.a.run.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    // Legacy aliases. Module settings used to surface under each module's
    // list/[id]/module-settings route; they now live at
    // /dashboard/{module}/settings. Define the redirect at the shell so the
    // browser address bar resolves to the canonical fully-qualified path
    // (a redirect inside an FE would strip the /dashboard/{module} prefix).
    return [
      {
        source: "/dashboard/users/list/module-settings",
        destination: "/dashboard/users/settings",
        permanent: true,
      },
      // Sprint 4 / C7 — legacy /module-settings paths redirect to canonical /settings.
      {
        source: "/dashboard/companies/module-settings",
        destination: "/dashboard/companies/settings",
        permanent: true,
      },
      {
        source: "/dashboard/users/module-settings",
        destination: "/dashboard/users/settings",
        permanent: true,
      },
      {
        source: "/dashboard/workspaces/module-settings",
        destination: "/dashboard/workspaces/settings",
        permanent: true,
      },

      // Deploy 5.21B — retire the per-record settings/roles/registry routes.
      // Module-scoped settings live at /dashboard/{module}/settings.
      // Per-record view of "users touching this record" already lives on the
      // detail page itself.
      {
        source: "/dashboard/companies/:companyId/module-settings",
        destination: "/dashboard/companies/settings",
        permanent: true,
      },
      {
        source: "/dashboard/companies/:companyId/roles",
        destination: "/dashboard/companies/settings#roles",
        permanent: true,
      },
      {
        source: "/dashboard/companies/:companyId/registry",
        destination: "/dashboard/companies/:companyId",
        permanent: true,
      },
      {
        source: "/dashboard/workspaces/:workspaceId/module-settings",
        destination: "/dashboard/workspaces/settings",
        permanent: true,
      },
      {
        source: "/dashboard/workspaces/:workspaceId/roles",
        destination: "/dashboard/workspaces/settings#roles",
        permanent: true,
      },
      {
        source: "/dashboard/workspaces/:workspaceId/registry",
        destination: "/dashboard/workspaces/:workspaceId",
        permanent: true,
      },

      // Deploy 5.21A — fold Edit into Detail. /edit is deprecated.
      {
        source: "/dashboard/companies/:companyId/edit",
        destination: "/dashboard/companies/:companyId#primary-information",
        permanent: true,
      },
      {
        source: "/dashboard/workspaces/:workspaceId/edit",
        destination: "/dashboard/workspaces/:workspaceId#primary-information",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // ── Static assets (must come before page rewrites) ───────────────
      // Each FE owns its own /_<module>-fe/* URL space for chunks/data.
      { source: "/_users-fe/:path*", destination: `${USERS_FE}/_users-fe/:path*` },
      { source: "/_companies-fe/:path*", destination: `${COMPANIES_FE}/_companies-fe/:path*` },
      { source: "/_workspaces-fe/:path*", destination: `${WORKSPACES_FE}/_workspaces-fe/:path*` },

      // ── Login + auth API (owned by users-fe, mounted at shell root) ──
      { source: "/login", destination: `${USERS_FE}/login` },
      { source: "/api/otp/:path*", destination: `${USERS_FE}/api/otp/:path*` },
      { source: "/api/logout", destination: `${USERS_FE}/api/logout` },
      { source: "/api/admin/:path*", destination: `${USERS_FE}/api/admin/:path*` },

      // ── Dashboard sub-apps ───────────────────────────────────────────
      { source: "/dashboard/users", destination: `${USERS_FE}/account` },
      { source: "/dashboard/users/:path*", destination: `${USERS_FE}/:path*` },

      { source: "/dashboard/companies", destination: `${COMPANIES_FE}/` },
      { source: "/dashboard/companies/:path*", destination: `${COMPANIES_FE}/:path*` },

      { source: "/dashboard/workspaces", destination: `${WORKSPACES_FE}/` },
      { source: "/dashboard/workspaces/:path*", destination: `${WORKSPACES_FE}/:path*` },
    ];
  },
};

export default nextConfig;
