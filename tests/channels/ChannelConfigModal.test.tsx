/**
 * ChannelConfigModal Component Tests
 * 
 * Tests for the unified channel configuration modal including
 * different sections, validation, and save functionality.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { ChannelConfigModal } from '@/components/channels/ChannelConfigModal';
import type { ChannelInstance } from '@/types/channels';

// =====================================================
// MOCKS
// =====================================================

// Mock the config sections
jest.mock('@/components/channels/config-sections/GeneralConfigSection', () => ({
  GeneralConfigSection: ({ config, onUpdate, errors, instanceName }: any) => (
    <div data-testid="general-config-section">
      <h3>General Configuration</h3>
      <p>Instance: {instanceName}</p>
      <button onClick={() => onUpdate({ auto_reply: !config.auto_reply })}>
        Toggle Auto Reply
      </button>
    </div>
  )
}));

jest.mock('@/components/channels/config-sections/WebhookConfigSection', () => ({
  WebhookConfigSection: ({ config, onUpdate }: any) => (
    <div data-testid="webhook-config-section">
      <h3>Webhook Configuration</h3>
      <input
        data-testid="webhook-url-input"
        value={config.webhook?.url || ''}
        onChange={(e) => onUpdate({ webhook: { ...config.webhook, url: e.target.value } })}
        placeholder="Webhook URL"
      />
    </div>
  )
}));

jest.mock('@/components/channels/config-sections/AIConfigSection', () => ({
  AIConfigSection: ({ config, onUpdate }: any) => (
    <div data-testid="ai-config-section">
      <h3>AI Configuration</h3>
      <label>
        <input
          type="checkbox"
          checked={config.ai_config?.enabled || false}
          onChange={(e) => onUpdate('ai_config', { ...config.ai_config, enabled: e.target.checked })}
        />
        Enable AI
      </label>
    </div>
  )
}));

jest.mock('@/components/channels/config-sections/WhatsAppConfigSection', () => ({
  WhatsAppConfigSection: ({ config, onUpdate }: any) => (
    <div data-testid="whatsapp-config-section">
      <h3>WhatsApp Configuration</h3>
      <input
        data-testid="phone-number-input"
        value={config.whatsapp?.phone_number || ''}
        onChange={(e) => onUpdate({ whatsapp: { ...config.whatsapp, phone_number: e.target.value } })}
        placeholder="Phone Number"
      />
    </div>
  )
}));

// =====================================================
// TEST DATA
// =====================================================

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
  created_at: '2025-01-28T10:00:00Z',
  updated_at: '2025-01-28T10:00:00Z'
};

// =====================================================
// TESTS
// =====================================================

describe('ChannelConfigModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
  });

  it('should not render when closed', () => {
    render(
      <ChannelConfigModal
        isOpen={false}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Configurar WhatsApp Principal')).not.toBeInTheDocument();
  });

  it('should render modal when open', () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Configurar WhatsApp Principal')).toBeInTheDocument();
    expect(screen.getByText('whatsapp • connected')).toBeInTheDocument();
  });

  it('should render configuration tabs', () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Webhook')).toBeInTheDocument();
    expect(screen.getByText('Inteligencia Artificial')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('should switch between tabs', async () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    // Should start with General tab
    await waitFor(() => {
      expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
    });

    // Click Webhook tab
    fireEvent.click(screen.getByText('Webhook'));
    
    await waitFor(() => {
      expect(screen.getByTestId('webhook-config-section')).toBeInTheDocument();
    });

    // Click WhatsApp tab
    fireEvent.click(screen.getByText('WhatsApp'));
    
    await waitFor(() => {
      expect(screen.getByTestId('whatsapp-config-section')).toBeInTheDocument();
    });
  });

  it('should handle configuration updates', async () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    // Wait for general section to load
    await waitFor(() => {
      expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
    });

    // Toggle auto reply
    const toggleButton = screen.getByText('Toggle Auto Reply');
    fireEvent.click(toggleButton);

    // Should show unsaved changes indicator
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  });

  it('should handle save configuration', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);

    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    // Wait for general section to load
    await waitFor(() => {
      expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
    });

    // Make a change
    const toggleButton = screen.getByText('Toggle Auto Reply');
    fireEvent.click(toggleButton);

    // Click save
    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        'inst-whatsapp-1',
        expect.objectContaining({
          auto_reply: false // Should be toggled
        })
      );
    });
  });

  it('should handle close modal', () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    // Click close button
    const closeButton = screen.getByLabelText('Cerrar modal de configuración');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle escape key', () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
      />
    );

    // Press escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show loading state when saving', async () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={mockWhatsAppInstance}
        onSave={mockOnSave}
        saving={true}
      />
    );

    expect(screen.getByText('Guardando...')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });

  it('should validate required fields', async () => {
    render(
      <ChannelConfigModal
        isOpen={true}
        onClose={mockOnClose}
        instance={{
          ...mockWhatsAppInstance,
          config: {
            ...mockWhatsAppInstance.config,
            webhook: { url: '', secret: '', events: [] }
          }
        }}
        onSave={mockOnSave}
      />
    );

    // Wait for general section to load
    await waitFor(() => {
      expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
    });

    // Try to save without required fields
    const saveButton = screen.getByText('Guardar Cambios');
    fireEvent.click(saveButton);

    // Should not call onSave due to validation
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
