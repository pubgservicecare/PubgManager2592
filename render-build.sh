#!/usr/bin/env bash
set -e

echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Install pnpm
npm install -g pnpm@10

echo "pnpm version: $(pnpm --version)"

# Install all dependencies (no frozen lockfile for cross-env compatibility)
pnpm install --no-frozen-lockfile

# Build the API server
pnpm --filter @workspace/api-server run build

# Build the frontend.
# IMPORTANT: Do NOT set VITE_API_URL here.
# Without it, the frontend uses relative /api paths — which are same-origin
# and work on ALL browsers including iOS Safari. Setting VITE_API_URL to an
# absolute URL creates a cross-origin setup that breaks mobile login on Safari.
pnpm --filter @workspace/pubg-manager run build

echo "Build complete!"
