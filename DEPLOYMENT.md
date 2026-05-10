# Deployment Guide

## Setup: Cloudflare Pages (Frontend) + Render.com (Backend)

---

## STEP 1 — Deploy Backend on Render.com

1. Go to https://render.com → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (push this code to GitHub first)
4. Use these settings:
   - **Name:** pubg-account-manager-api
   - **Build Command:** `npm install -g pnpm@latest && pnpm install && pnpm --filter @workspace/api-server run build`
   - **Start Command:** `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`
   - **Plan:** Free
5. Add these Environment Variables:
   - `DATABASE_URL` → (your Neon DB connection string)
   - `SESSION_SECRET` → (any random long string, e.g. use https://generate-secret.vercel.app/64)
   - `NODE_ENV` → `production`
   - `PORT` → `10000`
   - `FRONTEND_URL` → (add after Cloudflare deploy, e.g. https://pubgmarket.pages.dev)
6. Click **"Create Web Service"**
7. Wait for build to complete → copy your URL (e.g. `https://pubg-account-manager-api.onrender.com`)

---

## STEP 2 — Deploy Frontend on Cloudflare Pages

1. Go to https://pages.cloudflare.com → Sign in
2. Click **"Create a project"** → **"Connect to Git"**
3. Select your GitHub repo
4. Use these build settings:
   - **Framework preset:** None
   - **Build command:** `npm install -g pnpm@latest && pnpm install && pnpm --filter @workspace/pubg-manager run build`
   - **Build output directory:** `artifacts/pubg-manager/dist/public`
5. Add Environment Variable:
   - `VITE_API_URL` → (your Render URL from Step 1, e.g. `https://pubg-account-manager-api.onrender.com`)
6. Click **"Save and Deploy"**
7. Copy your Cloudflare URL (e.g. `https://pubgmarket.pages.dev`)

---

## STEP 3 — Update FRONTEND_URL on Render

1. Go back to Render dashboard
2. Open your web service → **"Environment"**
3. Update `FRONTEND_URL` to your Cloudflare Pages URL
4. Click **"Save Changes"** → service will restart automatically

---

## STEP 4 — Keep Backend Awake (UptimeRobot)

1. Go to https://uptimerobot.com → Sign up (free)
2. Click **"Add New Monitor"**
   - Monitor Type: HTTP(s)
   - Friendly Name: PUBG API
   - URL: `https://your-render-url.onrender.com/api/healthz`
   - Monitoring Interval: 14 minutes
3. Click **"Create Monitor"**

Done! Your app is now live 24/7 for free.
