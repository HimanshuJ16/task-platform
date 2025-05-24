# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production

# Build frontend
FROM base AS frontend-builder
WORKDIR /app
COPY frontend/ ./frontend/
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
RUN cd frontend && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy backend files
COPY --chown=nodejs:nodejs backend/ ./backend/
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy built frontend
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/healthcheck.js

CMD ["node", "backend/server.js"]
