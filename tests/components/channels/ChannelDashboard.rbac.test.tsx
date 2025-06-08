/**
 * RBAC Tests for Channel Dashboard
 * Tests role-based access control for WhatsApp channel management
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChannelDashboard } from '@/components/channels/ChannelDashboard';
import { renderWithProviders } from '../../utils/test-helpers';
import type { ChannelInstance } from '@/types/channels';

// Mock data
const mockWhatsAppInstance: ChannelInstance = {
  id: 'test-instance-1',
  instance_name: 'Test WhatsApp Instance',
  channel_type: 'whatsapp',
  status: 'connected',
  organization_id: 'test-org-1',
  config: {
    whatsapp: {
      phone_number: '+1234567890',
      evolution_api: {
        base_url: 'https://api.evolution.com',
        api_key: 'test-key',
        instance_name: 'test-instance'
      }
    }
  },
  created_at: '2025-01-28T10:00:00Z',
  updated_at: '2025-01-28T10:00:00Z',
  last_seen: '2025-01-28T10:00:00Z',
  metrics: {
    messages_24h: 15,
    appointments_24h: 3
  }
};

// Mock API responses
const mockApiResponses = {
  instances: [mockWhatsAppInstance],
  metrics: {
    total_instances: 1,
    connected_instances: 1,
    total_messages_24h: 15,
    total_appointments_24h: 3
  }
};

// Mock fetch
global.fetch = jest.fn();

describe('ChannelDashboard RBAC Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      console.log('Mock fetch called with URL:', url);
      if (url.includes('/api/channels/whatsapp/instances')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponses)
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Tenant Admin User (admin role)', () => {
    const tenantAdminUser = {
      id: 'tenant-admin-1',
      email: 'admin@tenant.com',
      role: 'admin'
    };

    const tenantAdminProfile = {
      id: 'tenant-admin-1',
      email: 'admin@tenant.com',
      role: 'admin' as const,
      organization_id: 'test-org-1',
      first_name: 'Tenant',
      last_name: 'Admin'
    };

    it('should show simplified configuration modal for tenant admin', async () => {
      renderWithProviders(
        <ChannelDashboard />,
        {
          initialUser: tenantAdminUser,
          initialProfile: tenantAdminProfile
        }
      );

      // Wait for instances to load
      await waitFor(() => {
        expect(screen.getByText('Test WhatsApp Instance')).toBeInTheDocument();
      });

      // Click configure button
      const configureButton = screen.getByText('Configurar');
      fireEvent.click(configureButton);

      // Should show basic connection section only
      await waitFor(() => {
        expect(screen.getByText('Estado de Conexión')).toBeInTheDocument();
        expect(screen.getByText('Información básica sobre el estado de tu instancia de WhatsApp.')).toBeInTheDocument();
      });

      // Should NOT show advanced configuration tabs
      expect(screen.queryByText('General')).not.toBeInTheDocument();
      expect(screen.queryByText('Webhook')).not.toBeInTheDocument();
      expect(screen.queryByText('Inteligencia Artificial')).not.toBeInTheDocument();

      // Should show "Cerrar" instead of "Cancelar"
      expect(screen.getByText('Cerrar')).toBeInTheDocument();
      expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();

      // Should NOT show save button
      expect(screen.queryByText('Guardar Cambios')).not.toBeInTheDocument();
    });

    it('should show connection status information for tenant admin', async () => {
      renderWithProviders(
        <ChannelDashboard />,
        {
          initialUser: tenantAdminUser,
          initialProfile: tenantAdminProfile
        }
      );

      // Wait for instances to load
      await waitFor(() => {
        expect(screen.getByText('Test WhatsApp Instance')).toBeInTheDocument();
      });

      // Click configure button
      const configureButton = screen.getByText('Configurar');
      fireEvent.click(configureButton);

      // Should show connection status details
      await waitFor(() => {
        expect(screen.getByText('Conectado')).toBeInTheDocument();
        expect(screen.getByText('+1234567890')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument(); // Messages today
      });

      // Should show informational message for admins
      expect(screen.getByText('ℹ️ Información para Administradores')).toBeInTheDocument();
      expect(screen.getByText('La configuración avanzada está gestionada por el equipo técnico')).toBeInTheDocument();
    });

    it('should allow basic instance actions for tenant admin', async () => {
      renderWithProviders(
        <ChannelDashboard />,
        {
          initialUser: tenantAdminUser,
          initialProfile: tenantAdminProfile
        }
      );

      // Wait for instances to load
      await waitFor(() => {
        expect(screen.getByText('Test WhatsApp Instance')).toBeInTheDocument();
      });

      // Should show connect/disconnect button
      expect(screen.getByText('Desconectar')).toBeInTheDocument(); // Since status is 'connected'

      // Should show delete button
      expect(screen.getByText('Eliminar')).toBeInTheDocument();

      // Should show configure button
      expect(screen.getByText('Configurar')).toBeInTheDocument();
    });
  });

  describe('Superadmin User (superadmin role)', () => {
    const superadminUser = {
      id: 'superadmin-1',
      email: 'superadmin@agentsalud.com',
      role: 'superadmin'
    };

    const superadminProfile = {
      id: 'superadmin-1',
      email: 'superadmin@agentsalud.com',
      role: 'superadmin' as const,
      organization_id: 'test-org-1',
      first_name: 'Super',
      last_name: 'Admin'
    };

    it('should show full configuration modal for superadmin', async () => {
      renderWithProviders(
        <ChannelDashboard />,
        {
          initialUser: superadminUser,
          initialProfile: superadminProfile
        }
      );

      // Wait for instances to load
      await waitFor(() => {
        expect(screen.getByText('Test WhatsApp Instance')).toBeInTheDocument();
      });

      // Click configure button
      const configureButton = screen.getByText('Configurar');
      fireEvent.click(configureButton);

      // Should show all configuration tabs
      await waitFor(() => {
        expect(screen.getByText('General')).toBeInTheDocument();
        expect(screen.getByText('Webhook')).toBeInTheDocument();
        expect(screen.getByText('Inteligencia Artificial')).toBeInTheDocument();
        expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      });

      // Should show "Cancelar" and "Guardar Cambios"
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
    });
  });

  describe('Fallback Component RBAC', () => {
    it('should use action handler instead of direct navigation', async () => {
      const tenantAdminUser = {
        id: 'tenant-admin-1',
        email: 'admin@tenant.com',
        role: 'admin'
      };

      const tenantAdminProfile = {
        id: 'tenant-admin-1',
        email: 'admin@tenant.com',
        role: 'admin' as const,
        organization_id: 'test-org-1',
        first_name: 'Tenant',
        last_name: 'Admin'
      };

      // Test that the fallback component uses action handlers
      renderWithProviders(
        <ChannelDashboard />,
        {
          initialUser: tenantAdminUser,
          initialProfile: tenantAdminProfile
        }
      );

      // Wait for fallback to render
      await waitFor(() => {
        expect(screen.getByText('Test WhatsApp Instance')).toBeInTheDocument();
      });

      // The configure button should not navigate directly but use the action handler
      const configureButton = screen.getByText('Configurar');
      
      // Mock window.location.href to ensure it's not called
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' };

      fireEvent.click(configureButton);

      // Should open modal instead of navigating
      await waitFor(() => {
        expect(screen.getByText('Estado de Conexión')).toBeInTheDocument();
      });

      // Restore window.location
      window.location = originalLocation;
    });
  });

  describe('Page Header Duplication Fix', () => {
    it('should not show duplicate headers', async () => {
      renderWithProviders(
        <ChannelDashboard />,
        {
          initialUser: {
            id: 'test-user',
            email: 'test@example.com',
            role: 'admin'
          },
          initialProfile: {
            id: 'test-user',
            email: 'test@example.com',
            role: 'admin' as const,
            organization_id: 'test-org-1',
            first_name: 'Test',
            last_name: 'User'
          }
        }
      );

      // Should only have one instance of the main heading
      const headings = screen.queryAllByText('Canales de Comunicación');
      expect(headings).toHaveLength(1);
    });
  });
});
