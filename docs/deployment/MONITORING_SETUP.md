# 📊 Production Monitoring Setup - AgentSalud MVP

## 🎯 Overview

Comprehensive monitoring and observability setup for AgentSalud MVP production environment on Vercel, including performance monitoring, error tracking, uptime monitoring, and business metrics.

## 🔧 Monitoring Stack

### Core Monitoring Services
- **Vercel Analytics**: Built-in performance and usage analytics
- **Sentry**: Error tracking and performance monitoring
- **Uptime Robot**: External uptime monitoring
- **Supabase Monitoring**: Database and API monitoring
- **Custom Health Checks**: Application-specific monitoring

## 📈 Vercel Analytics Configuration

### 1. Enable Vercel Analytics

```bash
# Enable analytics for the project
vercel analytics enable

# Configure Web Vitals tracking
vercel analytics config --web-vitals=true
```

### 2. Environment Variables

```bash
# Add to Vercel environment variables
VERCEL_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED=true
```

### 3. Code Integration

Add to `src/app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## 🚨 Sentry Error Tracking

### 1. Sentry Project Setup

```bash
# Install Sentry SDK
npm install @sentry/nextjs

# Initialize Sentry configuration
npx @sentry/wizard -i nextjs
```

### 2. Environment Variables

```bash
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=production-v1.0.0
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### 3. Sentry Configuration

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});
```

### 4. Performance Monitoring

```typescript
// Add to API routes for performance tracking
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  const transaction = Sentry.startTransaction({
    name: 'API: Create Appointment',
    op: 'http.server',
  });
  
  try {
    // Your API logic here
    const result = await createAppointment(data);
    transaction.setStatus('ok');
    return NextResponse.json(result);
  } catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

## 🔍 Health Check Endpoints

### 1. Basic Health Check

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.DEPLOYMENT_VERSION || 'unknown',
    environment: process.env.NODE_ENV,
    checks: {
      database: false,
      external_apis: false,
      memory: false
    }
  };

  try {
    // Database connectivity check
    const supabase = createClient();
    const { error } = await supabase.from('organizations').select('count').limit(1);
    checks.checks.database = !error;

    // Memory usage check
    const memUsage = process.memoryUsage();
    checks.checks.memory = memUsage.heapUsed < 500 * 1024 * 1024; // 500MB limit

    // External API checks
    try {
      const openaiCheck = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(5000)
      });
      checks.checks.external_apis = openaiCheck.ok;
    } catch {
      checks.checks.external_apis = false;
    }

    // Overall status
    const allHealthy = Object.values(checks.checks).every(Boolean);
    checks.status = allHealthy ? 'healthy' : 'degraded';

    return NextResponse.json(checks, {
      status: allHealthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      ...checks,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
```

### 2. Detailed System Status

Create `src/app/api/status/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: {
      node_version: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV
    },
    services: {
      supabase: await checkSupabaseStatus(),
      evolution_api: await checkEvolutionAPIStatus(),
      openai: await checkOpenAIStatus()
    }
  };

  return NextResponse.json(status);
}

async function checkSupabaseStatus() {
  try {
    const supabase = createClient();
    const start = Date.now();
    const { error } = await supabase.from('organizations').select('count').limit(1);
    const responseTime = Date.now() - start;
    
    return {
      status: error ? 'error' : 'healthy',
      response_time: responseTime,
      error: error?.message
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## 📊 Custom Metrics Collection

### 1. Business Metrics

Create `src/lib/monitoring/metrics.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

export class MetricsCollector {
  static trackAppointmentCreated(organizationId: string, source: string) {
    Sentry.addBreadcrumb({
      category: 'business',
      message: 'Appointment created',
      data: { organizationId, source },
      level: 'info'
    });
  }

  static trackWhatsAppConnection(instanceId: string, status: string) {
    Sentry.addBreadcrumb({
      category: 'integration',
      message: 'WhatsApp connection status',
      data: { instanceId, status },
      level: 'info'
    });
  }

  static trackAPIPerformance(endpoint: string, duration: number) {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: 'API endpoint performance',
      data: { endpoint, duration },
      level: 'info'
    });
  }
}
```

### 2. Usage Analytics

```typescript
// Track feature usage
export const trackFeatureUsage = (feature: string, userId: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'feature_usage', {
      feature_name: feature,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
  }
};

// Track appointment booking funnel
export const trackBookingFunnel = (step: string, data: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'booking_funnel', {
      funnel_step: step,
      ...data
    });
  }
};
```

## 🔔 Alerting Configuration

### 1. Sentry Alerts

Configure in Sentry dashboard:
- **Error Rate Alert**: >5% error rate in 5 minutes
- **Performance Alert**: P95 response time >3 seconds
- **Volume Alert**: >1000 errors in 1 hour

### 2. Uptime Monitoring

**Uptime Robot Configuration:**
```
Monitor Type: HTTP(s)
URL: https://agentsalud.com/api/health
Monitoring Interval: 5 minutes
Alert Contacts: devops@agentsalud.com
```

**Critical Endpoints to Monitor:**
- `https://agentsalud.com` (Homepage)
- `https://agentsalud.com/api/health` (Health check)
- `https://agentsalud.com/api/appointments` (Core API)
- `https://agentsalud.com/api/webhooks/evolution` (WhatsApp integration)

### 3. Custom Alerts

Create `src/lib/monitoring/alerts.ts`:

```typescript
export class AlertManager {
  static async sendCriticalAlert(message: string, data?: any) {
    // Send to Sentry
    Sentry.captureMessage(message, 'error');
    
    // Send to webhook (Slack, Discord, etc.)
    if (process.env.ALERT_WEBHOOK_URL) {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 CRITICAL: ${message}`,
          data: data
        })
      });
    }
  }

  static async sendWarningAlert(message: string, data?: any) {
    Sentry.captureMessage(message, 'warning');
  }
}
```

## 📋 Monitoring Checklist

### Daily Monitoring Tasks
- [ ] Check Vercel Analytics dashboard
- [ ] Review Sentry error reports
- [ ] Verify uptime monitoring status
- [ ] Check Supabase performance metrics
- [ ] Review API response times

### Weekly Monitoring Tasks
- [ ] Analyze performance trends
- [ ] Review error patterns and fixes
- [ ] Check resource usage and scaling needs
- [ ] Validate backup and recovery procedures
- [ ] Update monitoring thresholds if needed

### Monthly Monitoring Tasks
- [ ] Comprehensive performance review
- [ ] Security audit and monitoring review
- [ ] Cost optimization analysis
- [ ] Monitoring tool evaluation
- [ ] Disaster recovery testing

## 🎯 Key Performance Indicators (KPIs)

### Technical KPIs
- **Uptime**: >99.9%
- **Response Time**: <500ms (P95)
- **Error Rate**: <1%
- **Core Web Vitals**: All green

### Business KPIs
- **Appointment Booking Success Rate**: >95%
- **WhatsApp Connection Success Rate**: >90%
- **User Session Duration**: Track trends
- **Feature Adoption Rate**: Monitor new features

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

**High Error Rate:**
1. Check Sentry for error patterns
2. Review recent deployments
3. Check external service status
4. Verify environment variables

**Slow Response Times:**
1. Check Vercel function logs
2. Review database query performance
3. Check external API response times
4. Verify caching configuration

**Failed Health Checks:**
1. Check service dependencies
2. Verify database connectivity
3. Check external API availability
4. Review resource usage

## 📞 Emergency Contacts

- **DevOps Team**: devops@agentsalud.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **Incident Response**: incidents@agentsalud.com
- **Vercel Support**: support@vercel.com
