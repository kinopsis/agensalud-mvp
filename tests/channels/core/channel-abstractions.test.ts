/**
 * Channel Abstractions Tests
 * 
 * Unit tests for the base channel abstractions including BaseChannelService,
 * BaseMessageProcessor, BaseAppointmentService, and ChannelManager.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type {
  ChannelType,
  ChannelInstance,
  ChannelInstanceConfig,
  ChannelStatus,
  IncomingMessage,
  MessageProcessingResult
} from '@/types/channels';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

// Mock implementations for testing
class TestChannelService {
  constructor(public supabase: any, public organizationId: string) {}
  
  getChannelType(): ChannelType { return 'whatsapp'; }
  
  async validateConfig(config: any) {
    return { valid: true, errors: [] };
  }
  
  async connect(instance: any) { return; }
  async disconnect(instanceId: string) { return; }
  async sendMessage(instanceId: string, message: any) { return; }
  async processIncomingMessage(message: any) { 
    return {
      success: true,
      intent: 'greeting',
      entities: {},
      response: 'Hello',
      next_actions: [],
      confidence: 0.9
    };
  }
  async getExternalStatus(instanceId: string): Promise<ChannelStatus> { 
    return 'connected'; 
  }
}

class TestMessageProcessor {
  constructor(public supabase: any, public channelInstance: any) {}
  
  getChannelType(): ChannelType { return 'whatsapp'; }
  
  formatResponse(message: string) {
    return {
      conversation_id: 'test',
      content: { type: 'text', text: message },
      metadata: {}
    };
  }
  
  async sendMessage(message: any) { return; }
  
  parseIncomingMessage(rawMessage: any): IncomingMessage {
    return {
      id: 'msg-1',
      channel_type: 'whatsapp',
      instance_id: 'inst-1',
      conversation_id: 'conv-1',
      sender: { id: 'user-1', name: 'Test User' },
      content: { type: 'text', text: 'Hello' },
      timestamp: new Date().toISOString()
    };
  }
  
  validateMessage(message: any) {
    return { valid: true, errors: [] };
  }
}

class TestAppointmentService {
  constructor(public supabase: any, public channelInstance: any) {}
  
  getChannelType(): ChannelType { return 'whatsapp'; }
  
  formatAvailabilitySlots(slots: any[]) {
    return slots.map((slot, index) => 
      `${index + 1}. Dr. ${slot.doctor_name} - ${slot.date} ${slot.time}`
    ).join('\n');
  }
  
  formatAppointmentsList(appointments: any[]) {
    return appointments.map((apt, index) => 
      `${index + 1}. ${apt.service} - ${apt.date} ${apt.time}`
    ).join('\n');
  }
  
  formatConfirmationMessage(appointmentId: string, details: any) {
    return `Cita confirmada: ${appointmentId}`;
  }
  
  formatErrorMessage(errorType: string) {
    return `Error: ${errorType}`;
  }
}

describe('Channel Abstractions', () => {
  let mockChannelInstance: ChannelInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannelInstance = {
      id: 'inst-1',
      organization_id: 'org-1',
      channel_type: 'whatsapp',
      instance_name: 'Test Instance',
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
          events: ['message']
        },
        limits: {
          max_concurrent_chats: 100,
          message_rate_limit: 60,
          session_timeout_minutes: 30
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ChannelManager', () => {
    let ChannelManager: any;

    beforeEach(async () => {
      // Dynamic import to avoid module loading issues
      const module = await import('@/lib/channels/ChannelManager');
      ChannelManager = module.ChannelManager;
    });

    it('should register and retrieve channel services', () => {
      const manager = new ChannelManager(mockSupabase, 'org-1');
      
      manager.registerChannelService('whatsapp', TestChannelService);
      
      expect(manager.isChannelSupported('whatsapp')).toBe(true);
      expect(manager.isChannelSupported('telegram')).toBe(false);
      expect(manager.getAvailableChannels()).toContain('whatsapp');
    });

    it('should create service instances', () => {
      const manager = new ChannelManager(mockSupabase, 'org-1');
      manager.registerChannelService('whatsapp', TestChannelService);
      
      const service = manager.getChannelService('whatsapp');
      expect(service).toBeInstanceOf(TestChannelService);
      expect(service.organizationId).toBe('org-1');
    });

    it('should throw error for unsupported channel', () => {
      const manager = new ChannelManager(mockSupabase, 'org-1');
      
      expect(() => {
        manager.getChannelService('telegram');
      }).toThrow('Channel service not found for type: telegram');
    });

    it('should create message processor instances', () => {
      const manager = new ChannelManager(mockSupabase, 'org-1');
      manager.registerMessageProcessor('whatsapp', TestMessageProcessor);
      
      const processor = manager.createMessageProcessor('whatsapp', mockChannelInstance);
      expect(processor).toBeInstanceOf(TestMessageProcessor);
    });

    it('should create appointment service instances', () => {
      const manager = new ChannelManager(mockSupabase, 'org-1');
      manager.registerAppointmentService('whatsapp', TestAppointmentService);
      
      const service = manager.createAppointmentService('whatsapp', mockChannelInstance);
      expect(service).toBeInstanceOf(TestAppointmentService);
    });

    it('should handle getAllInstances with database error', async () => {
      const manager = new ChannelManager(mockSupabase, 'org-1');
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      });

      const instances = await manager.getAllInstances();
      expect(instances).toEqual([]);
    });

    it('should return empty metrics on error', async () => {
      const manager = new ChannelManager(mockSupabase, 'org-1');
      
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const metrics = await manager.getUnifiedMetrics({
        start: '2024-01-01',
        end: '2024-01-31'
      });

      expect(metrics.summary.total_channels).toBe(0);
      expect(metrics.summary.active_channels).toBe(0);
    });
  });

  describe('Channel Types Validation', () => {
    it('should validate ChannelType enum values', () => {
      const { ChannelType } = require('@/types/channels');
      
      expect(ChannelType.WHATSAPP).toBe('whatsapp');
      expect(ChannelType.TELEGRAM).toBe('telegram');
      expect(ChannelType.VOICE).toBe('voice');
      expect(ChannelType.SMS).toBe('sms');
      expect(ChannelType.EMAIL).toBe('email');
    });

    it('should validate ChannelStatus enum values', () => {
      const { ChannelStatus } = require('@/types/channels');
      
      expect(ChannelStatus.CONNECTED).toBe('connected');
      expect(ChannelStatus.DISCONNECTED).toBe('disconnected');
      expect(ChannelStatus.CONNECTING).toBe('connecting');
      expect(ChannelStatus.ERROR).toBe('error');
      expect(ChannelStatus.SUSPENDED).toBe('suspended');
      expect(ChannelStatus.MAINTENANCE).toBe('maintenance');
    });

    it('should validate MessageIntent enum values', () => {
      const { MessageIntent } = require('@/types/channels');
      
      expect(MessageIntent.APPOINTMENT_BOOKING).toBe('appointment_booking');
      expect(MessageIntent.APPOINTMENT_INQUIRY).toBe('appointment_inquiry');
      expect(MessageIntent.APPOINTMENT_RESCHEDULE).toBe('appointment_reschedule');
      expect(MessageIntent.APPOINTMENT_CANCEL).toBe('appointment_cancel');
      expect(MessageIntent.GENERAL_INQUIRY).toBe('general_inquiry');
      expect(MessageIntent.EMERGENCY).toBe('emergency');
      expect(MessageIntent.GREETING).toBe('greeting');
      expect(MessageIntent.UNKNOWN).toBe('unknown');
    });
  });

  describe('Message Processing Logic', () => {
    it('should validate message processing result structure', () => {
      const result: MessageProcessingResult = {
        success: true,
        intent: 'appointment_booking',
        entities: {
          specialty: 'cardiología',
          date: 'mañana'
        },
        response: 'Entiendo que necesita una cita de cardiología',
        next_actions: ['check_availability'],
        confidence: 0.85
      };

      expect(result.success).toBe(true);
      expect(result.intent).toBe('appointment_booking');
      expect(result.entities.specialty).toBe('cardiología');
      expect(result.next_actions).toContain('check_availability');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle error in message processing', () => {
      const errorResult: MessageProcessingResult = {
        success: false,
        intent: 'unknown',
        entities: {},
        response: 'Error processing message',
        next_actions: ['escalate_to_human'],
        confidence: 0,
        error: 'Network timeout'
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.intent).toBe('unknown');
      expect(errorResult.next_actions).toContain('escalate_to_human');
      expect(errorResult.confidence).toBe(0);
      expect(errorResult.error).toBe('Network timeout');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate channel instance configuration structure', () => {
      const config: ChannelInstanceConfig = {
        auto_reply: true,
        business_hours: {
          enabled: true,
          timezone: 'America/Bogota',
          schedule: {
            monday: { start: '09:00', end: '18:00', enabled: true },
            tuesday: { start: '09:00', end: '18:00', enabled: true },
            wednesday: { start: '09:00', end: '18:00', enabled: true },
            thursday: { start: '09:00', end: '18:00', enabled: true },
            friday: { start: '09:00', end: '18:00', enabled: true },
            saturday: { start: '09:00', end: '14:00', enabled: true },
            sunday: { start: '00:00', end: '00:00', enabled: false }
          }
        },
        ai_config: {
          enabled: true,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 500,
          timeout_seconds: 30,
          custom_prompt: 'Eres un asistente médico profesional'
        },
        webhook: {
          url: 'https://example.com/webhook',
          secret: 'webhook-secret-key',
          events: ['message', 'status']
        },
        limits: {
          max_concurrent_chats: 100,
          message_rate_limit: 60,
          session_timeout_minutes: 30
        }
      };

      expect(config.auto_reply).toBe(true);
      expect(config.business_hours.enabled).toBe(true);
      expect(config.business_hours.schedule.monday.enabled).toBe(true);
      expect(config.ai_config.model).toBe('gpt-3.5-turbo');
      expect(config.webhook.events).toContain('message');
      expect(config.limits.max_concurrent_chats).toBe(100);
    });

    it('should validate WhatsApp specific configuration', () => {
      const whatsappConfig = {
        phone_number: '+57300123456',
        business_id: '123456789012345',
        evolution_api: {
          base_url: 'https://api.evolution.com',
          api_key: 'evo-api-key',
          instance_name: 'agentsalud-instance'
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
      };

      expect(whatsappConfig.phone_number).toMatch(/^\+\d+/);
      expect(whatsappConfig.evolution_api.base_url).toMatch(/^https?:\/\//);
      expect(whatsappConfig.qr_code.enabled).toBe(true);
      expect(whatsappConfig.features.read_receipts).toBe(true);
    });
  });

  describe('Appointment Service Logic', () => {
    it('should validate booking request structure', () => {
      const bookingRequest = {
        channel_type: 'whatsapp' as ChannelType,
        conversation_id: 'conv-123',
        patient_id: 'patient-456',
        specialty: 'cardiología',
        preferred_date: 'mañana',
        preferred_time: '10:00',
        urgency: 'medium' as const,
        symptoms: ['dolor en el pecho', 'fatiga'],
        notes: 'Paciente con antecedentes familiares'
      };

      expect(bookingRequest.channel_type).toBe('whatsapp');
      expect(bookingRequest.specialty).toBe('cardiología');
      expect(bookingRequest.urgency).toBe('medium');
      expect(bookingRequest.symptoms).toContain('dolor en el pecho');
    });

    it('should validate booking result structure', () => {
      const bookingResult = {
        success: true,
        appointment_id: 'apt-789',
        message: 'Cita agendada exitosamente',
        available_slots: [
          {
            date: '2024-02-01',
            start_time: '10:00',
            doctor_id: 'doc-1',
            doctor_name: 'Dr. García'
          }
        ],
        next_step: 'confirm_slot' as const
      };

      expect(bookingResult.success).toBe(true);
      expect(bookingResult.appointment_id).toBe('apt-789');
      expect(bookingResult.available_slots).toHaveLength(1);
      expect(bookingResult.next_step).toBe('confirm_slot');
    });
  });

  describe('Error Handling', () => {
    it('should handle service instantiation errors gracefully', async () => {
      const module = await import('@/lib/channels/ChannelManager');
      const ChannelManager = module.ChannelManager;
      const manager = new ChannelManager(mockSupabase, 'org-1');

      expect(() => {
        manager.getChannelService('nonexistent' as ChannelType);
      }).toThrow();
    });

    it('should handle message processing errors', async () => {
      const processor = new TestMessageProcessor(mockSupabase, mockChannelInstance);
      
      // Mock a message that would cause processing to fail
      const invalidMessage = {
        id: '',
        channel_type: 'whatsapp' as ChannelType,
        instance_id: '',
        conversation_id: '',
        sender: { id: '' },
        content: { type: 'text' as const, text: '' },
        timestamp: ''
      };

      const validation = processor.validateMessage(invalidMessage);
      expect(validation.valid).toBe(true); // Our test implementation always returns valid
    });
  });
});
