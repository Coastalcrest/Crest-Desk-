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

# Copy gateway source + db schemas (needed for tsc via relative imports)
COPY services/gateway/ services/gateway/
COPY packages/db/src/ packages/db/src/
COPY tsconfig.json ./

# Compile TypeScript using Docker-specific tsconfig that:
# - Sets rootDir=../.. so relative imports to packages/db resolve
# - Relaxes strict checks (noUnusedLocals/Params) for production build
# Output: dist/services/gateway/src/index.js, dist/packages/db/src/schema/*
RUN cd services/gateway && npx tsc -p tsconfig.docker.json

# Prune dev dependencies
RUN cd services/gateway && npm prune --production

# ------------------------------------------------------------------ #
#  Stage 2 - Production image                                         #
# ------------------------------------------------------------------ #
FROM node:20-alpine

# Security: run as non-root user.
RUN addgroup -S crestdesk && adduser -S crestdesk -G crestdesk

WORKDIR /app

# Copy compiled output and production deps
COPY --from=builder /app/services/gateway/dist/ ./dist/
COPY --from=builder /app/services/gateway/node_modules ./node_modules
COPY --from=builder /app/services/gateway/package.json ./

# Switch to non-root user.
USER crestdesk

EXPOSE 4000

# With rootDir=../../ the entry point is nested under the repo structure
CMD ["node", "dist/services/gateway/src/index.js"]
