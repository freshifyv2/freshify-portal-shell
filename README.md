# freshify-portal-shell

The **Sovereign Portal** shell. The single hostname users interact with.

## Composition

Every `/dashboard/*` path is forwarded to a sovereign module FE via Next.js
server-side rewrites (configured in `next.config.mjs`).

| Path | Backend FE |
|---|---|
| `/login` · `/api/otp/*` · `/api/logout` | `freshify-users-fe` |
| `/dashboard/users/*` | `freshify-users-fe` |
| `/dashboard/companies/*` | `freshify-companies-fe` |
| `/dashboard/workspaces/*` | `freshify-workspaces-fe` |

The shell itself owns:
- `/` — public landing
- `/dashboard` — authenticated landing
- The `sp_session` httpOnly cookie (set by users-fe's `/api/otp/verify`, read by every module FE)

## Stack
Next.js 14 App Router · TypeScript · Cloud Run (Docker, port 8080)
