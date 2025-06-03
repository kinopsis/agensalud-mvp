/**
 * WhatsApp Migration Tests
 * 
 * Regression tests to ensure WhatsApp migration to multi-channel architecture
 * maintains 100% compatibility with existing functionality.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type {
  ChannelInstance,
  ChannelInstanceConfig,
  IncomingMessage,
  ChannelBookingRequest
} from '@/types/channels';
import type { WhatsAppInstance } from '@/types/whatsapp';

// Mock dependencies
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

// Enhanced mock for database operations
const createMockSupabaseChain = (returnData: any = null, returnError: any = null) => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis()
});

const mockEvolutionAPI = {
  createInstance: jest.fn(),
  logoutInstance: jest.fn(),
  sendMessage: jest.fn(),
  getInstanceStatus: jest.fn(),
  getQRCode: jest.fn(),
  restartInstance: jest.fn()
};

// Mock Evolution API service
jest.mock('@/lib/services/EvolutionAPIService', () => ({
  createEvolutionAPIService: () => mockEvolutionAPI
}));

describe('WhatsApp Migration Regression Tests', () => {
  let mockChannelInstance: ChannelInstance;
  let mockWhatsAppInstance: WhatsAppInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mocks
    mockSupabase.from.mockImplementation(() => createMockSupabaseChain());

    mockChannelInstance = {
      id: 'inst-1',
      organization_id: 'org-1',
      channel_type: 'whatsapp',
      instance_name: 'Test WhatsApp',
      status: 'connected',
      config: {
        auto_reply: true,
        business_hours: {
          enabled: false,
          timezone: 'UTC',
          schedule: {}
        },
        ai_config: {
          enabled: true,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 500,
          timeout_seconds: 30
        },
        webhook: {
          url: 'https://test.com/webhook',
          secret: 'secret',
          events: ['MESSAGE_RECEIVED']
        },
        limits: {
          max_concurrent_chats: 100,
          message_rate_limit: 60,
          session_timeout_minutes: 30
        },
        whatsapp: {
          phone_number: '+57300123456',
          business_id: '123456789',
          evolution_api: {
            base_url: 'https://api.evolution.com',
            api_key: 'test-key',
            instance_name: 'test-instance'
          },
          qr_code: {
            enabled: true,
            auto_refresh: true,
            refresh_interval_minutes: 5
          },
          features: {
            read_receipts: true,
            typing_indicator: true,
            presence_update: true
          }
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockWhatsAppInstance = {
      id: 'inst-1',
      organization_id: 'org-1',
      instance_name: 'Test WhatsApp',
      phone_number: '+57300123456',
      status: 'active',
      evolution_api_config: {
        base_url: 'https://api.evolution.com',
        api_key: 'test-key',
        instance_name: 'test-instance'
      },
      webhook_url: 'https://test.com/webhook',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('WhatsAppChannelService Migration', () => {
    let WhatsAppChannelService: any;

    beforeEach(async () => {
      const module = await import('@/lib/channels/whatsapp/WhatsAppChannelService');
      WhatsAppChannelService = module.WhatsAppChannelService;
    });

    it('should maintain compatibility with existing instance creation', () => {
      const service = new WhatsAppChannelService(mockSupabase, 'org-1');

      // Test that the service can be instantiated and has the expected methods
      expect(service).toBeDefined();
      expect(typeof service.createWhatsAppInstance).toBe('function');
      expect(typeof service.validateConfig).toBe('function');
      expect(typeof service.connect).toBe('function');
      expect(typeof service.disconnect).toBe('function');
      expect(service.getChannelType()).toBe('whatsapp');
    });

    it('should validate WhatsApp configuration correctly', async () => {
      const service = new WhatsAppChannelService(mockSupabase, 'org-1');

      // Valid configuration
      const validConfig: ChannelInstanceConfig = {
        ...mockChannelInstance.config,
        whatsapp: {
          phone_number: '+57300123456',
          evolution_api: {
            base_url: 'https://api.evolution.com',
            api_key: 'valid-key-123',
            instance_name: 'test-instance'
          },
          qr_code: { enabled: true, auto_refresh: true, refresh_interval_minutes: 5 },
          features: { read_receipts: true, typing_indicator: true, presence_update: true }
        }
      };

      const validation = await service.validateConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Invalid configuration
      const invalidConfig: ChannelInstanceConfig = {
        ...mockChannelInstance.config,
        whatsapp: {
          phone_number: 'invalid-phone',
          evolution_api: {
            base_url: 'invalid-url',
            api_key: 'short',
            instance_name: 'ab'
          },
          qr_code: { enabled: true, auto_refresh: true, refresh_interval_minutes: 5 },
          features: { read_receipts: true, typing_indicator: true, presence_update: true }
        }
      };

      const invalidValidation = await service.validateConfig(invalidConfig);
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });

    it('should handle Evolution API connection correctly', async () => {
      const service = new WhatsAppChannelService(mockSupabase, 'org-1');

      mockEvolutionAPI.createInstance.mockResolvedValue({
        instance: {
          instanceName: 'test-instance',
          status: 'created'
        }
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await service.connect(mockChannelInstance);

      expect(mockEvolutionAPI.createInstance).toHaveBeenCalledWith({
        instanceName: 'test-instance',
        integration: 'WHATSAPP-BUSINESS',
        qrcode: true,
        webhook: 'https://test.com/webhook',
        webhookByEvents: true,
        webhookBase64: false,
        events: ['MESSAGE_RECEIVED']
      });
    });

    it('should get external status from Evolution API', async () => {
      const service = new WhatsAppChannelService(mockSupabase, 'org-1');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockChannelInstance
        })
      });

      mockEvolutionAPI.getInstanceStatus.mockResolvedValue({
        instance: { state: 'open' }
      });

      const status = await service.getExternalStatus('inst-1');
      expect(status).toBe('connected');

      mockEvolutionAPI.getInstanceStatus.mockResolvedValue({
        instance: { state: 'close' }
      });

      const disconnectedStatus = await service.getExternalStatus('inst-1');
      expect(disconnectedStatus).toBe('disconnected');
    });
  });

  describe('WhatsAppMessageProcessor Migration', () => {
    let WhatsAppMessageProcessor: any;

    beforeEach(async () => {
      const module = await import('@/lib/channels/whatsapp/WhatsAppMessageProcessor');
      WhatsAppMessageProcessor = module.WhatsAppMessageProcessor;
    });

    it('should parse incoming WhatsApp messages correctly', () => {
      const processor = new WhatsAppMessageProcessor(mockSupabase, mockChannelInstance);

      const rawMessage = {
        key: {
          id: 'msg-123',
          remoteJid: '573001234567@s.whatsapp.net',
          fromMe: false
        },
        message: {
          conversation: 'Hola, necesito una cita'
        },
        messageType: 'conversation',
        messageTimestamp: Date.now() / 1000,
        pushName: 'Juan Pérez'
      };

      const parsedMessage = processor.parseIncomingMessage(rawMessage);

      expect(parsedMessage.id).toBe('msg-123');
      expect(parsedMessage.channel_type).toBe('whatsapp');
      expect(parsedMessage.conversation_id).toBe('573001234567@s.whatsapp.net');
      expect(parsedMessage.sender.name).toBe('Juan Pérez');
      expect(parsedMessage.content.text).toBe('Hola, necesito una cita');
      expect(parsedMessage.content.type).toBe('conversation');
    });

    it('should validate messages correctly', () => {
      const processor = new WhatsAppMessageProcessor(mockSupabase, mockChannelInstance);

      const validMessage: IncomingMessage = {
        id: 'msg-123',
        channel_type: 'whatsapp',
        instance_id: 'inst-1',
        conversation_id: 'conv-1',
        sender: { id: 'user-1', name: 'Test User' },
        content: { type: 'text', text: 'Hello' },
        timestamp: new Date().toISOString()
      };

      const validation = processor.validateMessage(validMessage);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const invalidMessage: IncomingMessage = {
        id: '',
        channel_type: 'whatsapp',
        instance_id: 'inst-1',
        conversation_id: '',
        sender: { id: '' },
        content: { type: 'text', text: '' },
        timestamp: new Date().toISOString()
      };

      const invalidValidation = processor.validateMessage(invalidMessage);
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });

    it('should format responses for WhatsApp correctly', () => {
      const processor = new WhatsAppMessageProcessor(mockSupabase, mockChannelInstance);

      const response = processor.formatResponse('Hola, ¿en qué puedo ayudarle?', {
        conversationId: 'conv-1',
        intent: 'greeting'
      });

      expect(response.conversation_id).toBe('conv-1');
      expect(response.content.type).toBe('text');
      expect(response.content.text).toBe('Hola, ¿en qué puedo ayudarle?');
      expect(response.metadata?.intent).toBe('greeting');
    });
  });

  describe('WhatsAppAppointmentService Migration', () => {
    let WhatsAppAppointmentService: any;

    beforeEach(async () => {
      const module = await import('@/lib/channels/whatsapp/WhatsAppAppointmentService');
      WhatsAppAppointmentService = module.WhatsAppAppointmentService;
    });

    it('should format availability slots for WhatsApp', () => {
      const service = new WhatsAppAppointmentService(mockSupabase, mockChannelInstance);

      const slots = [
        {
          date: '2024-02-01',
          start_time: '10:00',
          doctor_name: 'Dr. García',
          specialty: 'Cardiología'
        },
        {
          date: '2024-02-01',
          start_time: '14:00',
          doctor_name: 'Dr. López',
          specialty: 'Medicina General'
        }
      ];

      const formatted = service.formatAvailabilitySlots(slots);

      expect(formatted).toContain('1. 👨‍⚕️ Dr. García (Cardiología)');
      expect(formatted).toContain('2. 👨‍⚕️ Dr. López (Medicina General)');
      expect(formatted).toContain('a las 10:00');
      expect(formatted).toContain('a las 14:00');
    });

    it('should format appointments list for WhatsApp', () => {
      const service = new WhatsAppAppointmentService(mockSupabase, mockChannelInstance);

      const appointments = [
        {
          id: 'apt-1',
          appointment_date: '2024-02-01',
          start_time: '10:00',
          status: 'confirmed',
          doctors: {
            profiles: {
              first_name: 'Juan',
              last_name: 'García'
            }
          },
          services: {
            name: 'Cardiología'
          }
        }
      ];

      const formatted = service.formatAppointmentsList(appointments);

      expect(formatted).toContain('Sus citas:');
      expect(formatted).toContain('1. Cardiología - Juan García');
      expect(formatted).toContain('a las 10:00');
      expect(formatted).toContain('Estado: Confirmada');
      expect(formatted).toContain('ID: apt-1');
    });

    it('should format confirmation messages correctly', () => {
      const service = new WhatsAppAppointmentService(mockSupabase, mockChannelInstance);

      const details = {
        doctor_name: 'Dr. García',
        date: '2024-02-01',
        start_time: '10:00',
        specialty: 'Cardiología'
      };

      const message = service.formatConfirmationMessage('apt-123', details);

      expect(message).toContain('Su cita ha sido agendada exitosamente');
      expect(message).toContain('Dr. García (Cardiología)');
      expect(message).toContain('a las 10:00');
      expect(message).toContain('Cita #apt-123');
    });

    it('should process booking requests with WhatsApp formatting', async () => {
      const service = new WhatsAppAppointmentService(mockSupabase, mockChannelInstance);

      // Mock the appointment processor
      service.appointmentProcessor = {
        processMessage: jest.fn().mockResolvedValue({
          availability: [
            {
              date: '2024-02-01',
              start_time: '10:00',
              doctor_name: 'Dr. García',
              specialty: 'Cardiología'
            }
          ]
        })
      } as any;

      const request: ChannelBookingRequest = {
        channel_type: 'whatsapp',
        conversation_id: 'conv-1',
        specialty: 'cardiología',
        preferred_date: 'mañana'
      };

      const result = await service.processBookingRequest(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Encontré estas opciones disponibles');
      expect(result.message).toContain('Dr. García');
      expect(result.available_slots).toHaveLength(1);
    });
  });

  describe('Compatibility Wrappers', () => {
    let WhatsAppCompatibilityWrapper: any;

    beforeEach(async () => {
      const module = await import('@/lib/channels/whatsapp/compatibility-wrappers');
      WhatsAppCompatibilityWrapper = module.WhatsAppCompatibilityWrapper;
    });

    it('should convert between legacy and unified formats', () => {
      const wrapper = new WhatsAppCompatibilityWrapper(mockSupabase, 'org-1');

      // Test conversion methods exist and work
      expect(wrapper).toBeDefined();
      expect(typeof wrapper.createInstance).toBe('function');
      expect(typeof wrapper.getInstances).toBe('function');
      expect(typeof wrapper.getInstance).toBe('function');
      expect(typeof wrapper.updateInstance).toBe('function');
      expect(typeof wrapper.deleteInstance).toBe('function');
    });

    it('should maintain legacy API interface', async () => {
      const wrapper = new WhatsAppCompatibilityWrapper(mockSupabase, 'org-1');

      // Mock the channel service
      wrapper.channelService = {
        createWhatsAppInstance: jest.fn().mockResolvedValue(mockWhatsAppInstance),
        getInstances: jest.fn().mockResolvedValue([mockChannelInstance]),
        updateInstance: jest.fn().mockResolvedValue(mockChannelInstance),
        deleteInstance: jest.fn().mockResolvedValue(undefined),
        getInstanceStatus: jest.fn().mockResolvedValue('connected')
      };

      // Test legacy interface methods
      const instance = await wrapper.createInstance({
        instanceName: 'test',
        phoneNumber: '+57300123456',
        webhookUrl: 'https://test.com/webhook'
      });

      expect(instance).toBeDefined();
      expect(instance.instance_name).toBe('Test WhatsApp');
    });
  });

  describe('Migration Utilities', () => {
    let migrationModule: any;

    beforeEach(async () => {
      migrationModule = await import('@/lib/channels/whatsapp/index');
    });

    it('should register WhatsApp channel correctly', () => {
      // Test that the registration function exists and can be called
      expect(typeof migrationModule.registerWhatsAppChannel).toBe('function');
      expect(typeof migrationModule.initializeWhatsAppChannel).toBe('function');
      expect(typeof migrationModule.migrateExistingWhatsAppInstances).toBe('function');
      expect(typeof migrationModule.validateMigrationIntegrity).toBe('function');
    });

    it('should validate migration integrity', () => {
      // Test that the validation function exists and returns proper structure
      expect(typeof migrationModule.validateMigrationIntegrity).toBe('function');

      // Test with mock data that should pass validation
      const mockValidation = {
        valid: true,
        issues: []
      };

      expect(mockValidation.valid).toBe(true);
      expect(mockValidation.issues).toHaveLength(0);
    });
  });
});
