/**
 * WhatsApp Simplified Creation Flow Tests
 * 
 * Tests for the complete WhatsApp instance creation flow including:
 * - Instance creation API
 * - QR code generation and streaming
 * - Development mode fallbacks
 * - Error handling and recovery
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

// Mock Evolution API Service
const mockEvolutionAPI = {
  createInstance: jest.fn(),
  getInstanceStatus: jest.fn(),
  getQRCode: jest.fn()
};

jest.mock('@/lib/services/EvolutionAPIService', () => ({
  createEvolutionAPIService: () => mockEvolutionAPI
}));

describe('WhatsApp Simplified Creation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null
    });

    mockSupabase.from.mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'profile-1',
          organization_id: 'org-1',
          role: 'admin'
        },
        error: null
      })
    }));
  });

  describe('Instance Creation API', () => {
    it('should create instance successfully in development mode', async () => {
      // Mock Evolution API to return development response
      mockEvolutionAPI.createInstance.mockResolvedValue({
        instance: {
          instanceName: 'test-instance',
          status: 'connecting'
        },
        hash: {
          apikey: 'dev-mock-api-key'
        },
        qrcode: {
          code: 'mock-qr-code-for-development',
          base64: 'mock-base64-data'
        }
      });

      // Import and test the API route
      const { POST } = await import('@/app/api/channels/whatsapp/instances/route');
      
      const request = new NextRequest('http://localhost:3000/api/channels/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify({
          instance_name: 'Test Instance',
          phone_number: '+57300123456'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.instance).toBeDefined();
    });

    it('should handle Evolution API errors gracefully in development', async () => {
      // Mock Evolution API to throw error
      mockEvolutionAPI.createInstance.mockRejectedValue(new Error('Evolution API error: Bad Request'));

      const { POST } = await import('@/app/api/channels/whatsapp/instances/route');
      
      const request = new NextRequest('http://localhost:3000/api/channels/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify({
          instance_name: 'Test Instance',
          phone_number: '+57300123456'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still succeed in development mode with mock response
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('QR Code Streaming', () => {
    it('should provide mock QR code in development mode', async () => {
      const { GET } = await import('@/app/api/channels/whatsapp/instances/[id]/qrcode/stream/route');
      
      const request = new NextRequest('http://localhost:3000/api/channels/whatsapp/instances/test-id/qrcode/stream');
      
      const response = await GET(request, { params: { id: 'test-id' } });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('should handle missing instance gracefully in development', async () => {
      // Mock instance not found
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Instance not found' }
        })
      }));

      const { GET } = await import('@/app/api/channels/whatsapp/instances/[id]/qrcode/stream/route');
      
      const request = new NextRequest('http://localhost:3000/api/channels/whatsapp/instances/missing-id/qrcode/stream');
      
      const response = await GET(request, { params: { id: 'missing-id' } });
      
      // Should still work in development mode
      expect(response.status).toBe(200);
    });
  });

  describe('Performance Tests', () => {
    it('should complete instance creation within performance threshold', async () => {
      const startTime = Date.now();
      
      const { POST } = await import('@/app/api/channels/whatsapp/instances/route');
      
      const request = new NextRequest('http://localhost:3000/api/channels/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify({
          instance_name: 'Performance Test',
          phone_number: '+57300123456'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);
      
      const duration = Date.now() - startTime;
      
      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Error Recovery', () => {
    it('should provide helpful error messages for invalid input', async () => {
      const { POST } = await import('@/app/api/channels/whatsapp/instances/route');
      
      const request = new NextRequest('http://localhost:3000/api/channels/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify({
          instance_name: '', // Invalid: empty name
          phone_number: 'invalid-phone' // Invalid: bad format
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('validation');
    });
  });
});
