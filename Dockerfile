FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
RUN npm ci
FROM deps AS build
COPY . .
RUN npm run build:core && npm run db:generate && npm run build -w @aitutor/web
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --system --uid 1001 appuser
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","apps/web/server.js"]
