#!/bin/bash
# Kill any stale processes holding our ports before starting
fuser -k 8080/tcp 5000/tcp 2>/dev/null || true
sleep 1

# Start API server in background
PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Start frontend in foreground (keeps workflow alive)
PORT=5000 pnpm --filter @workspace/pubg-manager run dev

# If frontend exits for any reason, clean up API too
kill $API_PID 2>/dev/null || true
