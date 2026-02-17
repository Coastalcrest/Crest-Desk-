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
# Native modules and pino transports are kept external
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

# ------------------------------------------------------------------ #
#  Stage 2 - Production image                                         #
# ------------------------------------------------------------------ #
FROM node:20-alpine

# argon2 requires native build tools for installation
RUN apk add --no-cache python3 make g++

# Security: run as non-root user.
RUN addgroup -S crestdesk && adduser -S crestdesk -G crestdesk

WORKDIR /app

# Copy bundled output
COPY --from=builder /app/services/gateway/dist/index.js ./dist/index.js

# Install only the native/external runtime deps that esbuild can't bundle.
# This is faster and cleaner than copying the entire monorepo node_modules.
RUN npm init -y > /dev/null 2>&1 && \
    npm install --no-package-lock argon2@0.41 2>/dev/null && \
    rm -rf /root/.npm

# Switch to non-root user.
USER crestdesk

EXPOSE 4000

CMD ["node", "dist/index.js"]
