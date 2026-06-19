---
name: Auth hardening
description: Production auth security hardening — rate limiter, audit logs, soft delete, new account endpoints
---

## What was done

### DB-backed rate limiter (`lib/rateLimit.ts`)
- `checkRateLimit(key, maxCount, windowMs)` is **async** — all callers must `await` it.
- Persists in `rate_limit_entries` table (upsert); survives restarts; multi-instance safe.
- Fails open on DB error (returns true).

### Startup table init + cleanup job (`index.ts`)
- `initTables()` creates `user_sessions`, `rate_limit_entries`, `auth_audit_logs`, and adds `deleted_at` column to `customer_users` — all with `IF NOT EXISTS` / `IF NOT EXISTS`.
- `startCleanupJob()` runs hourly: purges expired email_verifications, password_reset_tokens, rate_limit_entries.

### Audit logging (`lib/authAudit.ts`)
- `logAuthEvent(action, userId, ip, metadata?)` — writes to `auth_audit_logs`.
- `getClientIp(req)` — reads `x-forwarded-for` or `req.ip`.
- Key events logged: `login_success`, `login_failure`, `google_login_success`, `google_linked`, `google_unlinked`, `password_changed`, `password_reset_complete`, `email_signup_*`, `forgot_password_*`, `account_deleted`, `email_changed`.

### Soft delete (`customer_users.deleted_at`)
- Schema: `deletedAt: timestamp("deleted_at", { withTimezone: true })` in `customerUsers.ts`.
- `DELETE /customer/account` sets `deletedAt = NOW()`, destroys session, clears cookie.
- Password confirmation required if account has a password.
- All login queries filter `AND deleted_at IS NULL` (phone login, email login, unified auth/login, `/customer/me` guard).
- `/customer/me` checks `user.deletedAt` and destroys session if account was soft-deleted.

### Unlink Google (`POST /customer/unlink-google`)
- Requires `user.passwordHash` to be set first (otherwise account becomes inaccessible).
- Sets `googleId = null`, resets `authProvider` to "phone" or "email".

### Email update flow
- `POST /customer/update-email/request` — rate-limited, checks email uniqueness, sends OTP.
- `POST /customer/update-email/verify` — validates OTP, updates `email` + `emailVerified`, logs `email_changed`.
- Uses `emailVerificationsTable` (already in schema + exported).

**Why:** Production hardening before codexstocks.org launch — accounts must be safe against enumeration, brute force, and dangling deleted accounts.

**How to apply:** When adding new auth routes in customerAuth.ts or emailAuth.ts: always `await checkRateLimit`, always `logAuthEvent` on success/failure, always filter `isNull(deletedAt)` in customer queries.
