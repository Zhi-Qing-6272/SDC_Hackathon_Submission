#!/usr/bin/env bash
# Replit deployment run: one Node process serves /api and the built web app on :8080.
. "$(dirname "$0")/replit-env.sh"
export NODE_ENV=production PORT="${PORT:-8080}"
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
