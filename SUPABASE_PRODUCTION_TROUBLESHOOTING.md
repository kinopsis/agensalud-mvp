# 🔧 Supabase Production Troubleshooting Guide

## 🚨 **Current Issue Analysis**

**Problem**: Application using placeholder Supabase configuration in production  
**Symptoms**: 
- `⚠️ Using placeholder Supabase configuration for build time`
- `Failed to load resource: net::ERR_NAME_NOT_RESOLVED (placeholder.supabase.co/auth/v1/token)`
- `TypeError: Failed to fetch at signInWithPassword`

**Root Cause**: Environment variables not properly configured in Coolify deployment

---

## 🔍 **Step-by-Step Diagnosis**

### **1. Verify Coolify Environment Variables**

**Access Coolify Dashboard:**
1. Log into your Coolify instance
2. Navigate to the AgentSalud application
3. Go to **Environment Variables** section
4. Verify the following variables are set:

```bash
# Required Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Authentication Configuration
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=https://agendia.torrecentral.com

# Additional Configuration
NODE_ENV=production
CORS_ORIGIN=https://agendia.torrecentral.com
```

**⚠️ Common Issues:**
- Variables not set at all
- Using placeholder values
- Incorrect variable names (missing NEXT_PUBLIC_ prefix)
- Trailing spaces or special characters

### **2. Validate Environment Variables**

**Run Validation Script:**
```bash
# SSH into Coolify container or run locally with production env
node scripts/validate-supabase-config.js
```

**Expected Output:**
```
✅ NEXT_PUBLIC_SUPABASE_URL: Valid
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Valid
✅ SUPABASE_SERVICE_ROLE_KEY: Valid
✅ Supabase server reachable (HTTP 200)
✅ Authentication endpoint accessible
```

### **3. Check Runtime Configuration**

**Browser Console Validation:**
1. Open https://agendia.torrecentral.com in browser
2. Open Developer Tools (F12)
3. Check Console for configuration logs:

```javascript
// Should see:
✅ Supabase client initialized with production configuration
URL: https://your-project.supabase.co

// Should NOT see:
⚠️ Using placeholder Supabase configuration
```

**Manual Runtime Check:**
```javascript
// In browser console:
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Runtime Config:', window.__RUNTIME_CONFIG__);
```

---

## 🛠️ **Resolution Steps**

### **Step 1: Set Coolify Environment Variables**

1. **Access Coolify Dashboard**
2. **Navigate to AgentSalud Application**
3. **Go to Environment Variables**
4. **Add/Update Variables:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
NEXTAUTH_SECRET=your-actual-32-char-secret
NEXTAUTH_URL=https://agendia.torrecentral.com
```

5. **Save Configuration**
6. **Restart Application**

### **Step 2: Verify Supabase Project Settings**

1. **Log into Supabase Dashboard**
2. **Go to Project Settings > API**
3. **Copy the correct values:**
   - Project URL (for NEXT_PUBLIC_SUPABASE_URL)
   - Anon/Public key (for NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Service Role key (for SUPABASE_SERVICE_ROLE_KEY)

4. **Update Authentication Settings:**
   - Go to Authentication > URL Configuration
   - Add `https://agendia.torrecentral.com` to allowed origins
   - Set redirect URLs to `https://agendia.torrecentral.com/auth/callback`

### **Step 3: Redeploy Application**

1. **Trigger Coolify Redeploy:**
   - Go to Coolify dashboard
   - Click "Deploy" or "Redeploy"
   - Wait for deployment to complete

2. **Monitor Deployment Logs:**
   - Check for successful environment variable injection
   - Verify no placeholder warnings in build logs

### **Step 4: Test Production Deployment**

1. **Run Validation Script:**
```bash
node scripts/validate-supabase-config.js
```

2. **Test Authentication:**
   - Visit https://agendia.torrecentral.com
   - Try to sign in with test credentials
   - Check browser console for errors

3. **Verify API Connectivity:**
```bash
curl -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key" \
     https://your-project.supabase.co/rest/v1/organizations?select=id&limit=1
```

---

## 🔧 **Advanced Troubleshooting**

### **Issue: Environment Variables Not Loading**

**Symptoms:**
- Variables set in Coolify but still seeing placeholders
- Application not reading runtime environment variables

**Solutions:**
1. **Check Coolify Container Environment:**
```bash
# SSH into container
docker exec -it container-name env | grep SUPABASE
```

2. **Verify Next.js Standalone Build:**
```bash
# Check if variables are embedded in build
grep -r "placeholder.supabase.co" .next/standalone/
```

3. **Force Environment Variable Refresh:**
```bash
# Restart Coolify application completely
# Clear any cached builds
```

### **Issue: CORS Errors**

**Symptoms:**
- Authentication requests blocked by CORS
- Network errors in browser console

**Solutions:**
1. **Update Supabase CORS Settings:**
   - Add `https://agendia.torrecentral.com` to allowed origins
   - Include all subdomains if needed

2. **Verify Domain Configuration:**
   - Ensure NEXTAUTH_URL matches actual domain
   - Check for HTTP vs HTTPS mismatches

### **Issue: Authentication Flow Failures**

**Symptoms:**
- signInWithPassword fails
- Session not persisting
- Redirect loops

**Solutions:**
1. **Check NextAuth Configuration:**
```bash
# Verify NEXTAUTH_SECRET is set and 32+ characters
# Verify NEXTAUTH_URL matches production domain
```

2. **Test Supabase Auth Directly:**
```javascript
// In browser console
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'testpassword'
});
console.log('Auth result:', { data, error });
```

---

## 📊 **Validation Checklist**

### **Environment Variables ✅**
- [ ] NEXT_PUBLIC_SUPABASE_URL set and valid
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set and valid
- [ ] SUPABASE_SERVICE_ROLE_KEY set and valid
- [ ] NEXTAUTH_SECRET set (32+ characters)
- [ ] NEXTAUTH_URL matches production domain

### **Supabase Configuration ✅**
- [ ] Project URL accessible
- [ ] API keys valid and not expired
- [ ] CORS origins include production domain
- [ ] Authentication redirect URLs configured

### **Application Deployment ✅**
- [ ] No placeholder warnings in console
- [ ] Supabase client initializes correctly
- [ ] Authentication endpoints accessible
- [ ] API requests succeed

### **Production Testing ✅**
- [ ] Can access https://agendia.torrecentral.com
- [ ] Authentication flow works
- [ ] API calls succeed
- [ ] No CORS errors in browser console

---

## 🚀 **Quick Fix Commands**

```bash
# 1. Validate current configuration
node scripts/validate-supabase-config.js

# 2. Test Supabase connectivity
curl -f https://your-project.supabase.co/rest/v1/

# 3. Check production health
curl -f https://agendia.torrecentral.com/api/health

# 4. Validate domain configuration
node scripts/validate-domain-configuration.js
```

---

## 📞 **Support Information**

If issues persist after following this guide:

1. **Check Deployment Logs** in Coolify dashboard
2. **Review Browser Console** for detailed error messages
3. **Verify Supabase Project Status** in Supabase dashboard
4. **Test with Minimal Configuration** to isolate issues

**Common Resolution Time**: 5-15 minutes for environment variable issues
