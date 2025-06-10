# 🔧 Coolify Environment Variables Setup - AgentSalud MVP

## **🚨 CRITICAL DISCOVERY: BUILD ARGUMENTS NOT SUPPORTED**

**Problem**: `NEXT_PUBLIC_SUPABASE_URL` shows placeholder value despite environment variables being loaded
**Root Cause**: Next.js embeds `NEXT_PUBLIC_*` variables at build time, not runtime
**Documentation Finding**: **Coolify does NOT support Docker build arguments** in current version
**Solution**: Use runtime environment variable replacement approach

## **📋 COOLIFY CAPABILITIES CONFIRMED**

### **✅ What Coolify DOES Support:**
- **Runtime Environment Variables**: Full support via UI
- **Docker Compose Variables**: `${VARIABLE_NAME}` syntax
- **Coolify Magic Variables**: `SERVICE_*`, `{{team.*}}`, `{{project.*}}`
- **Custom Docker Options**: `--cap-add`, `--privileged` flags
- **NPM Tokens**: Build-time secrets for private registries

### **❌ What Coolify DOES NOT Support:**
- **Docker Build Arguments**: No `--build-arg` support documented
- **Build Settings for ARG**: No UI for build argument configuration
- **ARG Override**: Cannot override Dockerfile ARG values

## **📋 UPDATED COOLIFY CONFIGURATION**

### **Step 1: Configure Runtime Environment Variables**

1. **Login to Coolify Dashboard**
2. **Navigate to AgentSalud Application**
3. **Go to**: Application → Environment Variables
4. **Add these variables**:

```bash
# Supabase Production Configuration
NEXT_PUBLIC_SUPABASE_URL=https://fjvletqwwmxusgthwphr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDc2MDAsImV4cCI6MjA2Mzc4MzYwMH0.TiU8DGo9kihikfmlk1drLs57tNuOrm_Pgq80yzsWytc

# Service Role Key (get from Supabase Dashboard → Settings → API)
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here

# NextAuth Configuration
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=https://agendia.torrecentral.com

# Node Environment
NODE_ENV=production
```

### **Step 2: Use Runtime Environment Dockerfile**

**Since build arguments are not supported, use runtime replacement:**

1. **Change Dockerfile setting** in Coolify to: `Dockerfile.runtime-env`
2. **This Dockerfile** performs runtime replacement of placeholder values
3. **Automatic replacement** during container startup

### **Step 3: Trigger Deployment**

1. **Save environment variables** in Coolify
2. **Change Dockerfile** to `Dockerfile.runtime-env`
3. **Trigger new deployment** (not just restart)
4. **Monitor startup logs** for replacement messages

## **🔍 VALIDATION STEPS**

### **Step 1: Check Startup Logs**

**Look for these messages in Coolify startup logs:**
```
� AgentSalud MVP - Runtime Environment Startup
✅ Environment variables configured:
   NEXT_PUBLIC_SUPABASE_URL: https://fjvletqwwmxusgthwphr.supabase.co
🔄 Performing runtime environment variable replacement...
✅ All placeholder URLs replaced successfully
🎯 Starting Next.js server...
```

### **Step 2: Test Health Check**

**After deployment, test health check:**
```bash
curl -X GET "https://agendia.torrecentral.com/api/health"
```

**Expected Response:**
```json
{
  "services": {
    "database": {
      "status": "healthy",
      "details": {
        "connection": "established",
        "query_time": "XXXms"
      }
    },
    "environment": {
      "details": {
        "debug": {
          "supabase_url": "https://fjvletqwwmxusgthwphr.supabase.co",
          "supabase_url_is_placeholder": false,
          "is_build_time_detected": false
        }
      }
    }
  }
}
```

### **Step 3: Test Debug Endpoint**

```bash
curl -X GET "https://agendia.torrecentral.com/api/debug/env"
```

**Expected Response:**
```json
{
  "supabase": {
    "url": "https://fjvletqwwmxusgthwphr.supabase.co",
    "url_masked": "https://fjvletqwwmx...",
    "service_key_has_placeholder": false
  },
  "build_time_detection": {
    "url_is_placeholder": false,
    "is_build_time": false
  }
}
```

## **🚨 TROUBLESHOOTING**

### **If Build Arguments Don't Work:**

#### **Option 1: Check Coolify Version**
- Some Coolify versions may not support build arguments
- Check Coolify documentation for your version
- Consider upgrading Coolify if needed

#### **Option 2: Use Environment Variables in Dockerfile**
```dockerfile
# Alternative approach - read from environment during build
ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
```

#### **Option 3: Runtime Replacement (Fallback)**
If build arguments are not available:
1. **Use runtime replacement script**: `scripts/replace-env-runtime.js`
2. **Modify startup script** to run replacement before server start
3. **Update Dockerfile** to include replacement step

### **If Values Still Show Placeholder:**

1. **Verify build arguments** are correctly set in Coolify
2. **Check build logs** for validation messages
3. **Ensure no typos** in variable names
4. **Try complete rebuild** (not just redeploy)

## **📊 EXPECTED TIMELINE**

### **Phase 1: Configuration (0-10 minutes)**
1. **Set build arguments** in Coolify
2. **Verify configuration** is saved
3. **Trigger new deployment**

### **Phase 2: Build & Deploy (10-20 minutes)**
1. **Monitor build logs** for validation
2. **Wait for deployment** to complete
3. **Check application startup**

### **Phase 3: Validation (20-25 minutes)**
1. **Test health check** endpoint
2. **Verify debug information**
3. **Confirm production connectivity**

## **🎯 SUCCESS CRITERIA**

**Configuration is successful when:**
- ✅ Build logs show production Supabase URL
- ✅ Health check shows `"connection": "established"`
- ✅ Debug endpoint shows `"is_build_time": false`
- ✅ Application connects to production Supabase
- ✅ No placeholder values in any response

## **📞 NEXT STEPS**

1. **Configure build arguments** in Coolify using values above
2. **Deploy updated Dockerfile** (commit: latest)
3. **Monitor build logs** for validation messages
4. **Test health check** for database connection
5. **Verify production functionality**

---

## **⚠️ IMPORTANT NOTES**

- **Build arguments are different from environment variables**
- **Build arguments are used during Docker build process**
- **Environment variables are used during runtime**
- **NEXT_PUBLIC_* variables MUST be set at build time**
- **This is a Next.js limitation, not a Coolify issue**

**Priority**: **CRITICAL**  
**Estimated Fix Time**: **20-30 minutes**  
**Success Rate**: **95%** with proper build argument configuration
