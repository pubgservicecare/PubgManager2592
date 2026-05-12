# PUBG Account Manager

Pakistan's trusted marketplace for buying and selling premium PUBG Mobile accounts — with seller management, customer installment plans, admin dashboard, and a real-time chat system.

## STARTUP — READ THIS FIRST (for any AI opening this project)

### Step 1 — Install dependencies if missing
```bash
pnpm install
```

### Step 2 — Start the app (in order)
Restart these two workflows **in this order**, one at a time:
1. **"API Server"** — wait for it to say `Server listening` before continuing
2. **"Start application"** — wait for port 5000 to open

Each workflow already includes `fuser -k` to kill stale ports before starting, so port conflicts are handled automatically.

### Step 3 — Artifact preview (canvas)
If the `artifacts/pubg-manager: web` workflow is not running, restart it too. It provides the canvas/artifact iframe preview on port 21604.

### Do NOT touch these — they are expected to fail
- `artifacts/api-server: API Server` — fails by design (port 8080 already taken by "API Server")
- `.migration-backup/*` workflows — legacy, always fail, ignore them

### Admin login
- URL: `/admin`
- Username: `admin`
- Password: `admin123`

---

## Run & Operate

- `pnpm --filter @workspace/pubg-manager run dev` — frontend (port 5000 in dev, 21604 via artifact)
- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, defaults to 8080 if PORT unset)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `SESSION_SECRET` — Random secret for session signing (set in Replit secrets)
- `FRONTEND_URL` — Frontend origin(s) for CORS (comma-separated, optional in dev)
- `PORT` — Set by workflow; API server defaults to 8080 if not set

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, wouter (routing), TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Session-based (admin + customer + seller flows)
- File uploads: Uppy + local/GCS object storage

## Where things live

- `artifacts/pubg-manager/` — React+Vite frontend (marketplace UI)
- `artifacts/api-server/` — Express backend (all API routes)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas
- `lib/db/src/schema/` — Drizzle database schema
- `lib/object-storage-web/` — Uppy upload helpers
- `scripts/start-dev.sh` — Combined dev startup script (kills stale ports, starts both services)

## Architecture decisions

- Three separate auth flows: admin (seller-side management), customer (buyers), seller (account sellers)
- Session-based auth with Postgres session store (`connect-pg-simple`)
- OpenAPI-first: all API contracts in `lib/api-spec/openapi.yaml`; frontend uses generated hooks only
- Object storage for account images and receipts (local by default, GCS optional via admin settings)
- Installment payment system with scheduled payments and activity logging

## Product

- Public marketplace: browse/search/filter PUBG accounts, view account details, wishlist
- Seller portal: list accounts, manage sales, track payments, chat with customers
- Customer portal: dashboard, installment management, purchase history
- Admin dashboard: full CRUD for accounts, customers, sellers, settings, activity log, PDF exports

## User preferences

- Keep all API contracts in the OpenAPI spec; run codegen after any spec changes
- Use `req.log` for logging in route handlers, `logger` singleton elsewhere

## Gotchas

- Always run `pnpm --filter @workspace/db run push` after schema changes
- Run `pnpm --filter @workspace/api-spec run codegen` after updating `lib/api-spec/openapi.yaml`
- API server defaults PORT to 8080 if not set (no longer throws on missing PORT)
- Each workflow kills its own port before starting — no manual port cleanup needed

## Pointers

- DB schema: `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/pubg-manager/src/pages/`
