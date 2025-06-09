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

# Use deployment-optimized Next.js config
RUN cp next.config.deploy.js next.config.js

# Set build-time environment variables for Next.js build (using ARG for security)
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only
ARG SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder-signature-for-build-time-only
ARG NEXTAUTH_SECRET=build-time-secret-placeholder-32-characters-long
ARG NEXTAUTH_URL=https://agendia.torrecentral.com

# Build the application with placeholder values (will be overridden at runtime)
# Note: NEXT_PUBLIC_ variables are embedded during build, but our client code
# will read from process.env at runtime in the standalone server
RUN NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    npx next build

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
# Copy public directory if it exists
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy package.json for runtime dependencies info
COPY --from=builder /app/package.json ./package.json

# Copy startup scripts from host context (before switching to non-root user)
COPY scripts/startup-coolify.sh /app/startup.sh
COPY scripts/startup-simple.sh /app/startup-simple.sh
COPY scripts/startup-validator.js /app/startup-validator.js
RUN chmod +x /app/startup.sh /app/startup-simple.sh

# Create uploads directory for file handling
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Set correct permissions (including startup script)
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check optimized for Coolify deployment
# Use basic health check during deployment, then switch to full health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000/api/health/basic || curl -f http://localhost:3000/api/health || exit 1

# Start the application with Node.js validator (most reliable)
# Fallback options: startup-simple.sh or direct server.js
CMD ["node", "/app/startup-validator.js"]
