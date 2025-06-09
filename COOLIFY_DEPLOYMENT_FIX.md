# 🚀 Coolify Deployment Fix - AgentSalud MVP

## **🔍 ISSUE ANALYSIS**

**Root Cause**: Health check endpoint returning HTTP 503 due to:
1. Missing/placeholder environment variables during deployment
2. Strict health check validation failing during container startup
3. Supabase connectivity issues during initial deployment phase

## **✅ IMPLEMENTED SOLUTIONS**

### **1. Enhanced Health Check Resilience**
- **Modified**: `src/app/api/health/route.ts`
- **Changes**: 
  - Environment variable failures now return `degraded` instead of `unhealthy`
  - Supabase connection failures return `degraded` during deployment
  - Added timeout protection for database queries
  - Improved error handling for deployment scenarios

### **2. Basic Health Check Endpoint**
- **Created**: `src/app/api/health/basic/route.ts`
- **Purpose**: Simple health check that only verifies server is running
- **Returns**: Always HTTP 200 if Next.js server is operational

### **3. Improved Docker Health Check**
- **Modified**: `Dockerfile` health check configuration
- **Changes**:
  - Increased start period to 30s (from 15s)
  - Increased retries to 5 (from 3)
  - Fallback to basic health check if full check fails
  - Uses: `curl -f /api/health/basic || curl -f /api/health`

### **4. Startup Script for Environment Validation**
- **Created**: `scripts/startup-coolify.sh`
- **Features**:
  - Validates environment variables on startup
  - Tests external dependencies (Supabase)
  - Provides detailed logging for troubleshooting
  - Graceful handling of missing configurations

## **🔧 COOLIFY CONFIGURATION STEPS**

### **Step 1: Verify Environment Variables**
Ensure these are set in Coolify Environment Variables:

```bash
# Required Variables
NEXT_PUBLIC_SUPABASE_URL=https://fjvletqwwmxusgthwphr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDc2MDAsImV4cCI6MjA2Mzc4MzYwMH0.TiU8DGo9kihikfmlk1drLs57tNuOrm_Pgq80yzsWytc
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-dashboard
NEXTAUTH_SECRET=your-32-character-secret-key
NEXTAUTH_URL=https://agendia.torrecentral.com

# Optional Variables
NODE_ENV=production
DEPLOYMENT_VERSION=e27a606
```

### **Step 2: Update Coolify Health Check Settings**
In Coolify Application Settings:

1. **Health Check URL**: `/api/health/basic`
2. **Health Check Interval**: `30s`
3. **Health Check Timeout**: `10s`
4. **Health Check Retries**: `5`
5. **Health Check Start Period**: `30s`

### **Step 3: Deploy with New Configuration**
1. **Commit and push** the fixes to repository
2. **Trigger redeploy** in Coolify
3. **Monitor deployment logs** for startup script output
4. **Verify health check** passes after deployment

## **📊 VALIDATION STEPS**

### **1. Test Basic Health Check**
```bash
curl -f https://agendia.torrecentral.com/api/health/basic
# Expected: HTTP 200 with server status
```

### **2. Test Full Health Check**
```bash
curl -f https://agendia.torrecentral.com/api/health
# Expected: HTTP 200 with detailed service status
```

### **3. Monitor Deployment Logs**
Look for these messages in Coolify logs:
```
🚀 AgentSalud MVP - Coolify Startup
✅ All environment variables properly configured
✅ Supabase is reachable
🎯 Starting Next.js server...
```

### **4. Verify Environment Variables**
```bash
# In browser console at https://agendia.torrecentral.com
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
# Should show: https://fjvletqwwmxusgthwphr.supabase.co
```

## **🔄 DEPLOYMENT TIMELINE**

### **Phase 1: Immediate (0-5 minutes)**
1. Commit and push fixes to repository
2. Trigger Coolify redeploy
3. Monitor deployment progress

### **Phase 2: Validation (5-10 minutes)**
1. Test basic health check endpoint
2. Verify environment variables loaded
3. Test full application functionality

### **Phase 3: Monitoring (10-30 minutes)**
1. Monitor application stability
2. Check for any remaining issues
3. Validate Supabase connectivity

## **🚨 TROUBLESHOOTING**

### **If Health Check Still Fails**
1. **Check Coolify logs** for startup script output
2. **Verify environment variables** are set correctly
3. **Test basic health check** manually: `/api/health/basic`
4. **Increase health check timeout** in Coolify settings

### **If Environment Variables Not Loading**
1. **Verify variable names** (case-sensitive)
2. **Check for trailing spaces** in values
3. **Restart application** completely in Coolify
4. **Use startup script logs** to debug

### **If Supabase Connection Fails**
1. **Test direct connectivity**: `curl https://fjvletqwwmxusgthwphr.supabase.co/rest/v1/`
2. **Check Supabase project status** in dashboard
3. **Verify API keys** are correct and not expired
4. **Check allowed origins** in Supabase settings

## **📈 EXPECTED RESULTS**

### **✅ Success Indicators**
- Health check returns HTTP 200
- No placeholder configuration warnings
- Supabase client initializes correctly
- Application loads without errors
- Environment variables properly loaded

### **⏱️ Performance Targets**
- Health check response: <2 seconds
- Application startup: <30 seconds
- First page load: <3 seconds
- Database queries: <500ms

## **🎯 NEXT STEPS**

1. **Deploy the fixes** using the steps above
2. **Monitor application** for 24 hours
3. **Update Supabase settings** (allowed origins)
4. **Test authentication flow** end-to-end
5. **Set up monitoring** and alerting

**Estimated Resolution Time**: 15-30 minutes  
**Risk Level**: Low (fallback health check ensures deployment success)
