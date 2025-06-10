# 🚨 EMERGENCY PRODUCTION FIX - AgentSalud MVP

## **🔍 CURRENT STATUS ASSESSMENT**

**Health Check Analysis (Latest):**
- ✅ **Recent deployment confirmed** (82 seconds uptime)
- ❌ **Placeholder issue persists** despite comprehensive fixes
- ❌ **Build arguments approach FAILED** (not configured or not supported)
- ❌ **Runtime replacement not executing** automatically

**Critical Issue:** Application still using `https://placeholder.supabase.co` instead of production Supabase

## **🚨 IMMEDIATE EMERGENCY FIXES**

### **Option 1: Manual Runtime Replacement (Fastest)**

**Step 1: Access Container**
```bash
# SSH into the running container (if Coolify provides shell access)
# Or use Coolify's container terminal feature
```

**Step 2: Run Manual Fix**
```bash
# Inside the container, run:
cd /app
./manual-env-fix.sh

# Then restart the application process
pkill node
node server.js &
```

### **Option 2: Use Runtime Environment Dockerfile (Recommended)**

**Step 1: Change Dockerfile in Coolify**
1. **Access Coolify Application Settings**
2. **Change Dockerfile setting** from `Dockerfile` to `Dockerfile.runtime-env`
3. **Trigger new deployment**

**Step 2: Verify Environment Variables**
Ensure these are set in Coolify Environment Variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://fjvletqwwmxusgthwphr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDc2MDAsImV4cCI6MjA2Mzc4MzYwMH0.TiU8DGo9kihikfmlk1drLs57tNuOrm_Pgq80yzsWytc
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=your-32-character-secret
NEXTAUTH_URL=https://agendia.torrecentral.com
```

### **Option 3: Direct Environment Variable Override**

**Create override script in Coolify:**
```bash
# Add this as a startup command in Coolify
sed -i 's|https://placeholder.supabase.co|https://fjvletqwwmxusgthwphr.supabase.co|g' .next/static/**/*.js
sed -i 's|https://placeholder.supabase.co|https://fjvletqwwmxusgthwphr.supabase.co|g' .next/server/**/*.js
node server.js
```

## **🔧 TROUBLESHOOTING STEPS**

### **If Environment Variables Are Not Set**

**Check Coolify Environment Variables:**
1. **Navigate to**: Application → Environment Variables
2. **Verify these are set**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`

### **If Variables Are Set But Still Showing Placeholder**

**This indicates the build arguments approach failed. Use runtime replacement:**

1. **Switch to runtime Dockerfile**: `Dockerfile.runtime-env`
2. **Redeploy application**
3. **Monitor startup logs** for replacement messages

### **If All Else Fails - Nuclear Option**

**Create new environment-specific build:**
1. **Fork repository** for production
2. **Manually edit** environment variables in code
3. **Deploy from production fork**

## **📊 VALIDATION CHECKLIST**

### **✅ Fix Successful When:**
- [ ] Health check shows `"connection": "established"`
- [ ] Debug endpoint shows production Supabase URL
- [ ] `"is_build_time_detected": false` in health check
- [ ] Application can query production database
- [ ] Browser console shows no placeholder warnings

### **✅ Test Commands:**
```bash
# Test health check
curl https://agendia.torrecentral.com/api/health

# Test debug endpoint
curl https://agendia.torrecentral.com/api/debug/env

# Test application functionality
curl https://agendia.torrecentral.com/
```

## **⏱️ EMERGENCY TIMELINE**

### **Option 1: Manual Fix (5-10 minutes)**
- Access container and run manual replacement
- Fastest but requires container access

### **Option 2: Runtime Dockerfile (15-20 minutes)**
- Change Dockerfile and redeploy
- Most reliable long-term solution

### **Option 3: Environment Override (10-15 minutes)**
- Add startup command in Coolify
- Quick fix without code changes

## **🎯 RECOMMENDED APPROACH**

**For Immediate Fix:**
1. **Use Option 2** (Runtime Dockerfile) - Most reliable
2. **Verify environment variables** are properly set in Coolify
3. **Deploy with `Dockerfile.runtime-env`**
4. **Monitor startup logs** for replacement success

**For Long-term Solution:**
1. **Investigate why build arguments failed**
2. **Document Coolify configuration requirements**
3. **Implement monitoring** for environment variable issues

## **📞 ESCALATION**

**If all options fail:**
1. **Check Coolify version** and documentation
2. **Contact Coolify support** for build arguments feature
3. **Consider alternative deployment platform**
4. **Implement manual deployment process**

---

## **🚨 CRITICAL REMINDER**

**The application is currently NOT connected to production database.**
**Any user data entered will be lost.**
**This MUST be fixed before any production use.**

**Priority**: **CRITICAL**  
**Business Impact**: **HIGH** (Data loss, authentication failure)  
**Estimated Fix Time**: **15-30 minutes** with runtime Dockerfile approach
