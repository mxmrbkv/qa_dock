# ==========================================
# Multi-stage Dockerfile for NestJS Backend
# ==========================================

# ------------------------------------------
# Stage 1: Build Stage
# ------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

# Copy dependency manifests
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and config
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# Build production bundle
RUN npm run build

# ------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production
ENV PORT=4000

# Copy package manifests and install production dependencies
COPY package.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev && \
    npx prisma generate && \
    npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Create startup script that pushes migrations and starts the app
RUN echo '#!/bin/sh' > /app/docker-entrypoint.sh && \
    echo 'set -e' >> /app/docker-entrypoint.sh && \
    echo 'echo "==> Running Prisma db push to sync schema..."' >> /app/docker-entrypoint.sh && \
    echo 'npx prisma db push --skip-generate --accept-data-loss' >> /app/docker-entrypoint.sh && \
    echo 'echo "==> Starting NestJS application..."' >> /app/docker-entrypoint.sh && \
    echo 'exec node dist/main.js' >> /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/docker-entrypoint.sh"]
