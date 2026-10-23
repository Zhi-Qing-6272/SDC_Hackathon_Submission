#!/usr/bin/env bash
# Replit "Run": API on :3001, Vite web app on :8080 (the port Replit shows in the preview), /api proxied to the API.
. "$(dirname "$0")/replit-env.sh"
# Always install: it is quick when nothing changed, and an older install (without this version's packages) would otherwise be reused.
pnpm install --frozen-lockfile || [ -x artifacts/future-ready-workforce/node_modules/.bin/vite ]  # newer pnpm exits non-zero for skipped build scripts; the packages are still installed
pnpm --filter @workspace/db run push || echo "Warning: could not update database tables (check DATABASE_URL)." >&2
PORT=3001 pnpm --filter @workspace/api-server run dev &
api=$!
trap 'kill $api 2>/dev/null' EXIT INT TERM
PORT=8080 BASE_PATH=/ API_PROXY_TARGET=http://localhost:3001 pnpm --filter @workspace/future-ready-workforce run dev
