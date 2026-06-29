#!/usr/bin/env bash
set -e

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# ─── CRITICAL: Guard against cross-origin misconfiguration ───────────────────
#
# VITE_API_URL must NEVER be set during the Render build.
# If it is set, every API call from the browser will go to an absolute URL
# on a different domain — cross-origin cookies will be blocked by iOS Safari
# and Samsung Internet, and mobile login will ALWAYS fail, no matter what
# SameSite/Secure/CORS settings are used server-side.
#
# The correct setup: this build script produces a frontend that uses relative
# /api/... paths. Express serves both the frontend and the API from the same
# Render URL. Everything is same-origin. No CORS. No cookie issues.
#
if [ -n "$VITE_API_URL" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║  BUILD BLOCKED: VITE_API_URL is set in the environment.         ║"
  echo "║                                                                  ║"
  echo "║  This will break mobile login on iOS Safari and Samsung         ║"
  echo "║  Internet because cross-origin cookies are blocked by ITP.      ║"
  echo "║                                                                  ║"
  echo "║  Fix: Delete VITE_API_URL from Render environment variables.    ║"
  echo "║  The frontend uses relative /api paths — no base URL needed.    ║"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

# Install pnpm
npm install -g pnpm@10
echo "pnpm version: $(pnpm --version)"

# Install all dependencies
pnpm install --no-frozen-lockfile

# Build the API server
pnpm --filter @workspace/api-server run build

# Build the frontend WITHOUT VITE_API_URL.
# Relative /api paths = same-origin = works on ALL browsers including iOS Safari.
echo "Building frontend (same-origin mode, no VITE_API_URL)..."
pnpm --filter @workspace/pubg-manager run build

echo ""
echo "✓ Build complete — same-origin deployment ready."
echo "  Make sure SAME_ORIGIN_DEPLOYMENT=true is set in Render env vars."
echo ""
