# =====================================================
# AGENTSALUD MVP - COOLIFY + SUPABASE DOCKERFILE
# =====================================================
# Optimized multi-stage build for Next.js + Supabase
# Designed for Git-based deployment in Coolify
#
# @author AgentSalud DevOps Team
# @date January 2025

# =====================================================
# STAGE 1: Dependencies
# =====================================================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# =====================================================
# STAGE 2: Builder
# =====================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (optimized for Git deployment)
COPY . .

# Set build environment variables for Supabase + Coolify
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true
# Supabase build optimizations
ENV NEXT_PUBLIC_SUPABASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# Generate Prisma client if using Prisma with Supabase
RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi

# Build the application with Supabase support
RUN npm run build

# Remove development dependencies to reduce image size
RUN npm prune --production

# =====================================================
# STAGE 3: Runner
# =====================================================
FROM node:18-alpine AS runner

# Install curl for health checks and security updates
RUN apk add --no-cache curl && apk upgrade

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set production environment for Supabase + Coolify
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application (standalone mode for Coolify)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy package.json for runtime dependencies info
COPY --from=builder /app/package.json ./package.json

# Create uploads directory for file handling
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check optimized for Supabase connectivity
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
