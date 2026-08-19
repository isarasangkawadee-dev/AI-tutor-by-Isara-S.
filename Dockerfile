# syntax=docker/dockerfile:1
#
# AI Tutor — production web app (Next.js standalone monorepo)
# Build stage uses the whole monorepo so that @aitutor/core + @aitutor/db
# workspaces are available, then copies only the standalone output.

# ---------- Stage 1: dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/db/package.json ./packages/db/package.json
# Full workspace install — workspace packages like @aitutor/db must have
# their dependencies (@prisma/client, pg, @prisma/adapter-pg, prisma CLI)
# installed before `npm run build` runs prisma generate.
RUN npm ci

# ---------- Stage 2: build ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY apps/web ./apps/web
COPY packages ./packages
COPY tsconfig*.json ./
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- Stage 3: production ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./apps/web/public
# standalone output includes its own node_modules + workspace packages
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3000
# Runtime platforms (e.g. Railway) inject their own PORT (e.g. 8080),
# overriding the default 3000. Use shell form so PORT expands at check time.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/api/v1/health" || exit 1
CMD ["node", "apps/web/server.js"]
# rebuild trigger
