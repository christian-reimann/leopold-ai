# Ein gemeinsames Image für beide Prozesse: Web (`next start`) und Worker (`node dist/worker/runner.mjs`).
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    PUPPETEER_SKIP_DOWNLOAD=true pnpm install --frozen-lockfile

FROM base AS deps-prod
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    PUPPETEER_SKIP_DOWNLOAD=true pnpm install --frozen-lockfile --prod

FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium (für den PDF-Export via Puppeteer) + Fonts für sauberes PDF-Rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# `drizzle-kit` bleibt in den Dependencies, weil das Deploy-Workflow `pnpm db:migrate` im Image ausführt.
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=node:node /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Laufzeit-Ablageort für Uploads/generierte PDFs
RUN mkdir -p storage/applications storage/chat-uploads storage/uploads && chown -R node:node storage

USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
