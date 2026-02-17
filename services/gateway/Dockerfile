# ------------------------------------------------------------------ #
#  Stage 1 - Build                                                    #
#  NOTE: Docker context must be the REPO ROOT (not services/gateway/) #
#  because src/lib/schema.ts has relative imports to packages/db/src  #
# ------------------------------------------------------------------ #
FROM node:20-alpine AS builder

# argon2 requires native build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package manifests for layer caching
COPY package.json package-lock.json* ./
COPY services/gateway/package.json services/gateway/
COPY packages/db/package.json packages/db/

RUN npm ci

# Copy gateway source + db schemas (needed via relative imports)
COPY services/gateway/ services/gateway/
COPY packages/db/src/ packages/db/src/
COPY tsconfig.json ./

# Bundle with esbuild (transpile-only, no type checking)
# This matches dev-mode behavior where tsx runs without type checks.
# Native modules (argon2, pg-native, dd-trace) are kept external
# so they load from node_modules at runtime.
RUN npx esbuild services/gateway/src/index.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile=services/gateway/dist/index.js \
    --external:argon2 \
    --external:pg-native \
    --external:dd-trace \
    --external:pino-pretty \
    --external:pino-datadog-transport \
    --format=cjs

# Prune dev dependencies
RUN cd services/gateway && npm prune --production

# ------------------------------------------------------------------ #
#  Stage 2 - Production image                                         #
# ------------------------------------------------------------------ #
FROM node:20-alpine

# Security: run as non-root user.
RUN addgroup -S crestdesk && adduser -S crestdesk -G crestdesk

WORKDIR /app

# Copy bundled output and production deps
COPY --from=builder /app/services/gateway/dist/index.js ./dist/index.js
COPY --from=builder /app/services/gateway/node_modules ./node_modules
COPY --from=builder /app/services/gateway/package.json ./

# Switch to non-root user.
USER crestdesk

EXPOSE 4000

CMD ["node", "dist/index.js"]
