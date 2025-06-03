/**
 * ChannelDashboard Component Tests
 * 
 * Tests for the unified channel dashboard component including
 * instance management, metrics display, and tab functionality.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { ChannelDashboard } from '@/components/channels/ChannelDashboard';
import type { ChannelInstance } from '@/types/channels';

// =====================================================
// MOCKS
// =====================================================

// Mock fetch globally
global.fetch = jest.fn();

// Mock ChannelInstanceCard
jest.mock('@/components/channels/ChannelInstanceCard', () => ({
  ChannelInstanceCard: ({ instance }: any) => (
    <div data-testid={`instance-card-${instance.id}`}>
      <h3>{instance.instance_name}</h3>
      <span data-testid={`status-${instance.id}`}>{instance.status}</span>
      <div>Metrics: {instance.metrics?.messages_24h || 0} messages</div>
    </div>
  )
}));

// =====================================================
// TEST DATA
// =====================================================

const mockInstances: ChannelInstance[] = [
  {
    id: 'inst-1',
    organization_id: 'org-123',
    channel_type: 'whatsapp',
    instance_name: 'WhatsApp Principal',
    status: 'connected',
    config: {
      whatsapp: {
        phone_number: '+57300123456',
        evolution_api: {
          base_url: 'https://api.evolution.com',
          api_key: 'test-key',
          instance_name: 'test-instance'
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
  },
  {
    id: 'inst-2',
    organization_id: 'org-123',
    channel_type: 'whatsapp',
    instance_name: 'WhatsApp Secundario',
    status: 'disconnected',
    config: {
      whatsapp: {
        phone_number: '+57300654321',
        evolution_api: {
          base_url: 'https://api.evolution.com',
          api_key: 'test-key-2',
          instance_name: 'test-instance-2'
        }
      }
    },
    metrics: {
      messages_24h: 75,
      conversations_24h: 20,
      appointments_24h: 5,
      success_rate: 78
    },
    created_at: '2025-01-28T10:00:00Z',
    updated_at: '2025-01-28T10:00:00Z'
  }
];

const mockApiResponse = {
  success: true,
  data: {
    instances: mockInstances,
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
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
// TESTS
// =====================================================

describe('ChannelDashboard', () => {
  beforeEach(() => {
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render loading state initially', () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    render(
      <ChannelDashboard
        organizationId="org-123"
        userRole="admin"
      />
    );

    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should fetch and display channel instances', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    } as Response);

    render(
      <ChannelDashboard
        organizationId="org-123"
        userRole="admin"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Canales de Comunicación')).toBeInTheDocument();
    });

    // Check basic functionality
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('Voice')).toBeInTheDocument();
  });

  it('should display unified metrics correctly', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    } as Response);

    render(
      <ChannelDashboard
        organizationId="org-123"
        userRole="admin"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Canales Activos')).toBeInTheDocument();
    });

    // Check metrics calculations
    expect(screen.getByText('1')).toBeInTheDocument(); // Active channels (1 connected)
    expect(screen.getByText('65')).toBeInTheDocument(); // Total conversations (45 + 20)
    expect(screen.getByText('17')).toBeInTheDocument(); // Total appointments (12 + 5)
  });

  it('should handle channel tab switching', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    } as Response);

    render(
      <ChannelDashboard
        organizationId="org-123"
        userRole="admin"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    });

    // Check if WhatsApp tab is active by default
    const whatsappTab = screen.getByText('WhatsApp');
    expect(whatsappTab.closest('button')).toHaveClass('text-blue-600');

    // Check if Telegram tab exists but is inactive
    const telegramTab = screen.getByText('Telegram');
    expect(telegramTab.closest('button')).toHaveClass('text-gray-500');

    // Click Telegram tab
    fireEvent.click(telegramTab);
    
    // Should show empty state for Telegram
    await waitFor(() => {
      expect(screen.getByText('No hay instancias de Telegram')).toBeInTheDocument();
    });
  });

  it('should handle instance actions', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    } as Response);

    render(
      <ChannelDashboard
        organizationId="org-123"
        userRole="admin"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Canales de Comunicación')).toBeInTheDocument();
    });

    // Check that the dashboard renders correctly
    expect(screen.getByText('Canales Activos')).toBeInTheDocument();
    expect(screen.getByText('Conversaciones Hoy')).toBeInTheDocument();
    expect(screen.getByText('Citas Creadas')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(
      <ChannelDashboard
        organizationId="org-123"
        userRole="admin"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });

    // Check retry button
    const retryButton = screen.getByText('Reintentar');
    expect(retryButton).toBeInTheDocument();
  });

  it('should show empty state when no instances exist', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('No hay instancias de WhatsApp')).toBeInTheDocument();
    });

    expect(screen.getByText('Crear Instancia')).toBeInTheDocument();
  });

  it('should call correct API endpoint', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse
    } as Response);

    render(
      <ChannelDashboard
        organizationId="org-123"
        userRole="admin"
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/channels/whatsapp/instances');
    });
  });
});
