/**
 * WhatsApp Integration Debugging Tests
 * 
 * Comprehensive test suite for debugging WhatsApp integration issues
 * including instance creation, synchronization, and Evolution API connectivity.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as createInstance } from '@/app/api/whatsapp/instances/route';
import { POST as syncInstances } from '@/app/api/whatsapp/instances/sync/route';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import { syncWhatsAppInstances } from '@/lib/utils/whatsapp-sync-utility';

// =====================================================
// MOCKS AND SETUP
// =====================================================

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(),
  rpc: jest.fn()
};

// Mock Evolution API Service
const mockEvolutionAPI = {
  fetchAllInstances: jest.fn(),
  createInstance: jest.fn(),
  getInstanceStatus: jest.fn(),
  getQRCode: jest.fn(),
  getInstanceInfo: jest.fn()
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase))
}));

jest.mock('@/lib/services/EvolutionAPIService', () => ({
  createEvolutionAPIService: jest.fn(() => mockEvolutionAPI)
}));

// =====================================================
// TEST SUITE
// =====================================================

describe('WhatsApp Integration Debugging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =====================================================
  // EVOLUTION API CONNECTIVITY TESTS
  // =====================================================

  describe('Evolution API Connectivity', () => {
    it('should validate Evolution API configuration', () => {
      const evolutionAPI = createEvolutionAPIService();
      expect(evolutionAPI).toBeDefined();
    });

    it('should handle existing instances in Evolution API', async () => {
      // Mock existing instance in Evolution API
      mockEvolutionAPI.fetchAllInstances.mockResolvedValue([
        {
          id: 'existing-id',
          name: 'existing-instance',
          connectionStatus: 'open',
          token: 'existing-token'
        }
      ]);

      mockEvolutionAPI.createInstance.mockImplementation(async (data) => {
        // Should not be called if instance exists
        throw new Error('Instance already exists');
      });

      const evolutionAPI = createEvolutionAPIService();
      
      // This should handle existing instance gracefully
      const result = await evolutionAPI.createInstance({
        instanceName: 'existing-instance',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });

      expect(result).toBeDefined();
      expect(result.instance.instanceName).toBe('existing-instance');
      expect(mockEvolutionAPI.fetchAllInstances).toHaveBeenCalled();
    });

    it('should create new instance when none exists', async () => {
      // Mock no existing instances
      mockEvolutionAPI.fetchAllInstances.mockResolvedValue([]);
      
      // Mock successful creation
      mockEvolutionAPI.createInstance.mockResolvedValue({
        instance: { instanceName: 'new-instance', status: 'connecting' },
        hash: { apikey: 'new-api-key' },
        qrcode: { base64: 'new-qr-code' }
      });

      const evolutionAPI = createEvolutionAPIService();
      
      const result = await evolutionAPI.createInstance({
        instanceName: 'new-instance',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });

      expect(result).toBeDefined();
      expect(result.instance.instanceName).toBe('new-instance');
      expect(mockEvolutionAPI.createInstance).toHaveBeenCalled();
    });
  });

  // =====================================================
  // INSTANCE SYNCHRONIZATION TESTS
  // =====================================================

  describe('Instance Synchronization', () => {
    it('should sync instances between Evolution API and database', async () => {
      // Mock Evolution API instances
      mockEvolutionAPI.fetchAllInstances.mockResolvedValue([
        {
          id: 'evo-1',
          name: 'instance-1',
          connectionStatus: 'open',
          token: 'token-1',
          number: '573104813259'
        }
      ]);

      // Mock database query for instances
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      
      mockQuery.eq.mockResolvedValue({
        data: [], // No instances in database
        error: null
      });

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock insert operation
      const mockInsert = {
        insert: jest.fn().mockResolvedValue({ error: null })
      };
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'whatsapp_instances') {
          return mockQuery.select.mockReturnValueOnce(mockQuery).eq.mockReturnValueOnce({
            data: [],
            error: null
          }).insert ? mockInsert : mockQuery;
        }
        return mockQuery;
      });

      const result = await syncWhatsAppInstances('test-org-id');

      expect(result.success).toBe(true);
      expect(result.created).toBeGreaterThan(0);
    });

    it('should handle sync API endpoint', async () => {
      // Mock profile query
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            role: 'admin', 
            organization_id: 'test-org-id',
            first_name: 'Test',
            last_name: 'User'
          },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockProfileQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      // Mock sync utility
      jest.doMock('@/lib/utils/whatsapp-sync-utility', () => ({
        syncWhatsAppInstances: jest.fn().mockResolvedValue({
          success: true,
          synchronized: 1,
          created: 1,
          updated: 0,
          errors: [],
          details: {
            evolutionInstances: 1,
            databaseInstances: 0,
            orphanedInDatabase: [],
            orphanedInEvolution: []
          }
        })
      }));

      const request = new NextRequest('http://localhost/api/whatsapp/instances/sync', {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });

      const response = await syncInstances(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.syncResult).toBeDefined();
    });
  });

  // =====================================================
  // INSTANCE CREATION FLOW TESTS
  // =====================================================

  describe('Instance Creation Flow', () => {
    it('should handle instance creation with existing Evolution instance', async () => {
      // Mock profile
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin', organization_id: 'test-org-id' },
          error: null
        })
      };

      // Mock duplicate check
      const mockDuplicateQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // No duplicate in database
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
            status: 'connecting'
          },
          error: null
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfileQuery;
        if (table === 'whatsapp_instances') {
          return mockSupabase.from.mockReturnValueOnce(mockDuplicateQuery).mockReturnValue(mockInsertQuery);
        }
        return mockProfileQuery;
      });

      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      // Mock Evolution API with existing instance
      mockEvolutionAPI.fetchAllInstances.mockResolvedValue([
        {
          id: 'existing-id',
          name: 'test-instance',
          connectionStatus: 'open',
          token: 'existing-token'
        }
      ]);

      const requestBody = {
        instance_name: 'test-instance',
        phone_number: '+573104813259'
      };

      const request = new NextRequest('http://localhost/api/whatsapp/instances', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await createInstance(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.instance).toBeDefined();
    });
  });

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  describe('Error Handling', () => {
    it('should handle Evolution API connection errors gracefully', async () => {
      mockEvolutionAPI.fetchAllInstances.mockRejectedValue(new Error('Connection failed'));

      const evolutionAPI = createEvolutionAPIService();

      await expect(evolutionAPI.fetchAllInstances()).rejects.toThrow('Failed to fetch instances');
    });

    it('should handle database connection errors during sync', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(syncWhatsAppInstances('test-org-id')).rejects.toThrow();
    });
  });
});
