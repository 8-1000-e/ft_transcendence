#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Starting backend..."
# Build emits to dist/src/main.js (prisma.config.ts at the project root shifts
# the tsc rootDir), so the production entry lives there — not dist/main.js.
exec node dist/src/main
