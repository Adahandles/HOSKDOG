# Multi-stage build for optimized image size
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --production
RUN cd server && npm ci --production

FROM node:18-alpine
WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Copy dependencies and application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --chown=nodejs:nodejs . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 4000
CMD ["node", "server/index.js"]
