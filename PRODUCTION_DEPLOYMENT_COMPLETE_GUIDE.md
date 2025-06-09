# 🚀 AgentSalud MVP - Complete Production Deployment Guide

## ✅ **SUPABASE PRODUCTION CONFIGURATION COMPLETED**

### **📋 Production Supabase Details**
- **Project ID**: `fjvletqwwmxusgthwphr`
- **Project URL**: `https://fjvletqwwmxusgthwphr.supabase.co`
- **Project Name**: `agendalo-sonnet-4`
- **Region**: `us-east-2`
- **Status**: `ACTIVE_HEALTHY`

### **🔑 Environment Variables for Coolify**
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://fjvletqwwmxusgthwphr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMDc2MDAsImV4cCI6MjA2Mzc4MzYwMH0.TiU8DGo9kihikfmlk1drLs57tNuOrm_Pgq80yzsWytc
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-dashboard

# Application Configuration
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=https://agendia.torrecentral.com
NODE_ENV=production

# CORS and Domain Configuration
CORS_ORIGIN=https://agendia.torrecentral.com
COOLIFY_DOMAIN=agendia.torrecentral.com

# Evolution API Configuration
EVOLUTION_API_BASE_URL=https://evo.torrecentral.com/
EVOLUTION_API_KEY=your-evolution-api-key

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
```

---

## 🔧 **REQUIRED MANUAL CONFIGURATION**

### **Step 1: Supabase Dashboard Configuration**
Since the Supabase MCP tools don't provide access to project settings, you need to manually configure:

1. **Log into Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to Project**: `agendalo-sonnet-4` (fjvletqwwmxusgthwphr)
3. **Go to Authentication > URL Configuration**
4. **Add Allowed Origins**:
   ```
   https://agendia.torrecentral.com
   ```
5. **Set Redirect URLs**:
   ```
   https://agendia.torrecentral.com/auth/callback
   https://agendia.torrecentral.com/auth/signin
   ```
6. **Go to Project Settings > API**
7. **Copy the Service Role Key** and add it to Coolify environment variables

### **Step 2: Coolify Environment Variable Setup**
1. **Access Coolify Dashboard**
2. **Navigate to AgentSalud Application**
3. **Go to Environment Variables Section**
4. **Add/Update All Variables** listed above
5. **Save Configuration**

### **Step 3: Trigger Coolify Redeploy**
1. **In Coolify Dashboard**, click "Deploy" or "Redeploy"
2. **Monitor Deployment Logs** for successful startup
3. **Wait for Deployment Completion** (typically 3-5 minutes)

---

## ✅ **VALIDATION STEPS**

### **1. Health Check Validation**
```bash
# Test production health endpoint
curl -f https://agendia.torrecentral.com/api/health

# Expected response should include:
# - status: "healthy"
# - services.database.status: "healthy"
# - services.environment.status: "healthy"
```

### **2. Supabase Configuration Validation**
```bash
# Run validation script (if you have access to the server)
node scripts/validate-supabase-config.js

# Expected output:
# ✅ NEXT_PUBLIC_SUPABASE_URL: Valid
# ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Valid
# ✅ Supabase server reachable (HTTP 200)
```

### **3. Browser Console Validation**
1. **Open**: https://agendia.torrecentral.com
2. **Open Developer Tools** (F12)
3. **Check Console** for:
   - ✅ `Supabase client initialized with production configuration`
   - ✅ No placeholder warnings
   - ✅ No DNS resolution errors

### **4. Authentication Flow Test**
1. **Navigate to Login Page**
2. **Attempt Sign In** with test credentials
3. **Verify No Errors** in browser console
4. **Check Network Tab** for successful API calls

---

## 🔍 **TROUBLESHOOTING**

### **If Still Seeing Placeholder Warnings:**
1. **Verify Environment Variables** are set in Coolify
2. **Check Variable Names** (must include NEXT_PUBLIC_ prefix)
3. **Restart Application** completely in Coolify
4. **Clear Browser Cache** and reload

### **If Authentication Fails:**
1. **Check Supabase Allowed Origins** include production domain
2. **Verify Redirect URLs** are correctly configured
3. **Test Supabase Connectivity** with curl commands
4. **Check CORS Settings** in application

### **If Health Check Fails:**
1. **Check Application Logs** in Coolify
2. **Verify Database Connectivity** to Supabase
3. **Test Environment Variables** with validation script
4. **Check Network Connectivity** between Coolify and Supabase

---

## 📊 **DEPLOYMENT STATUS**

### **✅ Completed:**
- [x] Enhanced Supabase client configuration
- [x] Fixed Dockerfile environment variable handling
- [x] Updated health check with Supabase validation
- [x] Created comprehensive validation tools
- [x] Committed and pushed all fixes to repository
- [x] Identified production Supabase configuration

### **⚠️ Pending Manual Configuration:**
- [ ] Set environment variables in Coolify dashboard
- [ ] Configure Supabase allowed origins and redirect URLs
- [ ] Trigger Coolify redeploy
- [ ] Validate production deployment

### **🎯 Success Criteria:**
- [ ] Health check returns status: "healthy"
- [ ] No placeholder warnings in browser console
- [ ] Authentication flow works correctly
- [ ] All API endpoints respond successfully

---

## 🚀 **NEXT STEPS**

1. **Configure Supabase Dashboard Settings** (allowed origins, redirect URLs)
2. **Set Coolify Environment Variables** using the values provided above
3. **Trigger Coolify Redeploy** to apply the fixes
4. **Run Validation Tests** to confirm everything works
5. **Monitor Application Performance** and error rates

### **Estimated Time to Complete**: 15-30 minutes
### **Expected Downtime**: 3-5 minutes during redeploy

---

## 📞 **Support Resources**

- **Troubleshooting Guide**: `SUPABASE_PRODUCTION_TROUBLESHOOTING.md`
- **Validation Script**: `scripts/validate-supabase-config.js`
- **Health Check**: `https://agendia.torrecentral.com/api/health`
- **Repository**: `kinopsis/agensalud-mvp` (commit: e27a606)

**The AgentSalud MVP is ready for production deployment once the manual configuration steps are completed!** 🎉
