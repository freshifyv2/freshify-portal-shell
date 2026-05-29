/**
 * Sovereign Portal shell — composition via server-side rewrites.
 *
 * Each sovereign module FE runs in its own Cloud Run service. The shell
 * mounts them under /dashboard/* and forwards all sub-paths via rewrite.
 *
 * /login is owned by users-fe but lives at the shell root so the user
 * sees a single hostname.
 */

const USERS_FE = process.env.USERS_FE_URL || "https://freshify-users-fe-sbzaekoo4q-uc.a.run.app";
const COMPANIES_FE = process.env.COMPANIES_FE_URL || "https://freshify-companies-fe-sbzaekoo4q-uc.a.run.app";
const WORKSPACES_FE = process.env.WORKSPACES_FE_URL || "https://freshify-workspaces-fe-sbzaekoo4q-uc.a.run.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      // Login UI is owned by users-fe but mounted at /login on the shell
      { source: "/login", destination: `${USERS_FE}/login` },
      { source: "/api/otp/:path*", destination: `${USERS_FE}/api/otp/:path*` },
      { source: "/api/logout", destination: `${USERS_FE}/api/logout` },

      // Dashboard sub-apps
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
