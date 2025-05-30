/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import UsersPage from '@/app/(dashboard)/users/page';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

// Mock dependencies
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

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn()
};

const mockAdminProfile = {
  id: 'admin-1',
  email: 'admin@test.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  organization_id: 'org-1'
};

const mockSuperAdminProfile = {
  id: 'superadmin-1',
  email: 'superadmin@test.com',
  first_name: 'Super',
  last_name: 'Admin',
  role: 'superadmin',
  organization_id: 'org-1'
};

const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org'
};

const mockUsers = [
  {
    id: 'user-1',
    email: 'doctor@test.com',
    first_name: 'Dr. John',
    last_name: 'Doe',
    role: 'doctor',
    organization_id: 'org-1',
    organization_name: 'Test Organization',
    created_at: '2024-01-01T00:00:00Z',
    is_active: true,
    last_sign_in_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'user-2',
    email: 'patient@test.com',
    first_name: 'Jane',
    last_name: 'Smith',
    role: 'patient',
    organization_id: 'org-1',
    organization_name: 'Test Organization',
    created_at: '2024-01-02T00:00:00Z',
    is_active: true,
    last_sign_in_at: '2024-01-14T15:30:00Z'
  }
];

describe('UsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useTenant as jest.Mock).mockReturnValue({ organization: mockOrganization });
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUsers })
    });
  });

  describe('Admin Access', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ profile: mockAdminProfile });
    });

    it('renders users page for admin', async () => {
      render(<UsersPage />);
      
      expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument();
      expect(screen.getByText('Organización: Test Organization')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('shows correct role badges', async () => {
      render(<UsersPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Doctor')).toBeInTheDocument();
        expect(screen.getByText('Paciente')).toBeInTheDocument();
      });
    });

    it('allows filtering by role', async () => {
      render(<UsersPage />);
      
      // Open filters
      fireEvent.click(screen.getByText('Filtros'));
      
      // Select doctor role
      const roleSelect = screen.getByLabelText('Rol');
      fireEvent.change(roleSelect, { target: { value: 'doctor' } });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('role=doctor')
        );
      });
    });

    it('allows searching users', async () => {
      render(<UsersPage />);
      
      // Open filters
      fireEvent.click(screen.getByText('Filtros'));
      
      // Search for a user
      const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=John')
        );
      });
    });

    it('navigates to new user page', () => {
      render(<UsersPage />);
      
      fireEvent.click(screen.getByText('Nuevo Usuario'));
      expect(mockRouter.push).toHaveBeenCalledWith('/users/new');
    });

    it('navigates to user details', async () => {
      render(<UsersPage />);
      
      await waitFor(() => {
        const viewButtons = screen.getAllByTitle('Ver detalles');
        fireEvent.click(viewButtons[0]);
        expect(mockRouter.push).toHaveBeenCalledWith('/users/user-1');
      });
    });
  });

  describe('SuperAdmin Access', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ profile: mockSuperAdminProfile });
    });

    it('renders users page for superadmin', async () => {
      render(<UsersPage />);
      
      expect(screen.getByText('Gestión de Usuarios')).toBeInTheDocument();
      expect(screen.getByText('Sistema completo')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
      });
    });

    it('shows organization column for superadmin', async () => {
      render(<UsersPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Organización')).toBeInTheDocument();
        expect(screen.getByText('Test Organization')).toBeInTheDocument();
      });
    });

    it('shows superadmin role option in filters', () => {
      render(<UsersPage />);
      
      fireEvent.click(screen.getByText('Filtros'));
      
      const roleSelect = screen.getByLabelText('Rol');
      expect(roleSelect).toHaveTextContent('Super Admin');
    });
  });

  describe('Access Control', () => {
    it('redirects non-admin users', () => {
      const patientProfile = { ...mockAdminProfile, role: 'patient' };
      (useAuth as jest.Mock).mockReturnValue({ profile: patientProfile });
      
      render(<UsersPage />);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('shows access denied for unauthorized users', () => {
      const patientProfile = { ...mockAdminProfile, role: 'patient' };
      (useAuth as jest.Mock).mockReturnValue({ profile: patientProfile });
      
      render(<UsersPage />);
      
      expect(screen.getByText('Acceso Denegado')).toBeInTheDocument();
      expect(screen.getByText('No tienes permisos para acceder a esta página.')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      (useAuth as jest.Mock).mockReturnValue({ profile: mockAdminProfile });
      
      render(<UsersPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Error al cargar usuarios. Por favor intenta de nuevo.')).toBeInTheDocument();
      });
    });

    it('shows empty state when no users found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });
      (useAuth as jest.Mock).mockReturnValue({ profile: mockAdminProfile });
      
      render(<UsersPage />);
      
      await waitFor(() => {
        expect(screen.getByText('No hay usuarios')).toBeInTheDocument();
        expect(screen.getByText('Aún no hay usuarios registrados.')).toBeInTheDocument();
      });
    });
  });

  describe('User Actions', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({ profile: mockAdminProfile });
    });

    it('handles user activation/deactivation', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockUsers })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockUsers })
        });
      
      render(<UsersPage />);
      
      await waitFor(() => {
        const actionButtons = screen.getAllByTitle('Desactivar');
        fireEvent.click(actionButtons[0]);
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/users/user-1',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deactivate' })
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner while fetching users', () => {
      (useAuth as jest.Mock).mockReturnValue({ profile: mockAdminProfile });
      
      // Mock a pending promise
      (fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
      
      render(<UsersPage />);
      
      expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders mobile-friendly layout', async () => {
      (useAuth as jest.Mock).mockReturnValue({ profile: mockAdminProfile });
      
      render(<UsersPage />);
      
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toHaveClass('min-w-full');
      });
    });
  });
});
