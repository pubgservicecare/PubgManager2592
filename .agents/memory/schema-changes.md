---
name: Schema changes
description: How to safely push schema changes without dropping user_sessions
---

## Rule
Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` directly, NOT `drizzle-kit push` (it prompts to drop `user_sessions` which is created manually at startup, not in Drizzle schema).

If drizzle-kit push is necessary, use `--force` flag.
