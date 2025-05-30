/**
 * SuperAdmin Organizations Page Tests
 * Testing organization management functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SuperAdminOrganizationsPage from '@/app/(dashboard)/superadmin/organizations/page';
import { useAuth } from '@/contexts/auth-context';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth context
jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('SuperAdminOrganizationsPage', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);

    mockUseAuth.mockReturnValue({
      profile: {
        id: '1',
        role: 'superadmin',
        first_name: 'Super',
        last_name: 'Admin',
        email: 'superadmin@example.com'
      }
    } as any);

    mockFetch.mockClear();
    mockPush.mockClear();
  });

  describe('Authentication and Authorization', () => {
    it('redirects non-superadmin users', () => {
      mockUseAuth.mockReturnValue({
        profile: {
          id: '1',
          role: 'admin',
          first_name: 'Regular',
          last_name: 'Admin',
          email: 'admin@example.com'
        }
      } as any);

      render(<SuperAdminOrganizationsPage />);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('shows access denied for non-superadmin users', () => {
      mockUseAuth.mockReturnValue({
        profile: {
          id: '1',
          role: 'admin',
          first_name: 'Regular',
          last_name: 'Admin',
          email: 'admin@example.com'
        }
      } as any);

      render(<SuperAdminOrganizationsPage />);

      expect(screen.getByText('Acceso Denegado')).toBeInTheDocument();
      expect(screen.getByText('Solo los SuperAdmins pueden acceder a esta página.')).toBeInTheDocument();
    });

    it('allows access for superadmin users', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      expect(screen.getByText('Gestión de Organizaciones')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SuperAdminOrganizationsPage />);

      expect(screen.getByText('Cargando organizaciones...')).toBeInTheDocument();
    });

    it('loads and displays organizations', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Test Organization',
          slug: 'test-org',
          email: 'test@example.com',
          phone: '+1234567890',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 5,
          appointment_count: 10
        },
        {
          id: '2',
          name: 'Another Org',
          slug: 'another-org',
          email: 'another@example.com',
          is_active: false,
          created_at: '2024-01-02T00:00:00Z',
          user_count: 3,
          appointment_count: 7
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument();
        expect(screen.getByText('Another Org')).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar las organizaciones')).toBeInTheDocument();
      });
    });

    it('handles empty organization list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('No hay organizaciones')).toBeInTheDocument();
        expect(screen.getByText('Aún no hay organizaciones registradas.')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('calculates and displays correct statistics', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Org 1',
          slug: 'org-1',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 5,
          appointment_count: 10
        },
        {
          id: '2',
          name: 'Org 2',
          slug: 'org-2',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          user_count: 3,
          appointment_count: 7
        },
        {
          id: '3',
          name: 'Org 3',
          slug: 'org-3',
          is_active: false,
          created_at: '2024-01-03T00:00:00Z',
          user_count: 2,
          appointment_count: 5
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Total organizations
        expect(screen.getByText('2')).toBeInTheDocument(); // Active organizations
        expect(screen.getByText('10')).toBeInTheDocument(); // Total users (5+3+2)
        expect(screen.getByText('22')).toBeInTheDocument(); // Total appointments (10+7+5)
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters organizations by search term', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Test Organization',
          slug: 'test-org',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 5,
          appointment_count: 10
        },
        {
          id: '2',
          name: 'Another Company',
          slug: 'another-company',
          email: 'another@example.com',
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          user_count: 3,
          appointment_count: 7
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument();
        expect(screen.getByText('Another Company')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar organizaciones...');
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      expect(screen.getByText('Test Organization')).toBeInTheDocument();
      expect(screen.queryByText('Another Company')).not.toBeInTheDocument();
    });

    it('shows no results message when search yields no matches', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Test Organization',
          slug: 'test-org',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 5,
          appointment_count: 10
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Buscar organizaciones...');
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      expect(screen.getByText('No hay organizaciones')).toBeInTheDocument();
      expect(screen.getByText('No se encontraron organizaciones con los criterios de búsqueda.')).toBeInTheDocument();
    });
  });

  describe('Navigation Actions', () => {
    it('navigates to new organization page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        const newOrgButton = screen.getByText('Nueva Organización');
        fireEvent.click(newOrgButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/superadmin/organizations/new');
    });

    it('navigates back to dashboard', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        const backButton = screen.getByText('Volver al Dashboard');
        fireEvent.click(backButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('navigates to organization details', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Test Organization',
          slug: 'test-org',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 5,
          appointment_count: 10
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        const viewButton = screen.getByTitle('Ver detalles');
        fireEvent.click(viewButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/superadmin/organizations/1');
    });

    it('navigates to organization edit', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Test Organization',
          slug: 'test-org',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 5,
          appointment_count: 10
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        const editButton = screen.getByTitle('Editar');
        fireEvent.click(editButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/superadmin/organizations/1/edit');
    });
  });

  describe('Organization Display', () => {
    it('displays organization information correctly', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Test Organization',
          slug: 'test-org',
          email: 'test@example.com',
          phone: '+1234567890',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 5,
          appointment_count: 10
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument();
        expect(screen.getByText('@test-org')).toBeInTheDocument();
        expect(screen.getByText('📧 test@example.com')).toBeInTheDocument();
        expect(screen.getByText('📞 +1234567890')).toBeInTheDocument();
        expect(screen.getByText('5 usuarios')).toBeInTheDocument();
        expect(screen.getByText('10 citas')).toBeInTheDocument();
        expect(screen.getByText('Activa')).toBeInTheDocument();
      });
    });

    it('shows inactive status for inactive organizations', async () => {
      const mockOrganizations = [
        {
          id: '1',
          name: 'Inactive Org',
          slug: 'inactive-org',
          email: 'inactive@example.com',
          is_active: false,
          created_at: '2024-01-01T00:00:00Z',
          user_count: 0,
          appointment_count: 0
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockOrganizations })
      } as Response);

      render(<SuperAdminOrganizationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Inactiva')).toBeInTheDocument();
      });
    });
  });
});
