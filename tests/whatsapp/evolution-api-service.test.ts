/**
 * Evolution API Service Tests
 * 
 * Unit tests for Evolution API v2 integration service.
 * Tests instance management, message sending, and error handling.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EvolutionAPIService, createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';

// Mock fetch globally
global.fetch = jest.fn();

describe('EvolutionAPIService', () => {
  let service: EvolutionAPIService;
  const mockConfig = {
    baseUrl: 'http://localhost:8080',
    apiKey: 'test-api-key',
    version: 'v2' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EvolutionAPIService(mockConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
        baseUrl: 'https://api.example.com',
        apiKey: 'valid-key',
        version: 'v2' as const
      };

      expect(EvolutionAPIService.validateConfig(validConfig)).toBe(true);
    });

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        baseUrl: 'invalid-url',
        apiKey: '',
        version: 'v2' as const
      };

      expect(EvolutionAPIService.validateConfig(invalidConfig)).toBe(false);
    });

    it('should reject missing configuration fields', () => {
      const incompleteConfig = {
        baseUrl: 'https://api.example.com',
        apiKey: '',
        version: 'v2' as const
      };

      expect(EvolutionAPIService.validateConfig(incompleteConfig)).toBe(false);
    });
  });

  describe('Instance Management', () => {
    it('should create instance successfully', async () => {
      const mockResponse = {
        instance: { instanceName: 'test-instance', status: 'connecting' },
        hash: { apikey: 'instance-api-key' },
        qrcode: { code: 'qr-text', base64: 'qr-base64' }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const instanceData = {
        instanceName: 'test-instance',
        qrcode: true,
        integration: 'WHATSAPP-BUSINESS' as const
      };

      const result = await service.createInstance(instanceData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'apikey': 'test-api-key'
          }),
          body: JSON.stringify(instanceData)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle create instance errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Invalid instance name' })
      });

      const instanceData = {
        instanceName: 'invalid-instance',
        qrcode: true,
        integration: 'WHATSAPP-BUSINESS' as const
      };

      await expect(service.createInstance(instanceData)).rejects.toThrow(
        'Failed to create WhatsApp instance: Evolution API error: Invalid instance name'
      );
    });

    it('should get instance status', async () => {
      const mockStatus = {
        instance: 'test-instance',
        state: 'open'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStatus)
      });

      const result = await service.getInstanceStatus('test-instance');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/connectionState/test-instance',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'apikey': 'test-api-key'
          })
        })
      );

      expect(result).toEqual(mockStatus);
    });

    it('should get QR code', async () => {
      const mockQRResponse = {
        qrcode: 'qr-text-data',
        base64: 'base64-qr-image'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockQRResponse)
      });

      const result = await service.getQRCode('test-instance');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/qrcode/test-instance',
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockQRResponse);
    });

    it('should delete instance', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await service.deleteInstance('test-instance');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/delete/test-instance',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should restart instance', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await service.restartInstance('test-instance');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/restart/test-instance',
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });

    it('should logout instance', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await service.logoutInstance('test-instance');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/instance/logout/test-instance',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('Webhook Configuration', () => {
    it('should configure webhook successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      const webhookConfig = {
        url: 'https://api.example.com/webhook',
        events: ['messages.upsert', 'connection.update'],
        webhook_by_events: true
      };

      await service.configureWebhook('test-instance', webhookConfig);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/webhook/set/test-instance',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(webhookConfig)
        })
      );
    });

    it('should handle webhook configuration errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Invalid webhook URL' })
      });

      const webhookConfig = {
        url: 'invalid-url',
        events: ['messages.upsert'],
        webhook_by_events: true
      };

      await expect(service.configureWebhook('test-instance', webhookConfig)).rejects.toThrow(
        'Failed to configure webhook: Evolution API error: Invalid webhook URL'
      );
    });
  });

  describe('Message Sending', () => {
    it('should send text message successfully', async () => {
      const mockMessageResponse = {
        key: {
          remoteJid: '1234567890@s.whatsapp.net',
          fromMe: true,
          id: 'message-id'
        },
        message: { conversation: 'Hello World' },
        messageTimestamp: Date.now()
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockMessageResponse)
      });

      const messageData = {
        number: '1234567890',
        text: 'Hello World'
      };

      const result = await service.sendMessage('test-instance', messageData);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/message/sendText/test-instance',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(messageData)
        })
      );

      expect(result).toEqual(mockMessageResponse);
    });

    it('should send media message successfully', async () => {
      const mockMessageResponse = {
        key: {
          remoteJid: '1234567890@s.whatsapp.net',
          fromMe: true,
          id: 'message-id'
        },
        message: { imageMessage: { url: 'media-url' } },
        messageTimestamp: Date.now()
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockMessageResponse)
      });

      const messageData = {
        number: '1234567890',
        media: {
          mediatype: 'image' as const,
          media: 'base64-image-data',
          caption: 'Test image'
        }
      };

      const result = await service.sendMessage('test-instance', messageData);

      expect(result).toEqual(mockMessageResponse);
    });

    it('should handle message sending errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Invalid phone number' })
      });

      const messageData = {
        number: 'invalid-number',
        text: 'Hello World'
      };

      await expect(service.sendMessage('test-instance', messageData)).rejects.toThrow(
        'Failed to send message: Evolution API error: Invalid phone number'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.getInstanceStatus('test-instance')).rejects.toThrow(
        'Failed to get instance status: Network error'
      );
    });

    it('should handle JSON parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(service.getInstanceStatus('test-instance')).rejects.toThrow(
        'Failed to get instance status: Invalid JSON'
      );
    });

    it('should handle HTTP errors without JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('No JSON'))
      });

      await expect(service.getInstanceStatus('test-instance')).rejects.toThrow(
        'Failed to get instance status: No JSON'
      );
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance when called multiple times', () => {
      const instance1 = EvolutionAPIService.getInstance(mockConfig);
      const instance2 = EvolutionAPIService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw error when getting instance without initial config', () => {
      // Reset singleton
      (EvolutionAPIService as any).instance = null;

      expect(() => EvolutionAPIService.getInstance()).toThrow(
        'Evolution API configuration is required for first initialization'
      );
    });
  });

  describe('Factory Function', () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.EVOLUTION_API_BASE_URL = 'http://localhost:8080';
      process.env.EVOLUTION_API_KEY = 'test-key';
    });

    afterEach(() => {
      delete process.env.EVOLUTION_API_BASE_URL;
      delete process.env.EVOLUTION_API_KEY;
    });

    it('should create service with environment configuration', () => {
      expect(() => createEvolutionAPIService()).not.toThrow();
    });

    it('should throw error with invalid environment configuration', () => {
      delete process.env.EVOLUTION_API_KEY;

      expect(() => createEvolutionAPIService()).toThrow(
        'Invalid Evolution API configuration'
      );
    });
  });
});
