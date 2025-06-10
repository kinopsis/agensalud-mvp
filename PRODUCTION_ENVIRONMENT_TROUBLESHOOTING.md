# 🚨 Production Environment Troubleshooting - AgentSalud MVP

## **🔍 CRITICAL ISSUE IDENTIFIED**

**Health Check Analysis Results:**
- ✅ Application Status: Running (uptime: 6 minutes)
- ❌ Database Connection: **USING PLACEHOLDER VALUES**
- ❌ Supabase Integration: **NOT CONNECTED TO PRODUCTION**
- ⚠️ Environment Variables: **NOT PROPERLY LOADED**

## **📊 HEALTH CHECK ANALYSIS**

### **Database Service - CRITICAL ISSUE**
```json
"database": {
  "status": "healthy",
  "details": {
    "connection": "build-time-placeholder",
    "note": "Real Supabase check will run at runtime"
  }
}
```

**Problem**: The application is detecting "build-time" conditions in production, meaning environment variables are not loaded.

### **Root Cause**
The `isBuildTime()` function returns `true` when:
1. `NEXT_PUBLIC_SUPABASE_URL` equals `https://placeholder.supabase.co`, OR
2. `SUPABASE_SERVICE_ROLE_KEY` contains "placeholder"

**This means Coolify environment variables are NOT reaching the application.**

## **🛠️ IMMEDIATE FIXES REQUIRED**

### **Step 1: Verify Environment Variables in Coolify**

**Access Coolify Dashboard:**
1. Navigate to AgentSalud application
2. Go to "Environment Variables" section
3. Verify these exact values are set:

```bash
# Required Variables (MUST be set exactly as shown)
NEXT_PUBLIC_SUPABASE_URL=https://fjvletqwwmxusgthwphr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDc2MDAsImV4cCI6MjA2Mzc4MzYwMH0.TiU8DGo9kihikfmlk1drLs57tNuOrm_Pgq80yzsWytc
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-from-supabase
NEXTAUTH_SECRET=your-32-character-secret-key
NEXTAUTH_URL=https://agendia.torrecentral.com
NODE_ENV=production
```

### **Step 2: Debug Current Environment Variables**

**Test the debug endpoint:**
```bash
# Enable debug mode temporarily
curl -X GET "https://agendia.torrecentral.com/api/debug/env"
```

**Expected Response Should Show:**
```json
{
  "supabase": {
    "url": "https://fjvletqwwmxusgthwphr.supabase.co",
    "url_masked": "https://fjvletqwwmx...",
    "service_key_has_placeholder": false
  },
  "build_time_detection": {
    "url_is_placeholder": false,
    "service_key_has_placeholder": false,
    "is_build_time": false
  }
}
```

### **Step 3: Force Application Restart**

**In Coolify:**
1. **Stop the application** completely
2. **Wait 30 seconds**
3. **Start the application** again
4. **Monitor deployment logs** for environment variable loading

### **Step 4: Validate Fix**

**Test health check after restart:**
```bash
curl -X GET "https://agendia.torrecentral.com/api/health"
```

**Expected Response Should Show:**
```json
{
  "services": {
    "database": {
      "status": "healthy",
      "details": {
        "connection": "established",
        "query_time": "XXXms"
      }
    }
  }
}
```

## **🔧 TROUBLESHOOTING STEPS**

### **If Environment Variables Still Not Loading:**

#### **Option 1: Manual Environment Variable Reset**
1. **Delete all environment variables** in Coolify
2. **Wait 1 minute**
3. **Re-add all variables** one by one
4. **Redeploy application**

#### **Option 2: Container Rebuild**
1. **Clear build cache** in Coolify (if available)
2. **Force rebuild** from scratch
3. **Monitor build logs** for environment variable injection

#### **Option 3: Alternative Deployment Method**
1. **Use Dockerfile.simple** (no startup scripts)
2. **Change Dockerfile setting** in Coolify to `Dockerfile.simple`
3. **Redeploy with simplified configuration**

### **If Supabase Connection Still Fails:**

#### **Verify Supabase Configuration:**
```bash
# Test direct Supabase connectivity
curl -H "apikey: YOUR_ANON_KEY" \
     "https://fjvletqwwmxusgthwphr.supabase.co/rest/v1/organizations?select=id&limit=1"
```

#### **Check Supabase Dashboard:**
1. **Project Status**: Ensure project is active
2. **API Keys**: Verify keys are correct and not expired
3. **Allowed Origins**: Add `https://agendia.torrecentral.com`

## **📊 VALIDATION CHECKLIST**

### **✅ Environment Variables Loaded Correctly**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` shows production URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` does not contain "placeholder"
- [ ] Debug endpoint shows `is_build_time: false`
- [ ] All required variables are set

### **✅ Database Connection Working**
- [ ] Health check shows `"connection": "established"`
- [ ] No "build-time-placeholder" in response
- [ ] Response time > 0ms for database service
- [ ] Supabase queries work in application

### **✅ Application Functionality**
- [ ] Homepage loads without errors
- [ ] No placeholder warnings in browser console
- [ ] Authentication system works
- [ ] Database queries return real data

## **⏱️ EXPECTED RESOLUTION TIME**

### **Phase 1: Environment Variable Fix (0-15 minutes)**
1. **Verify and reset** environment variables in Coolify
2. **Restart application** completely
3. **Test debug endpoint** for proper loading

### **Phase 2: Validation (15-25 minutes)**
1. **Test health check** for database connection
2. **Verify application functionality**
3. **Check browser console** for errors

### **Phase 3: Production Validation (25-35 minutes)**
1. **Test end-to-end functionality**
2. **Verify data persistence**
3. **Confirm production readiness**

## **🎯 SUCCESS CRITERIA**

**The issue will be resolved when:**
- ✅ Health check shows `"connection": "established"` for database
- ✅ Debug endpoint shows `"is_build_time": false`
- ✅ Application connects to production Supabase instance
- ✅ No placeholder values in any configuration
- ✅ All environment variables properly loaded

## **📞 EMERGENCY CONTACTS**

**If issues persist:**
1. **Check Coolify documentation** for environment variable troubleshooting
2. **Review Supabase project status** in dashboard
3. **Use simplified Dockerfile** as emergency fallback
4. **Contact DevOps team** with detailed logs

---

## **🚨 IMMEDIATE ACTION REQUIRED**

**The application is currently NOT connected to the production database. This must be fixed before any production use.**

**Priority**: **CRITICAL**  
**Estimated Fix Time**: **15-30 minutes**  
**Risk**: **High** (data loss, authentication failures)
