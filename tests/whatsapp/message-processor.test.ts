/**
 * WhatsApp Message Processor Tests
 * 
 * Unit tests for AI-powered message processing including intent detection,
 * entity extraction, and response generation.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WhatsAppMessageProcessor } from '@/lib/services/WhatsAppMessageProcessor';

// Mock dependencies
jest.mock('@ai-sdk/openai');
jest.mock('ai');
jest.mock('@/lib/services/EvolutionAPIService');

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

const mockEvolutionAPI = {
  sendMessage: jest.fn()
};

// Mock AI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
  generateText: jest.fn()
}));

jest.mock('@/lib/services/EvolutionAPIService', () => ({
  createEvolutionAPIService: jest.fn(() => mockEvolutionAPI)
}));

describe('WhatsAppMessageProcessor', () => {
  let processor: WhatsAppMessageProcessor;
  let mockWhatsAppInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables for Evolution API
    process.env.EVOLUTION_API_BASE_URL = 'http://localhost:8080';
    process.env.EVOLUTION_API_KEY = 'test-api-key';

    mockWhatsAppInstance = {
      id: 'instance-1',
      instance_name: 'test-instance',
      organization_id: 'org-1',
      evolution_api_config: {
        autoReply: true
      }
    };

    processor = new WhatsAppMessageProcessor(mockSupabase as any, mockWhatsAppInstance);
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.EVOLUTION_API_BASE_URL;
    delete process.env.EVOLUTION_API_KEY;
  });

  describe('processIncomingMessage', () => {
    it('should process appointment booking message successfully', async () => {
      // Mock AI response
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'appointment_booking',
          confidence: 0.9,
          entities: {
            specialty: 'cardiología',
            date: 'próxima semana',
            time: 'mañana'
          },
          suggestedResponse: 'Te ayudo a agendar una cita con cardiología.',
          nextActions: ['collect_patient_info', 'check_availability'],
          requiresHumanIntervention: false
        }
      });

      // Mock database operations
      const mockMessageQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      const mockConversationQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { content: 'Hola', direction: 'inbound', created_at: '2024-01-01T10:00:00Z' }
          ]
        })
      };

      const mockConversationByJidQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'conv-1' }
        })
      };

      const mockOutboundMessageQuery = {
        insert: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_messages') {
          return {
            ...mockMessageQuery,
            ...mockHistoryQuery,
            insert: mockOutboundMessageQuery.insert
          };
        }
        if (table === 'whatsapp_conversations') {
          return {
            ...mockConversationQuery,
            ...mockConversationByJidQuery
          };
        }
        return mockMessageQuery;
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });
      mockEvolutionAPI.sendMessage.mockResolvedValue({});

      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Necesito una cita con cardiología'
      };

      const mockConversation = {
        id: 'conv-1',
        contact_jid: '1234567890@s.whatsapp.net',
        context_data: {}
      };

      const result = await processor.processIncomingMessage(
        mockMessage as any,
        mockConversation as any,
        'Necesito una cita con cardiología'
      );

      expect(result.success).toBe(true);
      expect(result.intent).toBe('appointment_booking');
      expect(result.entities?.specialty).toBe('cardiología');
      expect(generateObject).toHaveBeenCalled();
      expect(mockEvolutionAPI.sendMessage).toHaveBeenCalledWith(
        'test-instance',
        {
          number: '1234567890',
          text: 'Te ayudo a agendar una cita con cardiología.'
        }
      );
    });

    it('should handle greeting messages', async () => {
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'greeting',
          confidence: 0.95,
          entities: {},
          suggestedResponse: '¡Hola! Soy el asistente virtual de AgentSalud.',
          nextActions: ['wait_for_request'],
          requiresHumanIntervention: false
        }
      });

      // Mock database operations
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        insert: jest.fn()
      };

      mockQuery.eq.mockResolvedValue({ error: null });
      mockQuery.limit.mockResolvedValue({ data: [] });
      mockQuery.single.mockResolvedValue({ data: { id: 'conv-1' } });
      mockQuery.insert.mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });
      mockEvolutionAPI.sendMessage.mockResolvedValue({});

      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Hola'
      };

      const mockConversation = {
        id: 'conv-1',
        contact_jid: '1234567890@s.whatsapp.net',
        context_data: {}
      };

      const result = await processor.processIncomingMessage(
        mockMessage as any,
        mockConversation as any,
        'Hola'
      );

      expect(result.success).toBe(true);
      expect(result.intent).toBe('greeting');
      expect(mockEvolutionAPI.sendMessage).toHaveBeenCalled();
    });

    it('should handle emergency messages with high priority', async () => {
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'emergency',
          confidence: 0.98,
          entities: {
            urgency: 'emergency',
            symptoms: ['chest pain', 'difficulty breathing']
          },
          suggestedResponse: '🚨 Si es una emergencia médica, llame al 911 inmediatamente.',
          nextActions: ['escalate_to_emergency'],
          requiresHumanIntervention: true
        }
      });

      // Mock database operations
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        insert: jest.fn()
      };

      mockQuery.eq.mockResolvedValue({ error: null });
      mockQuery.limit.mockResolvedValue({ data: [] });
      mockQuery.single.mockResolvedValue({ data: { id: 'conv-1' } });
      mockQuery.insert.mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });
      mockEvolutionAPI.sendMessage.mockResolvedValue({});

      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Tengo dolor en el pecho y no puedo respirar bien'
      };

      const mockConversation = {
        id: 'conv-1',
        contact_jid: '1234567890@s.whatsapp.net',
        context_data: {}
      };

      const result = await processor.processIncomingMessage(
        mockMessage as any,
        mockConversation as any,
        'Tengo dolor en el pecho y no puedo respirar bien'
      );

      expect(result.success).toBe(true);
      expect(result.intent).toBe('emergency');
      expect(result.entities?.urgency).toBe('emergency');
      expect(mockEvolutionAPI.sendMessage).toHaveBeenCalledWith(
        'test-instance',
        expect.objectContaining({
          text: expect.stringContaining('🚨')
        })
      );
    });

    it('should handle AI processing errors gracefully', async () => {
      const { generateObject } = require('ai');
      generateObject.mockRejectedValue(new Error('AI service unavailable'));

      // Mock database operations
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Test message'
      };

      const mockConversation = {
        id: 'conv-1',
        contact_jid: '1234567890@s.whatsapp.net',
        context_data: {}
      };

      const result = await processor.processIncomingMessage(
        mockMessage as any,
        mockConversation as any,
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service unavailable');
      
      // Should still mark message as processed
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          processed: true,
          ai_confidence: 0
        })
      );
    });

    it('should not send auto-reply when disabled', async () => {
      // Disable auto-reply
      mockWhatsAppInstance.evolution_api_config.autoReply = false;

      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'greeting',
          confidence: 0.95,
          entities: {},
          suggestedResponse: 'Hello!',
          nextActions: [],
          requiresHumanIntervention: false
        }
      });

      // Mock database operations
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis()
      };

      mockQuery.eq.mockResolvedValue({ error: null });
      mockQuery.limit.mockResolvedValue({ data: [] });

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Hola'
      };

      const mockConversation = {
        id: 'conv-1',
        contact_jid: '1234567890@s.whatsapp.net',
        context_data: {}
      };

      const result = await processor.processIncomingMessage(
        mockMessage as any,
        mockConversation as any,
        'Hola'
      );

      expect(result.success).toBe(true);
      expect(mockEvolutionAPI.sendMessage).not.toHaveBeenCalled();
    });

    it('should update conversation context with AI insights', async () => {
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'appointment_booking',
          confidence: 0.85,
          entities: {
            specialty: 'dermatología',
            urgency: 'medium'
          },
          suggestedResponse: 'Te ayudo con dermatología.',
          nextActions: ['check_availability'],
          requiresHumanIntervention: false
        }
      });

      // Mock database operations
      const mockMessageQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      const mockConversationQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [] })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_messages') {
          return { ...mockMessageQuery, ...mockHistoryQuery };
        }
        if (table === 'whatsapp_conversations') {
          return mockConversationQuery;
        }
        return mockMessageQuery;
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Necesito cita con dermatólogo'
      };

      const mockConversation = {
        id: 'conv-1',
        contact_jid: '1234567890@s.whatsapp.net',
        context_data: { previousIntent: 'greeting' }
      };

      await processor.processIncomingMessage(
        mockMessage as any,
        mockConversation as any,
        'Necesito cita con dermatólogo'
      );

      // Verify conversation context was updated
      expect(mockConversationQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          context_data: expect.objectContaining({
            lastIntent: 'appointment_booking',
            lastConfidence: 0.85,
            extractedEntities: expect.objectContaining({
              specialty: 'dermatología',
              urgency: 'medium'
            })
          })
        })
      );
    });
  });

  describe('AI Analysis', () => {
    it('should build comprehensive analysis prompt', async () => {
      const { generateObject } = require('ai');
      
      // Mock conversation history
      const mockHistoryQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { content: 'Hola', direction: 'inbound', created_at: '2024-01-01T10:00:00Z' },
            { content: '¡Hola! ¿En qué puedo ayudarte?', direction: 'outbound', created_at: '2024-01-01T10:01:00Z' }
          ]
        })
      };

      mockSupabase.from.mockReturnValue(mockHistoryQuery);

      generateObject.mockResolvedValue({
        object: {
          intent: 'appointment_booking',
          confidence: 0.9,
          entities: {},
          suggestedResponse: 'Response',
          nextActions: [],
          requiresHumanIntervention: false
        }
      });

      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        content: 'Necesito una cita'
      };

      const mockConversation = {
        id: 'conv-1',
        contact_jid: '1234567890@s.whatsapp.net',
        context_data: {}
      };

      // Mock other database operations
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_messages' && mockSupabase.from.mock.calls.length === 1) {
          return mockHistoryQuery;
        }
        return mockUpdateQuery;
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      await processor.processIncomingMessage(
        mockMessage as any,
        mockConversation as any,
        'Necesito una cita'
      );

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('AgentSalud'),
          schema: expect.any(Object)
        })
      );
    });
  });
});
