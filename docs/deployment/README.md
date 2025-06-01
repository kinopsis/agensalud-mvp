# 🚀 AgentSalud MVP - Deployment Documentation

## 📋 Overview

This document provides comprehensive deployment guidelines for the AgentSalud MVP, covering environment setup, production deployment, monitoring, and troubleshooting procedures for the AI-powered healthcare appointment booking system.

## 🏗️ Deployment Architecture

### 🌐 Infrastructure Overview
- **Frontend & API**: Vercel (Next.js deployment)
- **Database**: Supabase (Managed PostgreSQL)
- **AI Services**: OpenAI API integration
- **CDN**: Vercel Edge Network
- **Monitoring**: Built-in Vercel Analytics + Custom monitoring

### 🔧 Technology Stack
- **Framework**: Next.js 14 with App Router
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4 via Vercel AI SDK

## 🌍 Environment Configuration

### 📋 Environment Variables
Required environment variables for all environments:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production

# Optional: Analytics and Monitoring
VERCEL_ANALYTICS_ID=your_analytics_id
```

### 🔐 Security Configuration
```bash
# Additional security variables
ENCRYPTION_KEY=your_encryption_key_for_sensitive_data
WEBHOOK_SECRET=your_webhook_secret_for_external_integrations
CORS_ORIGIN=https://your-domain.com
```

## 🏃‍♂️ Development Environment

### 🛠️ Local Setup
```bash
# 1. Clone repository
git clone https://github.com/your-org/agensalud-mvp.git
cd agensalud-mvp

# 2. Install dependencies
npm install

# 3. Environment setup
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Database setup
npm run apply-migrations

# 5. Start development server
npm run dev
```

### 🧪 Development Validation
```bash
# Run comprehensive validation
npm run validate:all

# Specific validations
npm run validate:dashboard
npm run validate:management
npm run validate:rls
npm run validate:navigation

# Testing
npm test
npm run test:coverage
```

## 🎯 Staging Environment

### 🔧 Staging Configuration
Staging environment mirrors production with test data:

```bash
# Staging-specific variables
NODE_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=your_staging_supabase_url
OPENAI_API_KEY=your_test_openai_key
```

### 📋 Staging Deployment Process
```bash
# 1. Deploy to staging branch
git checkout staging
git merge main
git push origin staging

# 2. Verify deployment
npm run validate:staging

# 3. Run integration tests
npm run test:integration

# 4. Performance testing
npm run test:performance
```

## 🌟 Production Deployment

### 🚀 Vercel Deployment
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
vercel --prod

# 4. Configure environment variables in Vercel dashboard
# Navigate to Project Settings > Environment Variables
```

### 📊 Production Configuration
```javascript
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://your-domain.com"
        }
      ]
    }
  ]
}
```

### 🔒 Production Security Checklist
- [ ] Environment variables configured securely
- [ ] HTTPS enforced across all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Database RLS policies active
- [ ] API keys rotated and secured
- [ ] Monitoring and alerting configured

## 📊 Database Deployment

### 🗄️ Supabase Production Setup
```sql
-- 1. Create production database
-- 2. Apply all migrations
-- 3. Configure RLS policies
-- 4. Set up backup schedule
-- 5. Configure monitoring
```

### 🔄 Migration Deployment
```bash
# Apply migrations to production
npm run apply-migrations:production

# Verify migration success
npm run validate:database

# Backup before major changes
npm run backup:database
```

### 🛡️ Database Security
- **RLS Policies**: Comprehensive row-level security
- **Backup Strategy**: Daily automated backups
- **Access Control**: Limited production database access
- **Monitoring**: Query performance and security alerts

## 📈 Monitoring & Analytics

### 📊 Application Monitoring
```typescript
// Custom monitoring setup
interface MonitoringConfig {
  performance: {
    coreWebVitals: boolean;
    apiResponseTimes: boolean;
    databaseQueryTimes: boolean;
  };
  errors: {
    errorTracking: boolean;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
    };
  };
  business: {
    appointmentBookings: boolean;
    userEngagement: boolean;
    aiInteractions: boolean;
  };
}
```

### 🚨 Alerting Configuration
```yaml
# Alert rules
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    notification: "slack, email"
  
  - name: "Slow API Response"
    condition: "avg_response_time > 2s"
    notification: "slack"
  
  - name: "Database Connection Issues"
    condition: "db_connection_errors > 0"
    notification: "email, sms"
```

## 🔧 Performance Optimization

### ⚡ Production Optimizations
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};
```

### 📊 Performance Metrics
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **API Response Times**: 95th percentile < 500ms
- **Database Queries**: Average < 100ms
- **AI Processing**: Natural language booking < 3s

## 🔄 CI/CD Pipeline

### 🤖 GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run validate:all

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 📋 Deployment Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Environment variables updated
- [ ] Database migrations applied
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Monitoring configured
- [ ] Rollback plan prepared

## 🚨 Disaster Recovery

### 💾 Backup Strategy
```bash
# Database backups
- Daily automated backups (30-day retention)
- Weekly full backups (90-day retention)
- Point-in-time recovery available

# Application backups
- Git repository with full history
- Environment configuration backups
- Deployment artifacts stored
```

### 🔄 Recovery Procedures
```bash
# Database recovery
1. Identify recovery point
2. Stop application traffic
3. Restore database from backup
4. Verify data integrity
5. Resume application traffic

# Application recovery
1. Identify last known good deployment
2. Rollback to previous version
3. Verify functionality
4. Monitor for issues
```

## 📚 Deployment Resources

### 🔗 External Documentation
- [Vercel Deployment Guide](https://vercel.com/docs/deployments)
- [Supabase Production Guide](https://supabase.com/docs/guides/platform/going-to-prod)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

### 🛠️ Deployment Tools
- **Vercel CLI**: Production deployment management
- **Supabase CLI**: Database migration and management
- **GitHub Actions**: Automated CI/CD pipeline
- **Monitoring Dashboard**: Real-time system health

### 📞 Support Contacts
- **Technical Issues**: DevOps team
- **Database Issues**: Database administrator
- **Security Incidents**: Security team
- **Business Impact**: Product team

---

**Deployment Guide Version**: 1.0  
**Last Updated**: January 2025  
**Environment**: Production Ready  
**Support**: 24/7 monitoring and alerting
