---
name: DB connection priority
description: How the DB connection is resolved; NEON_DATABASE_URL overrides DATABASE_URL
---

## Rule
DB connection order: NEON_DATABASE_URL → DATABASE_URL. SSL (`rejectUnauthorized: false`) auto-enabled for Neon URLs.

**Why:** Production data lives in Neon. Dev Replit DB used as fallback.
