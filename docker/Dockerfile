# syntax=docker/dockerfile:1

# ─── Stage 1: Builder ───
FROM oven/bun:1-debian AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

RUN bun build --compile --minify --sourcemap=none --target=bun-linux-x64 src/bootstrap.ts --outfile server

# ─── Stage 2: Minimal Runtime ───
FROM debian:12-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home --shell /usr/sbin/nologin appuser

WORKDIR /app

COPY --from=builder /app/server /app/server

ENV NODE_ENV=production
EXPOSE 3000

USER appuser
CMD ["/app/server"]
