/**
 * End-to-End Tests for Channel Management
 * 
 * Tests complete user flows from dashboard → configuration → save → update
 * validating the entire multi-channel system integration.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { jest } from '@jest/globals';
import { ChannelDashboard } from '@/components/channels/ChannelDashboard';
import type { ChannelInstance } from '@/types/channels';

// =====================================================
// MOCKS
// =====================================================

// Mock fetch globally for API calls
global.fetch = jest.fn();

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn()
  })
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}));

// =====================================================
// TEST DATA
// =====================================================

const mockUser = {
  id: 'user-123',
  email: 'admin@agentsalud.com'
};

const mockProfile = {
  id: 'user-123',
  organization_id: 'org-123',
  role: 'admin',
  first_name: 'Admin',
  last_name: 'User'
};

const mockWhatsAppInstance: ChannelInstance = {
  id: 'inst-whatsapp-1',
  organization_id: 'org-123',
  channel_type: 'whatsapp',
  instance_name: 'WhatsApp Principal',
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
      url: 'https://example.com/webhook',
      secret: 'secret123',
      events: ['MESSAGE_RECEIVED']
    },
    limits: {
      max_concurrent_chats: 100,
      message_rate_limit: 60,
      session_timeout_minutes: 30
    },
    whatsapp: {
      phone_number: '+57300123456',
      evolution_api: {
        base_url: 'https://api.evolution.com',
        api_key: 'test-key',
        instance_name: 'test-instance'
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
    messages_24h: 150,
    conversations_24h: 45,
    appointments_24h: 12,
    success_rate: 85
  },
  created_at: '2025-01-28T10:00:00Z',
  updated_at: '2025-01-28T10:00:00Z'
};

const mockApiResponse = {
  success: true,
  data: {
    instances: [mockWhatsAppInstance],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      pages: 1
    }
  },
  meta: {
    timestamp: '2025-01-28T10:00:00Z',
    requestId: 'req-123',
    organizationId: 'org-123',
    channel: 'whatsapp'
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Setup mocks for successful authentication and data fetching
 */
const setupSuccessfulMocks = () => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null
  });

  mockSupabase.from.mockImplementation((table) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: mockProfile,
      error: null
    })
  }));

  (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
    ok: true,
    json: async () => mockApiResponse
  } as Response);
};

/**
 * Wait for dashboard to load completely
 */
const waitForDashboardLoad = async () => {
  await waitFor(() => {
    expect(screen.getByText('Canales de Comunicación')).toBeInTheDocument();
  }, { timeout: 5000 });
};

// =====================================================
// E2E TESTS
// =====================================================

describe('Channel Management E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSuccessfulMocks();
  });

  describe('Complete Dashboard → Configuration → Save Flow', () => {
    it('should complete full configuration flow successfully', async () => {
      // Step 1: Render dashboard and wait for load
      render(
        <ChannelDashboard
          organizationId="org-123"
          userRole="admin"
        />
      );

      await waitForDashboardLoad();

      // Step 2: Verify dashboard shows instance
      expect(screen.getByText('WhatsApp Principal')).toBeInTheDocument();
      expect(screen.getByText('Conectado')).toBeInTheDocument();

      // Step 3: Click configure button
      const configureButton = screen.getByText('Configurar');
      fireEvent.click(configureButton);

      // Step 4: Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Configurar WhatsApp Principal')).toBeInTheDocument();
      });

      // Step 5: Navigate to AI configuration tab
      const aiTab = screen.getByText('Inteligencia Artificial');
      fireEvent.click(aiTab);

      await waitFor(() => {
        expect(screen.getByText('Configuración de IA')).toBeInTheDocument();
      });

      // Step 6: Toggle AI enabled
      const aiToggle = screen.getByRole('checkbox');
      fireEvent.click(aiToggle);

      // Step 7: Verify unsaved changes indicator
      expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();

      // Step 8: Mock successful save
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      // Step 9: Save configuration
      const saveButton = screen.getByText('Guardar Cambios');
      fireEvent.click(saveButton);

      // Step 10: Verify API call was made
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/channels/whatsapp/instances/inst-whatsapp-1',
          expect.objectContaining({
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });

      // Step 11: Verify modal closes
      await waitFor(() => {
        expect(screen.queryByText('Configurar WhatsApp Principal')).not.toBeInTheDocument();
      });
    }, 10000);

    it('should handle configuration validation errors', async () => {
      render(
        <ChannelDashboard
          organizationId="org-123"
          userRole="admin"
        />
      );

      await waitForDashboardLoad();

      // Open configuration modal
      const configureButton = screen.getByText('Configurar');
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByText('Configurar WhatsApp Principal')).toBeInTheDocument();
      });

      // Navigate to webhook section
      const webhookTab = screen.getByText('Webhook');
      fireEvent.click(webhookTab);

      await waitFor(() => {
        expect(screen.getByText('Configuración de Webhook')).toBeInTheDocument();
      });

      // Clear webhook URL to trigger validation error
      const webhookInput = screen.getByPlaceholderText('https://tu-dominio.com/webhook');
      fireEvent.change(webhookInput, { target: { value: '' } });

      // Try to save with invalid configuration
      const saveButton = screen.getByText('Guardar Cambios');
      fireEvent.click(saveButton);

      // Should not make API call due to validation
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/channels/whatsapp/instances/'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should handle API errors gracefully', async () => {
      render(
        <ChannelDashboard
          organizationId="org-123"
          userRole="admin"
        />
      );

      await waitForDashboardLoad();

      // Open configuration modal
      const configureButton = screen.getByText('Configurar');
      fireEvent.click(configureButton);

      await waitFor(() => {
        expect(screen.getByText('Configurar WhatsApp Principal')).toBeInTheDocument();
      });

      // Make a change
      const generalTab = screen.getByText('General');
      fireEvent.click(generalTab);

      // Mock API error
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Try to save
      const saveButton = screen.getByText('Guardar Cambios');
      fireEvent.click(saveButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Modal should remain open
      expect(screen.getByText('Configurar WhatsApp Principal')).toBeInTheDocument();
    });
  });

  describe('Dashboard Metrics Integration', () => {
    it('should display real-time metrics correctly', async () => {
      render(
        <ChannelDashboard
          organizationId="org-123"
          userRole="admin"
        />
      );

      await waitForDashboardLoad();

      // Verify metrics are calculated and displayed
      expect(screen.getByText('1')).toBeInTheDocument(); // Active channels
      expect(screen.getByText('45')).toBeInTheDocument(); // Conversations
      expect(screen.getByText('12')).toBeInTheDocument(); // Appointments

      // Verify instance metrics
      expect(screen.getByText('150')).toBeInTheDocument(); // Messages 24h
      expect(screen.getByText('+57300123456')).toBeInTheDocument(); // Phone number
    });

    it('should handle empty state correctly', async () => {
      // Mock empty response
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockApiResponse,
          data: { instances: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } }
        })
      } as Response);

      render(
        <ChannelDashboard
          organizationId="org-123"
          userRole="admin"
        />
      );

      await waitForDashboardLoad();

      // Should show empty state
      expect(screen.getByText('No hay instancias de WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Crear Instancia')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation and Channel Types', () => {
    it('should switch between channel types correctly', async () => {
      render(
        <ChannelDashboard
          organizationId="org-123"
          userRole="admin"
        />
      );

      await waitForDashboardLoad();

      // Should start with WhatsApp tab active
      const whatsappTab = screen.getByText('WhatsApp');
      expect(whatsappTab.closest('button')).toHaveClass('text-blue-600');

      // Click Telegram tab
      const telegramTab = screen.getByText('Telegram');
      fireEvent.click(telegramTab);

      // Should show empty state for Telegram
      await waitFor(() => {
        expect(screen.getByText('No hay instancias de Telegram')).toBeInTheDocument();
      });

      // Click Voice tab
      const voiceTab = screen.getByText('Voice');
      fireEvent.click(voiceTab);

      // Should show empty state for Voice
      await waitFor(() => {
        expect(screen.getByText('No hay instancias de Voice')).toBeInTheDocument();
      });
    });
  });
});
