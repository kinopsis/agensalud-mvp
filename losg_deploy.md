Starting deployment of kinopsis/agensalud-mvp:main to localhost.
Preparing container with helper image: ghcr.io/coollabsio/coolify-helper:1.0.8.
[CMD]: docker stop --time=30 j0kkc0wso4wsswcgsoo8ow0o
Error response from daemon: No such container: j0kkc0wso4wsswcgsoo8ow0o
[CMD]: docker rm -f j0kkc0wso4wsswcgsoo8ow0o
Error response from daemon: No such container: j0kkc0wso4wsswcgsoo8ow0o
[CMD]: docker run -d --network coolify --name j0kkc0wso4wsswcgsoo8ow0o --rm -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/coollabsio/coolify-helper:1.0.8
96401159988f1c735b8a9a608e3de7ea8723b69c637c56ba179440619d9fed0d
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'GIT_SSH_COMMAND="ssh -o ConnectTimeout=30 -p 22 -o Port=22 -o LogLevel=ERROR -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" git ls-remote https://github.com/kinopsis/agensalud-mvp main'
0c0308df0afe5889faaa54a2a4994edb59f291d8	refs/heads/main
----------------------------------------
Importing kinopsis/agensalud-mvp:main (commit sha HEAD) to /artifacts/j0kkc0wso4wsswcgsoo8ow0o.
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'git clone -b "main" https://github.com/kinopsis/agensalud-mvp /artifacts/j0kkc0wso4wsswcgsoo8ow0o && cd /artifacts/j0kkc0wso4wsswcgsoo8ow0o && sed -i "s#git@\(.*\):#https://\1/#g" /artifacts/j0kkc0wso4wsswcgsoo8ow0o/.gitmodules || true && cd /artifacts/j0kkc0wso4wsswcgsoo8ow0o && GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" git submodule update --init --recursive && cd /artifacts/j0kkc0wso4wsswcgsoo8ow0o && GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" git lfs pull'
Cloning into '/artifacts/j0kkc0wso4wsswcgsoo8ow0o'...
sed: /artifacts/j0kkc0wso4wsswcgsoo8ow0o/.gitmodules: No such file or directory
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'cd /artifacts/j0kkc0wso4wsswcgsoo8ow0o && git log -1 0c0308df0afe5889faaa54a2a4994edb59f291d8 --pretty=%B'
fix: resolve NEXT_PUBLIC_SUPABASE_URL placeholder issue with build arguments
Critical Issue Resolution:
- Health check confirms NEXT_PUBLIC_SUPABASE_URL still shows placeholder despite 30 env vars loaded
- Root cause: Next.js embeds NEXT_PUBLIC_* variables at build time, not runtime
- Coolify environment variables cannot override build-time embedded values
Solutions Implemented:
1. Enhanced Dockerfile with Build Argument Validation
- Added build argument validation logging
- Clear messages showing which values are used during build
- Verification that production values are embedded
2. Coolify Build Arguments Configuration Guide
- Step-by-step instructions for setting build arguments in Coolify
- Exact values needed for production Supabase connection
- Validation steps to confirm proper configuration
3. Runtime Environment Replacement (Fallback)
- Script to replace placeholder values in built files at runtime
- Automatic detection and replacement of embedded placeholders
- Fallback solution if build arguments are not available
4. Enhanced Startup Validation
- Detailed analysis of placeholder vs production values
- Automatic runtime replacement attempt if placeholders detected
- Clear error messages for troubleshooting
Technical Details:
- NEXT_PUBLIC_* variables are embedded in client bundle during 'next build'
- Runtime environment variables cannot change embedded values
- Build arguments must be configured in Coolify to pass production values during build
- Alternative runtime replacement modifies built files before server start
Next Steps:
1. Configure build arguments in Coolify with production Supabase values
2. Trigger new deployment (not just restart)
3. Monitor build logs for validation messages
4. Test health check for 'connection: established'
Priority: CRITICAL - Application currently not connected to production database
Estimated Fix Time: 20-30 minutes with proper Coolify build argument configuration
[CMD]: docker images -q y08844g888wo40scscsw4g48:0c0308df0afe5889faaa54a2a4994edb59f291d8 2>/dev/null
0a42122c3317
Configuration changed. Rebuilding image.
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'cat /artifacts/j0kkc0wso4wsswcgsoo8ow0o/Dockerfile'
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
# Set build-time environment variables for Next.js build
# These ARG values will be overridden by Coolify build arguments in production
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only
ARG SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder-signature-for-build-time-only
ARG NEXTAUTH_SECRET=build-time-secret-placeholder-32-characters-long
ARG NEXTAUTH_URL=https://agendia.torrecentral.com
# Validate build arguments (will show in build logs)
RUN echo "🔍 Build Arguments Validation:" && \
echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL" && \
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY length: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY}" && \
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
# Build the application with production values from Coolify build arguments
# CRITICAL: NEXT_PUBLIC_ variables are embedded into client bundle during build
RUN NEXT_TELEMETRY_DISABLED=1 \
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
npx next build
# Verify build completed with correct values
RUN echo "✅ Build completed with NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
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
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'cat /artifacts/j0kkc0wso4wsswcgsoo8ow0o/Dockerfile'
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
# Set build-time environment variables for Next.js build
# These ARG values will be overridden by Coolify build arguments in production
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only
ARG SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder-signature-for-build-time-only
ARG NEXTAUTH_SECRET=build-time-secret-placeholder-32-characters-long
ARG NEXTAUTH_URL=https://agendia.torrecentral.com
# Validate build arguments (will show in build logs)
RUN echo "🔍 Build Arguments Validation:" && \
echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL" && \
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY length: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY}" && \
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
# Build the application with production values from Coolify build arguments
# CRITICAL: NEXT_PUBLIC_ variables are embedded into client bundle during build
RUN NEXT_TELEMETRY_DISABLED=1 \
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
npx next build
# Verify build completed with correct values
RUN echo "✅ Build completed with NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
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
----------------------------------------
Building docker image started.
To check the current progress, click on Show Debug Logs.
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'cat /artifacts/build.sh'
docker build  --add-host coolify:10.0.1.5 --add-host coolify-db:10.0.1.2 --add-host coolify-realtime:10.0.1.4 --add-host coolify-redis:10.0.1.3 --network host -f /artifacts/j0kkc0wso4wsswcgsoo8ow0o/Dockerfile --build-arg SOURCE_COMMIT='0c0308df0afe5889faaa54a2a4994edb59f291d8' --build-arg 'COOLIFY_URL=https://agendia.torrecentral.com' --build-arg 'COOLIFY_FQDN=agendia.torrecentral.com' --build-arg 'COOLIFY_BRANCH=main' --build-arg 'COOLIFY_RESOURCE_UUID=y08844g888wo40scscsw4g48' --build-arg 'COOLIFY_CONTAINER_NAME=y08844g888wo40scscsw4g48-005745241525' --progress plain -t y08844g888wo40scscsw4g48:0c0308df0afe5889faaa54a2a4994edb59f291d8 /artifacts/j0kkc0wso4wsswcgsoo8ow0o
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'bash /artifacts/build.sh'
#0 building with "default" instance using docker driver
#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 5.01kB done
#1 DONE 0.0s
#2 [internal] load metadata for docker.io/library/node:18-alpine
#2 DONE 0.1s
#3 [internal] load .dockerignore
#3 transferring context: 2.39kB done
#3 DONE 0.0s
#4 [deps 1/5] FROM docker.io/library/node:18-alpine@sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e
#4 DONE 0.0s
#5 [internal] load build context
#5 transferring context: 9.61MB 0.2s done
#5 DONE 0.2s
#6 [builder  8/10] RUN NEXT_TELEMETRY_DISABLED=1     NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only     npx next build
#6 CACHED
#7 [runner  7/15] COPY --from=builder /app/.next/standalone ./
#7 CACHED
#8 [runner 11/15] COPY scripts/startup-simple.sh /app/startup-simple.sh
#8 CACHED
#9 [runner  2/15] RUN apk add --no-cache curl && apk upgrade
#9 CACHED
#10 [deps 3/5] WORKDIR /app
#10 CACHED
#11 [runner 13/15] RUN chmod +x /app/startup.sh /app/startup-simple.sh
#11 CACHED
#12 [runner  3/15] WORKDIR /app
#12 CACHED
#13 [runner 10/15] COPY scripts/startup-coolify.sh /app/startup.sh
#13 CACHED
#14 [runner  8/15] COPY --from=builder /app/.next/static ./.next/static
#14 CACHED
#15 [runner  5/15] RUN adduser --system --uid 1001 nextjs
#15 CACHED
#16 [runner 12/15] COPY scripts/startup-validator.js /app/startup-validator.js
#16 CACHED
#17 [runner  9/15] COPY --from=builder /app/package.json ./package.json
#17 CACHED
#18 [builder 10/10] RUN npm prune --production
#18 CACHED
#19 [deps 4/5] COPY package.json package-lock.json* ./
#19 CACHED
#20 [builder  2/10] WORKDIR /app
#20 CACHED
#21 [builder  4/10] COPY . .
#21 CACHED
#22 [runner  6/15] COPY --from=builder /app/public ./public
#22 CACHED
#23 [builder  6/10] RUN cp next.config.deploy.js next.config.js
#23 CACHED
#24 [deps 2/5] RUN apk add --no-cache libc6-compat curl
#24 CACHED
#25 [builder  3/10] COPY --from=deps /app/node_modules ./node_modules
#25 CACHED
#26 [builder  9/10] RUN echo "✅ Build completed with NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co"
#26 CACHED
#27 [runner 14/15] RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
#27 CACHED
#28 [runner  4/15] RUN addgroup --system --gid 1001 nodejs
#28 CACHED
#29 [deps 5/5] RUN npm ci && npm cache clean --force
#29 CACHED
#30 [builder  7/10] RUN echo "🔍 Build Arguments Validation:" &&     echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL" &&     echo "NEXT_PUBLIC_SUPABASE_ANON_KEY length: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY}" &&     echo "NEXTAUTH_URL: $NEXTAUTH_URL"
#30 CACHED
#31 [builder  5/10] RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi
#31 CACHED
#32 [runner 15/15] RUN chown -R nextjs:nodejs /app
#32 CACHED
#33 exporting to image
#33 exporting layers done
#33 writing image sha256:0a42122c331780d1a135a9d1966d3dbd69943642b882448773d4722cab58e6a1 done
#33 naming to docker.io/library/y08844g888wo40scscsw4g48:0c0308df0afe5889faaa54a2a4994edb59f291d8 done
#33 DONE 0.0s
Building docker image completed.
----------------------------------------
Rolling update started.
[CMD]: docker exec j0kkc0wso4wsswcgsoo8ow0o bash -c 'SOURCE_COMMIT=0c0308df0afe5889faaa54a2a4994edb59f291d8 COOLIFY_FQDN=https://agendia.torrecentral.com COOLIFY_URL=agendia.torrecentral.com COOLIFY_BRANCH=main  docker compose --project-name y08844g888wo40scscsw4g48 --project-directory /artifacts/j0kkc0wso4wsswcgsoo8ow0o -f /artifacts/j0kkc0wso4wsswcgsoo8ow0o/docker-compose.yaml up --build -d'
time="2025-06-10T00:57:51Z" level=warning msg="Found orphan containers ([y08844g888wo40scscsw4g48-005028998463]) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up."
Container y08844g888wo40scscsw4g48-005745241525  Creating
y08844g888wo40scscsw4g48-005745241525 Your kernel does not support memory swappiness capabilities or the cgroup is not mounted. Memory swappiness discarded.
Container y08844g888wo40scscsw4g48-005745241525  Created
Container y08844g888wo40scscsw4g48-005745241525  Starting
Container y08844g888wo40scscsw4g48-005745241525  Started
New container started.
Custom healthcheck found, skipping default healthcheck.
Waiting for healthcheck to pass on the new container.
Waiting for the start period (30 seconds) before starting healthcheck.
[CMD]: docker inspect --format='{{json .State.Health.Status}}' y08844g888wo40scscsw4g48-005745241525
"healthy"
[CMD]: docker inspect --format='{{json .State.Health.Log}}' y08844g888wo40scscsw4g48-005745241525
[{"Start":"2025-06-10T00:57:56.576191066Z","End":"2025-06-10T00:57:56.750194169Z","ExitCode":0,"Output":"  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n\r  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0\r100   203    0   203    0     0   1828      0 --:--:-- --:--:-- --:--:--  1828\n{\"status\":\"healthy\",\"timestamp\":\"2025-06-10T00:57:56.732Z\",\"server\":\"running\",\"environment\":\"production\",\"uptime\":5,\"memory\":{\"used\":16,\"total\":32},\"deployment\":{\"platform\":\"coolify\",\"commit\":\"unknown\"}}"}]
Attempt 1 of 5 | Healthcheck status: "healthy"
Healthcheck logs:   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
Dload  Upload   Total   Spent    Left  Speed
0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
100   203    0   203    0     0   1828      0 --:--:-- --:--:-- --:--:--  1828
{"status":"healthy","timestamp":"2025-06-10T00:57:56.732Z","server":"running","environment":"production","uptime":5,"memory":{"used":16,"total":32},"deployment":{"platform":"coolify","commit":"unknown"}} | Return code: 0
New container is healthy.