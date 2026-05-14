FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install api + database dependencies (standalone — no workspace)
COPY apps/api/package.json ./package.json
COPY packages/database/package.json ./packages/database/package.json
RUN npm install --legacy-peer-deps && \
    cd packages/database && npm install --legacy-peer-deps && cd /app

# Copy source
COPY apps/api/ ./
COPY packages/database/ ./packages/database/

RUN ./packages/database/node_modules/.bin/prisma generate --schema=./packages/database/prisma/schema.prisma && \
    mkdir -p node_modules/.prisma && \
    cp -r packages/database/node_modules/.prisma/client node_modules/.prisma/
RUN npm run build

# ── Production runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# Create proper node_modules structure for Prisma CLI (migrate at startup)
COPY --from=builder /app/packages/database/node_modules /app/prisma-run/node_modules
COPY --from=builder /app/packages/database/prisma ./prisma

COPY --chown=nestjs:nodejs apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nestjs
EXPOSE 4000

CMD ["sh", "./docker-entrypoint.sh"]
