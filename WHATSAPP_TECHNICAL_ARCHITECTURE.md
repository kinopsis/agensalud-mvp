# 🏗️ **WHATSAPP INTEGRATION TECHNICAL ARCHITECTURE**

## 📋 **TECHNICAL SPECIFICATIONS**

### **A. API Architecture Design**

#### **1. Microservices Structure**
```typescript
// Core Services Architecture
interface WhatsAppIntegrationServices {
  messageOrchestrator: MessageOrchestratorService;
  channelManager: ChannelManagerService;
  webhookHandler: WebhookHandlerService;
  templateManager: TemplateManagerService;
  deliveryService: DeliveryService;
  monitoringService: MonitoringService;
  circuitBreaker: CircuitBreakerService;
}

// Message Orchestrator Service
class MessageOrchestratorService {
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    // 1. Validate message content and recipient
    // 2. Select optimal channel (WhatsApp -> SMS -> Voice)
    // 3. Apply rate limiting and circuit breaker
    // 4. Route to appropriate delivery service
    // 5. Track message status and delivery
  }
  
  async processIncomingMessage(message: IncomingMessage): Promise<void> {
    // 1. Parse and validate incoming message
    // 2. Route to AI agent or human operator
    // 3. Generate appropriate response
    // 4. Track conversation context
  }
}
```

#### **2. Circuit Breaker Implementation**
```typescript
interface CircuitBreakerConfig {
  failureThreshold: 5;           // Failures before opening circuit
  recoveryTimeout: 30000;        // 30 seconds recovery time
  monitoringWindow: 60000;       // 1 minute monitoring window
  halfOpenMaxCalls: 3;           // Max calls in half-open state
  emergencyShutdownThreshold: 50; // Emergency shutdown after 50 failures
}

class CircuitBreakerService {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        return fallback ? await fallback() : Promise.reject('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.logCircuitBreakerEvent('OPENED', `Failures: ${this.failureCount}`);
    }
    
    // Emergency shutdown for excessive failures
    if (this.failureCount >= this.config.emergencyShutdownThreshold) {
      this.triggerEmergencyShutdown();
    }
  }
}
```

#### **3. Webhook Handler with Error Recovery**
```typescript
class WebhookHandlerService {
  async handleWebhook(payload: WebhookPayload): Promise<WebhookResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Validate webhook signature
      await this.validateWebhookSignature(payload);
      
      // 2. Parse webhook event
      const event = await this.parseWebhookEvent(payload);
      
      // 3. Process event with circuit breaker
      await this.circuitBreaker.executeWithCircuitBreaker(
        () => this.processEvent(event),
        () => this.handleEventFallback(event)
      );
      
      // 4. Return success response quickly (< 2 seconds)
      return { status: 'success', processedAt: new Date().toISOString() };
      
    } catch (error) {
      // 5. Log error and return appropriate response
      await this.logWebhookError(error, payload);
      return { status: 'error', error: error.message };
    } finally {
      // 6. Track processing time
      const processingTime = Date.now() - startTime;
      await this.trackWebhookMetrics(processingTime);
    }
  }
  
  private async processEvent(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'message.received':
        await this.handleIncomingMessage(event.data);
        break;
      case 'message.status':
        await this.updateMessageStatus(event.data);
        break;
      case 'connection.update':
        await this.updateConnectionStatus(event.data);
        break;
      default:
        console.warn(`Unknown webhook event type: ${event.type}`);
    }
  }
}
```

### **B. Database Schema Specifications**

#### **1. Message Management Tables**
```sql
-- Conversations table for tracking patient communications
CREATE TABLE message_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID REFERENCES patients(id),
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('whatsapp', 'sms', 'voice', 'email')),
  channel_identifier VARCHAR(100) NOT NULL, -- Phone number, email, etc.
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, channel_type, channel_identifier)
);

-- Messages table for individual message tracking
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES message_conversations(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'template', 'media', 'interactive')),
  template_id UUID REFERENCES message_templates(id),
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'rejected')
  ),
  external_id VARCHAR(100), -- Provider message ID
  error_code VARCHAR(50),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_messages_conversation_created (conversation_id, created_at),
  INDEX idx_messages_external_id (external_id),
  INDEX idx_messages_status_created (delivery_status, created_at)
);

-- Channel instances for provider management
CREATE TABLE channel_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  channel_type VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'twilio', 'meta', '360dialog'
  provider_config JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'inactive' CHECK (
    status IN ('inactive', 'connecting', 'connected', 'disconnected', 'error')
  ),
  health_status VARCHAR(20) DEFAULT 'unknown' CHECK (
    health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')
  ),
  last_health_check TIMESTAMP WITH TIME ZONE,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, channel_type, provider)
);

-- Message templates for WhatsApp Business API
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'appointment', 'reminder', 'confirmation'
  language VARCHAR(10) DEFAULT 'es',
  template_content JSONB NOT NULL,
  provider_template_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'disabled')
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, name, language)
);
```

#### **2. Monitoring and Analytics Tables**
```sql
-- System health monitoring
CREATE TABLE system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(50) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'response_time', 'error_rate', 'throughput'
  metric_value DECIMAL(10,4) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  INDEX idx_health_metrics_service_time (service_name, timestamp),
  INDEX idx_health_metrics_type_time (metric_type, timestamp)
);

-- Circuit breaker events
CREATE TABLE circuit_breaker_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(50) NOT NULL,
  event_type VARCHAR(20) NOT NULL, -- 'opened', 'closed', 'half_open'
  failure_count INTEGER,
  error_details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_circuit_breaker_service_time (service_name, timestamp)
);

-- Webhook processing logs
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id VARCHAR(100),
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  processing_time_ms INTEGER,
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'timeout'
  error_message TEXT,
  payload_hash VARCHAR(64), -- SHA-256 hash for deduplication
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_webhook_logs_provider_time (provider, timestamp),
  INDEX idx_webhook_logs_status_time (status, timestamp),
  UNIQUE(payload_hash) -- Prevent duplicate processing
);
```

### **C. API Endpoint Specifications**

#### **1. Message API Endpoints**
```typescript
// Send Message API
POST /api/v2/messages/send
Content-Type: application/json
Authorization: Bearer {token}

interface SendMessageRequest {
  conversationId?: string;
  recipient: {
    type: 'phone' | 'whatsapp_id';
    value: string;
  };
  message: {
    type: 'text' | 'template' | 'media';
    content: string | TemplateMessage | MediaMessage;
  };
  options?: {
    priority: 'low' | 'normal' | 'high';
    fallbackChannels: ('sms' | 'voice' | 'email')[];
    scheduledAt?: string; // ISO 8601 timestamp
  };
}

interface SendMessageResponse {
  messageId: string;
  conversationId: string;
  status: 'queued' | 'sent' | 'failed';
  estimatedDelivery?: string;
  fallbackUsed?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// Get Conversation API
GET /api/v2/conversations/{conversationId}
Authorization: Bearer {token}

interface ConversationResponse {
  id: string;
  patient: {
    id: string;
    name: string;
    phone: string;
  };
  channel: {
    type: string;
    identifier: string;
    status: string;
  };
  messages: Message[];
  metadata: {
    totalMessages: number;
    unreadCount: number;
    lastActivity: string;
  };
}
```

#### **2. Webhook Endpoints**
```typescript
// WhatsApp Webhook Handler
POST /api/v2/webhooks/whatsapp/{organizationId}
Content-Type: application/json
X-Webhook-Signature: {signature}

interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: IncomingMessage[];
        statuses?: MessageStatus[];
      };
      field: string;
    }>;
  }>;
}

// Health Check Endpoint
GET /api/v2/health
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      lastCheck: string;
      details?: string;
    };
  };
  metrics: {
    uptime: number;
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
  };
}
```

### **D. Monitoring and Alerting Specifications**

#### **1. Health Check Implementation**
```typescript
class HealthCheckService {
  async performHealthCheck(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkWhatsAppAPI(),
      this.checkCircuitBreaker(),
      this.checkMessageQueue(),
      this.checkWebhookEndpoint()
    ]);
    
    return this.aggregateHealthStatus(checks);
  }
  
  private async checkWhatsAppAPI(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      // Test API connectivity with a simple request
      await this.whatsappClient.getBusinessProfile();
      return {
        service: 'whatsapp_api',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'whatsapp_api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }
}
```

#### **2. Alerting Rules**
```yaml
# Alerting Configuration
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5% for 5 minutes"
    severity: "critical"
    channels: ["slack", "email", "pagerduty"]
    
  - name: "Circuit Breaker Opened"
    condition: "circuit_breaker_state = 'OPEN'"
    severity: "high"
    channels: ["slack", "email"]
    
  - name: "Webhook Processing Slow"
    condition: "webhook_response_time > 2000ms for 3 minutes"
    severity: "medium"
    channels: ["slack"]
    
  - name: "Message Delivery Failure"
    condition: "message_delivery_rate < 95% for 10 minutes"
    severity: "high"
    channels: ["slack", "email"]
```

---

## 🔄 **INTEGRATION TESTING FRAMEWORK**

### **A. Automated Testing Strategy**
```typescript
// Integration Test Suite
describe('WhatsApp Integration Tests', () => {
  beforeEach(async () => {
    await setupTestEnvironment();
    await seedTestData();
  });
  
  describe('Message Sending', () => {
    it('should send text message successfully', async () => {
      const response = await sendMessage({
        recipient: { type: 'phone', value: '+1234567890' },
        message: { type: 'text', content: 'Test message' }
      });
      
      expect(response.status).toBe('sent');
      expect(response.messageId).toBeDefined();
    });
    
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      mockWhatsAppAPI.mockRejectedValue(new Error('API Error'));
      
      const response = await sendMessage({
        recipient: { type: 'phone', value: '+1234567890' },
        message: { type: 'text', content: 'Test message' }
      });
      
      expect(response.status).toBe('failed');
      expect(response.error).toBeDefined();
    });
  });
  
  describe('Webhook Processing', () => {
    it('should process incoming message webhook', async () => {
      const webhookPayload = createMockWebhookPayload();
      const response = await processWebhook(webhookPayload);
      
      expect(response.status).toBe('success');
      expect(response.processedAt).toBeDefined();
    });
    
    it('should handle webhook processing within 2 seconds', async () => {
      const startTime = Date.now();
      const webhookPayload = createMockWebhookPayload();
      
      await processWebhook(webhookPayload);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(2000);
    });
  });
  
  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      // Simulate failures
      for (let i = 0; i < 5; i++) {
        await simulateAPIFailure();
      }
      
      const circuitState = await getCircuitBreakerState();
      expect(circuitState).toBe('OPEN');
    });
    
    it('should use fallback when circuit is open', async () => {
      await openCircuitBreaker();
      
      const response = await sendMessage({
        recipient: { type: 'phone', value: '+1234567890' },
        message: { type: 'text', content: 'Test message' },
        options: { fallbackChannels: ['sms'] }
      });
      
      expect(response.fallbackUsed).toBe('sms');
    });
  });
});
```

### **B. Load Testing Specifications**
```typescript
// Load Test Configuration
const loadTestConfig = {
  scenarios: {
    message_sending: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },
    webhook_processing: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 webhooks per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
    webhook_processing_time: ['p(99)<1000'], // 99% of webhooks under 1s
  },
};
```

---

**🎯 This technical architecture provides the foundation for a robust, scalable, and HIPAA-compliant WhatsApp integration that eliminates the infinite loop issues and provides enterprise-grade reliability.**
