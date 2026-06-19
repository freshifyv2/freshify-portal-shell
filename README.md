# freshify-portal-shell

The **Sovereign Portal** shell — the single hostname users interact with.

The shell is intentionally thin. It owns the navigation chrome, the tenant switcher, the cross-module routing layer, the audit feed surface, the pre-auth screens (login / signup / password reset), and the legacy-redirect handler. Every actual feature lives in a sovereign module mounted underneath it.

## Role in the foundation

| Surface | What this app owns |
|---|---|
| Routes | `/login`, `/signup`, `/reset`, `/dashboard`, `/dashboard/audit`, tenant switcher endpoint |
| Rewrites | `/dashboard/users/*` → `freshify-users-fe`, `/dashboard/companies/*` → `freshify-companies-fe`, `/dashboard/workspaces/*` → `freshify-workspaces-fe`, plus every module installed at runtime |
| Session | Reads the user JWT, resolves the active tenant, surfaces the tenant switcher in the topbar |
| Audit | Renders the cross-module audit feed produced by every sovereign module |

This is framework infrastructure. The shell knows nothing about Users, Companies, or Workspaces specifically — it discovers them through the [Standard Module Interface](https://github.com/freshifyv2/freshify-sovereign-portal/blob/main/docs/smi-spec.md) at runtime.

## Run locally

```bash
npm install
cp .env.example .env  # set USERS_SERVICE_URL, COMPANIES_SERVICE_URL, WORKSPACES_SERVICE_URL, etc.
npm run dev
```

Defaults to `http://localhost:3000`. The shell expects the four reference backends and three reference frontends to be running on their default ports (see the umbrella `docker-compose.yml` for the full local topology).

## Environment

| Variable | Required | Notes |
|---|---|---|
| `USERS_SERVICE_URL` / `USERS_FE_URL` | yes | Backend + frontend URLs for the Users module |
| `COMPANIES_SERVICE_URL` / `COMPANIES_FE_URL` | yes | Same for Companies |
| `WORKSPACES_SERVICE_URL` / `WORKSPACES_FE_URL` | yes | Same for Workspaces |
| `SESSION_COOKIE_NAME` | no | Defaults to `sp_session` |
| `PORT` | no | Defaults to `3000` |

## Conformance

The shell is framework infrastructure, not a sovereign module — it does not export a Module Registry. It does, however, consume the registries every module exports. See [`docs/smi-spec.md`](https://github.com/freshifyv2/freshify-sovereign-portal/blob/main/docs/smi-spec.md) for the contract the shell expects from every module it mounts.

## License

Apache 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE). Copyright 2026 Freshify, Inc.

## Support

- Bugs and feature requests: open an issue. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first.
- Security disclosures: see [SECURITY.md](./SECURITY.md). Do not open a public issue.
- Production deployment, custom modules, architecture review: see [SUPPORT.md](./SUPPORT.md).
