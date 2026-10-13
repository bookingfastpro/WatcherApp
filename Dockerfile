# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
#  Watcher — image de production (Coolify, Docker, tout orchestrateur)
#  Debian slim (glibc) : binaires natifs sharp / argon2 / Prisma fiables.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ─── Dépendances complètes (build)
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ─── Build Next.js
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npx prisma generate && npm run build

# ─── Dépendances de production uniquement
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund && npx prisma generate && npm cache clean --force

# ─── Image finale
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_LOCAL_DIR=/app/storage

RUN groupadd --system --gid 1001 app \
 && useradd --system --uid 1001 --gid app --home /app app \
 && mkdir -p /app/storage \
 && chown app:app /app/storage

COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --chown=app:app package.json next.config.mjs ./
COPY --chown=app:app prisma ./prisma
COPY --chown=app:app scripts ./scripts

USER app
EXPOSE 3000
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
