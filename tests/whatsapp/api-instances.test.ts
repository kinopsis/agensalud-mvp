/**
 * WhatsApp Instances API Tests
 * 
 * Unit tests for WhatsApp instances management API endpoints.
 * Tests CRUD operations, validation, authentication, and Evolution API integration.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/whatsapp/instances/route';
import { GET as getById, PUT, DELETE } from '@/app/api/whatsapp/instances/[id]/route';
import { GET as getQRCode, POST as refreshQRCode } from '@/app/api/whatsapp/instances/[id]/qrcode/route';
import { GET as getStatus, POST as updateStatus } from '@/app/api/whatsapp/instances/[id]/status/route';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/services/EvolutionAPIService');

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(),
  rpc: jest.fn()
};

const mockEvolutionAPI = {
  createInstance: jest.fn(),
  getInstanceStatus: jest.fn(),
  getQRCode: jest.fn(),
  deleteInstance: jest.fn(),
  restartInstance: jest.fn(),
  logoutInstance: jest.fn(),
  getInstanceInfo: jest.fn()
};

// Mock createClient to return our mock
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase))
}));

// Mock Evolution API Service
jest.mock('@/lib/services/EvolutionAPIService', () => ({
  createEvolutionAPIService: jest.fn(() => mockEvolutionAPI)
}));

describe('WhatsApp Instances API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/whatsapp/instances', () => {
    it('should return instances for admin user', async () => {
      // Mock user profile
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'instance-1',
              instance_name: 'test-instance',
              phone_number: '+1234567890',
              status: 'active'
            }
          ],
          error: null
        })
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        count: 1
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockQuery;
        if (table === 'whatsapp_instances') return mockQuery;
        return mockQuery;
      });

      const request = new NextRequest('http://localhost/api/whatsapp/instances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.instances).toHaveLength(1);
      expect(data.data.instances[0].instance_name).toBe('test-instance');
    });

    it('should reject non-admin users', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'patient', organization_id: 'org-1' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost/api/whatsapp/instances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should handle unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost/api/whatsapp/instances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/whatsapp/instances', () => {
    it('should create new instance successfully', async () => {
      // Mock user profile
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            role: 'admin', 
            organization_id: 'org-1',
            first_name: 'Test',
            last_name: 'Admin'
          },
          error: null
        })
      };

      // Mock duplicate check
      const mockDuplicateQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' } // Not found
        })
      };

      // Mock insert
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-instance-id',
            instance_name: 'test-instance',
            phone_number: '+1234567890',
            status: 'connecting'
          },
          error: null
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery;
        if (table === 'whatsapp_instances') {
          // First call is duplicate check, second is insert
          return mockSupabase.from.mockReturnValueOnce(mockDuplicateQuery).mockReturnValue(mockInsertQuery);
        }
        return mockProfileQuery;
      });

      // Mock Evolution API
      mockEvolutionAPI.createInstance.mockResolvedValue({
        instance: { instanceName: 'test-instance', status: 'connecting' },
        hash: { apikey: 'test-api-key' },
        qrcode: { base64: 'test-qr-code' }
      });

      // Mock audit log
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      const requestBody = {
        instance_name: 'test-instance',
        phone_number: '+1234567890',
        evolution_api_config: {
          qrcode: true,
          integration: 'WHATSAPP-BUSINESS'
        }
      };

      const request = new NextRequest('http://localhost/api/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.instance.instance_name).toBe('test-instance');
      expect(data.data.qrCode).toBe('test-qr-code');
      expect(mockEvolutionAPI.createInstance).toHaveBeenCalledWith({
        instanceName: 'test-instance',
        qrcode: true,
        integration: 'WHATSAPP-BUSINESS'
      });
    });

    it('should validate request data', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const invalidRequestBody = {
        instance_name: 'ab', // Too short
        phone_number: 'invalid-phone' // Invalid format
      };

      const request = new NextRequest('http://localhost/api/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });

    it('should handle duplicate instance names', async () => {
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        })
      };

      const mockDuplicateQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-instance' },
          error: null
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery;
        if (table === 'whatsapp_instances') return mockDuplicateQuery;
        return mockProfileQuery;
      });

      const requestBody = {
        instance_name: 'existing-instance',
        phone_number: '+1234567890'
      };

      const request = new NextRequest('http://localhost/api/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_INSTANCE_NAME');
    });
  });

  describe('GET /api/whatsapp/instances/[id]', () => {
    it('should return specific instance', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            status: 'active',
            organization_id: 'org-1'
          },
          error: null
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            ...mockQuery,
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', organization_id: 'org-1' },
              error: null
            })
          };
        }
        return mockQuery;
      });

      // Mock Evolution API status check
      mockEvolutionAPI.getInstanceStatus.mockResolvedValue({
        state: 'open'
      });

      const request = new NextRequest('http://localhost/api/whatsapp/instances/instance-1');
      const response = await getById(request, { params: { id: 'instance-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.instance.id).toBe('instance-1');
    });

    it('should return 404 for non-existent instance', async () => {
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        })
      };

      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery;
        if (table === 'whatsapp_instances') return mockInstanceQuery;
        return mockProfileQuery;
      });

      const request = new NextRequest('http://localhost/api/whatsapp/instances/non-existent');
      const response = await getById(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSTANCE_NOT_FOUND');
    });
  });

  describe('QR Code Endpoints', () => {
    it('should return QR code for connecting instance', async () => {
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        })
      };

      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            status: 'connecting',
            organization_id: 'org-1'
          },
          error: null
        })
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery;
        if (table === 'whatsapp_instances') {
          return {
            ...mockInstanceQuery,
            update: mockUpdateQuery.update
          };
        }
        return mockProfileQuery;
      });

      // Mock Evolution API QR code
      mockEvolutionAPI.getQRCode.mockResolvedValue({
        qrcode: 'qr-text',
        base64: 'base64-qr-code'
      });

      // Mock audit log
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      const request = new NextRequest('http://localhost/api/whatsapp/instances/instance-1/qrcode');
      const response = await getQRCode(request, { params: { id: 'instance-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.qrCode).toBe('base64-qr-code');
      expect(data.data.qrCodeText).toBe('qr-text');
    });

    it('should reject QR code request for active instance', async () => {
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        })
      };

      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            status: 'active', // Already connected
            organization_id: 'org-1'
          },
          error: null
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery;
        if (table === 'whatsapp_instances') return mockInstanceQuery;
        return mockProfileQuery;
      });

      const request = new NextRequest('http://localhost/api/whatsapp/instances/instance-1/qrcode');
      const response = await getQRCode(request, { params: { id: 'instance-1' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSTANCE_ALREADY_CONNECTED');
    });
  });

  describe('Status Management', () => {
    it('should restart instance successfully', async () => {
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            role: 'admin',
            organization_id: 'org-1',
            first_name: 'Test',
            last_name: 'Admin'
          },
          error: null
        })
      };

      const mockInstanceQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            status: 'error',
            organization_id: 'org-1'
          },
          error: null
        })
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'instance-1',
            instance_name: 'test-instance',
            status: 'connecting'
          },
          error: null
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery;
        if (table === 'whatsapp_instances') {
          return {
            ...mockInstanceQuery,
            update: mockUpdateQuery.update
          };
        }
        return mockProfileQuery;
      });

      // Mock Evolution API restart
      mockEvolutionAPI.restartInstance.mockResolvedValue(undefined);

      // Mock audit log
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      const requestBody = { action: 'restart', reason: 'Manual restart' };
      const request = new NextRequest('http://localhost/api/whatsapp/instances/instance-1/status', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await updateStatus(request, { params: { id: 'instance-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('restart');
      expect(data.data.newStatus).toBe('connecting');
      expect(mockEvolutionAPI.restartInstance).toHaveBeenCalledWith('test-instance');
    });

    it('should validate status action requests', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const invalidRequestBody = { action: 'invalid-action' };
      const request = new NextRequest('http://localhost/api/whatsapp/instances/instance-1/status', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody)
      });

      const response = await updateStatus(request, { params: { id: 'instance-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle Evolution API errors gracefully', async () => {
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockProfileQuery);

      // Mock Evolution API error
      mockEvolutionAPI.createInstance.mockRejectedValue(new Error('Evolution API connection failed'));

      const requestBody = {
        instance_name: 'test-instance',
        phone_number: '+1234567890'
      };

      const request = new NextRequest('http://localhost/api/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EVOLUTION_API_ERROR');
      expect(data.error.details).toContain('Evolution API connection failed');
    });

    it('should handle database errors', async () => {
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed')
        })
      };

      mockSupabase.from.mockReturnValue(mockProfileQuery);

      const request = new NextRequest('http://localhost/api/whatsapp/instances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PROFILE_NOT_FOUND');
    });
  });
});
