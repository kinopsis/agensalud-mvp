/**
 * WhatsApp Radical Solution Integration Tests
 * 
 * End-to-end tests for the radical solution implementation including
 * single-click creation, auto-naming, and streamlined UX flow.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ChannelDashboard } from '@/components/channels/ChannelDashboard';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

// =====================================================
// MOCKS
// =====================================================

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn()
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

// =====================================================
// TEST SETUP
// =====================================================

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn()
};

const mockProfile = {
  id: 'user-123',
  role: 'admin',
  email: 'admin@test.com'
};

const mockOrganization = {
  id: 'org-123',
  name: 'Test Clinic'
};

const mockQuickCreateResponse = {
  instanceId: 'instance-123',
  instanceName: 'testclinic-whatsapp-1706454123456',
  connectUrl: '/admin/channels/whatsapp/instance-123/connect',
  status: 'disconnected'
};

const mockInstancesResponse = {
  success: true,
  data: []
};

describe('WhatsApp Radical Solution Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({ profile: mockProfile });
    (useTenant as jest.Mock).mockReturnValue({ organization: mockOrganization });
    
    // Mock the instances fetch
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/whatsapp/simple/instances')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInstancesResponse)
        });
      }
      
      if (url.includes('/api/channels/whatsapp/instances/quick-create')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockQuickCreateResponse)
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  // =====================================================
  // INTEGRATION TESTS
  // =====================================================

  it('should render QuickCreateWhatsAppButton in empty state', async () => {
    render(
      <ChannelDashboard 
        organizationId={mockOrganization.id}
        userRole="admin"
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('WhatsApp - Instancias')).toBeInTheDocument();
    });

    // Should show empty state with QuickCreateWhatsAppButton
    expect(screen.getByText('No hay instancias de WhatsApp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear primera instancia whatsapp/i })).toBeInTheDocument();
  });

  it('should render QuickCreateWhatsAppButton in header when instances exist', async () => {
    // Mock response with existing instances
    const mockInstancesWithData = {
      success: true,
      data: [{
        id: 'existing-instance',
        display_name: 'Existing Instance',
        status: 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    };

    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/whatsapp/simple/instances')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInstancesWithData)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    render(
      <ChannelDashboard 
        organizationId={mockOrganization.id}
        userRole="admin"
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('WhatsApp - Instancias')).toBeInTheDocument();
    });

    // Should show header button
    expect(screen.getByRole('button', { name: /nueva instancia whatsapp/i })).toBeInTheDocument();
    
    // Should show existing instance
    expect(screen.getByText('Existing Instance')).toBeInTheDocument();
  });

  it('should execute radical solution flow end-to-end', async () => {
    render(
      <ChannelDashboard 
        organizationId={mockOrganization.id}
        userRole="admin"
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('WhatsApp - Instancias')).toBeInTheDocument();
    });

    // Click the QuickCreateWhatsAppButton
    const createButton = screen.getByRole('button', { name: /crear primera instancia whatsapp/i });
    fireEvent.click(createButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Creando...')).toBeInTheDocument();
    });

    // Should call quick-create API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/channels/whatsapp/instances/quick-create',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('testclinic-whatsapp-')
        })
      );
    });

    // Should navigate to connect view
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(mockQuickCreateResponse.connectUrl);
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/whatsapp/simple/instances')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockInstancesResponse)
        });
      }
      
      if (url.includes('/api/channels/whatsapp/instances/quick-create')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    render(
      <ChannelDashboard 
        organizationId={mockOrganization.id}
        userRole="admin"
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('WhatsApp - Instancias')).toBeInTheDocument();
    });

    // Click the QuickCreateWhatsAppButton
    const createButton = screen.getByRole('button', { name: /crear primera instancia whatsapp/i });
    fireEvent.click(createButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    // Should not navigate
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('should validate user permissions', async () => {
    // Mock user without permissions
    (useAuth as jest.Mock).mockReturnValue({ 
      profile: { ...mockProfile, role: 'user' } 
    });

    render(
      <ChannelDashboard 
        organizationId={mockOrganization.id}
        userRole="admin"
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('WhatsApp - Instancias')).toBeInTheDocument();
    });

    // Click the QuickCreateWhatsAppButton
    const createButton = screen.getByRole('button', { name: /crear primera instancia whatsapp/i });
    fireEvent.click(createButton);

    // Should show permission error
    await waitFor(() => {
      expect(screen.getByText('Permisos insuficientes para crear instancias')).toBeInTheDocument();
    });

    // Should not call API
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/channels/whatsapp/instances/quick-create'),
      expect.any(Object)
    );
  });

  it('should refresh instances list after successful creation', async () => {
    const fetchSpy = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInstancesResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQuickCreateResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [{
            id: mockQuickCreateResponse.instanceId,
            display_name: mockQuickCreateResponse.instanceName,
            status: 'disconnected',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
      });

    (global.fetch as jest.Mock).mockImplementation(fetchSpy);

    render(
      <ChannelDashboard 
        organizationId={mockOrganization.id}
        userRole="admin"
      />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('WhatsApp - Instancias')).toBeInTheDocument();
    });

    // Click create button
    const createButton = screen.getByRole('button', { name: /crear primera instancia whatsapp/i });
    fireEvent.click(createButton);

    // Wait for creation and refresh
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(3); // Initial load + create + refresh
    });

    // Should call instances API again to refresh
    expect(fetchSpy).toHaveBeenLastCalledWith('/api/whatsapp/simple/instances');
  });
});
