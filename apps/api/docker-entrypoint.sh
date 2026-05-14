#!/bin/sh
set -e

echo "Running database migrations..."
/app/prisma-run/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma

echo "Starting API..."
exec node dist/main
