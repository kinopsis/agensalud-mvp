# 🚀 AgentSalud MVP - Production Deployment Execution Guide

## 📋 Overview

This guide provides step-by-step instructions to execute the production deployment of AgentSalud MVP to Vercel using the comprehensive infrastructure we've prepared.

## ✅ Pre-deployment Validation Complete

All critical deployment files are verified and ready:
- ✅ **vercel.json** - Complete Vercel configuration
- ✅ **.env.production.example** - Environment variables template
- ✅ **GitHub Actions workflow** - CI/CD pipeline
- ✅ **Deployment scripts** - Automation tools

## 🔧 Step-by-Step Deployment Execution

### **Step 1: Vercel CLI Setup and Authentication**

```bash
# 1. Install Vercel CLI (already done)
npm install -g vercel@latest

# 2. Login to Vercel
npx vercel login
# Choose "Continue with GitHub" and authenticate

# 3. Verify login
npx vercel whoami
```

### **Step 2: Project Initialization**

```bash
# 1. Link project to Vercel
npx vercel link

# When prompted:
# - Set up and deploy? Y
# - Which scope? [Select your account/team]
# - Link to existing project? N (create new)
# - Project name: agentsalud-mvp
# - Directory: ./ (current directory)
```

### **Step 3: Environment Variables Configuration**

**Critical Environment Variables to Set in Vercel Dashboard:**

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Add the following variables** (replace with actual values):

```bash
# Core Application
NEXT_PUBLIC_APP_URL=https://agentsalud.com
NODE_ENV=production
NEXTAUTH_SECRET=[generate-strong-secret]
NEXTAUTH_URL=https://agentsalud.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-project-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-supabase-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-supabase-service-role-key]

# OpenAI Configuration
OPENAI_API_KEY=[your-openai-api-key]
OPENAI_MODEL=gpt-4

# Evolution API Configuration
EVOLUTION_API_BASE_URL=[your-evolution-api-url]
EVOLUTION_API_KEY=[your-evolution-api-key]

# Security Configuration
JWT_SECRET=[generate-strong-jwt-secret]
ENCRYPTION_KEY=[32-character-encryption-key]
ENCRYPTION_IV=[16-character-iv]

# Feature Flags
FEATURE_WHATSAPP_ENABLED=true
FEATURE_AI_BOOKING_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
```

### **Step 4: Domain Configuration**

```bash
# 1. Add custom domain
npx vercel domains add agentsalud.com
npx vercel domains add www.agentsalud.com

# 2. Configure DNS (in your domain provider):
# Type: CNAME
# Name: @
# Value: cname.vercel-dns.com
#
# Type: CNAME
# Name: www
# Value: cname.vercel-dns.com
```

### **Step 5: Production Deployment**

```bash
# 1. Deploy to production
npx vercel --prod

# This will:
# - Build the application
# - Deploy to production
# - Configure SSL certificates
# - Apply all vercel.json settings
```

### **Step 6: Post-deployment Validation**

```bash
# 1. Run our validation script
node scripts/validate-production-deployment.js

# 2. Test critical endpoints
curl -f https://agentsalud.com
curl -f https://agentsalud.com/api/health

# 3. Test WhatsApp integration
curl -f https://agentsalud.com/api/channels/whatsapp/instances

# 4. Verify authentication
curl -f https://agentsalud.com/api/auth/session
```

## 📊 Monitoring Setup

### **Step 7: Configure Monitoring Services**

1. **Sentry Error Tracking**:
   - Create Sentry project
   - Add SENTRY_DSN to environment variables
   - Configure alerts for error rates >5%

2. **Vercel Analytics**:
   ```bash
   npx vercel analytics enable
   ```

3. **External Uptime Monitoring**:
   - Configure Uptime Robot or Pingdom
   - Monitor: https://agentsalud.com/api/health
   - Set 5-minute intervals

### **Step 8: Performance Validation**

```bash
# 1. Run Lighthouse audit
npx lighthouse https://agentsalud.com --output=json

# 2. Test API performance
node scripts/test-api-performance.js

# 3. Validate Core Web Vitals
# Check Vercel Analytics dashboard
```

## 🎯 Success Criteria Validation

### **Performance Targets** ✅
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Core Web Vitals in green
- [ ] 99.9% uptime target

### **Functionality Tests** ✅
- [ ] Homepage loads successfully
- [ ] User authentication works
- [ ] API endpoints respond correctly
- [ ] WhatsApp integration functional
- [ ] Database connections active
- [ ] AI features operational

### **Security Validation** ✅
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] CORS policies working
- [ ] Rate limiting functional
- [ ] Data encryption verified

## 🚨 Rollback Procedures

### **If Issues Occur:**

```bash
# 1. Immediate rollback
npx vercel rollback

# 2. Check deployment logs
npx vercel logs

# 3. Emergency maintenance mode
# Set MAINTENANCE_MODE=true in environment variables
```

## 📞 Support Resources

### **Available Tools:**
- **Deployment scripts**: `scripts/deploy-production.sh`
- **Validation tools**: `scripts/validate-production-deployment.js`
- **Debugging scripts**: 80+ diagnostic tools
- **Emergency procedures**: Emergency fix and cleanup scripts

### **Documentation:**
- **Deployment guide**: `docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md`
- **Monitoring setup**: `docs/deployment/MONITORING_SETUP.md`
- **Troubleshooting**: 50+ documentation files

## ✅ Deployment Checklist

### **Pre-deployment:**
- [ ] Vercel CLI installed and authenticated
- [ ] Project linked to Vercel
- [ ] Environment variables configured
- [ ] Domain DNS configured

### **Deployment:**
- [ ] Production deployment executed
- [ ] SSL certificates configured
- [ ] Custom domain active
- [ ] All services responding

### **Post-deployment:**
- [ ] Validation scripts executed successfully
- [ ] Monitoring configured and active
- [ ] Performance targets met
- [ ] Security validation complete

### **Go-live:**
- [ ] Team notified of successful deployment
- [ ] Monitoring dashboards active
- [ ] Support procedures documented
- [ ] Success criteria validated

## 🎉 Expected Results

Upon successful completion:
- ✅ **AgentSalud MVP** live at https://agentsalud.com
- ✅ **All features functional** including WhatsApp integration
- ✅ **Performance optimized** with <3s load times
- ✅ **Security configured** with comprehensive headers
- ✅ **Monitoring active** with real-time alerts
- ✅ **CI/CD pipeline** operational for future deployments

## 📋 Next Steps After Deployment

1. **Monitor performance** for first 24 hours
2. **Validate all user workflows** end-to-end
3. **Configure backup procedures** and test recovery
4. **Train team** on production monitoring and support
5. **Plan first maintenance window** for optimizations

---

**🚀 Ready for Production Launch!**

The AgentSalud MVP deployment infrastructure is complete and ready for immediate production deployment using this guide.
