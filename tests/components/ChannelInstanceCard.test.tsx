/**
 * ChannelInstanceCard Component Tests
 * 
 * Tests for the fixed config structure handling in ChannelInstanceCard component.
 * Verifies defensive programming and proper config access patterns.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChannelInstanceCard } from '@/components/channels/ChannelInstanceCard';
import type { ChannelInstance } from '@/types/channels';

// Mock QRCodeDisplay component
jest.mock('@/components/channels/QRCodeDisplay', () => ({
  QRCodeDisplay: ({ instanceName }: { instanceName: string }) => (
    <div data-testid="qr-code-display">QR Code for {instanceName}</div>
  )
}));

describe('ChannelInstanceCard', () => {
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Config Structure Handling', () => {
    it('should handle WhatsApp config with correct structure', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test WhatsApp',
        channel_type: 'whatsapp',
        status: 'connected',
        organization_id: 'org-123',
        config: {
          auto_reply: true,
          business_hours: { enabled: true },
          ai_config: { enabled: true },
          webhook: { url: 'https://example.com/webhook' },
          limits: { daily_messages: 1000 },
          whatsapp: {
            phone_number: '+57300123456',
            evolution_api: {
              base_url: 'https://api.example.com',
              api_key: 'test-key'
            }
          }
        },
        metrics: {
          messages_24h: 50,
          appointments_24h: 5,
          conversations_24h: 10
        },
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Should display instance name
      expect(screen.getByText('Test WhatsApp')).toBeInTheDocument();
      
      // Should display channel type
      expect(screen.getByText('whatsapp')).toBeInTheDocument();
      
      // Should display phone number
      expect(screen.getByText('+57300123456')).toBeInTheDocument();
      
      // Should display metrics
      expect(screen.getByText('50')).toBeInTheDocument(); // messages_24h
      expect(screen.getByText('5')).toBeInTheDocument();  // appointments_24h
      expect(screen.getByText('10')).toBeInTheDocument(); // conversations_24h
    });

    it('should handle missing config gracefully', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test Instance',
        channel_type: 'whatsapp',
        status: 'disconnected',
        organization_id: 'org-123',
        config: null as any, // Simulate missing config
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Should display fallback values
      expect(screen.getByText('Test Instance')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument(); // phone number fallback
      expect(screen.getByText('No configurado')).toBeInTheDocument(); // config fallback
    });

    it('should handle missing WhatsApp config section', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test Instance',
        channel_type: 'whatsapp',
        status: 'error',
        organization_id: 'org-123',
        config: {
          auto_reply: true,
          business_hours: { enabled: true },
          // Missing whatsapp section
        },
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Should display fallback values
      expect(screen.getByText('N/A')).toBeInTheDocument(); // phone number fallback
      expect(screen.getByText('No configurado')).toBeInTheDocument(); // config fallback
    });

    it('should handle Telegram config correctly', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test Telegram',
        channel_type: 'telegram',
        status: 'connected',
        organization_id: 'org-123',
        config: {
          auto_reply: true,
          telegram: {
            bot_token: 'test-bot-token-123',
            webhook_url: 'https://example.com/telegram'
          }
        },
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Should display masked bot token
      expect(screen.getByText('••••••••')).toBeInTheDocument();
      expect(screen.getByText('Bot Token:')).toBeInTheDocument();
    });

    it('should handle Voice config correctly', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test Voice',
        channel_type: 'voice',
        status: 'connected',
        organization_id: 'org-123',
        config: {
          auto_reply: true,
          voice: {
            provider: 'Twilio',
            phone_number: '+1234567890'
          }
        },
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Should display provider
      expect(screen.getByText('Twilio')).toBeInTheDocument();
      expect(screen.getByText('Proveedor:')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when present', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test Instance',
        channel_type: 'whatsapp',
        status: 'error',
        organization_id: 'org-123',
        config: {
          whatsapp: {
            phone_number: '+57300123456'
          }
        },
        error_message: 'Connection failed',
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onAction when buttons are clicked', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test Instance',
        channel_type: 'whatsapp',
        status: 'disconnected',
        organization_id: 'org-123',
        config: {
          whatsapp: {
            phone_number: '+57300123456'
          }
        },
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Click configure button
      const configureButton = screen.getByText('Configurar');
      fireEvent.click(configureButton);
      expect(mockOnAction).toHaveBeenCalledWith('test-id', 'configure');

      // Click connect button
      const connectButton = screen.getByText('Conectar');
      fireEvent.click(connectButton);
      expect(mockOnAction).toHaveBeenCalledWith('test-id', 'connect');
    });
  });

  describe('QR Code Display', () => {
    it('should show QR code for WhatsApp when connecting', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test WhatsApp',
        channel_type: 'whatsapp',
        status: 'connecting',
        organization_id: 'org-123',
        config: {
          whatsapp: {
            phone_number: '+57300123456'
          }
        },
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Click connect to trigger QR display
      const connectButton = screen.getByText('Conectar');
      fireEvent.click(connectButton);

      // QR code should be displayed (mocked)
      expect(screen.getByTestId('qr-code-display')).toBeInTheDocument();
    });
  });

  describe('Defensive Programming', () => {
    it('should handle undefined instance name', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: undefined as any,
        channel_type: 'whatsapp',
        status: 'connected',
        organization_id: 'org-123',
        config: {
          whatsapp: {
            phone_number: '+57300123456'
          }
        },
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Should display fallback name
      expect(screen.getByText('Sin nombre')).toBeInTheDocument();
    });

    it('should handle missing metrics', () => {
      const instance: ChannelInstance = {
        id: 'test-id',
        instance_name: 'Test Instance',
        channel_type: 'whatsapp',
        status: 'connected',
        organization_id: 'org-123',
        config: {
          whatsapp: {
            phone_number: '+57300123456'
          }
        },
        // Missing metrics
        created_at: '2025-01-28T10:00:00Z',
        updated_at: '2025-01-28T10:00:00Z'
      };

      render(
        <ChannelInstanceCard
          instance={instance}
          onAction={mockOnAction}
        />
      );

      // Should display zero values for missing metrics
      expect(screen.getAllByText('0')).toHaveLength(3); // messages, appointments, conversations
    });
  });
});
