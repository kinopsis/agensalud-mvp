/**
 * DashboardLayout Tests
 * Comprehensive testing for improved mobile navigation and accessibility
 * Tests responsive design, ARIA compliance, and UX improvements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import DashboardLayout from '@/components/dashboard/DashboardLayout';

// Mock the contexts
const mockUser = {
  id: '1',
  email: 'test@example.com'
};

const mockProfile = {
  id: '1',
  first_name: 'John',
  last_name: 'Doe',
  role: 'admin' as const,
  email: 'test@example.com'
};

const mockOrganization = {
  id: '1',
  name: 'Test Organization'
};

const mockAuthContext = {
  user: mockUser,
  profile: mockProfile,
  session: null,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn()
};

const mockTenantContext = {
  organization: mockOrganization,
  loading: false,
  switchOrganization: jest.fn(),
  refreshOrganization: jest.fn()
};

// Mock the context hooks
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => mockTenantContext
}));

// Mock the Breadcrumbs component
jest.mock('@/components/ui/Breadcrumbs', () => {
  return function MockBreadcrumbs() {
    return <div data-testid="breadcrumbs">Breadcrumbs</div>;
  };
});

// Mock the LogoutConfirmationDialog component
jest.mock('@/components/common/LogoutConfirmationDialog', () => {
  return function MockLogoutDialog({ isOpen, onClose, onConfirm }: any) {
    return isOpen ? (
      <div data-testid="logout-dialog">
        <button onClick={onClose} data-testid="cancel-logout">Cancel</button>
        <button onClick={onConfirm} data-testid="confirm-logout">Confirm</button>
      </div>
    ) : null;
  };
});

describe('DashboardLayout', () => {
  const defaultProps = {
    title: 'Test Dashboard',
    subtitle: 'Test subtitle',
    children: <div data-testid="dashboard-content">Dashboard Content</div>
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders dashboard content', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    test('renders user information', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    test('renders navigation items for admin role', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Citas')).toBeInTheDocument();
      expect(screen.getByText('Usuarios')).toBeInTheDocument();
      expect(screen.getByText('Servicios')).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    test('mobile menu button is visible on small screens', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveClass('lg:hidden');
    });

    test('opens mobile sidebar when menu button is clicked', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      await waitFor(() => {
        const mobileSidebar = screen.getByRole('dialog');
        expect(mobileSidebar).toBeInTheDocument();
        expect(mobileSidebar).toHaveAttribute('aria-modal', 'true');
      });
    });

    test('closes mobile sidebar when close button is clicked', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      // Open sidebar
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close sidebar
      const closeButton = screen.getByLabelText('Cerrar menú de navegación');
      fireEvent.click(closeButton);

      await waitFor(() => {
        const mobileSidebar = screen.queryByRole('dialog');
        expect(mobileSidebar).toHaveAttribute('aria-hidden', 'true');
      });
    });

    test('closes mobile sidebar when overlay is clicked', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      // Open sidebar
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click overlay
      const overlay = screen.getByLabelText('Cerrar menú de navegación');
      fireEvent.click(overlay);

      await waitFor(() => {
        const mobileSidebar = screen.queryByRole('dialog');
        expect(mobileSidebar).toHaveAttribute('aria-hidden', 'true');
      });
    });

    test('mobile navigation has proper ARIA attributes', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-sidebar');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(menuButton).toHaveAttribute('aria-expanded', 'true');
        
        const mobileSidebar = screen.getByRole('dialog');
        expect(mobileSidebar).toHaveAttribute('id', 'mobile-sidebar');
        expect(mobileSidebar).toHaveAttribute('aria-labelledby', 'mobile-menu-title');
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper heading structure', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Test Dashboard');
    });

    test('navigation has proper ARIA labels', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const desktopNav = screen.getByLabelText('Navegación principal móvil');
      expect(desktopNav).toBeInTheDocument();
    });

    test('navigation items have proper accessibility attributes', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      const navItems = screen.getAllByRole('listitem');
      expect(navItems.length).toBeGreaterThan(0);

      const firstNavLink = screen.getByLabelText('Ir a Dashboard');
      expect(firstNavLink).toBeInTheDocument();
    });

    test('search input has proper labels', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const searchInput = screen.getByLabelText('Buscar en el sistema');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('id', 'global-search');
    });

    test('notification button has proper accessibility', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const notificationButton = screen.getByLabelText('Ver notificaciones (1 nueva)');
      expect(notificationButton).toBeInTheDocument();
    });

    test('logout button has proper accessibility', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const logoutButton = screen.getByLabelText('Cerrar sesión');
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('title truncates on small screens', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const title = screen.getByText('Test Dashboard');
      expect(title).toHaveClass('truncate');
    });

    test('subtitle truncates on small screens', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const subtitle = screen.getByText('Test subtitle');
      expect(subtitle).toHaveClass('truncate');
    });

    test('breadcrumbs are hidden on small screens', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const breadcrumbsContainer = screen.getByTestId('breadcrumbs').parentElement;
      expect(breadcrumbsContainer).toHaveClass('hidden', 'sm:block');
    });

    test('search is hidden on mobile', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const searchContainer = screen.getByLabelText('Buscar en el sistema').parentElement?.parentElement;
      expect(searchContainer).toHaveClass('hidden', 'md:block');
    });
  });

  describe('Touch Interactions', () => {
    test('navigation items have touch-manipulation class', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      fireEvent.click(menuButton);

      await waitFor(() => {
        const navLinks = screen.getAllByRole('link');
        navLinks.forEach(link => {
          expect(link).toHaveClass('touch-manipulation');
        });
      });
    });

    test('buttons have proper touch targets', () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const menuButton = screen.getByLabelText('Abrir menú de navegación');
      expect(menuButton).toHaveClass('p-2'); // Ensures minimum 44px touch target
    });
  });

  describe('Logout Functionality', () => {
    test('opens logout confirmation dialog', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const logoutButton = screen.getByLabelText('Cerrar sesión');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('logout-dialog')).toBeInTheDocument();
      });
    });

    test('calls signOut when logout is confirmed', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const logoutButton = screen.getByLabelText('Cerrar sesión');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('logout-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId('confirm-logout');
      fireEvent.click(confirmButton);

      expect(mockAuthContext.signOut).toHaveBeenCalledTimes(1);
    });

    test('cancels logout when cancel is clicked', async () => {
      render(<DashboardLayout {...defaultProps} />);
      
      const logoutButton = screen.getByLabelText('Cerrar sesión');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('logout-dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('cancel-logout');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('logout-dialog')).not.toBeInTheDocument();
      });

      expect(mockAuthContext.signOut).not.toHaveBeenCalled();
    });
  });

  describe('Role-based Navigation', () => {
    test('shows different navigation for different roles', () => {
      const patientProfile = { ...mockProfile, role: 'patient' as const };
      const patientAuthContext = { ...mockAuthContext, profile: patientProfile };

      jest.mocked(require('@/contexts/auth-context').useAuth).mockReturnValue(patientAuthContext);

      render(<DashboardLayout {...defaultProps} />);
      
      expect(screen.getByText('Citas')).toBeInTheDocument();
      expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
      expect(screen.queryByText('Servicios')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading state when user is not available', () => {
      const loadingAuthContext = { ...mockAuthContext, user: null, profile: null };
      jest.mocked(require('@/contexts/auth-context').useAuth).mockReturnValue(loadingAuthContext);

      render(<DashboardLayout {...defaultProps} />);
      
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
      expect(screen.getByText('Obteniendo información del usuario')).toBeInTheDocument();
    });
  });
});
