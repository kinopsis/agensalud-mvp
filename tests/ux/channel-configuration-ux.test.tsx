/**
 * Channel Configuration UX Tests
 * 
 * Tests user experience aspects of the channel configuration system
 * including usability, accessibility, and user flow validation.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { ChannelConfigModal } from '@/components/channels/ChannelConfigModal';
import type { ChannelInstance } from '@/types/channels';

// =====================================================
// MOCKS
// =====================================================

// Mock config sections with UX-focused implementations
jest.mock('@/components/channels/config-sections/GeneralConfigSection', () => ({
  GeneralConfigSection: ({ config, onUpdate, errors, instanceName }: any) => (
    <div data-testid="general-config-section">
      <h3>Configuración General</h3>
      <label htmlFor="instance-name">Nombre de Instancia</label>
      <input
        id="instance-name"
        value={instanceName}
        readOnly
        aria-label="Nombre de la instancia (solo lectura)"
      />
      
      <label htmlFor="auto-reply-toggle">
        <input
          id="auto-reply-toggle"
          type="checkbox"
          checked={config.auto_reply || false}
          onChange={(e) => onUpdate({ auto_reply: e.target.checked })}
          aria-describedby="auto-reply-help"
        />
        Respuesta Automática
      </label>
      <div id="auto-reply-help" className="help-text">
        Habilita respuestas automáticas del asistente IA
      </div>
      
      {errors.auto_reply && (
        <div role="alert" className="error-message">
          {errors.auto_reply}
        </div>
      )}
    </div>
  )
}));

jest.mock('@/components/channels/config-sections/WebhookConfigSection', () => ({
  WebhookConfigSection: ({ config, onUpdate, errors }: any) => (
    <div data-testid="webhook-config-section">
      <h3>Configuración de Webhook</h3>
      <label htmlFor="webhook-url">URL del Webhook</label>
      <input
        id="webhook-url"
        type="url"
        value={config.webhook?.url || ''}
        onChange={(e) => onUpdate({ webhook: { ...config.webhook, url: e.target.value } })}
        placeholder="https://tu-dominio.com/webhook"
        aria-describedby="webhook-url-help"
        aria-invalid={!!errors['webhook.url']}
      />
      <div id="webhook-url-help" className="help-text">
        URL donde se enviarán las notificaciones de eventos
      </div>
      
      {errors['webhook.url'] && (
        <div role="alert" className="error-message">
          {errors['webhook.url']}
        </div>
      )}
      
      <button type="button" aria-label="Probar conexión del webhook">
        Probar Webhook
      </button>
    </div>
  )
}));

// =====================================================
// TEST DATA
// =====================================================

const mockWhatsAppInstance: ChannelInstance = {
  id: 'inst-ux-test',
  organization_id: 'org-123',
  channel_type: 'whatsapp',
  instance_name: 'UX Test Instance',
  status: 'connected',
  config: {
    auto_reply: true,
    webhook: {
      url: 'https://test.com/webhook',
      secret: 'test-secret',
      events: ['MESSAGE_RECEIVED']
    },
    ai_config: {
      enabled: true,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 500,
      timeout_seconds: 30
    }
  },
  created_at: '2025-01-28T10:00:00Z',
  updated_at: '2025-01-28T10:00:00Z'
};

// =====================================================
// UX TESTS
// =====================================================

describe('Channel Configuration UX Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      // Check modal has proper role
      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toBeInTheDocument();

      // Check close button has proper label
      const closeButton = screen.getByLabelText('Cerrar modal de configuración');
      expect(closeButton).toBeInTheDocument();

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      // Check form elements have proper labels
      expect(screen.getByLabelText('Nombre de la instancia (solo lectura)')).toBeInTheDocument();
      expect(screen.getByLabelText('Respuesta Automática')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      // Test tab navigation
      await user.tab();
      expect(screen.getByText('General')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Webhook')).toHaveFocus();

      // Test Enter key on tabs
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByTestId('webhook-config-section')).toBeInTheDocument();
      });
    });

    it('should handle escape key properly', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should provide proper error announcements', async () => {
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

      // Navigate to webhook section
      await user.click(screen.getByText('Webhook'));
      
      await waitFor(() => {
        expect(screen.getByTestId('webhook-config-section')).toBeInTheDocument();
      });

      // Try to save with invalid data
      await user.click(screen.getByText('Guardar Cambios'));

      // Should show error with role="alert"
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Usability Tests', () => {
    it('should provide clear visual feedback for form states', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      // Check initial state - save button should be disabled
      const saveButton = screen.getByText('Guardar Cambios');
      expect(saveButton).toBeDisabled();

      // Make a change
      const autoReplyToggle = screen.getByLabelText('Respuesta Automática');
      await user.click(autoReplyToggle);

      // Should show unsaved changes indicator
      expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();

      // Save button should now be enabled
      expect(saveButton).not.toBeDisabled();
    });

    it('should provide helpful tooltips and descriptions', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      // Check help text is present
      expect(screen.getByText('Habilita respuestas automáticas del asistente IA')).toBeInTheDocument();

      // Navigate to webhook section
      await user.click(screen.getByText('Webhook'));
      
      await waitFor(() => {
        expect(screen.getByTestId('webhook-config-section')).toBeInTheDocument();
      });

      // Check webhook help text
      expect(screen.getByText('URL donde se enviarán las notificaciones de eventos')).toBeInTheDocument();
    });

    it('should handle loading states gracefully', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
          saving={true}
        />
      );

      // Should show loading state
      expect(screen.getByText('Guardando...')).toBeInTheDocument();

      // Buttons should be disabled during save
      expect(screen.getByText('Cancelar')).toBeDisabled();
    });

    it('should provide clear action buttons with proper labels', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      // Check button labels are clear
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('webhook-config-section')).toBeInTheDocument();
      });

      // Navigate to webhook section to check test button
      await user.click(screen.getByText('Webhook'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Probar conexión del webhook')).toBeInTheDocument();
      });
    });
  });

  describe('User Flow Tests', () => {
    it('should guide users through configuration process', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      // Should start with General tab active
      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      const generalTab = screen.getByText('General');
      expect(generalTab.closest('button')).toHaveClass('text-blue-600');

      // Navigate through all tabs
      const tabs = ['Webhook', 'Inteligencia Artificial', 'WhatsApp'];
      
      for (const tabName of tabs) {
        await user.click(screen.getByText(tabName));
        
        // Wait for tab content to load
        await waitFor(() => {
          const activeTab = screen.getByText(tabName);
          expect(activeTab.closest('button')).toHaveClass('text-blue-600');
        });
      }
    });

    it('should handle unsaved changes warning', async () => {
      // Mock window.confirm
      const mockConfirm = jest.fn().mockReturnValue(false);
      Object.defineProperty(window, 'confirm', { value: mockConfirm });

      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      // Make a change
      const autoReplyToggle = screen.getByLabelText('Respuesta Automática');
      await user.click(autoReplyToggle);

      // Try to close modal
      const closeButton = screen.getByLabelText('Cerrar modal de configuración');
      await user.click(closeButton);

      // Should show confirmation dialog
      expect(mockConfirm).toHaveBeenCalledWith(
        '¿Estás seguro de que quieres cerrar? Los cambios no guardados se perderán.'
      );

      // Modal should not close if user cancels
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should provide immediate feedback for form validation', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      // Navigate to webhook section
      await user.click(screen.getByText('Webhook'));
      
      await waitFor(() => {
        expect(screen.getByTestId('webhook-config-section')).toBeInTheDocument();
      });

      // Clear webhook URL
      const webhookInput = screen.getByLabelText('URL del Webhook');
      await user.clear(webhookInput);

      // Try to save
      await user.click(screen.getByText('Guardar Cambios'));

      // Should show validation error immediately
      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });

      // Error should have proper aria-invalid attribute
      expect(webhookInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Responsive Design Tests', () => {
    it('should adapt to different screen sizes', async () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });

      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      // Modal should be responsive
      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toHaveClass('sm:max-w-4xl');
    });

    it('should handle mobile interactions', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      // Touch interactions should work
      const webhookTab = screen.getByText('Webhook');
      fireEvent.touchStart(webhookTab);
      fireEvent.touchEnd(webhookTab);
      fireEvent.click(webhookTab);

      await waitFor(() => {
        expect(screen.getByTestId('webhook-config-section')).toBeInTheDocument();
      });
    });
  });

  describe('Performance UX Tests', () => {
    it('should show loading states for slow operations', async () => {
      // Mock slow save operation
      mockOnSave.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });

      // Make a change and save
      const autoReplyToggle = screen.getByLabelText('Respuesta Automática');
      await user.click(autoReplyToggle);

      const saveButton = screen.getByText('Guardar Cambios');
      await user.click(saveButton);

      // Should show loading state immediately
      expect(screen.getByText('Guardando...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it('should handle section loading gracefully', async () => {
      render(
        <ChannelConfigModal
          isOpen={true}
          onClose={mockOnClose}
          instance={mockWhatsAppInstance}
          onSave={mockOnSave}
        />
      );

      // Should show loading state while sections load
      expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();

      // Content should load
      await waitFor(() => {
        expect(screen.getByTestId('general-config-section')).toBeInTheDocument();
      });
    });
  });
});
