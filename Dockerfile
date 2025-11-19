# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache bash \
  && corepack enable

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# --- Stage 2: Production ---
FROM node:20-alpine AS runner
WORKDIR /app

# Enable pnpm via corepack
RUN apk add --no-cache bash \
  && corepack enable

ENV NODE_ENV=production

# Copy dependency manifests first (for pnpm install)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 5436

CMD ["node", "dist/index.js"]
