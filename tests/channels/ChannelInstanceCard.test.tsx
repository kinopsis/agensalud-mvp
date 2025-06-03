/**
 * ChannelInstanceCard Component Tests
 * 
 * Tests for the generic channel instance card component including
 * different channel types, statuses, and actions.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { ChannelInstanceCard } from '@/components/channels/ChannelInstanceCard';
import type { ChannelInstance } from '@/types/channels';

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
};

const mockTelegramInstance: ChannelInstance = {
  id: 'inst-telegram-1',
  organization_id: 'org-123',
  channel_type: 'telegram',
  instance_name: 'Telegram Bot',
  status: 'disconnected',
  config: {
    telegram: {
      bot_token: 'bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      webhook_url: 'https://example.com/webhook'
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
};

const mockErrorInstance: ChannelInstance = {
  ...mockWhatsAppInstance,
  id: 'inst-error-1',
  instance_name: 'WhatsApp con Error',
  status: 'error',
  error_message: 'Failed to connect to Evolution API'
};

// =====================================================
// TESTS
// =====================================================

describe('ChannelInstanceCard', () => {
  const mockOnAction = jest.fn();

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  it('should render WhatsApp instance correctly', () => {
    render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={mockOnAction}
      />
    );

    // Check instance name and type
    expect(screen.getByText('WhatsApp Principal')).toBeInTheDocument();
    expect(screen.getByText('whatsapp')).toBeInTheDocument();

    // Check status
    expect(screen.getByText('Conectado')).toBeInTheDocument();

    // Check metrics
    expect(screen.getByText('150')).toBeInTheDocument(); // messages_24h
    expect(screen.getByText('12')).toBeInTheDocument(); // appointments_24h
    expect(screen.getByText('45')).toBeInTheDocument(); // conversations_24h
    expect(screen.getByText('+57300123456')).toBeInTheDocument(); // phone number

    // Check action buttons
    expect(screen.getByText('Configurar')).toBeInTheDocument();
    expect(screen.getByText('Desconectar')).toBeInTheDocument(); // Connected instance shows disconnect
  });

  it('should render Telegram instance correctly', () => {
    render(
      <ChannelInstanceCard
        instance={mockTelegramInstance}
        onAction={mockOnAction}
      />
    );

    // Check instance name and type
    expect(screen.getByText('Telegram Bot')).toBeInTheDocument();
    expect(screen.getByText('telegram')).toBeInTheDocument();

    // Check status
    expect(screen.getByText('Desconectado')).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByText('Conectar')).toBeInTheDocument(); // Disconnected instance shows connect
  });

  it('should display error message when present', () => {
    render(
      <ChannelInstanceCard
        instance={mockErrorInstance}
        onAction={mockOnAction}
      />
    );

    // Check error status
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Check error message
    expect(screen.getByText('Failed to connect to Evolution API')).toBeInTheDocument();
  });

  it('should handle configure action', () => {
    render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={mockOnAction}
      />
    );

    const configureButton = screen.getByText('Configurar');
    fireEvent.click(configureButton);

    expect(mockOnAction).toHaveBeenCalledWith('inst-whatsapp-1', 'configure');
  });

  it('should handle connect action for disconnected instance', () => {
    render(
      <ChannelInstanceCard
        instance={mockTelegramInstance}
        onAction={mockOnAction}
      />
    );

    const connectButton = screen.getByText('Conectar');
    fireEvent.click(connectButton);

    expect(mockOnAction).toHaveBeenCalledWith('inst-telegram-1', 'connect');
  });

  it('should handle disconnect action for connected instance', () => {
    render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={mockOnAction}
      />
    );

    const disconnectButton = screen.getByText('Desconectar');
    fireEvent.click(disconnectButton);

    expect(mockOnAction).toHaveBeenCalledWith('inst-whatsapp-1', 'disconnect');
  });

  it('should handle delete action', () => {
    render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={mockOnAction}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /eliminar/i });
    fireEvent.click(deleteButton);

    expect(mockOnAction).toHaveBeenCalledWith('inst-whatsapp-1', 'delete');
  });

  it('should show loading state for actions', async () => {
    const slowAction = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={slowAction}
      />
    );

    const disconnectButton = screen.getByText('Desconectar');
    fireEvent.click(disconnectButton);

    // Should show loading spinner and disable all buttons
    await waitFor(() => {
      expect(screen.getByText('Configurar')).toBeDisabled();
      expect(disconnectButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /eliminar/i })).toBeDisabled();
    });

    // Wait for action to complete
    await waitFor(() => {
      expect(slowAction).toHaveBeenCalledWith('inst-whatsapp-1', 'disconnect');
    });
  });

  it('should disable buttons when loading prop is true', () => {
    render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={mockOnAction}
        loading={true}
      />
    );

    // All buttons should be disabled
    expect(screen.getByText('Configurar')).toBeDisabled();
    expect(screen.getByText('Desconectar')).toBeDisabled();
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeDisabled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={mockOnAction}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display correct channel icons', () => {
    const { container, rerender } = render(
      <ChannelInstanceCard
        instance={mockWhatsAppInstance}
        onAction={mockOnAction}
      />
    );

    // WhatsApp should have an icon displayed
    const whatsappIcon = container.querySelector('svg.text-green-600');
    expect(whatsappIcon).toBeInTheDocument();

    // Rerender with Telegram instance
    rerender(
      <ChannelInstanceCard
        instance={mockTelegramInstance}
        onAction={mockOnAction}
      />
    );

    // Telegram should have an icon displayed
    const telegramIcon = container.querySelector('svg.text-blue-600');
    expect(telegramIcon).toBeInTheDocument();
  });

  it('should handle missing metrics gracefully', () => {
    const instanceWithoutMetrics = {
      ...mockWhatsAppInstance,
      metrics: undefined
    };

    render(
      <ChannelInstanceCard
        instance={instanceWithoutMetrics}
        onAction={mockOnAction}
      />
    );

    // Should show 0 for missing metrics
    expect(screen.getAllByText('0')).toHaveLength(3); // messages, appointments, conversations
  });

  it('should handle missing phone number gracefully', () => {
    const instanceWithoutPhone = {
      ...mockWhatsAppInstance,
      config: {
        whatsapp: {
          evolution_api: {
            base_url: 'https://api.evolution.com',
            api_key: 'test-key',
            instance_name: 'test-instance'
          }
        }
      }
    };

    render(
      <ChannelInstanceCard
        instance={instanceWithoutPhone}
        onAction={mockOnAction}
      />
    );

    // Should show N/A for missing phone number
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
