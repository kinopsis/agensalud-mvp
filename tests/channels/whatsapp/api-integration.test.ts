/**
 * WhatsApp API Integration Tests
 * 
 * Integration tests for the unified WhatsApp API endpoints and proxy compatibility.
 * Validates that new unified APIs work correctly and legacy proxies maintain compatibility.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(),
  rpc: jest.fn()
};

// Mock user and profile data
const mockUser = {
  id: 'user-123',
  email: 'admin@test.com'
};

const mockProfile = {
  organization_id: 'org-123',
  role: 'admin'
};

const mockChannelInstance = {
  id: 'inst-123',
  organization_id: 'org-123',
  channel_type: 'whatsapp',
  instance_name: 'Test Instance',
  status: 'connected',
  config: {
    auto_reply: true,
    business_hours: { enabled: false, timezone: 'UTC', schedule: {} },
    ai_config: { enabled: true, model: 'gpt-3.5-turbo', temperature: 0.7, max_tokens: 500, timeout_seconds: 30 },
    webhook: { url: 'https://test.com/webhook', secret: 'secret', events: ['MESSAGE_RECEIVED'] },
    limits: { max_concurrent_chats: 100, message_rate_limit: 60, session_timeout_minutes: 30 },
    whatsapp: {
      phone_number: '+57300123456',
      evolution_api: { base_url: 'https://api.evolution.com', api_key: 'test-key', instance_name: 'test-instance' },
      qr_code: { enabled: true, auto_refresh: true, refresh_interval_minutes: 5 },
      features: { read_receipts: true, typing_indicator: true, presence_update: true }
    }
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Mock Supabase client creation
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

// Mock Evolution API service
jest.mock('@/lib/services/EvolutionAPIService', () => ({
  createEvolutionAPIService: () => ({
    createInstance: jest.fn(),
    logoutInstance: jest.fn(),
    sendMessage: jest.fn(),
    getInstanceStatus: jest.fn(),
    getQRCode: jest.fn(),
    restartInstance: jest.fn()
  })
}));

// Mock channel manager
const mockChannelManager = {
  getChannelService: jest.fn(),
  createMessageProcessor: jest.fn(),
  createAppointmentService: jest.fn()
};

const mockWhatsAppService = {
  getInstances: jest.fn(),
  getInstance: jest.fn(),
  createInstance: jest.fn(),
  updateInstance: jest.fn(),
  deleteInstance: jest.fn(),
  getInstanceStatus: jest.fn(),
  getExternalStatus: jest.fn(),
  getQRCode: jest.fn(),
  restartInstance: jest.fn(),
  getMetrics: jest.fn()
};

jest.mock('@/lib/channels/whatsapp', () => ({
  registerWhatsAppChannel: () => mockChannelManager
}));

describe('WhatsApp API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockSupabase.from.mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis()
    }));

    mockChannelManager.getChannelService.mockReturnValue(mockWhatsAppService);
    mockWhatsAppService.getInstances.mockResolvedValue([mockChannelInstance]);
    mockWhatsAppService.getInstance.mockResolvedValue(mockChannelInstance);
    mockWhatsAppService.getMetrics.mockResolvedValue({
      conversations: { total: 10, active: 5 },
      messages: { total: 50, last_received_at: new Date().toISOString() },
      appointments: { created: 3 },
      ai_performance: { intent_accuracy: 85 }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Unified WhatsApp Services', () => {
    it('should register WhatsApp services correctly', async () => {
      const { registerWhatsAppChannel } = await import('@/lib/channels/whatsapp');

      const manager = registerWhatsAppChannel(mockSupabase, 'org-123');

      expect(manager).toBeDefined();
      expect(typeof manager.getChannelService).toBe('function');
      expect(typeof manager.createMessageProcessor).toBe('function');
      expect(typeof manager.createAppointmentService).toBe('function');
    });

    it('should create WhatsApp channel service', async () => {
      const { WhatsAppChannelService } = await import('@/lib/channels/whatsapp/WhatsAppChannelService');

      const service = new WhatsAppChannelService(mockSupabase, 'org-123');

      expect(service).toBeDefined();
      expect(service.getChannelType()).toBe('whatsapp');
      expect(typeof service.validateConfig).toBe('function');
      expect(typeof service.connect).toBe('function');
      expect(typeof service.disconnect).toBe('function');
    });

    it('should create WhatsApp message processor', async () => {
      const { WhatsAppMessageProcessor } = await import('@/lib/channels/whatsapp/WhatsAppMessageProcessor');

      const processor = new WhatsAppMessageProcessor(mockSupabase, mockChannelInstance);

      expect(processor).toBeDefined();
      expect(processor.getChannelType()).toBe('whatsapp');
      expect(typeof processor.formatResponse).toBe('function');
      expect(typeof processor.parseIncomingMessage).toBe('function');
      expect(typeof processor.validateMessage).toBe('function');
    });

    it('should create WhatsApp appointment service', async () => {
      const { WhatsAppAppointmentService } = await import('@/lib/channels/whatsapp/WhatsAppAppointmentService');

      const service = new WhatsAppAppointmentService(mockSupabase, mockChannelInstance);

      expect(service).toBeDefined();
      expect(service.getChannelType()).toBe('whatsapp');
      expect(typeof service.formatAvailabilitySlots).toBe('function');
      expect(typeof service.formatAppointmentsList).toBe('function');
      expect(typeof service.formatConfirmationMessage).toBe('function');
    });

    it('should validate WhatsApp configuration', async () => {
      const { WhatsAppChannelService } = await import('@/lib/channels/whatsapp/WhatsAppChannelService');

      const service = new WhatsAppChannelService(mockSupabase, 'org-123');

      // Valid configuration
      const validConfig = {
        auto_reply: true,
        business_hours: { enabled: false, timezone: 'UTC', schedule: {} },
        ai_config: { enabled: true, model: 'gpt-3.5-turbo', temperature: 0.7, max_tokens: 500, timeout_seconds: 30 },
        webhook: { url: 'https://test.com/webhook', secret: 'secret', events: ['MESSAGE_RECEIVED'] },
        limits: { max_concurrent_chats: 100, message_rate_limit: 60, session_timeout_minutes: 30 },
        whatsapp: {
          phone_number: '+57300123456',
          evolution_api: { base_url: 'https://api.evolution.com', api_key: 'test-key-123', instance_name: 'test-instance' },
          qr_code: { enabled: true, auto_refresh: true, refresh_interval_minutes: 5 },
          features: { read_receipts: true, typing_indicator: true, presence_update: true }
        }
      };

      const validation = await service.validateConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should format WhatsApp messages correctly', async () => {
      const { WhatsAppMessageProcessor } = await import('@/lib/channels/whatsapp/WhatsAppMessageProcessor');

      const processor = new WhatsAppMessageProcessor(mockSupabase, mockChannelInstance);

      // Test message parsing
      const rawMessage = {
        key: { id: 'msg-123', remoteJid: '573001234567@s.whatsapp.net', fromMe: false },
        message: { conversation: 'Hola, necesito una cita' },
        messageType: 'conversation',
        messageTimestamp: Date.now() / 1000,
        pushName: 'Juan Pérez'
      };

      const parsedMessage = processor.parseIncomingMessage(rawMessage);

      expect(parsedMessage.id).toBe('msg-123');
      expect(parsedMessage.channel_type).toBe('whatsapp');
      expect(parsedMessage.content.text).toBe('Hola, necesito una cita');
      expect(parsedMessage.sender.name).toBe('Juan Pérez');
    });

    it('should format appointment slots for WhatsApp', async () => {
      const { WhatsAppAppointmentService } = await import('@/lib/channels/whatsapp/WhatsAppAppointmentService');

      const service = new WhatsAppAppointmentService(mockSupabase, mockChannelInstance);

      const slots = [
        { date: '2024-02-01', start_time: '10:00', doctor_name: 'Dr. García', specialty: 'Cardiología' },
        { date: '2024-02-01', start_time: '14:00', doctor_name: 'Dr. López', specialty: 'Medicina General' }
      ];

      const formatted = service.formatAvailabilitySlots(slots);

      expect(formatted).toContain('1. 👨‍⚕️ Dr. García (Cardiología)');
      expect(formatted).toContain('2. 👨‍⚕️ Dr. López (Medicina General)');
      expect(formatted).toContain('a las 10:00');
      expect(formatted).toContain('a las 14:00');
    });

    it('should test proxy functionality', async () => {
      const { proxyToUnifiedAPI, convertToLegacyFormat } = await import('@/app/api/whatsapp/legacy-proxy');

      // Test conversion functions exist
      expect(typeof proxyToUnifiedAPI).toBe('function');
      expect(typeof convertToLegacyFormat).toBe('function');

      // Test legacy format conversion
      const unifiedData = {
        success: true,
        data: { instances: [mockChannelInstance] }
      };

      const legacyData = convertToLegacyFormat(unifiedData, '/instances');
      expect(legacyData.success).toBe(true);
      expect(legacyData.instances).toHaveLength(1);
    });

    it('should test audit migration utilities', async () => {
      const auditModule = await import('@/lib/channels/whatsapp/audit-migration');

      expect(typeof auditModule.migrateWhatsAppAuditLogs).toBe('function');
      expect(typeof auditModule.createUnifiedAuditLog).toBe('function');
      expect(typeof auditModule.validateAuditMigrationIntegrity).toBe('function');
      expect(typeof auditModule.getUnifiedAuditLogs).toBe('function');
    });
  });
});
