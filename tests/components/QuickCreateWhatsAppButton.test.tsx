/**
 * QuickCreateWhatsAppButton Component Tests
 * 
 * Tests for the radical solution single-click WhatsApp instance creation
 * component including auto-naming, navigation, and error handling.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { QuickCreateWhatsAppButton } from '@/components/channels/QuickCreateWhatsAppButton';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

// =====================================================
// MOCKS
// =====================================================

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock auth context
jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn()
}));

// Mock tenant context
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

describe('QuickCreateWhatsAppButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue({ profile: mockProfile });
    (useTenant as jest.Mock).mockReturnValue({ organization: mockOrganization });
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockQuickCreateResponse)
    });
  });

  // =====================================================
  // BASIC RENDERING TESTS
  // =====================================================

  it('should render the quick create button', () => {
    render(<QuickCreateWhatsAppButton />);
    
    expect(screen.getByRole('button', { name: /crear instancia whatsapp/i })).toBeInTheDocument();
    expect(screen.getByText('⚡ Creación instantánea con auto-configuración')).toBeInTheDocument();
  });

  it('should show icon by default', () => {
    render(<QuickCreateWhatsAppButton />);
    
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should hide icon when showIcon is false', () => {
    render(<QuickCreateWhatsAppButton showIcon={false} />);
    
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).not.toBeInTheDocument();
  });

  // =====================================================
  // FUNCTIONALITY TESTS
  // =====================================================

  it('should handle successful quick create', async () => {
    const onSuccess = jest.fn();
    
    render(<QuickCreateWhatsAppButton onSuccess={onSuccess} />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Creando...')).toBeInTheDocument();
    });

    // Should call API with correct data
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

    // Should call success callback
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        mockQuickCreateResponse.instanceId,
        mockQuickCreateResponse.connectUrl
      );
    });

    // Should navigate to connect view
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(mockQuickCreateResponse.connectUrl);
    });
  });

  it('should handle API errors', async () => {
    const onError = jest.fn();
    const errorMessage = 'Failed to create instance';
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: errorMessage })
    });

    render(<QuickCreateWhatsAppButton onError={onError} />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('should handle network errors', async () => {
    const onError = jest.fn();
    
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<QuickCreateWhatsAppButton onError={onError} />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith('Network error');
    });
  });

  // =====================================================
  // VALIDATION TESTS
  // =====================================================

  it('should validate user authentication', async () => {
    (useAuth as jest.Mock).mockReturnValue({ profile: null });

    render(<QuickCreateWhatsAppButton />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Usuario no autenticado')).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should validate organization', async () => {
    (useTenant as jest.Mock).mockReturnValue({ organization: null });

    render(<QuickCreateWhatsAppButton />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Organización no encontrada')).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should validate user permissions', async () => {
    (useAuth as jest.Mock).mockReturnValue({ 
      profile: { ...mockProfile, role: 'user' } 
    });

    render(<QuickCreateWhatsAppButton />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Permisos insuficientes para crear instancias')).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  // =====================================================
  // AUTO-NAMING TESTS
  // =====================================================

  it('should generate correct auto-naming pattern', async () => {
    render(<QuickCreateWhatsAppButton />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    
    expect(requestBody.instanceName).toMatch(/^testclinic-whatsapp-\d+$/);
    expect(requestBody.organizationId).toBe(mockOrganization.id);
  });

  it('should clean organization name for auto-naming', async () => {
    (useTenant as jest.Mock).mockReturnValue({ 
      organization: { ...mockOrganization, name: 'Test Clinic & Hospital!' } 
    });

    render(<QuickCreateWhatsAppButton />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    
    expect(requestBody.instanceName).toMatch(/^testclinichospital-whatsapp-\d+$/);
  });

  // =====================================================
  // DISABLED STATE TESTS
  // =====================================================

  it('should respect disabled prop', () => {
    render(<QuickCreateWhatsAppButton disabled={true} />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    expect(button).toBeDisabled();
  });

  it('should disable button during creation', async () => {
    render(<QuickCreateWhatsAppButton />);
    
    const button = screen.getByRole('button', { name: /crear instancia whatsapp/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });
});
