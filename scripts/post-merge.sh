#!/bin/bash
set -e

# Install / update all workspace dependencies
pnpm install --frozen-lockfile

# Push DB schema changes
pnpm --filter @workspace/db run push
