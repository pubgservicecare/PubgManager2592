# PUBG Account Manager

Pakistan's trusted marketplace for buying and selling premium PUBG Mobile accounts — with seller management, customer installment plans, admin dashboard, and a real-time chat system.

## Run & Operate

- `pnpm --filter @workspace/pubg-manager run dev` — run the frontend (port 21604)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Random secret for session signing
- `FRONTEND_URL` — Frontend origin(s) for CORS (comma-separated)
- `PORT` — Set automatically by workflow

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, wouter (routing), TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Session-based (admin + customer + seller flows)
- File uploads: Uppy + object storage

## Where things live

- `artifacts/pubg-manager/` — React+Vite frontend (marketplace UI)
- `artifacts/api-server/` — Express backend (all API routes)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas
- `lib/db/src/schema/` — Drizzle database schema
- `lib/object-storage-web/` — Uppy upload helpers

## Architecture decisions

- Three separate auth flows: admin (seller-side management), customer (buyers), seller (account sellers)
- Session-based auth with Postgres session store (`connect-pg-simple`)
- OpenAPI-first: all API contracts in `lib/api-spec/openapi.yaml`; frontend uses generated hooks only
- Object storage for account images and receipts
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
- The API server requires `DATABASE_URL`, `SESSION_SECRET`, and `PORT` to start

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema: `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/pubg-manager/src/pages/`
