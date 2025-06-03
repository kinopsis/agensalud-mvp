/**
 * WhatsApp Validations Tests
 * 
 * Unit tests for WhatsApp Zod validation schemas.
 * Tests input validation, error handling, and type safety.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect } from '@jest/globals';
import {
  createWhatsAppInstanceSchema,
  updateWhatsAppInstanceSchema,
  whatsAppInstanceQuerySchema,
  evolutionInstanceCreateSchema,
  evolutionWebhookConfigSchema,
  evolutionSendMessageSchema,
  evolutionWebhookEventSchema,
  createConversationSchema,
  updateConversationSchema,
  whatsAppMessageSchema,
  whatsAppAuditLogSchema
} from '@/lib/validations/whatsapp';

describe('WhatsApp Validation Schemas', () => {
  describe('createWhatsAppInstanceSchema', () => {
    it('should validate correct instance creation data', () => {
      const validData = {
        instance_name: 'test-instance',
        phone_number: '+1234567890',
        business_id: 'business-123',
        webhook_url: 'https://api.example.com/webhook',
        evolution_api_config: {
          integration: 'WHATSAPP-BUSINESS',
          qrcode: true,
          autoReply: false,
          sessionTimeout: 3600,
          maxConcurrentChats: 100
        }
      };

      const result = createWhatsAppInstanceSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instance_name).toBe('test-instance');
        expect(result.data.phone_number).toBe('+1234567890');
        expect(result.data.evolution_api_config?.integration).toBe('WHATSAPP-BUSINESS');
      }
    });

    it('should reject invalid instance names', () => {
      const invalidData = {
        instance_name: 'ab', // Too short
        phone_number: '+1234567890'
      };

      const result = createWhatsAppInstanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 3 characters');
      }
    });

    it('should reject invalid phone numbers', () => {
      const invalidData = {
        instance_name: 'test-instance',
        phone_number: 'invalid-phone' // Invalid format
      };

      const result = createWhatsAppInstanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('international format');
      }
    });

    it('should reject invalid webhook URLs', () => {
      const invalidData = {
        instance_name: 'test-instance',
        phone_number: '+1234567890',
        webhook_url: 'not-a-url'
      };

      const result = createWhatsAppInstanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('valid URL');
      }
    });

    it('should apply default values for evolution_api_config', () => {
      const minimalData = {
        instance_name: 'test-instance',
        phone_number: '+1234567890'
      };

      const result = createWhatsAppInstanceSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.evolution_api_config).toEqual({
          integration: 'WHATSAPP-BUSINESS',
          qrcode: true,
          autoReply: false,
          sessionTimeout: 3600,
          maxConcurrentChats: 100
        });
      }
    });
  });

  describe('updateWhatsAppInstanceSchema', () => {
    it('should validate partial updates', () => {
      const updateData = {
        status: 'active' as const,
        error_message: 'Test error'
      };

      const result = updateWhatsAppInstanceSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
        expect(result.data.error_message).toBe('Test error');
      }
    });

    it('should validate status enum values', () => {
      const invalidData = {
        status: 'invalid-status'
      };

      const result = updateWhatsAppInstanceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid enum value');
      }
    });
  });

  describe('whatsAppInstanceQuerySchema', () => {
    it('should validate query parameters', () => {
      const queryData = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'active',
        limit: '25',
        offset: '0',
        search: 'test'
      };

      const result = whatsAppInstanceQuerySchema.safeParse(queryData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25); // Transformed from string
        expect(result.data.offset).toBe(0); // Transformed from string
      }
    });

    it('should apply default values', () => {
      const emptyQuery = {};

      const result = whatsAppInstanceQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });
  });

  describe('evolutionInstanceCreateSchema', () => {
    it('should validate Evolution API instance creation', () => {
      const evolutionData = {
        instanceName: 'test-instance',
        token: 'optional-token',
        qrcode: true,
        integration: 'WHATSAPP-BUSINESS'
      };

      const result = evolutionInstanceCreateSchema.safeParse(evolutionData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instanceName).toBe('test-instance');
        expect(result.data.integration).toBe('WHATSAPP-BUSINESS');
      }
    });

    it('should apply default values', () => {
      const minimalData = {
        instanceName: 'test-instance'
      };

      const result = evolutionInstanceCreateSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.qrcode).toBe(true);
        expect(result.data.integration).toBe('WHATSAPP-BUSINESS');
      }
    });
  });

  describe('evolutionSendMessageSchema', () => {
    it('should validate text message', () => {
      const textMessage = {
        number: '1234567890',
        text: 'Hello World'
      };

      const result = evolutionSendMessageSchema.safeParse(textMessage);
      expect(result.success).toBe(true);
    });

    it('should validate media message', () => {
      const mediaMessage = {
        number: '1234567890',
        media: {
          mediatype: 'image',
          media: 'base64-image-data',
          caption: 'Test image'
        }
      };

      const result = evolutionSendMessageSchema.safeParse(mediaMessage);
      expect(result.success).toBe(true);
    });

    it('should reject message without text or media', () => {
      const emptyMessage = {
        number: '1234567890'
      };

      const result = evolutionSendMessageSchema.safeParse(emptyMessage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Either text or media must be provided');
      }
    });

    it('should validate phone number format', () => {
      const invalidMessage = {
        number: '123', // Too short
        text: 'Hello'
      };

      const result = evolutionSendMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('10-15 digits');
      }
    });
  });

  describe('createConversationSchema', () => {
    it('should validate conversation creation', () => {
      const conversationData = {
        whatsapp_instance_id: '123e4567-e89b-12d3-a456-426614174000',
        contact_jid: '1234567890@s.whatsapp.net',
        contact_name: 'John Doe',
        patient_id: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = createConversationSchema.safeParse(conversationData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contact_jid).toBe('1234567890@s.whatsapp.net');
        expect(result.data.context_data).toEqual({});
      }
    });

    it('should reject invalid contact JID format', () => {
      const invalidData = {
        whatsapp_instance_id: '123e4567-e89b-12d3-a456-426614174000',
        contact_jid: 'invalid-jid'
      };

      const result = createConversationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('WhatsApp format');
      }
    });
  });

  describe('whatsAppMessageSchema', () => {
    it('should validate message data', () => {
      const messageData = {
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
        message_id: 'whatsapp-message-id',
        direction: 'inbound',
        message_type: 'text',
        content: 'Hello World',
        intent_detected: 'greeting'
      };

      const result = whatsAppMessageSchema.safeParse(messageData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.direction).toBe('inbound');
        expect(result.data.message_type).toBe('text');
        expect(result.data.extracted_entities).toEqual({});
      }
    });

    it('should validate direction enum', () => {
      const invalidData = {
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
        message_id: 'test-id',
        direction: 'invalid-direction',
        message_type: 'text'
      };

      const result = whatsAppMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid enum value');
      }
    });

    it('should validate message type enum', () => {
      const invalidData = {
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
        message_id: 'test-id',
        direction: 'inbound',
        message_type: 'invalid-type'
      };

      const result = whatsAppMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid enum value');
      }
    });
  });

  describe('whatsAppAuditLogSchema', () => {
    it('should validate audit log entry', () => {
      const auditData = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'instance_created',
        actor_id: '123e4567-e89b-12d3-a456-426614174001',
        actor_type: 'admin',
        details: {
          instanceName: 'test-instance',
          createdBy: 'Admin User'
        }
      };

      const result = whatsAppAuditLogSchema.safeParse(auditData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe('instance_created');
        expect(result.data.actor_type).toBe('admin');
        expect(result.data.details).toEqual({
          instanceName: 'test-instance',
          createdBy: 'Admin User'
        });
      }
    });

    it('should validate actor type enum', () => {
      const invalidData = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'test_action',
        actor_type: 'invalid-actor'
      };

      const result = whatsAppAuditLogSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Invalid enum value');
      }
    });

    it('should apply default values', () => {
      const minimalData = {
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'test_action'
      };

      const result = whatsAppAuditLogSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.details).toEqual({});
      }
    });
  });

  describe('evolutionWebhookEventSchema', () => {
    it('should validate webhook event', () => {
      const webhookEvent = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          key: {
            remoteJid: '1234567890@s.whatsapp.net',
            fromMe: false,
            id: 'message-id'
          },
          pushName: 'John Doe',
          message: {
            conversation: 'Hello World'
          },
          messageType: 'text',
          messageTimestamp: 1640995200000
        }
      };

      const result = evolutionWebhookEventSchema.safeParse(webhookEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.event).toBe('messages.upsert');
        expect(result.data.data.messageType).toBe('text');
      }
    });

    it('should validate minimal webhook event', () => {
      const minimalEvent = {
        event: 'connection.update',
        instance: 'test-instance',
        data: {
          messageType: 'connection',
          messageTimestamp: 1640995200000
        }
      };

      const result = evolutionWebhookEventSchema.safeParse(minimalEvent);
      expect(result.success).toBe(true);
    });
  });
});
