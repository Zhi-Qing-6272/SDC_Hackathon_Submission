#!/usr/bin/env bash
# Shared by the Replit scripts: make sure pnpm exists, map secrets, and fail early with a clear message.
set -e
cd "$(dirname "$0")/.."
if ! command -v pnpm >/dev/null 2>&1; then corepack enable >/dev/null 2>&1 || npm install -g pnpm; fi
# One Clerk publishable key is enough: the web app reads VITE_CLERK_PUBLISHABLE_KEY, the server reads CLERK_PUBLISHABLE_KEY.
export CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY:-$VITE_CLERK_PUBLISHABLE_KEY}"
export VITE_CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-$CLERK_PUBLISHABLE_KEY}"
missing=""
for v in DATABASE_URL CLERK_SECRET_KEY CLERK_PUBLISHABLE_KEY; do [ -n "${!v}" ] || missing="$missing $v"; done
if [ -n "$missing" ]; then
  echo "Missing Replit Secrets:$missing" >&2
  echo "Open Tools > Secrets and add them (see REPLIT_SETUP.md). DATABASE_URL comes from Tools > PostgreSQL." >&2
  exit 1
fi
