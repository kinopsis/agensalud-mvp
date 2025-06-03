/**
 * WhatsApp Webhook Handler Tests
 * 
 * Unit tests for WhatsApp webhook processing including message handling,
 * AI integration, and conversation management.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/whatsapp/webhook/route';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/services/WhatsAppWebhookProcessor');
jest.mock('@ai-sdk/openai');
jest.mock('ai');

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

const mockWebhookProcessor = {
  processMessageEvent: jest.fn(),
  processMessageUpdate: jest.fn(),
  processConnectionUpdate: jest.fn(),
  processQRUpdate: jest.fn(),
  processInstanceCreated: jest.fn()
};

// Mock createClient to return our mock
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase))
}));

// Mock WhatsAppWebhookProcessor
jest.mock('@/lib/services/WhatsAppWebhookProcessor', () => ({
  WhatsAppWebhookProcessor: jest.fn(() => mockWebhookProcessor)
}));

describe('WhatsApp Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.EVOLUTION_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.EVOLUTION_WEBHOOK_VERIFY_TOKEN = 'test-verify-token';
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.EVOLUTION_WEBHOOK_SECRET;
    delete process.env.EVOLUTION_WEBHOOK_VERIFY_TOKEN;
  });

  describe('POST /api/whatsapp/webhook', () => {
    it('should process valid message webhook successfully', async () => {
      // Mock instance lookup
      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            organization_id: 'org-1',
            status: 'active'
          },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockInstanceQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      // Mock webhook processor
      mockWebhookProcessor.processMessageEvent.mockResolvedValue({
        success: true,
        message: 'Message processed successfully',
        data: {
          conversationId: 'conv-1',
          messageId: 'msg-1',
          messageContent: 'Hello',
          messageType: 'conversation'
        }
      });

      const webhookPayload = {
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
            conversation: 'Hello, I need an appointment'
          },
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const request = new NextRequest('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: {
          'apikey': 'test-webhook-secret',
          'content-type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.eventType).toBe('messages.upsert');
      expect(data.data.instanceName).toBe('test-instance');
      expect(mockWebhookProcessor.processMessageEvent).toHaveBeenCalledWith(webhookPayload);
    });

    it('should reject unauthorized webhook requests', async () => {
      const webhookPayload = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const request = new NextRequest('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: {
          'apikey': 'invalid-secret',
          'content-type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle invalid webhook payload', async () => {
      const invalidPayload = {
        invalid: 'payload'
      };

      const request = new NextRequest('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: {
          'apikey': 'test-webhook-secret',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PAYLOAD');
    });

    it('should handle non-existent WhatsApp instance', async () => {
      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      mockSupabase.from.mockReturnValue(mockInstanceQuery);

      const webhookPayload = {
        event: 'messages.upsert',
        instance: 'non-existent-instance',
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

      const request = new NextRequest('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: {
          'apikey': 'test-webhook-secret',
          'content-type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSTANCE_NOT_FOUND');
    });

    it('should handle different event types', async () => {
      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            organization_id: 'org-1'
          },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockInstanceQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      const eventTypes = [
        'messages.update',
        'connection.update',
        'qr.updated',
        'instance.created'
      ];

      for (const eventType of eventTypes) {
        const webhookPayload = {
          event: eventType,
          instance: 'test-instance',
          data: {
            messageType: 'system',
            messageTimestamp: 1640995200000
          }
        };

        const request = new NextRequest('http://localhost/api/whatsapp/webhook', {
          method: 'POST',
          headers: {
            'apikey': 'test-webhook-secret',
            'content-type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        });

        // Mock appropriate processor method
        const processorMethod = `process${eventType.split('.').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join('')}`;
        
        if (mockWebhookProcessor[processorMethod]) {
          mockWebhookProcessor[processorMethod].mockResolvedValue({
            success: true,
            message: `${eventType} processed`
          });
        }

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.eventType).toBe(eventType);
      }
    });

    it('should handle webhook processing errors gracefully', async () => {
      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            organization_id: 'org-1'
          },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockInstanceQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      // Mock processor to throw error
      mockWebhookProcessor.processMessageEvent.mockRejectedValue(
        new Error('Processing failed')
      );

      const webhookPayload = {
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

      const request = new NextRequest('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: {
          'apikey': 'test-webhook-secret',
          'content-type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('WEBHOOK_PROCESSING_ERROR');
    });
  });

  describe('GET /api/whatsapp/webhook', () => {
    it('should handle webhook verification', async () => {
      const request = new NextRequest(
        'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test-challenge&hub.verify_token=test-verify-token'
      );

      const response = await GET(request);
      const responseText = await response.text();

      expect(response.status).toBe(200);
      expect(responseText).toBe('test-challenge');
    });

    it('should reject invalid verification token', async () => {
      const request = new NextRequest(
        'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test-challenge&hub.verify_token=invalid-token'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_VERIFY_TOKEN');
    });

    it('should return status for basic GET request', async () => {
      const request = new NextRequest('http://localhost/api/whatsapp/webhook');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('WhatsApp webhook endpoint is active');
    });
  });

  describe('Webhook Authentication', () => {
    it('should allow requests when webhook secret is not configured', async () => {
      delete process.env.EVOLUTION_WEBHOOK_SECRET;

      const webhookPayload = {
        event: 'messages.upsert',
        instance: 'test-instance',
        data: {
          messageType: 'conversation',
          messageTimestamp: 1640995200000
        }
      };

      const request = new NextRequest('http://localhost/api/whatsapp/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      // Mock instance lookup for this test
      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            organization_id: 'org-1'
          },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockInstanceQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      mockWebhookProcessor.processMessageEvent.mockResolvedValue({
        success: true,
        message: 'Message processed'
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed in development mode
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
