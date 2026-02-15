# ------------------------------------------------------------------ #
#  Stage 1 - Build                                                    #
# ------------------------------------------------------------------ #
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching for
# dependency installation.
COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

# Copy source and compile TypeScript.
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Prune dev dependencies so the production image is smaller.
RUN npm prune --production

# ------------------------------------------------------------------ #
#  Stage 2 - Production image                                         #
# ------------------------------------------------------------------ #
FROM node:20-alpine

# Security: run as non-root user.
RUN addgroup -S crestdesk && adduser -S crestdesk -G crestdesk

WORKDIR /app

# Copy only the compiled output and production dependencies.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Switch to non-root user.
USER crestdesk

EXPOSE 4000

CMD ["node", "dist/index.js"]
