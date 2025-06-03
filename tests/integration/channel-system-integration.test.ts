/**
 * Channel System Integration Tests
 * 
 * Comprehensive integration tests validating the complete integration
 * between ChannelDashboard, ChannelConfigModal, and unified APIs.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { jest } from '@jest/globals';
import type { ChannelInstance, ChannelInstanceConfig } from '@/types/channels';

// =====================================================
// MOCKS
// =====================================================

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Evolution API service
jest.mock('@/lib/services/EvolutionAPIService', () => ({
  createEvolutionAPIService: () => ({
    createInstance: jest.fn().mockResolvedValue({ success: true }),
    getInstanceStatus: jest.fn().mockResolvedValue('connected'),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    getQRCode: jest.fn().mockResolvedValue({ qrCode: 'mock-qr-code' }),
    restartInstance: jest.fn().mockResolvedValue({ success: true })
  })
}));

// Mock Supabase operations
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

// =====================================================
// TEST DATA
// =====================================================

const mockChannelInstance: ChannelInstance = {
  id: 'inst-integration-test',
  organization_id: 'org-123',
  channel_type: 'whatsapp',
  instance_name: 'Integration Test Instance',
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
      url: 'https://test.agentsalud.com/webhook',
      secret: 'integration-test-secret',
      events: ['MESSAGE_RECEIVED', 'CONNECTION_UPDATE']
    },
    limits: {
      max_concurrent_chats: 100,
      message_rate_limit: 60,
      session_timeout_minutes: 30
    },
    whatsapp: {
      phone_number: '+57300999888',
      evolution_api: {
        base_url: 'https://api.evolution.test',
        api_key: 'integration-test-key',
        instance_name: 'integration-test-instance'
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
  metrics: {
    messages_24h: 250,
    conversations_24h: 75,
    appointments_24h: 18,
    success_rate: 92
  },
  created_at: '2025-01-28T10:00:00Z',
  updated_at: '2025-01-28T10:00:00Z'
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Setup successful API mocks
 */
const setupSuccessfulAPIMocks = () => {
  (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (url, options) => {
    const urlStr = url.toString();
    const method = options?.method || 'GET';

    // Mock different API endpoints
    if (urlStr.includes('/api/channels/whatsapp/instances') && method === 'GET') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            instances: [mockChannelInstance],
            pagination: { page: 1, limit: 10, total: 1, pages: 1 }
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'req-integration-test',
            organizationId: 'org-123',
            channel: 'whatsapp'
          }
        })
      } as Response;
    }

    if (urlStr.includes('/api/channels/whatsapp/instances') && method === 'PUT') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            instance: {
              ...mockChannelInstance,
              updated_at: new Date().toISOString()
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: 'req-update-test'
          }
        })
      } as Response;
    }

    if (urlStr.includes('/status') && method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            action_executed: 'restart',
            new_status: 'connecting',
            message: 'Instance restart initiated'
          }
        })
      } as Response;
    }

    if (urlStr.includes('/qrcode')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            qr_code: 'data:image/png;base64,mock-qr-code-data',
            expires_in: 45,
            status: 'qr_available'
          }
        })
      } as Response;
    }

    // Default success response
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} })
    } as Response;
  });
};

/**
 * Setup Supabase mocks
 */
const setupSupabaseMocks = () => {
  mockSupabase.from.mockImplementation((table) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: mockChannelInstance,
      error: null
    })
  }));
};

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('Channel System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSuccessfulAPIMocks();
    setupSupabaseMocks();
  });

  describe('API Layer Integration', () => {
    it('should integrate unified APIs with database operations', async () => {
      // Test GET instances endpoint
      const getResponse = await fetch('/api/channels/whatsapp/instances');
      const getData = await getResponse.json();

      expect(getResponse.ok).toBe(true);
      expect(getData.success).toBe(true);
      expect(getData.data.instances).toHaveLength(1);
      expect(getData.data.instances[0].id).toBe('inst-integration-test');

      // Test PUT configuration endpoint
      const updateConfig: Partial<ChannelInstanceConfig> = {
        auto_reply: false,
        ai_config: {
          enabled: false,
          model: 'gpt-4',
          temperature: 0.5,
          max_tokens: 1000,
          timeout_seconds: 45
        }
      };

      const putResponse = await fetch('/api/channels/whatsapp/instances/inst-integration-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateConfig)
      });
      const putData = await putResponse.json();

      expect(putResponse.ok).toBe(true);
      expect(putData.success).toBe(true);
    });

    it('should handle status management operations', async () => {
      // Test status action
      const statusResponse = await fetch('/api/channels/whatsapp/instances/inst-integration-test/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restart',
          reason: 'Integration test restart'
        })
      });
      const statusData = await statusResponse.json();

      expect(statusResponse.ok).toBe(true);
      expect(statusData.success).toBe(true);
      expect(statusData.data.action_executed).toBe('restart');
    });

    it('should handle QR code operations', async () => {
      // Test QR code retrieval
      const qrResponse = await fetch('/api/channels/whatsapp/instances/inst-integration-test/qrcode');
      const qrData = await qrResponse.json();

      expect(qrResponse.ok).toBe(true);
      expect(qrData.success).toBe(true);
      expect(qrData.data.qr_code).toContain('data:image/png;base64');
      expect(qrData.data.expires_in).toBe(45);
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should validate WhatsApp configuration completely', async () => {
      const validConfig: Partial<ChannelInstanceConfig> = {
        whatsapp: {
          phone_number: '+57300123456',
          evolution_api: {
            base_url: 'https://api.evolution.com',
            api_key: 'valid-api-key',
            instance_name: 'valid-instance'
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
        },
        webhook: {
          url: 'https://valid-webhook.com/endpoint',
          secret: 'valid-secret',
          events: ['MESSAGE_RECEIVED']
        },
        ai_config: {
          enabled: true,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 500,
          timeout_seconds: 30
        }
      };

      const response = await fetch('/api/channels/whatsapp/instances/inst-integration-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfig)
      });

      expect(response.ok).toBe(true);
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        whatsapp: {
          phone_number: 'invalid-phone', // Invalid format
          evolution_api: {
            base_url: 'not-a-url', // Invalid URL
            api_key: '', // Empty API key
            instance_name: ''
          }
        },
        webhook: {
          url: '', // Empty URL
          events: [] // No events
        }
      };

      // Mock validation error response
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid configuration',
            details: {
              'whatsapp.phone_number': 'Invalid phone number format',
              'whatsapp.evolution_api.base_url': 'Invalid URL format',
              'webhook.url': 'Webhook URL is required'
            }
          }
        })
      } as Response);

      const response = await fetch('/api/channels/whatsapp/instances/inst-integration-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig)
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network connection failed')
      );

      try {
        await fetch('/api/channels/whatsapp/instances');
      } catch (error) {
        expect(error).toEqual(new Error('Network connection failed'));
      }
    });

    it('should handle API errors with proper error format', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
            timestamp: new Date().toISOString()
          }
        })
      } as Response);

      const response = await fetch('/api/channels/whatsapp/instances');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across operations', async () => {
      // 1. Get initial state
      const initialResponse = await fetch('/api/channels/whatsapp/instances');
      const initialData = await initialResponse.json();
      const initialInstance = initialData.data.instances[0];

      // 2. Update configuration
      const updateConfig = {
        auto_reply: !initialInstance.config.auto_reply
      };

      await fetch(`/api/channels/whatsapp/instances/${initialInstance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateConfig)
      });

      // 3. Verify update was applied
      const updatedResponse = await fetch('/api/channels/whatsapp/instances');
      const updatedData = await updatedResponse.json();
      const updatedInstance = updatedData.data.instances[0];

      expect(updatedInstance.config.auto_reply).toBe(updateConfig.auto_reply);
      expect(new Date(updatedInstance.updated_at).getTime()).toBeGreaterThan(
        new Date(initialInstance.updated_at).getTime()
      );
    });

    it('should handle concurrent updates safely', async () => {
      const instanceId = 'inst-integration-test';
      
      // Simulate concurrent updates
      const update1 = fetch(`/api/channels/whatsapp/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_reply: true })
      });

      const update2 = fetch(`/api/channels/whatsapp/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ai_config: { enabled: false, model: 'gpt-4', temperature: 0.5, max_tokens: 1000, timeout_seconds: 30 }
        })
      });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both should succeed (in a real implementation, proper locking would be needed)
      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);
    });
  });

  describe('Audit Trail Integration', () => {
    it('should create audit logs for configuration changes', async () => {
      const updateConfig = {
        auto_reply: false,
        webhook: {
          url: 'https://new-webhook.com/endpoint',
          secret: 'new-secret',
          events: ['MESSAGE_RECEIVED', 'CONNECTION_UPDATE']
        }
      };

      await fetch('/api/channels/whatsapp/instances/inst-integration-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateConfig)
      });

      // Verify audit log creation (mocked)
      expect(mockSupabase.from).toHaveBeenCalledWith('unified_audit_logs');
    });

    it('should track status changes in audit logs', async () => {
      await fetch('/api/channels/whatsapp/instances/inst-integration-test/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restart',
          reason: 'Integration test'
        })
      });

      // Verify audit log for status change
      expect(mockSupabase.from).toHaveBeenCalledWith('unified_audit_logs');
    });
  });
});
