/**
 * WhatsApp Webhook Processor Tests
 * 
 * Unit tests for WhatsApp webhook processing logic without NextRequest dependencies.
 * Tests core business logic for message processing and conversation management.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WhatsAppWebhookProcessor } from '@/lib/services/WhatsAppWebhookProcessor';

// Mock dependencies
jest.mock('@/lib/services/WhatsAppMessageProcessor');

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

const mockMessageProcessor = {
  processIncomingMessage: jest.fn()
};

// Mock WhatsAppMessageProcessor
jest.mock('@/lib/services/WhatsAppMessageProcessor', () => ({
  WhatsAppMessageProcessor: jest.fn(() => mockMessageProcessor)
}));

describe('WhatsAppWebhookProcessor', () => {
  let processor: WhatsAppWebhookProcessor;
  let mockWhatsAppInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWhatsAppInstance = {
      id: 'instance-1',
      instance_name: 'test-instance',
      organization_id: 'org-1',
      status: 'active'
    };

    processor = new WhatsAppWebhookProcessor(mockSupabase as any, mockWhatsAppInstance);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processMessageEvent', () => {
    it('should process incoming message successfully', async () => {
      // Mock conversation lookup/creation
      const mockConversationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'conv-1',
            contact_jid: '1234567890@s.whatsapp.net',
            contact_name: 'John Doe'
          },
          error: null
        })
      };

      // Mock message insertion
      const mockMessageQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'msg-1',
            conversation_id: 'conv-1',
            content: 'Hello',
            message_type: 'conversation'
          },
          error: null
        })
      };

      // Mock conversation update
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_conversations') {
          return { ...mockConversationQuery, ...mockUpdateQuery };
        }
        if (table === 'whatsapp_messages') {
          return mockMessageQuery;
        }
        return mockConversationQuery;
      });

      // Mock message processor
      mockMessageProcessor.processIncomingMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-1',
        conversationId: 'conv-1',
        intent: 'greeting'
      });

      const webhookEvent = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          key: {
            remoteJid: '1234567890@s.whatsapp.net',
            fromMe: false,
            id: 'message-id-123'
          },
          pushName: 'John Doe',
          message: {
            conversation: 'Hello'
          },
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processMessageEvent(webhookEvent);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Message processed successfully');
      expect(result.data.conversationId).toBe('conv-1');
      expect(result.data.messageContent).toBe('Hello');
      expect(mockMessageProcessor.processIncomingMessage).toHaveBeenCalled();
    });

    it('should skip outbound messages (fromMe = true)', async () => {
      const webhookEvent = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          key: {
            remoteJid: '1234567890@s.whatsapp.net',
            fromMe: true, // Outbound message
            id: 'message-id-123'
          },
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processMessageEvent(webhookEvent);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Outbound message ignored');
      expect(mockMessageProcessor.processIncomingMessage).not.toHaveBeenCalled();
    });

    it('should handle different message types', async () => {
      const messageTypes = [
        {
          type: 'imageMessage',
          message: {
            imageMessage: {
              url: 'https://example.com/image.jpg',
              caption: 'Test image'
            }
          },
          expectedContent: 'Test image'
        },
        {
          type: 'audioMessage',
          message: {
            audioMessage: {
              url: 'https://example.com/audio.mp3'
            }
          },
          expectedContent: '[Audio message]'
        },
        {
          type: 'documentMessage',
          message: {
            documentMessage: {
              url: 'https://example.com/doc.pdf',
              fileName: 'document.pdf',
              caption: 'Important document'
            }
          },
          expectedContent: 'document.pdf'
        }
      ];

      for (const messageType of messageTypes) {
        // Mock database operations
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis()
        };

        mockQuery.single.mockResolvedValue({
          data: { id: 'conv-1', contact_jid: '1234567890@s.whatsapp.net' },
          error: null
        });
        mockQuery.insert.mockResolvedValue({
          data: { id: 'msg-1', content: messageType.expectedContent },
          error: null
        });
        mockQuery.eq.mockResolvedValue({ error: null });

        mockSupabase.from.mockReturnValue(mockQuery);

        const webhookEvent = {
          event: 'messages.upsert',
          instance: 'test-instance',
          data: {
            key: {
              remoteJid: '1234567890@s.whatsapp.net',
              fromMe: false,
              id: 'message-id-123'
            },
            message: messageType.message,
            messageType: messageType.type,
            messageTimestamp: 1640995200000
          }
        };

        const result = await processor.processMessageEvent(webhookEvent);

        expect(result.success).toBe(true);
        expect(result.data.messageContent).toBe(messageType.expectedContent);
        expect(result.data.messageType).toBe(messageType.type);
      }
    });

    it('should handle missing required data gracefully', async () => {
      const webhookEvent = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          key: {
            // Missing remoteJid
            fromMe: false,
            id: 'message-id-123'
          },
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processMessageEvent(webhookEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required message data');
    });

    it('should create new conversation when none exists', async () => {
      // Mock no existing conversation
      const mockConversationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      // Mock conversation creation
      const mockCreateQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-conv-1',
            contact_jid: '1234567890@s.whatsapp.net',
            contact_name: 'John Doe'
          },
          error: null
        })
      };

      // Mock message insertion
      const mockMessageQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'msg-1', conversation_id: 'new-conv-1' },
          error: null
        })
      };

      // Mock conversation update
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_conversations') {
          // First call returns no existing conversation, second call creates new one
          return mockSupabase.from.mock.calls.length === 1 ? 
            mockConversationQuery : 
            { ...mockCreateQuery, ...mockUpdateQuery };
        }
        if (table === 'whatsapp_messages') {
          return mockMessageQuery;
        }
        return mockConversationQuery;
      });

      const webhookEvent = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          key: {
            remoteJid: '1234567890@s.whatsapp.net',
            fromMe: false,
            id: 'message-id-123'
          },
          pushName: 'John Doe',
          message: {
            conversation: 'Hello'
          },
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processMessageEvent(webhookEvent);

      expect(result.success).toBe(true);
      expect(result.data.conversationId).toBe('new-conv-1');
      expect(mockCreateQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_jid: '1234567890@s.whatsapp.net',
          contact_name: 'John Doe'
        })
      );
    });
  });

  describe('processConnectionUpdate', () => {
    it('should update instance status on connection change', async () => {
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockReturnValue(mockUpdateQuery);

      const webhookEvent = {
        event: 'connection.update',
        instance: 'test-instance',
        data: {
          messageType: 'open', // Connected state
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processConnectionUpdate(webhookEvent);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection update processed');
      expect(result.data.newStatus).toBe('active');
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active'
        })
      );
    });
  });

  describe('processQRUpdate', () => {
    it('should update instance status to connecting', async () => {
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockReturnValue(mockUpdateQuery);

      const webhookEvent = {
        event: 'qr.updated',
        instance: 'test-instance',
        data: {
          messageType: 'qr',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processQRUpdate(webhookEvent);

      expect(result.success).toBe(true);
      expect(result.message).toBe('QR code update processed');
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'connecting'
        })
      );
    });
  });

  describe('processInstanceCreated', () => {
    it('should confirm instance creation', async () => {
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockReturnValue(mockUpdateQuery);

      const webhookEvent = {
        event: 'instance.created',
        instance: 'test-instance',
        data: {
          messageType: 'system',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processInstanceCreated(webhookEvent);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Instance creation processed');
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'connecting'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const webhookEvent = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          key: {
            remoteJid: '1234567890@s.whatsapp.net',
            fromMe: false,
            id: 'message-id-123'
          },
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processMessageEvent(webhookEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle message processor errors', async () => {
      // Mock successful database operations
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis()
      };

      mockQuery.single.mockResolvedValue({
        data: { id: 'conv-1', contact_jid: '1234567890@s.whatsapp.net' },
        error: null
      });
      mockQuery.insert.mockResolvedValue({
        data: { id: 'msg-1', conversation_id: 'conv-1' },
        error: null
      });
      mockQuery.eq.mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock message processor error
      mockMessageProcessor.processIncomingMessage.mockRejectedValue(
        new Error('AI processing failed')
      );

      const webhookEvent = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          key: {
            remoteJid: '1234567890@s.whatsapp.net',
            fromMe: false,
            id: 'message-id-123'
          },
          message: {
            conversation: 'Hello'
          },
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const result = await processor.processMessageEvent(webhookEvent);

      // Should still succeed even if AI processing fails
      expect(result.success).toBe(true);
      expect(result.message).toBe('Message processed successfully');
      expect(result.data.aiProcessing).toBeNull();
    });
  });
});
