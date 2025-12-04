# syntax=docker/dockerfile:1

# ─── Stage 1: Dependencies (production only) ───
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# ─── Stage 2: Builder (for lint/test) ───
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run lint

# ─── Stage 3: Runner (production) ───
FROM oven/bun:1-alpine AS runner
WORKDIR /app

COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json tsconfig.json ./
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun drizzle ./drizzle
COPY --chown=bun:bun drizzle.config.ts ./

ENV NODE_ENV=production
EXPOSE 3000

USER bun
CMD ["bun", "run", "src/bootstrap.ts"]
