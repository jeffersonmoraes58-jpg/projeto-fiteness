#!/bin/sh
set -e

echo "Applying Prisma schema..."
/app/prisma-run/node_modules/.bin/prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss

echo "Starting API..."
exec node dist/main
