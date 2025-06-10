# 🚀 AgentSalud MVP - Coolify Deployment Guide

## 📋 Environment Variable Management Strategy

### **Critical Impact Analysis**

Adding multiple API keys to the AgentSalud MVP deployment affects:

1. **Runtime Environment Replacement System** ✅ **UPDATED**
   - Enhanced `replace-env-runtime.js` to handle ALL API keys
   - Updated `Dockerfile.runtime-env` with comprehensive placeholder values
   - Improved validation and error reporting

2. **Coolify Environment Variable Injection** ⚠️ **REQUIRES MANUAL CONFIGURATION**
   - All variables must be manually configured in Coolify dashboard
   - Proper security classification (Build vs Runtime variables)
   - Consistent naming conventions

3. **Production Deployment Consistency** ✅ **STANDARDIZED**
   - Unified approach for all API keys and secrets
   - Comprehensive validation script
   - Clear migration path from development to production

---

## 🔧 Step-by-Step Deployment Process

### **Phase 1: Coolify Environment Variables Configuration**

#### **1.1 Access Coolify Dashboard**
```bash
# Navigate to your Coolify instance
https://your-coolify-instance.com

# Go to: Projects → AgentSalud MVP → Configuration → Environment Variables
```

#### **1.2 Configure Core API Keys**

| **Variable Name** | **Value** | **Build Variable** | **Is Multiline** | **Security Level** |
|-------------------|-----------|-------------------|------------------|-------------------|
| `NODE_ENV` | `production` | ✅ YES | ❌ NO | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fjvletqwwmxusgthwphr.supabase.co` | ✅ YES | ❌ NO | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[your-supabase-anon-key]` | ✅ YES | ❌ NO | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `[your-supabase-service-key]` | ❌ NO | ❌ NO | **SECRET** |
| `OPENAI_API_KEY` | `[your-openai-key]` | ❌ NO | ❌ NO | **SECRET** |
| `EVOLUTION_API_BASE_URL` | `https://evo.torrecentral.com/` | ❌ NO | ❌ NO | Private |
| `EVOLUTION_API_KEY` | `[your-evolution-key]` | ❌ NO | ❌ NO | **SECRET** |
| `NEXTAUTH_SECRET` | `[generate-32-char-secret]` | ❌ NO | ❌ NO | **SECRET** |
| `NEXTAUTH_URL` | `https://agendia.torrecentral.com` | ❌ NO | ❌ NO | Private |

#### **1.3 Configure Production-Specific Variables**

```bash
# Production URLs
NEXT_PUBLIC_APP_URL=https://agendia.torrecentral.com
WEBHOOK_GLOBAL_URL=https://agendia.torrecentral.com/api/webhooks/evolution

# Security Configuration
JWT_SECRET=[generate-32-char-secret]
ENCRYPTION_KEY=[generate-32-char-key]
ENCRYPTION_IV=[generate-16-char-iv]

# Redis Configuration
REDIS_URL=redis://agentsalud-redis:6379
REDIS_PASSWORD=[generate-redis-password]

# Feature Flags
FEATURE_WHATSAPP_ENABLED=true
FEATURE_AI_BOOKING_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true

# Security & Compliance
HIPAA_AUDIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true
CORS_ORIGIN=https://agendia.torrecentral.com

# OpenAI Configuration
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

### **Phase 2: Deployment Validation**

#### **2.1 Pre-Deployment Checklist**

- [ ] All environment variables configured in Coolify
- [ ] Build variables properly marked (NEXT_PUBLIC_* only)
- [ ] Runtime variables properly secured (API keys, secrets)
- [ ] Production URLs updated for domain `agendia.torrecentral.com`
- [ ] Webhook endpoints configured for Evolution API
- [ ] Redis password generated and configured
- [ ] Security keys generated (JWT, Encryption)

#### **2.2 Run Validation Script**

```bash
# After deployment, run validation
docker exec -it agentsalud-app node scripts/validate-production-deployment.js

# Expected output:
# ✅ ALL VALIDATIONS PASSED (5/5)
# 🚀 Production deployment is ready!
```

#### **2.3 Test Critical Functionality**

```bash
# 1. Test Supabase Connection
curl -H "apikey: [anon-key]" https://agendia.torrecentral.com/api/health/supabase

# 2. Test OpenAI Integration
curl -X POST https://agendia.torrecentral.com/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# 3. Test Evolution API
curl -H "apikey: [evolution-key]" https://evo.torrecentral.com/manager/findInstances

# 4. Test Application Health
curl https://agendia.torrecentral.com/api/health/basic
```

---

## 🔍 Troubleshooting Common Issues

### **Issue 1: Environment Variables Not Injected**

**Symptoms:**
- Application shows placeholder values
- API connections fail
- Runtime replacement script reports missing variables

**Solution:**
```bash
# 1. Check Coolify environment variables are saved
# 2. Restart the application service
# 3. Check container logs for injection errors
docker logs agentsalud-app

# 4. Manual verification inside container
docker exec -it agentsalud-app env | grep -E "(SUPABASE|OPENAI|EVOLUTION)"
```

### **Issue 2: Build vs Runtime Variable Confusion**

**Symptoms:**
- NEXT_PUBLIC_* variables not available in browser
- Server-side API keys exposed in client bundle

**Solution:**
- **Build Variables (YES)**: Only `NEXT_PUBLIC_*` and `NODE_ENV`
- **Runtime Variables (NO)**: All API keys, secrets, private URLs

### **Issue 3: Runtime Replacement Not Working**

**Symptoms:**
- Placeholder values remain in production
- API calls fail with placeholder URLs

**Solution:**
```bash
# 1. Check replacement script execution
docker exec -it agentsalud-app cat /app/startup-with-replacement.sh

# 2. Run replacement manually
docker exec -it agentsalud-app node replace-env-runtime.js

# 3. Verify file modifications
docker exec -it agentsalud-app grep -r "placeholder" .next/
```

---

## 📊 Security Best Practices

### **Environment Variable Security Classification**

| **Security Level** | **Variables** | **Coolify Setting** | **Exposure Risk** |
|-------------------|---------------|-------------------|------------------|
| **PUBLIC** | `NEXT_PUBLIC_*`, `NODE_ENV` | Build Variable = YES | Low (intended) |
| **PRIVATE** | URLs, feature flags | Build Variable = NO | Medium |
| **SECRET** | API keys, passwords, tokens | Build Variable = NO | **HIGH** |

### **Secret Generation Commands**

```bash
# Generate secure secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
ENCRYPTION_IV=$(openssl rand -base64 16)
REDIS_PASSWORD=$(openssl rand -base64 24)

echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "JWT_SECRET=$JWT_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "ENCRYPTION_IV=$ENCRYPTION_IV"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
```

---

## 🎯 Production Deployment Checklist

### **Pre-Deployment**
- [ ] All API keys obtained and validated
- [ ] Secrets generated using secure methods
- [ ] Coolify environment variables configured
- [ ] Build vs Runtime variables properly classified
- [ ] Production URLs updated
- [ ] Webhook endpoints configured

### **During Deployment**
- [ ] Monitor build logs for errors
- [ ] Verify environment variable injection
- [ ] Check runtime replacement execution
- [ ] Validate container startup

### **Post-Deployment**
- [ ] Run comprehensive validation script
- [ ] Test all API integrations
- [ ] Verify application functionality
- [ ] Monitor logs for errors
- [ ] Performance testing
- [ ] Security audit

### **Ongoing Monitoring**
- [ ] Set up health check alerts
- [ ] Monitor API rate limits
- [ ] Track error rates
- [ ] Regular security updates
- [ ] Backup validation

---

## 📞 Support and Troubleshooting

For deployment issues:
1. Check Coolify logs: `docker logs coolify`
2. Check application logs: `docker logs agentsalud-app`
3. Run validation script: `node scripts/validate-production-deployment.js`
4. Review this guide for common solutions

**Emergency Rollback:**
```bash
# Rollback to previous deployment
# Via Coolify dashboard: Deployments → Select previous → Redeploy
```
