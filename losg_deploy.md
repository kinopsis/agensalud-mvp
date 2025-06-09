Building docker image started.
To check the current progress, click on Show Debug Logs.
Oops something is not okay, are you okay? 😢
#0 building with "default" instance using docker driver
#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 3.69kB done
#1 DONE 0.0s
#2 [internal] load metadata for docker.io/library/node:18-alpine
#2 DONE 0.1s
#3 [internal] load .dockerignore
#3 transferring context: 2.39kB done
#3 DONE 0.0s
#4 [deps 1/5] FROM docker.io/library/node:18-alpine@sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e
#4 DONE 0.0s
#5 [runner  2/11] RUN apk add --no-cache curl && apk upgrade
#5 CACHED
#6 [runner  3/11] WORKDIR /app
#6 CACHED
#7 [runner  4/11] RUN addgroup --system --gid 1001 nodejs
#7 CACHED
#8 [runner  5/11] RUN adduser --system --uid 1001 nextjs
#8 CACHED
#9 [internal] load build context
#9 transferring context: 9.35MB 0.2s done
#9 DONE 0.2s
#10 [deps 3/5] WORKDIR /app
#10 CACHED
#11 [deps 4/5] COPY package.json package-lock.json* ./
#11 CACHED
#12 [deps 5/5] RUN npm ci && npm cache clean --force
#12 CACHED
#13 [builder 2/8] WORKDIR /app
#13 CACHED
#14 [deps 2/5] RUN apk add --no-cache libc6-compat curl
#14 CACHED
#15 [builder 3/8] COPY --from=deps /app/node_modules ./node_modules
#15 CACHED
#16 [builder 4/8] COPY . .
#16 DONE 0.2s
#17 [builder 5/8] RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi
#17 DONE 0.1s
#18 [builder 6/8] RUN cp next.config.deploy.js next.config.js
#18 DONE 0.1s
#19 [builder 7/8] RUN NEXT_TELEMETRY_DISABLED=1 npx next build
#19 2.079   ▲ Next.js 14.2.29
#19 2.079   - Experiments (use with caution):
#19 2.079     · optimizeServerReact
#19 2.079
#19 2.129    Creating an optimized production build ...
#19 30.27  ✓ Compiled successfully
#19 30.27    Skipping validation of types
#19 30.27    Skipping linting
#19 30.67    Collecting page data ...
#19 33.05    Generating static pages (0/103) ...
#19 34.24 Unexpected error in GET /api/admin/whatsapp/instances: n [Error]: Dynamic server usage: Route /api/admin/whatsapp/instances couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.24     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 34.24     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 34.24     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 34.24     at l (/app/.next/server/app/api/admin/whatsapp/instances/route.js:1:1535)
#19 34.24     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.24     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.24     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.24     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.24     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.24     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 34.24   description: "Route /api/admin/whatsapp/instances couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.24   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.24 }
#19 34.44 Error in Unified Availability API: n [Error]: Dynamic server usage: Route /api/availability couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.44     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 34.44     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 34.44     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 34.44     at g (/app/.next/server/app/api/availability/route.js:26:2229)
#19 34.44     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.44     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.44     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.44     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.44     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.44     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 34.44   description: "Route /api/availability couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.44   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.44 }
#19 34.49 ⚠️ Availability API called during build time with placeholder Supabase config
#19 34.59 Error in admin activity API: B [Error]: Dynamic server usage: Route /api/dashboard/admin/activity couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.59     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.59     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.59     at d (/app/.next/server/app/api/dashboard/admin/activity/route.js:1:894)
#19 34.59     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.59     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.59     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.59     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.59     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.59     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.59     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.59   description: "Route /api/dashboard/admin/activity couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.59   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.59 }
#19 34.61 Error in admin stats API: B [Error]: Dynamic server usage: Route /api/dashboard/admin/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.61     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.61     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.61     at p (/app/.next/server/app/api/dashboard/admin/stats/route.js:1:894)
#19 34.61     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.61     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.61     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.61     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.61     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.61     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.61     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.61   description: "Route /api/dashboard/admin/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.61   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.61 }
#19 34.64 Error in admin upcoming appointments API: B [Error]: Dynamic server usage: Route /api/dashboard/admin/upcoming couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.64     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.64     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.64     at c (/app/.next/server/app/api/dashboard/admin/upcoming/route.js:1:894)
#19 34.64     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.64     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.64     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.64     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.64     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.64     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.64     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.64   description: "Route /api/dashboard/admin/upcoming couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.64   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.64 }
#19 34.66 Error in doctor stats API: B [Error]: Dynamic server usage: Route /api/dashboard/doctor/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.66     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.66     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.66     at d (/app/.next/server/app/api/dashboard/doctor/stats/route.js:1:894)
#19 34.66     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.66     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.66     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.66     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.66     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.66     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.66     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.66   description: "Route /api/dashboard/doctor/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.66   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.66 }
#19 34.67 Error in patient stats API: B [Error]: Dynamic server usage: Route /api/dashboard/patient/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.67     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.67     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.67     at c (/app/.next/server/app/api/dashboard/patient/stats/route.js:1:894)
#19 34.67     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.67     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.67     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.67     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.67     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.67     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.67     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.67   description: "Route /api/dashboard/patient/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.67   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.67 }
#19 34.67    Generating static pages (25/103)
#19 34.69 Error in staff stats API: B [Error]: Dynamic server usage: Route /api/dashboard/staff/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.69     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.69     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.69     at p (/app/.next/server/app/api/dashboard/staff/stats/route.js:1:894)
#19 34.69     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.69     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.69     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.69     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.69     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.69     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.69     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.69   description: "Route /api/dashboard/staff/stats couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.69   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.69 }
#19 34.72 Error in SuperAdmin activity API: B [Error]: Dynamic server usage: Route /api/dashboard/superadmin/activity couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.72     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.72     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.72     at d (/app/.next/server/app/api/dashboard/superadmin/activity/route.js:1:894)
#19 34.72     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.72     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.72     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.72     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.72     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.72     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.72     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.72   description: "Route /api/dashboard/superadmin/activity couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.72   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.72 }
#19 34.75 Error in SuperAdmin organizations API: B [Error]: Dynamic server usage: Route /api/dashboard/superadmin/organizations couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.75     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.75     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.75     at u (/app/.next/server/app/api/dashboard/superadmin/organizations/route.js:1:894)
#19 34.75     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.75     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.75     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.75     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.75     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.75     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.75     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.75   description: "Route /api/dashboard/superadmin/organizations couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.75   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.75 }
#19 34.78 Error in SuperAdmin stats API: n [Error]: Dynamic server usage: Route /api/dashboard/superadmin/stats couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.78     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 34.78     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 34.78     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 34.78     at u (/app/.next/server/app/api/dashboard/superadmin/stats/route.js:1:883)
#19 34.78     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.78     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.78     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.78     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.78     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.78     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 34.78   description: "Route /api/dashboard/superadmin/stats couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.78   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.78 }
#19 34.80 Error in staff tasks API: B [Error]: Dynamic server usage: Route /api/dashboard/staff/tasks couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.80     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 34.80     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 34.80     at d (/app/.next/server/app/api/dashboard/staff/tasks/route.js:1:894)
#19 34.80     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.80     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.80     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.80     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.80     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.80     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 34.80     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 34.80   description: "Route /api/dashboard/staff/tasks couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.80   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.80 }
#19 34.83 Debug endpoint error: n [Error]: Dynamic server usage: Route /api/debug/admin-doctor-access couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.83     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 34.83     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 34.83     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 34.83     at u (/app/.next/server/app/api/debug/admin-doctor-access/route.js:1:951)
#19 34.83     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.83     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.83     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.83     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.83     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.83     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 34.83   description: "Route /api/debug/admin-doctor-access couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.83   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.83 }
#19 34.96 Error en investigación: n [Error]: Dynamic server usage: Route /api/debug/doctor-availability-investigation couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.96     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 34.96     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 34.96     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 34.96     at d (/app/.next/server/app/api/debug/doctor-availability-investigation/route.js:1:883)
#19 34.96     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.96     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.96     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.96     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.96     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.96     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 34.96   description: "Route /api/debug/doctor-availability-investigation couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.96   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.96 }
#19 34.99 Error in frontend simulation debug: n [Error]: Dynamic server usage: Route /api/debug/frontend-simulation couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 34.99     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 34.99     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 34.99     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 34.99     at u (/app/.next/server/app/api/debug/frontend-simulation/route.js:1:880)
#19 34.99     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 34.99     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 34.99     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 34.99     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 34.99     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 34.99     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 34.99   description: "Route /api/debug/frontend-simulation couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 34.99   digest: 'DYNAMIC_SERVER_USAGE'
#19 34.99 }
#19 35.02 Error in Laura patients access debug: n [Error]: Dynamic server usage: Route /api/debug/laura-patients-access couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.02     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 35.02     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 35.02     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 35.02     at d (/app/.next/server/app/api/debug/laura-patients-access/route.js:1:883)
#19 35.02     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.02     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.02     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.02     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.02     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.02     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 35.02   description: "Route /api/debug/laura-patients-access couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.02   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.02 }
#19 35.05 Debug endpoint error: B [Error]: Dynamic server usage: Route /api/debug/patient-data-consistency couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.05     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 35.05     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 35.05     at c (/app/.next/server/app/api/debug/patient-data-consistency/route.js:1:964)
#19 35.05     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.05     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.05     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.05     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.05     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.05     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 35.05     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 35.05   description: "Route /api/debug/patient-data-consistency couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.05   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.05 }
#19 35.12 Error in patients API debug: n [Error]: Dynamic server usage: Route /api/debug/patients-api-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.12     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 35.12     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 35.12     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 35.12     at u (/app/.next/server/app/api/debug/patients-api-test/route.js:1:883)
#19 35.12     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.12     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.12     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.12     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.12     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.12     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 35.12   description: "Route /api/debug/patients-api-test couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.12   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.12 }
#19 35.14 Role data consistency audit error: B [Error]: Dynamic server usage: Route /api/debug/role-data-consistency couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.14     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 35.14     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 35.14     at p (/app/.next/server/app/api/debug/role-data-consistency/route.js:1:964)
#19 35.14     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.14     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.14     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.14     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.14     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.14     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 35.14     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 35.14   description: "Route /api/debug/role-data-consistency couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.14   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.14 }
#19 35.18 Error in credentials test debug: n [Error]: Dynamic server usage: Route /api/debug/test-credentials couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.18     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 35.18     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 35.18     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 35.18     at u (/app/.next/server/app/api/debug/test-credentials/route.js:1:883)
#19 35.18     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.18     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.18     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.18     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.18     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.18     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 35.18   description: "Route /api/debug/test-credentials couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.18   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.18 }
#19 35.23 Error in GET /api/docs/endpoints: n [Error]: Dynamic server usage: Route /api/docs/endpoints couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.23     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 35.23     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 35.23     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 35.23     at d (/app/.next/server/app/api/docs/endpoints/route.js:1:883)
#19 35.23     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.23     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.23     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.23     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.23     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.23     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 35.23   description: "Route /api/docs/endpoints couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.23   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.23 }
#19 35.25 Unexpected error in GET /api/doctors/availability: n [Error]: Dynamic server usage: Route /api/doctors/availability couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.25     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 35.25     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 35.25     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 35.25     at p (/app/.next/server/app/api/doctors/availability/route.js:1:1301)
#19 35.25     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.25     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.25     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.25     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.25     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.25     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 35.25   description: "Route /api/doctors/availability couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.25   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.25 }
#19 35.27 Doctors API Error: B [Error]: Dynamic server usage: Route /api/doctors couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.27     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 35.27     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 35.27     at p (/app/.next/server/app/api/doctors/route.js:1:970)
#19 35.27     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.27     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.27     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.27     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.27     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.27     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 35.27     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 35.27   description: "Route /api/doctors couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.27   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.27 }
#19 35.63 Error in GET /api/superadmin/analytics: B [Error]: Dynamic server usage: Route /api/superadmin/analytics couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.63     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 35.63     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 35.63     at l (/app/.next/server/app/api/superadmin/analytics/route.js:1:894)
#19 35.63     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.63     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.63     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.63     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.63     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.63     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 35.63     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 35.63   description: "Route /api/superadmin/analytics couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.63   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.63 }
#19 35.73 Error in superadmin reports metrics API: B [Error]: Dynamic server usage: Route /api/superadmin/reports/metrics couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.73     at V (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
#19 35.73     at Object.get (/app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
#19 35.73     at u (/app/.next/server/app/api/superadmin/reports/metrics/route.js:1:894)
#19 35.73     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.73     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.73     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.73     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.73     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.73     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24)
#19 35.73     at /app/node_modules/next/dist/server/lib/trace/tracer.js:122:103 {
#19 35.73   description: "Route /api/superadmin/reports/metrics couldn't be rendered statically because it used `request.url`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.73   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.73 }
#19 35.74 Error in GET /api/superadmin/system/config: n [Error]: Dynamic server usage: Route /api/superadmin/system/config couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.74     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 35.74     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 35.74     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 35.74     at p (/app/.next/server/app/api/superadmin/system/config/route.js:1:893)
#19 35.74     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.74     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.74     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.74     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.74     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.74     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 35.74   description: "Route /api/superadmin/system/config couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.74   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.74 }
#19 35.74    Generating static pages (51/103)
#19 35.79 Error in GET /api/superadmin/system/health: n [Error]: Dynamic server usage: Route /api/superadmin/system/health couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
#19 35.79     at l (/app/.next/server/chunks/8948.js:1:57759)
#19 35.79     at f (/app/.next/server/chunks/5655.js:1:1756)
#19 35.79     at i (/app/.next/server/chunks/5655.js:1:6527)
#19 35.79     at p (/app/.next/server/app/api/superadmin/system/health/route.js:1:883)
#19 35.79     at /app/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
#19 35.79     at /app/node_modules/next/dist/server/lib/trace/tracer.js:140:36
#19 35.79     at NoopContextManager.with (/app/node_modules/@opentelemetry/api/build/src/context/NoopContextManager.js:25:19)
#19 35.79     at ContextAPI.with (/app/node_modules/@opentelemetry/api/build/src/api/context.js:60:46)
#19 35.79     at NoopTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/NoopTracer.js:65:31)
#19 35.79     at ProxyTracer.startActiveSpan (/app/node_modules/@opentelemetry/api/build/src/trace/ProxyTracer.js:36:24) {
#19 35.79   description: "Route /api/superadmin/system/health couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
#19 35.79   digest: 'DYNAMIC_SERVER_USAGE'
#19 35.79 }
#19 36.12 ⚠️ Using placeholder Supabase configuration for build time
#19 38.32  ✓ Generating static pages (103/103)
#19 39.69    Finalizing page optimization ...
#19 39.69    Collecting build traces ...
#19 51.97
#19 51.98 Route (app)                                              Size     First Load JS
#19 51.98 ┌ ○ /                                                    12.9 kB         138 kB
#19 51.98 ├ ○ /_not-found                                          876 B            89 kB
#19 51.98 ├ ○ /admin/channels                                      2.85 kB         144 kB
#19 51.98 ├ ○ /admin/channels/whatsapp/create                      5.79 kB         162 kB
#19 51.98 ├ ƒ /admin/whatsapp-state-resolver                       2.31 kB        90.5 kB
#19 51.98 ├ ○ /api-docs                                            4.83 kB         146 kB
#19 51.98 ├ ƒ /api/admin/booking-settings                          0 B                0 B
#19 51.98 ├ ƒ /api/admin/cleanup-monitoring                        0 B                0 B
#19 51.98 ├ ƒ /api/admin/instances/emergency-reset                 0 B                0 B
#19 51.98 ├ ƒ /api/admin/monitoring/cleanup                        0 B                0 B
#19 51.98 ├ ƒ /api/admin/whatsapp/instances                        0 B                0 B
#19 51.98 ├ ƒ /api/admin/whatsapp/resolve-state-inconsistency      0 B                0 B
#19 51.98 ├ ƒ /api/ai/admin-staff-chat                             0 B                0 B
#19 51.98 ├ ƒ /api/ai/appointments                                 0 B                0 B
#19 51.98 ├ ƒ /api/ai/chat                                         0 B                0 B
#19 51.98 ├ ƒ /api/ai/test                                         0 B                0 B
#19 51.98 ├ ƒ /api/appointments                                    0 B                0 B
#19 51.98 ├ ƒ /api/appointments/[id]                               0 B                0 B
#19 51.98 ├ ƒ /api/appointments/[id]/audit                         0 B                0 B
#19 51.98 ├ ƒ /api/appointments/[id]/status                        0 B                0 B
#19 51.98 ├ ƒ /api/appointments/auto-confirm                       0 B                0 B
#19 51.98 ├ ○ /api/appointments/availability                       0 B                0 B
#19 51.98 ├ ƒ /api/availability                                    0 B                0 B
#19 51.98 ├ ƒ /api/calendar/appointments                           0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/appointments                  0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances                     0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances/[id]                0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances/[id]/connect        0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances/[id]/qr             0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances/[id]/qrcode         0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances/[id]/qrcode/stream  0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances/[id]/reconnect      0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/instances/[id]/status         0 B                0 B
#19 51.98 ├ ƒ /api/channels/whatsapp/webhook                       0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/admin/activity                        0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/admin/stats                           0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/admin/upcoming                        0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/doctor/stats                          0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/patient/stats                         0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/staff/stats                           0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/staff/tasks                           0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/superadmin/activity                   0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/superadmin/organizations              0 B                0 B
#19 51.98 ├ ƒ /api/dashboard/superadmin/stats                      0 B                0 B
#19 51.98 ├ ƒ /api/debug/admin-doctor-access                       0 B                0 B
#19 51.98 ├ ƒ /api/debug/create-test-patients                      0 B                0 B
#19 51.98 ├ ƒ /api/debug/doctor-availability-investigation         0 B                0 B
#19 51.98 ├ ƒ /api/debug/frontend-simulation                       0 B                0 B
#19 51.98 ├ ƒ /api/debug/laura-patients-access                     0 B                0 B
#19 51.98 ├ ƒ /api/debug/patient-data-consistency                  0 B                0 B
#19 51.98 ├ ƒ /api/debug/patients-api-test                         0 B                0 B
#19 51.98 ├ ƒ /api/debug/role-data-consistency                     0 B                0 B
#19 51.98 ├ ƒ /api/debug/test-credentials                          0 B                0 B
#19 51.98 ├ ƒ /api/dev/qr-test                                     0 B                0 B
#19 51.98 ├ ƒ /api/docs/endpoints                                  0 B                0 B
#19 51.98 ├ ƒ /api/doctors                                         0 B                0 B
#19 51.98 ├ ƒ /api/doctors/[id]/schedule                           0 B                0 B
#19 51.98 ├ ƒ /api/doctors/[id]/schedule/[scheduleId]              0 B                0 B
#19 51.98 ├ ƒ /api/doctors/availability                            0 B                0 B
#19 51.98 ├ ○ /api/health                                          0 B                0 B
#19 51.98 ├ ƒ /api/locations                                       0 B                0 B
#19 51.98 ├ ƒ /api/locations/[id]                                  0 B                0 B
#19 51.98 ├ ƒ /api/patients                                        0 B                0 B
#19 51.98 ├ ƒ /api/services                                        0 B                0 B
#19 51.98 ├ ƒ /api/services/[id]                                   0 B                0 B
#19 51.98 ├ ƒ /api/services/[id]/doctors                           0 B                0 B
#19 51.98 ├ ƒ /api/staff/doctors/[id]/availability                 0 B                0 B
#19 51.98 ├ ƒ /api/superadmin/analytics                            0 B                0 B
#19 51.98 ├ ƒ /api/superadmin/organizations                        0 B                0 B
#19 51.98 ├ ƒ /api/superadmin/reports/metrics                      0 B                0 B
#19 51.98 ├ ƒ /api/superadmin/system/config                        0 B                0 B
#19 51.98 ├ ƒ /api/superadmin/system/health                        0 B                0 B
#19 51.98 ├ ƒ /api/superadmin/users                                0 B                0 B
#19 51.98 ├ ○ /api/test-availability                               0 B                0 B
#19 51.98 ├ ƒ /api/users                                           0 B                0 B
#19 51.98 ├ ƒ /api/users/[id]/settings                             0 B                0 B
#19 51.98 ├ ƒ /api/webhooks/evolution                              0 B                0 B
#19 51.98 ├ ƒ /api/webhooks/evolution/[orgId]                      0 B                0 B
#19 51.98 ├ ƒ /api/webhooks/evolution/qrcode                       0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/appointments                           0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/instances                              0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/instances/[id]                         0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/instances/[id]/connect                 0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/instances/[id]/qrcode                  0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/instances/[id]/status                  0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/instances/sync                         0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/simple/instances                       0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/simple/instances/[id]                  0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/simple/instances/[id]/qr               0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/simple/instances/[id]/status           0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/simple/webhook/[orgId]                 0 B                0 B
#19 51.98 ├ ƒ /api/whatsapp/webhook                                0 B                0 B
#19 51.98 ├ ○ /appointments                                        19.1 kB         187 kB
#19 51.98 ├ ƒ /appointments/[id]                                   4.13 kB         146 kB
#19 51.98 ├ ○ /appointments/book                                   14.5 kB         176 kB
#19 51.98 ├ ○ /calendar                                            7.96 kB         149 kB
#19 51.98 ├ ○ /dashboard                                           2.96 kB         128 kB
#19 51.98 ├ ○ /debug/appointments-buttons                          3.51 kB         129 kB
#19 51.98 ├ ○ /debug/auth-context                                  3.63 kB         145 kB
#19 51.98 ├ ○ /debug/doctor-names                                  3.94 kB         145 kB
#19 51.98 ├ ○ /debug/doctors                                       2.65 kB         128 kB
#19 51.98 ├ ○ /debug/frontend-issues                               4.32 kB         146 kB
#19 51.98 ├ ○ /debug/management-pages                              4.88 kB         146 kB
#19 51.98 ├ ○ /debug/patient-buttons                               3.89 kB         151 kB
#19 51.98 ├ ○ /debug/patient-id-mismatch                           4.13 kB         146 kB
#19 51.98 ├ ○ /demo/availability-ux                                5.06 kB         152 kB
#19 51.98 ├ ○ /doctor/schedule                                     4.56 kB         146 kB
#19 51.98 ├ ○ /locations                                           6.12 kB         148 kB
#19 51.98 ├ ○ /login                                               2.56 kB         137 kB
#19 51.98 ├ ○ /organization/register                               1.85 kB          90 kB
#19 51.98 ├ ○ /patients                                            6.31 kB         148 kB
#19 51.98 ├ ○ /patients/new                                        6.51 kB         162 kB
#19 51.98 ├ ○ /profile                                             4.15 kB         146 kB
#19 51.98 ├ ○ /register                                            3.12 kB         137 kB
#19 51.98 ├ ○ /services                                            5.96 kB         147 kB
#19 51.98 ├ ƒ /services/[id]                                       5.45 kB         147 kB
#19 51.98 ├ ○ /settings                                            5.27 kB         147 kB
#19 51.98 ├ ○ /staff/doctors                                       4.35 kB         146 kB
#19 51.98 ├ ○ /staff/patients                                      6.29 kB         148 kB
#19 51.98 ├ ○ /staff/schedules                                     6.59 kB         148 kB
#19 51.98 ├ ○ /superadmin                                          9.64 kB         151 kB
#19 51.98 ├ ○ /superadmin/analytics                                4.87 kB         146 kB
#19 51.98 ├ ○ /superadmin/organizations                            5.04 kB         147 kB
#19 51.98 ├ ○ /superadmin/organizations/new                        3.79 kB         145 kB
#19 51.98 ├ ○ /superadmin/reports                                  5.66 kB         147 kB
#19 51.98 ├ ○ /superadmin/system                                   6.22 kB         148 kB
#19 51.98 ├ ○ /superadmin/users                                    5.79 kB         147 kB
#19 51.98 ├ ○ /users                                               4.89 kB         146 kB
#19 51.98 ├ ƒ /users/[id]                                          4.5 kB          146 kB
#19 51.98 ├ ƒ /users/[id]/edit                                     2.17 kB         148 kB
#19 51.98 └ ○ /users/new                                           1.82 kB         148 kB
#19 51.98 + First Load JS shared by all                            88.1 kB
#19 51.98   ├ chunks/2117-d74654a71418766c.js                      31.6 kB
#19 51.98   ├ chunks/fd9d1056-c5d15a20be58fe85.js                  53.6 kB
#19 51.98   └ other shared chunks (total)                          2.91 kB
#19 51.98
#19 51.98
#19 51.98 ○  (Static)   prerendered as static content
#19 51.98 ƒ  (Dynamic)  server-rendered on demand
#19 51.98
#19 52.08 npm notice
#19 52.08 npm notice New major version of npm available! 10.8.2 -> 11.4.1
#19 52.08 npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.4.1
#19 52.08 npm notice To update run: npm install -g npm@11.4.1
#19 52.08 npm notice
#19 DONE 52.1s
#20 [builder 8/8] RUN npm prune --production
#20 0.252 npm warn config production Use `--omit=dev` instead.
#20 6.527
#20 6.527 up to date, audited 149 packages in 6s
#20 6.527
#20 6.527 17 packages are looking for funding
#20 6.528   run `npm fund` for details
#20 6.576
#20 6.576 6 vulnerabilities (3 low, 3 moderate)
#20 6.576
#20 6.576 To address all issues (including breaking changes), run:
#20 6.576   npm audit fix --force
#20 6.576
#20 6.576 Run `npm audit` for details.
#20 DONE 6.6s
#21 [runner  6/11] COPY --from=builder /app/public ./public
#21 ERROR: failed to calculate checksum of ref 101d61c8-3932-4448-9a57-5c952b837970::h1v1i4jmbtgxlqa32nix7oea0: "/app/public": not found
------
> [runner  6/11] COPY --from=builder /app/public ./public:
------
2 warnings found (use docker --debug to expand):
- SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ENV "SUPABASE_SERVICE_ROLE_KEY") (line 54)
- SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data (ENV "NEXTAUTH_SECRET") (line 55)
Dockerfile:85
--------------------
83 |
84 |     # Copy built application (standalone mode for Coolify)
85 | >>> COPY --from=builder /app/public ./public
86 |     COPY --from=builder /app/.next/standalone ./
87 |     COPY --from=builder /app/.next/static ./.next/static
--------------------
ERROR: failed to solve: failed to compute cache key: failed to calculate checksum of ref 101d61c8-3932-4448-9a57-5c952b837970::h1v1i4jmbtgxlqa32nix7oea0: "/app/public": not found
exit status 1
Deployment failed. Removing the new version of your application.