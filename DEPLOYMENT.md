# Deployment Guide

## Recommended Setup: Single Render.com Web Service (Frontend + Backend, same-origin)

This is the **correct and recommended** production setup. The frontend is built and
served by the same Express server as the API. Everything is same-origin — no CORS
issues, no cross-origin cookie problems, and no mobile browser compatibility issues.

> **Why same-origin matters for mobile:**
> Mobile browsers (iOS Safari, Android Chrome, Samsung Internet) block
> `SameSite=None` cookies from cross-origin requests as part of their
> anti-tracking systems (ITP, Smart Anti-Tracking, etc.). Same-origin deployments
> use `SameSite=Lax` cookies which work perfectly on all devices.

---

## STEP 1 — Deploy on Render.com (single web service)

1. Go to https://render.com → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Use these settings:
   - **Name:** pubg-account-manager
   - **Build Command:** `chmod +x render-build.sh && ./render-build.sh`
   - **Start Command:** `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`
   - **Plan:** Free
5. Add these Environment Variables:
   - `DATABASE_URL` → (your PostgreSQL connection string)
   - `SESSION_SECRET` → (any random 64-char string — use https://generate-secret.vercel.app/64)
   - `NODE_ENV` → `production`
   - `PORT` → `10000`
   - `ADMIN_USERNAME` → `admin`
   - `ADMIN_PASSWORD` → (your chosen admin password)
6. Click **"Create Web Service"**
7. Wait for build to complete
8. Your app is live at the Render URL (e.g. `https://pubg-account-manager.onrender.com`)
   — both the frontend AND the `/api` backend are served from this single URL

**Do NOT set `VITE_API_URL`** in the build. Without it, the frontend uses relative
`/api` paths and everything stays same-origin. This is what makes mobile login work.

---

## STEP 2 — Keep Backend Awake (UptimeRobot)

Render free tier spins down after 15 minutes of inactivity. Add a monitor to keep it alive:

1. Go to https://uptimerobot.com → Sign up (free)
2. Click **"Add New Monitor"**
   - Monitor Type: HTTP(s)
   - Friendly Name: PUBG API
   - URL: `https://your-render-url.onrender.com/health`
   - Monitoring Interval: 14 minutes
3. Click **"Create Monitor"**

---

## Optional: Custom Domain

1. In Render dashboard → your web service → **"Settings"** → **"Custom Domain"**
2. Add your domain and follow the DNS instructions

---

## Cross-origin Deployment (NOT recommended — breaks mobile login)

If you choose to deploy the frontend separately (e.g. Cloudflare Pages) and the
backend on Render, login will fail on mobile browsers because `SameSite=None`
cookies are blocked by anti-tracking systems.

If you must use this setup, set `CROSS_ORIGIN_COOKIES=true` on the backend and
`VITE_API_URL` to your Render URL on the frontend, and set `FRONTEND_URL` on the
backend to your frontend domain. Understand that mobile Safari login may still
fail due to browser-level ITP restrictions that cannot be bypassed server-side.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Random secret for session signing |
| `NODE_ENV` | ✅ | Set to `production` |
| `PORT` | ✅ | Set to `10000` on Render |
| `ADMIN_USERNAME` | ✅ | Admin dashboard username |
| `ADMIN_PASSWORD` | ✅ | Admin dashboard password |
| `FRONTEND_URL` | ❌ | Only needed for cross-origin CORS (see above) |
| `CROSS_ORIGIN_COOKIES` | ❌ | Set to `true` only for cross-origin deployments |
