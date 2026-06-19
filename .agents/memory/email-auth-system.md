---
name: Email auth system
description: OTP-based email signup & password reset; set-password and link-google endpoints; frontend hook is a .ts file.
---

## Architecture

- `emailAuth.ts` — email-signup (3-step OTP: /request → /verify → /complete), /forgot-password, /reset-password
- `customerAuth.ts` — set-password (requires currentPassword if user already has one), link-google (requires Google credential), /me returns hasPassword + hasGoogle
- OTPs are 6-digit, SHA-256 hashed. Signup: 10 min expiry, reset: 15 min. Max 5 wrong attempts tracked in attemptCount column.

## DB tables
- `email_verifications` — id, email, otp_hash, verified_token_hash, expires_at, verified_at, attempt_count, created_at
- `password_reset_tokens` — id, customer_user_id, otp_hash, expires_at, used_at, attempt_count, created_at

## SMTP / email
- `artifacts/api-server/src/lib/email.ts` — nodemailer with console fallback (no-op if SMTP_HOST not set)
- `artifacts/api-server/src/lib/rateLimit.ts` — in-memory rate limiter

## Frontend
- `use-customer-auth.ts` is a `.ts` file — NO JSX; use `React.createElement` for the provider.
- `loginWithGoogle` returns `{ isNewAccount: boolean }` — if true, redirect to `/setup-password`
- New pages: `/forgot-password`, `/setup-password`, `/my/settings`
- Signup page has Phone/Email tab switcher + `EmailSignupFlow` 3-step component

**Why:** Email-only users need OTP verification to prove ownership before account creation. Google-only users need a path to add a password without having a current one to provide.
