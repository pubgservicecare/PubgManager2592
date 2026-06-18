---
name: Google OAuth auth
description: How Google Sign-In is implemented for customers; schema changes and key decisions.
---

## Implementation

Google Identity Services (GIS) token-based flow — no server redirect needed.

**Flow:** Browser loads GIS script → user clicks button → Google popup → browser receives JWT credential → POST /api/auth/google/callback → server calls `verifyIdToken()` → session set.

**Key files:**
- `artifacts/api-server/src/routes/customerAuth.ts` — `GET /auth/config` (returns googleClientId) + `POST /auth/google/callback`
- `artifacts/pubg-manager/src/components/GoogleSignInButton.tsx` — GIS renderButton wrapper
- `artifacts/pubg-manager/src/hooks/use-customer-auth.ts` — adds `googleClientId` + `loginWithGoogle`

**Account lookup order in callback:**
1. `google_id` match → existing Google user, log in
2. `email` match → existing phone user, link google_id then log in
3. No match → create new `customers` + `customer_users` row

## Schema changes to customer_users

Run via direct SQL (not drizzle-kit push — it would prompt to drop user_sessions):
```sql
ALTER TABLE customer_users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE customer_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS customer_users_email_unique ON customer_users(email) WHERE email IS NOT NULL;
ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS google_id text;
CREATE UNIQUE INDEX IF NOT EXISTS customer_users_google_id_unique ON customer_users(google_id) WHERE google_id IS NOT NULL;
ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'phone';
ALTER TABLE customer_users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
```

## Running DB migration without @neondatabase/serverless at root

Use `pg` from `lib/db/node_modules/pg` — it's installed there:
```bash
node --input-type=module << 'EOF'
import { createRequire } from 'module';
const require = createRequire('/home/runner/workspace/lib/db/node_modules/pg/package.json');
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
// ... run SQL ...
await client.end();
EOF
```

## Why GIS (not OAuth2 redirect flow)

**Why:** Token-based flow needs no redirect URI, works from any origin in popup mode, and `google-auth-library` was already installed. Simpler and more reliable for a CSR app.

**How to apply:** `GET /api/auth/config` returns `googleClientId` to the frontend. Frontend loads GIS script and calls `renderButton`. Button callback sends credential JWT to `/api/auth/google/callback` which validates server-side.

## Dev limitation

`[GSI_LOGGER]: The given origin is not allowed` in dev preview is expected — OAuth client only authorizes `https://www.codexstocks.org`. Button renders but clicking it will fail in dev. Works in production.

## Hook file pattern

`use-customer-auth.ts` is a `.ts` file (not `.tsx`) containing a React context provider. To avoid JSX in `.ts` (TypeScript rejects it), use `React.createElement(CustomerAuthCtx.Provider, { value: ... }, children)` instead of JSX syntax.
