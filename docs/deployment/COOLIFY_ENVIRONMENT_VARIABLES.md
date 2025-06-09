# 🔧 Coolify Environment Variables Configuration

## 📋 Required Environment Variables for AgentSalud MVP

### **🔥 CRITICAL - Supabase Configuration**

These variables are **REQUIRED** for the application to function properly in production:

```bash
# Supabase Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **🔐 Authentication Configuration**

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=https://your-domain.com
```

### **🤖 AI Services Configuration**

```bash
# OpenAI API for AI features
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### **📱 WhatsApp Integration (Optional)**

```bash
# Evolution API Configuration
EVOLUTION_API_BASE_URL=https://evo.torrecentral.com
EVOLUTION_API_KEY=your-evolution-api-key
WEBHOOK_GLOBAL_URL=https://your-domain.com/api/webhooks/evolution
```

---

## 🚀 **How to Configure in Coolify**

### **Step 1: Access Environment Variables**
1. Open your Coolify dashboard
2. Navigate to your AgentSalud project
3. Go to **Environment Variables** section
4. Click **Add Environment Variable**

### **Step 2: Add Required Variables**

#### **🔥 Supabase Variables (CRITICAL)**
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co
```

```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
```

```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your service role key)
```

#### **🔐 Authentication Variables**
```
Name: NEXTAUTH_SECRET
Value: your-32-character-secret-key-here
```

```
Name: NEXTAUTH_URL
Value: https://your-domain.com
```

#### **🤖 AI Services**
```
Name: OPENAI_API_KEY
Value: sk-your-openai-api-key-here
```

### **Step 3: Save and Redeploy**
1. Click **Save** after adding all variables
2. Trigger a new deployment
3. Wait for the build to complete

---

## 📍 **Where to Find Your Supabase Credentials**

### **1. Supabase Project URL**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to **Settings** → **API**
- Copy the **Project URL**

### **2. Supabase Anon Key**
- In the same **Settings** → **API** page
- Copy the **anon public** key

### **3. Supabase Service Role Key**
- In the same **Settings** → **API** page
- Copy the **service_role** key
- ⚠️ **Keep this secret!** This key has admin privileges

---

## 🔒 **Security Best Practices**

### **✅ DO:**
- Use strong, unique secrets for NEXTAUTH_SECRET (32+ characters)
- Keep service role keys private and secure
- Use HTTPS for all webhook URLs
- Regularly rotate API keys

### **❌ DON'T:**
- Share service role keys in public repositories
- Use weak or predictable secrets
- Expose sensitive keys in client-side code
- Use HTTP URLs for webhooks in production

---

## 🧪 **Testing Your Configuration**

### **1. Health Check Endpoint**
After deployment, test your configuration:
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "healthy" },
    "environment": { "status": "healthy" }
  }
}
```

### **2. Supabase Connection Test**
```bash
curl https://your-domain.com/api/appointments/availability?organizationId=test&startDate=2025-01-01&endDate=2025-01-07
```

Should return data or proper error messages (not build-time errors).

---

## 🚨 **Troubleshooting**

### **Build Fails with "supabaseUrl is required"**
- ✅ **Fixed**: The application now uses placeholder values during build
- ✅ **Verify**: Environment variables are set in Coolify
- ✅ **Check**: Variables don't have extra spaces or quotes

### **Runtime Errors After Deployment**
1. **Check Environment Variables**: Ensure all required variables are set
2. **Verify Supabase URLs**: Make sure URLs are correct and accessible
3. **Test API Keys**: Verify keys work with Supabase directly
4. **Check Logs**: Review Coolify deployment logs for specific errors

### **Authentication Issues**
1. **NEXTAUTH_SECRET**: Must be 32+ characters
2. **NEXTAUTH_URL**: Must match your actual domain
3. **Supabase Auth**: Verify auth settings in Supabase dashboard

---

## 📋 **Environment Variables Checklist**

### **Required for Basic Functionality:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`

### **Required for AI Features:**
- [ ] `OPENAI_API_KEY`

### **Required for WhatsApp:**
- [ ] `EVOLUTION_API_BASE_URL`
- [ ] `EVOLUTION_API_KEY`
- [ ] `WEBHOOK_GLOBAL_URL`

### **Optional:**
- [ ] `NODE_ENV=production` (usually set automatically)
- [ ] `NEXT_TELEMETRY_DISABLED=1` (privacy)

---

## 🎉 **Deployment Success**

Once all environment variables are configured correctly:

1. ✅ **Build Process**: Completes without Supabase errors
2. ✅ **Application Start**: Starts successfully with real Supabase connection
3. ✅ **Health Check**: Returns healthy status
4. ✅ **Authentication**: Users can log in
5. ✅ **Database**: Data loads correctly
6. ✅ **AI Features**: Work with OpenAI integration
7. ✅ **WhatsApp**: Connects if configured

---

## 📞 **Support**

If you encounter issues:

1. **Check Logs**: Review Coolify deployment and runtime logs
2. **Verify Variables**: Double-check all environment variable values
3. **Test Supabase**: Verify your Supabase project is accessible
4. **Health Check**: Use `/api/health` endpoint to diagnose issues

**The hybrid Coolify + Supabase architecture is now optimized for seamless deployment with proper environment variable handling!**
