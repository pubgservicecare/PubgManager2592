# Deployment Guide — PUBG Account Manager

This project is a **pnpm monorepo**:
- **Backend** lives in `artifacts/api-server/` → deploys to **Render**
- **Frontend** lives in `artifacts/pubg-manager/` → deploys to **Vercel**
- Shared code lives in `lib/` (db schemas, generated API client, validation)

> ⚠️ **DO NOT flatten** the project to `/frontend` and `/backend`. The `lib/` packages are shared between both and consumed via pnpm workspace links. The current structure is correct and intentional.

---

## 1. Database Setup (do this first)

You need a PostgreSQL database before deploying the backend.

**Recommended providers** (free tiers available):
- [Neon](https://neon.tech) — serverless Postgres
- [Supabase](https://supabase.com) — Postgres with extras
- [Render Postgres](https://render.com/docs/databases)

After creating the DB, copy the connection string (looks like `postgresql://user:pass@host:5432/dbname`).

Push the schema once locally before first deploy:

```bash
DATABASE_URL="<your-connection-string>" pnpm --filter @workspace/db run push
```

---

## 2. Backend → Render

### Option A — One-click via `render.yaml` (Blueprint)

1. Push this repo to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect your GitHub repo. Render will auto-detect `render.yaml`.
4. When prompted, fill in the required env vars:
   - `DATABASE_URL` — your Postgres connection string
   - `FRONTEND_URL` — your Vercel URL (you'll get this after step 3 — start with `*` and update later)
5. Click **Apply**.

### Option B — Manual setup

1. Render Dashboard → **New** → **Web Service** → connect your GitHub repo.
2. Configure:
   - **Root Directory**: leave blank (use repo root)
   - **Runtime**: Node
   - **Build Command**: `corepack enable && pnpm install --frozen-lockfile=false && pnpm --filter @workspace/api-server run build`
   - **Start Command**: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
   - **Health Check Path**: `/api/healthz`
3. Add Environment Variables:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |
   | `DATABASE_URL` | (your Postgres URL) |
   | `SESSION_SECRET` | (generate a long random string) |
   | `FRONTEND_URL` | (Vercel URL — fill after frontend deploys) |
4. Click **Create Web Service**.

After deploy, your backend URL will be something like `https://pubg-account-manager-api.onrender.com`.

**Test it**: open `https://your-backend.onrender.com/api/healthz` — should return `{"status":"ok"}`.

---

## 3. Frontend → Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new) → **Add New Project** → import your GitHub repo.
2. Configure:
   - **Framework Preset**: Other (or "Vite" if shown)
   - **Root Directory**: leave as `.` (project root) — `vercel.json` handles the rest
   - **Build Command**, **Output Directory**, **Install Command**: leave blank (read from `vercel.json`)
3. Add Environment Variable:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-backend.onrender.com` (from step 2, NO trailing slash) |
4. Click **Deploy**.

After deploy you'll get a URL like `https://your-app.vercel.app`.

---

## 4. Connect them (CORS)

Go back to your **Render** service → Environment → update:
- `FRONTEND_URL` = `https://your-app.vercel.app`

Redeploy the backend (Render does this automatically on env change).

---

## 5. Verify

1. Open `https://your-app.vercel.app` — should load the marketplace.
2. Open browser DevTools → Network tab → confirm API calls go to your Render URL.
3. No CORS errors in console.

---

## Local Development (Replit)

Sab kuch already configured hai. Bas:
```bash
# Schema sync (only needed once or after schema changes)
pnpm --filter @workspace/db run push

# Workflows panel se restart karein:
# - artifacts/api-server: API Server
# - artifacts/pubg-manager: web
```

Local mein `VITE_API_URL` set NA karein — frontend Replit proxy ke through backend ko same origin se hit karta hai.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Vercel build fails with "PORT required" | Confirm `vercel.json` has `build.env.PORT` set |
| CORS error in browser | Check `FRONTEND_URL` on Render exactly matches Vercel URL (no trailing slash, correct scheme) |
| 401 errors after login | Cookies need `sameSite: "none"` and `secure: true` for cross-site auth — see `app.ts` session config |
| 500 from API | Database not migrated. Run `pnpm --filter @workspace/db run push` with prod `DATABASE_URL` |
| `setBaseUrl` not found | Confirm `VITE_API_URL` is set in Vercel env (Build & Production scope) |
