# 🌐 AgentSalud MVP - Production Domain Configuration

## 📋 **Domain Update Summary**

**Production Domain**: `https://agendia.torrecentral.com/`  
**Evolution API Domain**: `https://evo.torrecentral.com/`  
**Update Date**: January 2025

---

## ✅ **Files Updated**

### **1. Core Configuration Files**

#### **Dockerfile**
- ✅ Updated `ARG NEXTAUTH_URL` from `https://placeholder.com` to `https://agendia.torrecentral.com`

#### **Next.js Configuration**
- ✅ `next.config.js` - Added `agendia.torrecentral.com` to image domains
- ✅ `next.config.deploy.js` - Added `agendia.torrecentral.com` to image domains  
- ✅ `next.config.coolify.js` - Updated domains and CSP policies:
  - Image domains: `agendia.torrecentral.com`, `evo.torrecentral.com`
  - CSP connect-src: Updated Evolution API domain

### **2. Environment Configuration**

#### **Environment Files**
- ✅ `.env.coolify.example`:
  - `NEXT_PUBLIC_APP_URL=https://agendia.torrecentral.com`
  - `NEXTAUTH_URL=https://agendia.torrecentral.com`
  - `CORS_ORIGIN=https://agendia.torrecentral.com`
  - `COOLIFY_DOMAIN=agendia.torrecentral.com`

- ✅ `.env.production.example`:
  - `CORS_ORIGIN=https://agendia.torrecentral.com`

- ✅ `docker/staging/.env.staging.example`:
  - `NEXTAUTH_URL=https://staging.agendia.torrecentral.com`

#### **Docker Compose**
- ✅ `docker-compose.yml` - Updated Evolution API CORS origin

### **3. API Routes & Webhook Configuration**

#### **WhatsApp Integration**
- ✅ `src/app/api/whatsapp/instances/[id]/connect/route.ts`:
  - Updated webhook URL fallback to production domain

- ✅ `src/lib/utils/whatsapp-defaults.ts`:
  - Updated `generateWebhookURL()` fallback domain

#### **Development Scripts**
- ✅ `fix-webhook-for-existing-instance.js` - Added environment variable support
- ✅ `recreate-whatsapp-instance.js` - Added environment variable support

### **4. Documentation**

#### **Deployment Guides**
- ✅ `docs/deployment/COOLIFY_ENVIRONMENT_VARIABLES.md`
- ✅ `docs/deployment/COOLIFY_SUPABASE_HYBRID_GUIDE.md`

#### **Validation Scripts**
- ✅ `scripts/validate-production-deployment.js` - Updated production URL

---

## 🔧 **Required Environment Variables**

### **Production Environment (Coolify)**
```bash
# Application URLs
NEXT_PUBLIC_APP_URL=https://agendia.torrecentral.com
NEXTAUTH_URL=https://agendia.torrecentral.com

# CORS Configuration
CORS_ORIGIN=https://agendia.torrecentral.com

# Coolify Configuration
COOLIFY_DOMAIN=agendia.torrecentral.com
COOLIFY_PORT=3000
COOLIFY_HEALTH_CHECK_PATH=/api/health

# Supabase Configuration (External)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
NEXTAUTH_SECRET=your-32-character-secret
JWT_SECRET=your-jwt-secret

# WhatsApp Evolution API
EVOLUTION_API_BASE_URL=https://evo.torrecentral.com/
EVOLUTION_API_KEY=your-evolution-api-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

---

## 🔗 **Webhook Endpoints**

### **Evolution API Webhooks**
- **Organization-specific**: `https://agendia.torrecentral.com/api/webhooks/evolution/[orgId]`
- **Legacy endpoint**: `https://agendia.torrecentral.com/api/whatsapp/webhook`
- **Simple webhook**: `https://agendia.torrecentral.com/api/whatsapp/simple/webhook/[orgId]`

### **Webhook Configuration**
All WhatsApp instances will automatically use the production domain for webhook URLs when:
- `NEXT_PUBLIC_APP_URL` environment variable is set to `https://agendia.torrecentral.com`
- Fallback domain is configured in utility functions

---

## 🛡️ **Security Configuration**

### **CORS Settings**
- **Allowed Origins**: `https://agendia.torrecentral.com`
- **Evolution API CORS**: `https://agendia.torrecentral.com`

### **Content Security Policy (CSP)**
```
connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co https://evo.torrecentral.com
```

### **Image Domains**
- `agendia.torrecentral.com`
- `evo.torrecentral.com`
- `*.supabase.co`

---

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Verify DNS configuration for `agendia.torrecentral.com`
- [ ] Ensure SSL certificate is valid and configured
- [ ] Update Coolify environment variables
- [ ] Configure Supabase allowed origins

### **Post-Deployment**
- [ ] Run production validation: `node scripts/validate-production-deployment.js`
- [ ] Test webhook connectivity with Evolution API
- [ ] Verify authentication flows work correctly
- [ ] Test WhatsApp instance creation and QR code generation
- [ ] Validate CORS settings with browser developer tools

### **Supabase Configuration**
- [ ] Add `https://agendia.torrecentral.com` to allowed origins in Supabase dashboard
- [ ] Update redirect URLs for authentication flows
- [ ] Verify RLS policies work with new domain

---

## 📊 **Validation Commands**

### **Production Health Check**
```bash
curl -f https://agendia.torrecentral.com/api/health
```

### **Webhook Connectivity Test**
```bash
curl -X POST https://agendia.torrecentral.com/api/webhooks/evolution/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### **SSL Certificate Verification**
```bash
openssl s_client -connect agendia.torrecentral.com:443 -servername agendia.torrecentral.com
```

---

## 🔄 **Migration Notes**

### **From Previous Domains**
- All references to `agentsalud.com` have been updated to `agendia.torrecentral.com`
- Evolution API domain changed from `evolution.agentsalud.com` to `evo.torrecentral.com`
- Placeholder URLs updated to use production domain as fallback

### **Backward Compatibility**
- Development scripts maintain localhost fallback for local development
- Environment variable-based configuration ensures flexibility
- No breaking changes to API endpoints or functionality

---

## ⚠️ **Important Notes**

1. **Environment Variables**: Ensure all production environment variables are set in Coolify before deployment
2. **DNS Configuration**: Verify that `agendia.torrecentral.com` points to the Coolify server
3. **SSL Certificate**: Ensure valid SSL certificate is configured for the domain
4. **Supabase Settings**: Update Supabase project settings to include the new domain
5. **Evolution API**: Verify that `evo.torrecentral.com` is accessible and configured correctly

**The AgentSalud MVP is now fully configured for production deployment at `https://agendia.torrecentral.com/`**
