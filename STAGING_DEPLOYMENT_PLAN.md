# 🚀 Plan de Deployment Staging - AgentSalud MVP

**Fecha**: Enero 2025  
**Objetivo**: Preparar environment staging para primeros 3-5 clientes piloto  
**Responsable**: DevOps Team - AgentSalud MVP  
**Estado**: En Ejecución

## 📋 Resumen Ejecutivo

### 🎯 Objetivos del Deployment Staging
1. **Validación Evolution API v2**: 100% funcional con instancias WhatsApp
2. **Environment Staging**: Réplica exacta de producción
3. **Testing Pre-Deploy**: Suite completa de validación
4. **Documentación**: Guías de configuración y troubleshooting
5. **Onboarding**: Proceso para primeros 3-5 clientes piloto

### ✅ Criterios de Éxito
- ✅ 100% uptime Evolution API durante 48h de testing
- ✅ <5s latencia end-to-end para mensajes WhatsApp
- ✅ 0 errores críticos en flujo de booking via WhatsApp
- ✅ Configuración exitosa de al menos 3 instancias WhatsApp piloto

## 🏗️ FASE 1: Configuración Environment Staging (Semana 1)

### 📅 Día 1-2: Infraestructura Base

#### 1.1 Vercel Staging Environment
```bash
# Configurar proyecto staging en Vercel
vercel --prod --scope agentsalud-staging
vercel env add ENVIRONMENT staging
vercel env add NODE_ENV production
```

#### 1.2 Supabase Staging Database
```sql
-- Crear proyecto staging en Supabase
-- URL: https://staging-agentsalud.supabase.co
-- Aplicar todas las migraciones
```

#### 1.3 Variables de Entorno Staging
```env
# Staging Environment Variables
ENVIRONMENT=staging
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.agentsalud.com

# Supabase Staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-agentsalud.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=staging_service_key

# Evolution API Staging
EVOLUTION_API_BASE_URL=https://staging-evolution.agentsalud.com
EVOLUTION_API_KEY=staging_evolution_key
EVOLUTION_WEBHOOK_VERIFY_TOKEN=staging_webhook_token

# OpenAI Configuration
OPENAI_API_KEY=production_openai_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# Monitoring & Alerts
SENTRY_DSN=staging_sentry_dsn
DATADOG_API_KEY=staging_datadog_key
```

### 📅 Día 3-4: Evolution API Setup

#### 1.4 Evolution API v2 Installation
```bash
# Docker Compose para Evolution API Staging
version: '3.8'
services:
  evolution-api:
    image: atendai/evolution-api:v2.0.0
    container_name: evolution-staging
    environment:
      - DATABASE_URL=postgresql://staging_user:password@db:5432/evolution_staging
      - REDIS_URL=redis://redis:6379
      - WEBHOOK_GLOBAL_URL=https://staging.agentsalud.com/api/whatsapp/webhook
      - WEBHOOK_GLOBAL_ENABLED=true
      - CONFIG_SESSION_PHONE_CLIENT=AgentSalud-Staging
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: evolution_staging
      POSTGRES_USER: staging_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### 1.5 SSL y Dominio Staging
```bash
# Configurar SSL para staging.agentsalud.com
# Configurar subdomain para Evolution API: staging-evolution.agentsalud.com
# Configurar reverse proxy con Nginx
```

### 📅 Día 5-7: Configuración y Testing

#### 1.6 Database Migration y Seed Data
```bash
# Aplicar migraciones a staging
npm run migrate:staging

# Seed data para testing
npm run seed:staging
```

#### 1.7 Monitoring Setup
```bash
# Configurar Sentry para error tracking
# Configurar Datadog para performance monitoring
# Configurar alertas para Evolution API uptime
```

## 🔧 FASE 2: Validación Evolution API Integration (Semana 2)

### 📅 Día 8-10: Tests de Conectividad

#### 2.1 Evolution API Health Check
```typescript
// tests/staging/evolution-api-health.test.ts
describe('Evolution API Staging Health', () => {
  it('should connect to Evolution API successfully', async () => {
    const service = createEvolutionAPIService();
    const health = await service.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.version).toBe('v2.0.0');
  });

  it('should validate API key authentication', async () => {
    const service = createEvolutionAPIService();
    const auth = await service.validateAuthentication();
    expect(auth.valid).toBe(true);
  });
});
```

#### 2.2 Instance Creation Tests
```typescript
// tests/staging/whatsapp-instance-creation.test.ts
describe('WhatsApp Instance Creation', () => {
  it('should create WhatsApp instance successfully', async () => {
    const instanceData = {
      instanceName: 'staging-test-001',
      integration: 'WHATSAPP-BUSINESS',
      qrcode: true,
      webhook: 'https://staging.agentsalud.com/api/whatsapp/webhook'
    };

    const response = await evolutionAPI.createInstance(instanceData);
    expect(response.instance.instanceName).toBe('staging-test-001');
    expect(response.instance.status).toBe('created');
  });
});
```

### 📅 Día 11-12: QR Code y Conexión

#### 2.3 QR Code Generation Tests
```typescript
// tests/staging/qr-code-generation.test.ts
describe('QR Code Generation', () => {
  it('should generate QR code for new instance', async () => {
    const qrResponse = await evolutionAPI.getQRCode('staging-test-001');
    expect(qrResponse.qrcode).toBeDefined();
    expect(qrResponse.base64).toBeDefined();
    expect(qrResponse.base64).toMatch(/^data:image\/png;base64,/);
  });

  it('should auto-refresh QR code every 30 seconds', async () => {
    // Test auto-refresh functionality
    const initialQR = await evolutionAPI.getQRCode('staging-test-001');
    
    // Wait 35 seconds
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    const refreshedQR = await evolutionAPI.getQRCode('staging-test-001');
    expect(refreshedQR.qrcode).not.toBe(initialQR.qrcode);
  });
});
```

#### 2.4 Connection Status Tests
```typescript
// tests/staging/connection-status.test.ts
describe('Connection Status Management', () => {
  it('should track connection states correctly', async () => {
    const status = await evolutionAPI.getConnectionStatus('staging-test-001');
    expect(['close', 'connecting', 'open']).toContain(status.state);
  });

  it('should handle disconnection gracefully', async () => {
    await evolutionAPI.disconnect('staging-test-001');
    const status = await evolutionAPI.getConnectionStatus('staging-test-001');
    expect(status.state).toBe('close');
  });
});
```

### 📅 Día 13-14: Webhook Processing

#### 2.5 Webhook Reception Tests
```typescript
// tests/staging/webhook-processing.test.ts
describe('Webhook Processing', () => {
  it('should receive and process webhooks correctly', async () => {
    // Simulate webhook from Evolution API
    const webhookPayload = {
      event: 'messages.upsert',
      instance: 'staging-test-001',
      data: {
        key: { id: 'msg-123', remoteJid: '573001234567@s.whatsapp.net' },
        message: { conversation: 'Hola, necesito una cita' },
        messageTimestamp: Date.now()
      }
    };

    const response = await fetch('/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });

    expect(response.status).toBe(200);
  });
});
```

## 🧪 FASE 3: Testing Pre-Deploy (Semana 3)

### 📅 Día 15-17: Load Testing

#### 3.1 Multiple Instances Test
```typescript
// tests/staging/load-testing.test.ts
describe('Load Testing - Multiple Instances', () => {
  it('should handle 5 simultaneous WhatsApp instances', async () => {
    const instances = [];
    
    for (let i = 1; i <= 5; i++) {
      const instanceName = `staging-load-test-${i.toString().padStart(3, '0')}`;
      const promise = evolutionAPI.createInstance({
        instanceName,
        integration: 'WHATSAPP-BUSINESS',
        qrcode: true
      });
      instances.push(promise);
    }

    const results = await Promise.all(instances);
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.instance.status).toBe('created');
    });
  });
});
```

#### 3.2 Message Volume Test
```typescript
// tests/staging/message-volume.test.ts
describe('Message Volume Testing', () => {
  it('should handle 100 messages per minute per instance', async () => {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 100; i++) {
      const promise = evolutionAPI.sendMessage('staging-test-001', {
        number: '573001234567',
        text: `Test message ${i + 1}`
      });
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results).toHaveLength(100);
    expect(duration).toBeLessThan(60000); // Less than 1 minute
  });
});
```

### 📅 Día 18-19: End-to-End Testing

#### 3.3 Complete Booking Flow Test
```typescript
// tests/staging/e2e-booking-flow.test.ts
describe('End-to-End Booking Flow', () => {
  it('should complete full booking via WhatsApp', async () => {
    // 1. Simulate incoming message
    const incomingMessage = {
      text: 'Necesito una cita con cardiología para mañana',
      from: '573001234567',
      instance: 'staging-test-001'
    };

    // 2. Process with AI
    const aiResponse = await processWhatsAppMessage(incomingMessage);
    expect(aiResponse.intent).toBe('book_appointment');
    expect(aiResponse.entities.service).toBe('cardiología');

    // 3. Check availability
    const availability = await getAvailability({
      service: 'cardiología',
      date: 'tomorrow'
    });
    expect(availability.slots.length).toBeGreaterThan(0);

    // 4. Create appointment
    const appointment = await createAppointment({
      serviceId: availability.service.id,
      doctorId: availability.slots[0].doctorId,
      date: availability.slots[0].date,
      time: availability.slots[0].time,
      patientPhone: '573001234567'
    });
    expect(appointment.id).toBeDefined();

    // 5. Send confirmation
    const confirmation = await evolutionAPI.sendMessage('staging-test-001', {
      number: '573001234567',
      text: `✅ Cita confirmada para ${appointment.date} a las ${appointment.time}`
    });
    expect(confirmation.key.id).toBeDefined();
  });
});
```

### 📅 Día 20-21: Error Scenarios

#### 3.4 Error Handling Tests
```typescript
// tests/staging/error-scenarios.test.ts
describe('Error Scenarios', () => {
  it('should handle Evolution API downtime gracefully', async () => {
    // Simulate API downtime
    const originalBaseUrl = process.env.EVOLUTION_API_BASE_URL;
    process.env.EVOLUTION_API_BASE_URL = 'http://invalid-url:8080';

    const service = createEvolutionAPIService();
    
    await expect(service.createInstance({
      instanceName: 'test-error',
      integration: 'WHATSAPP-BUSINESS'
    })).rejects.toThrow('Failed to create WhatsApp instance');

    // Restore original URL
    process.env.EVOLUTION_API_BASE_URL = originalBaseUrl;
  });

  it('should handle invalid webhook payloads', async () => {
    const invalidPayload = { invalid: 'data' };

    const response = await fetch('/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload)
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error.code).toBe('INVALID_WEBHOOK_PAYLOAD');
  });
});
```

## 📊 FASE 4: Monitoring y Alertas (Semana 4)

### 📅 Día 22-24: Monitoring Setup

#### 4.1 Evolution API Monitoring
```typescript
// monitoring/evolution-api-monitor.ts
export class EvolutionAPIMonitor {
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${process.env.EVOLUTION_API_BASE_URL}/health`);
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkInstancesStatus(): Promise<InstanceStatus[]> {
    const instances = await this.getAllInstances();
    return Promise.all(instances.map(async (instance) => {
      const status = await this.getInstanceStatus(instance.name);
      return {
        name: instance.name,
        status: status.state,
        lastSeen: status.lastSeen,
        messageCount24h: await this.getMessageCount(instance.name, '24h')
      };
    }));
  }
}
```

#### 4.2 Alertas Críticas
```yaml
# alerts/evolution-api-alerts.yml
alerts:
  - name: evolution_api_down
    condition: evolution_api_health != "healthy"
    duration: 2m
    severity: critical
    message: "Evolution API is down or unhealthy"
    
  - name: high_response_time
    condition: evolution_api_response_time > 5000
    duration: 5m
    severity: warning
    message: "Evolution API response time is high"
    
  - name: instance_disconnected
    condition: whatsapp_instance_status == "disconnected"
    duration: 1m
    severity: warning
    message: "WhatsApp instance disconnected"
```

### 📅 Día 25-28: Performance Optimization

#### 4.3 Performance Benchmarks
```typescript
// benchmarks/performance-benchmarks.test.ts
describe('Performance Benchmarks', () => {
  it('should meet response time requirements', async () => {
    const benchmarks = {
      'QR Code Generation': { target: 2000, test: () => evolutionAPI.getQRCode('test') },
      'Message Sending': { target: 3000, test: () => evolutionAPI.sendMessage('test', { number: '123', text: 'test' }) },
      'Instance Creation': { target: 5000, test: () => evolutionAPI.createInstance({ instanceName: 'bench-test' }) },
      'Webhook Processing': { target: 1000, test: () => processWebhook(mockWebhookPayload) }
    };

    for (const [name, benchmark] of Object.entries(benchmarks)) {
      const startTime = Date.now();
      await benchmark.test();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(benchmark.target);
      console.log(`✅ ${name}: ${duration}ms (target: ${benchmark.target}ms)`);
    }
  });
});
```

## 📚 Entregables

### 📋 1. Environment Staging Configurado
- ✅ Vercel staging deployment
- ✅ Supabase staging database
- ✅ Evolution API v2 staging instance
- ✅ SSL certificates y dominios
- ✅ Monitoring y alertas

### 📋 2. Reporte de Validación
- ✅ 100% tests de integración pasando
- ✅ Performance benchmarks cumplidos
- ✅ Error scenarios validados
- ✅ Load testing completado

### 📋 3. Documentación
- ✅ Guías de configuración WhatsApp
- ✅ Troubleshooting Evolution API
- ✅ Checklist post-deployment
- ✅ Proceso de soporte

### 📋 4. Plan de Rollback
- ✅ Procedimientos de rollback
- ✅ Backup y recovery
- ✅ Escalation procedures
- ✅ Emergency contacts

---

**Próxima Fase**: Onboarding Clientes Piloto (Semana 5-6)  
**Responsable**: DevOps Team + Product Manager  
**Estado**: Listo para Ejecución ✅
