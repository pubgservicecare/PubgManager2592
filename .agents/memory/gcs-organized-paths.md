---
name: GCS organized paths
description: Forward-only GCS upload restructure — how new upload paths are generated without touching existing DB records or GCS files.
---

## Rule
New GCS uploads use organized folder paths. Existing DB records and GCS files are NOT touched.

## How it works
1. Frontend passes `uploadContext: { uploadType, sellerId?, accountId?, accountSlug? }` in the upload request body.
2. `getObjectEntityUploadURL()` in `objectStorage.ts` detects `context.uploadType`, generates an organized path, and registers a UUID token → gcsPath in `_uploadTokens` map (30-min TTL).
3. `normalizeObjectEntityPath()` checks the token map first; returns `/objects/{gcsPath}` for organized uploads.
4. `saveGcsObject()` checks the token map first; saves to organized gcsPath and consumes the token.
5. Without `uploadContext`, legacy behavior (slug-based or UUID path with folder prefix) is preserved.

## Path structure (new uploads only)
- Logo: `logo/code-x-stocks-logo-{shortId}`
- Account image (edit): `accounts/account-{accountId}-{slug}/thumbnail-{shortId}`
- Account image (new): `accounts/new-{slug}/thumbnail-{shortId}`
- Seller CNIC front (signup): `sellers/pending/signup-{shortId}/cnic-front`
- Seller CNIC back (signup): `sellers/pending/signup-{shortId}/cnic-back`
- Seller selfie (signup): `sellers/pending/signup-{shortId}/selfie`
- Seller docs (admin re-upload with sellerId): `sellers/pending/seller-{id}/cnic-front-{shortId}`

## Key gotcha
`accountSlug` from DB is already a slug — do NOT pass through `toSlug()` again (strips hyphens).
Use `accountSlug.slice(0, 40)` directly. Only `accountTitle` (raw title) needs `toSlug()`.

## Files changed
- `artifacts/api-server/src/lib/objectStorage.ts` — core token map + path generation
- `artifacts/api-server/src/routes/storage.ts` — reads uploadContext from req.body
- `lib/object-storage-web/src/use-upload.ts` — UploadContext type + request body
- `lib/object-storage-web/src/index.ts` — exports UploadContext
- `artifacts/pubg-manager/src/components/FileUploadField.tsx` — uploadContext prop
- `artifacts/pubg-manager/src/components/MultiImageUploadField.tsx` — uploadContext prop
- Pages: admin/settings (logo), public/unified-signup (CNIC/selfie), seller-account-form, admin/accounts/form

**Why:** Forward-only: organized structure for new uploads, zero risk to live site or Google-indexed URLs.
