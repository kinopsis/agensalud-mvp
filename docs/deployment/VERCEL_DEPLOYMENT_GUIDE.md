# 🚀 Vercel Deployment Guide - AgentSalud MVP

## 📋 Overview

This guide provides step-by-step instructions for deploying the AgentSalud MVP to Vercel production environment with all necessary configurations, security measures, and monitoring setup.

## 🎯 Prerequisites

### Required Accounts & Services
- [x] Vercel account with Pro plan (for advanced features)
- [x] GitHub repository with AgentSalud MVP code
- [x] Supabase production project
- [x] OpenAI API account with GPT-4 access
- [x] Evolution API v2 server (self-hosted or managed)
- [x] Custom domain (agentsalud.com)
- [x] SSL certificate (handled by Vercel)

### Required Credentials
- [x] Supabase production URL and keys
- [x] OpenAI API key
- [x] Evolution API credentials
- [x] Domain DNS access
- [x] GitHub repository access

## 🏗️ Phase 1: Environment Setup

### 1.1 Vercel Project Creation

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link
```

### 1.2 Environment Variables Configuration

**Critical Environment Variables (Required):**

```bash
# Core Application
NEXT_PUBLIC_APP_URL=https://agentsalud.com
NODE_ENV=production
NEXTAUTH_SECRET=your_secure_nextauth_secret
NEXTAUTH_URL=https://agentsalud.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# Evolution API Configuration
EVOLUTION_API_BASE_URL=https://evolution.agentsalud.com
EVOLUTION_API_KEY=your_evolution_api_key
```

**Set via Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add each variable with appropriate scope (Production/Preview/Development)
3. Mark sensitive variables as "Sensitive" to hide values

**Set via CLI:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
# ... continue for all variables
```

### 1.3 Build Configuration

Ensure `vercel.json` is properly configured (already created in project root):
- Function timeouts optimized for different endpoints
- Security headers configured
- CORS policies set
- Cron jobs for maintenance tasks

## 🔐 Phase 2: Security Configuration

### 2.1 Domain & SSL Setup

1. **Add Custom Domain:**
   ```bash
   vercel domains add agentsalud.com
   vercel domains add www.agentsalud.com
   ```

2. **Configure DNS Records:**
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   
   Type: CNAME  
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **SSL Certificate:**
   - Automatically handled by Vercel
   - Verify HTTPS redirect is enabled

### 2.2 Security Headers

Already configured in `vercel.json`:
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy

### 2.3 CORS Configuration

Configured for:
- Supabase domains
- OpenAI API
- Evolution API endpoints
- WebSocket connections

## 📊 Phase 3: Database & External Services

### 3.1 Supabase Production Setup

1. **Create Production Project:**
   - New Supabase project for production
   - Configure database with production settings
   - Set up RLS policies
   - Configure authentication providers

2. **Run Migrations:**
   ```bash
   # Set production Supabase URL and key
   npx supabase db push --db-url "postgresql://..."
   ```

3. **Configure Webhooks:**
   - Set webhook URL to: `https://agentsalud.com/api/webhooks/supabase`
   - Configure events for real-time updates

### 3.2 Evolution API Configuration

1. **Production Server Setup:**
   - Deploy Evolution API v2 to production server
   - Configure with production WhatsApp Business API
   - Set webhook URL: `https://agentsalud.com/api/webhooks/evolution`

2. **API Key Configuration:**
   - Generate production API key
   - Configure rate limiting
   - Set up monitoring

### 3.3 OpenAI Configuration

1. **Production API Key:**
   - Use separate API key for production
   - Configure usage limits
   - Set up billing alerts

2. **Model Configuration:**
   - Use GPT-4 for production
   - Configure appropriate temperature and max tokens
   - Set up fallback models if needed

## 🚀 Phase 4: Deployment Pipeline

### 4.1 GitHub Integration

1. **Connect Repository:**
   - Link Vercel project to GitHub repository
   - Configure automatic deployments from `main` branch
   - Set up preview deployments for pull requests

2. **Branch Configuration:**
   ```
   Production: main branch → agentsalud.com
   Staging: staging branch → staging-agentsalud.vercel.app
   Preview: feature branches → preview URLs
   ```

### 4.2 Build Optimization

1. **Build Settings:**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm ci",
     "nodeVersion": "18.x"
   }
   ```

2. **Performance Optimization:**
   - Enable Vercel Analytics
   - Configure Image Optimization
   - Set up Edge Functions for critical paths
   - Enable compression and caching

### 4.3 Deployment Validation

**Pre-deployment Checklist:**
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] External services configured
- [ ] Security headers tested
- [ ] SSL certificate active
- [ ] Domain DNS configured

**Post-deployment Validation:**
- [ ] Application loads successfully
- [ ] Authentication works
- [ ] Database connections active
- [ ] API endpoints responding
- [ ] WhatsApp integration functional
- [ ] AI features operational

## 📈 Phase 5: Monitoring & Analytics

### 5.1 Vercel Analytics

```bash
# Enable Vercel Analytics
vercel analytics enable
```

Configure:
- Core Web Vitals monitoring
- Real User Monitoring (RUM)
- Performance insights
- Error tracking

### 5.2 Error Monitoring

**Sentry Integration:**
1. Create Sentry project
2. Add Sentry DSN to environment variables
3. Configure error boundaries in React components
4. Set up performance monitoring

### 5.3 Uptime Monitoring

**External Monitoring:**
- Configure Uptime Robot or Pingdom
- Monitor critical endpoints:
  - `/api/health`
  - `/api/appointments`
  - `/api/webhooks/evolution`
- Set up alerts for downtime

## 🔄 Phase 6: Backup & Recovery

### 6.1 Database Backups

**Automated Backups:**
- Supabase automatic backups (daily)
- Custom backup scripts via cron jobs
- Point-in-time recovery configuration

### 6.2 Disaster Recovery Plan

**Recovery Procedures:**
1. Database restoration from backup
2. Environment variable restoration
3. DNS failover configuration
4. Service dependency restoration

**RTO/RPO Targets:**
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 1 hour

## ✅ Success Criteria Validation

### Performance Metrics
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Core Web Vitals in green
- [ ] 99.9% uptime target

### Functionality Tests
- [ ] User authentication flow
- [ ] Appointment booking system
- [ ] WhatsApp integration
- [ ] AI-powered features
- [ ] Multi-tenant data isolation
- [ ] Role-based access control

### Security Validation
- [ ] SSL certificate active
- [ ] Security headers configured
- [ ] CORS policies working
- [ ] Rate limiting functional
- [ ] Data encryption verified

## 🚨 Rollback Strategy

### Immediate Rollback
```bash
# Rollback to previous deployment
vercel rollback
```

### Manual Rollback
1. Identify last known good deployment
2. Revert to specific deployment ID
3. Verify functionality
4. Update DNS if needed

### Emergency Procedures
- Maintenance mode activation
- Service degradation handling
- Communication plan
- Incident response team contacts

## � Implementation Timeline

### Phase 1: Environment Setup (Day 1-2)
**Duration**: 2 days
**Effort**: 16 hours

**Day 1 (8 hours):**
- [ ] Vercel account setup and project creation (2h)
- [ ] Environment variables configuration (3h)
- [ ] Domain and SSL setup (2h)
- [ ] Initial deployment testing (1h)

**Day 2 (8 hours):**
- [ ] Supabase production instance setup (4h)
- [ ] Evolution API production configuration (3h)
- [ ] Security headers and CORS testing (1h)

### Phase 2: Database & Services (Day 3-4)
**Duration**: 2 days
**Effort**: 16 hours

**Day 3 (8 hours):**
- [ ] Database migration to production (4h)
- [ ] RLS policies validation (2h)
- [ ] Authentication provider setup (2h)

**Day 4 (8 hours):**
- [ ] OpenAI API production configuration (2h)
- [ ] WhatsApp Business API setup (4h)
- [ ] Webhook endpoint configuration (2h)

### Phase 3: CI/CD & Monitoring (Day 5-6)
**Duration**: 2 days
**Effort**: 16 hours

**Day 5 (8 hours):**
- [ ] GitHub Actions workflow setup (4h)
- [ ] Automated deployment pipeline (3h)
- [ ] Staging environment configuration (1h)

**Day 6 (8 hours):**
- [ ] Sentry error tracking setup (3h)
- [ ] Vercel Analytics configuration (2h)
- [ ] Uptime monitoring setup (2h)
- [ ] Custom health checks implementation (1h)

### Phase 4: Testing & Validation (Day 7-8)
**Duration**: 2 days
**Effort**: 16 hours

**Day 7 (8 hours):**
- [ ] Comprehensive functionality testing (4h)
- [ ] Performance optimization (2h)
- [ ] Security validation (2h)

**Day 8 (8 hours):**
- [ ] Load testing and stress testing (4h)
- [ ] Disaster recovery testing (2h)
- [ ] Documentation finalization (2h)

### Phase 5: Go-Live & Support (Day 9-10)
**Duration**: 2 days
**Effort**: 16 hours

**Day 9 (8 hours):**
- [ ] Final production deployment (2h)
- [ ] DNS cutover and traffic routing (2h)
- [ ] Real-time monitoring setup (2h)
- [ ] Team training and handover (2h)

**Day 10 (8 hours):**
- [ ] Post-deployment monitoring (4h)
- [ ] Issue resolution and optimization (3h)
- [ ] Success criteria validation (1h)

**Total Timeline**: 10 days
**Total Effort**: 80 hours

## 📊 Success Metrics

### Technical Metrics
- **Deployment Success Rate**: 100%
- **Page Load Time**: <3 seconds
- **API Response Time**: <500ms
- **Uptime**: >99.9%
- **Error Rate**: <1%

### Business Metrics
- **Zero Critical Deployment Issues**
- **All Features Functional**
- **User Authentication Working**
- **WhatsApp Integration Active**
- **AI Features Operational**

## �📞 Support & Maintenance

### Monitoring Dashboards
- Vercel Dashboard: Performance and deployments
- Supabase Dashboard: Database and auth metrics
- Sentry Dashboard: Error tracking and performance

### Regular Maintenance
- Weekly security updates
- Monthly dependency updates
- Quarterly performance reviews
- Annual security audits

### Contact Information
- DevOps Team: devops@agentsalud.com
- Emergency Contact: +1-XXX-XXX-XXXX
- Incident Response: incidents@agentsalud.com
