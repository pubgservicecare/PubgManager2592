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

echo "Build complete!"
