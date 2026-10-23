#!/usr/bin/env bash
# Replit deployment build: install, create/update tables, build the web app and the API.
. "$(dirname "$0")/replit-env.sh"
pnpm install --frozen-lockfile || [ -x artifacts/future-ready-workforce/node_modules/.bin/vite ]
pnpm --filter @workspace/db run push
PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/future-ready-workforce run build
NODE_ENV=production pnpm --filter @workspace/api-server run build
