---
name: GCS proxy upload
description: Why signed URLs fail for GCS and how the proxy upload endpoint solves it
---

## Rule
Never use GCS signed URLs for browser-direct uploads. Use proxy upload instead:
- `getObjectEntityUploadURL` returns `/api/storage/uploads/gcs/{uuid}` (our server)
- Browser PUTs file to that URL (same origin — no CORS, no signing)
- Server saves to GCS via `file.save()` (no signing needed)

**Why:** `@google-cloud/storage` generates V2 signed URLs in this setup which fail with `SignatureDoesNotMatch` (403). Connection test passes because it uses OAuth token (not signing). Proxy bypasses signing entirely.

**How to apply:** `saveGcsObject(uuid, data, contentType)` in objectStorage.ts. Path is deterministic: `folderPath ? ${folderPath}/uploads/${uuid} : uploads/${uuid}`. Both `normalizeObjectEntityPath` and `saveGcsObject` use the same formula.
