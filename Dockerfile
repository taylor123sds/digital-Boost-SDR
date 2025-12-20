# =============================================================================
# LEADLY SDR Agent - Production Dockerfile
# =============================================================================
# Multi-stage build: React SPA + Node.js backend
# Build with: docker build --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) -t orbion-leadly .
# =============================================================================

# =============================================================================
# Stage 1: Build React SPA (apps/web-vite)
# =============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy frontend package files
COPY apps/web-vite/package.json apps/web-vite/package-lock.json ./

# Install frontend dependencies
# --legacy-peer-deps: resolve peer dep conflicts
# --ignore-optional: skip platform-specific optional deps like @rollup/rollup-darwin-arm64
RUN npm install --legacy-peer-deps --ignore-optional

# Copy frontend source files
COPY apps/web-vite/ ./

# Build the React app (outputs to dist/)
RUN npm run build

# =============================================================================
# Stage 2: Build final image with backend + frontend
# =============================================================================
FROM node:20-alpine

# Build arguments for versioning
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ARG BUILD_DATE=unknown

# Install build dependencies for native modules (better-sqlite3, sharp)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json ./

# Install dependencies (--force ignores optional platform-specific deps like @ffmpeg-installer/darwin-arm64)
RUN npm install --omit=dev --force && npm cache clean --force

# Copy application source
COPY src/ ./src/
COPY public/ ./public/
COPY prompts/ ./prompts/
COPY ecosystem.config.cjs ./
COPY start-orbion.js ./

# Copy React SPA build from frontend-builder stage
COPY --from=frontend-builder /build/dist/ ./public/app/

# Create BUILD_INFO.json with version metadata
RUN echo "{\"commit\":\"${GIT_COMMIT}\",\"branch\":\"${GIT_BRANCH}\",\"buildDate\":\"${BUILD_DATE}\",\"nodeVersion\":\"$(node -v)\"}" > BUILD_INFO.json

# Create necessary directories
RUN mkdir -p logs data uploads backups

# Set environment with version info
ENV NODE_ENV=production
ENV PORT=3001
ENV GIT_COMMIT=${GIT_COMMIT}
ENV BUILD_DATE=${BUILD_DATE}

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Start the application
CMD ["node", "src/server.js"]
