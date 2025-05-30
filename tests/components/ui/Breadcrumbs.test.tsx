/**
 * Breadcrumbs Component Tests
 * Comprehensive testing for breadcrumb navigation functionality
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Breadcrumbs, { useBreadcrumbs } from '@/components/ui/Breadcrumbs';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock auth context
jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock tenant context
jest.mock('@/contexts/tenant-context', () => ({
  useTenant: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseTenant = useTenant as jest.MockedFunction<typeof useTenant>;

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      profile: {
        id: '1',
        role: 'admin',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      }
    } as any);

    mockUseTenant.mockReturnValue({
      organization: {
        id: '1',
        name: 'Test Organization',
        slug: 'test-org'
      }
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Breadcrumbs', () => {
    it('renders custom breadcrumb items correctly', () => {
      const customItems = [
        { label: 'Home', href: '/' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Users', isActive: true }
      ];

      render(<Breadcrumbs items={customItems} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('renders home icon when showHome is true', () => {
      const customItems = [
        { label: 'Dashboard', isActive: true }
      ];

      render(<Breadcrumbs items={customItems} showHome={true} />);

      const homeLink = screen.getByRole('link');
      expect(homeLink).toHaveAttribute('href', '/dashboard');
    });

    it('does not render home icon when showHome is false', () => {
      const customItems = [
        { label: 'Dashboard', isActive: true }
      ];

      render(<Breadcrumbs items={customItems} showHome={false} />);

      const links = screen.queryAllByRole('link');
      expect(links).toHaveLength(0);
    });

    it('applies custom className', () => {
      const customItems = [
        { label: 'Test', isActive: true }
      ];

      const { container } = render(
        <Breadcrumbs items={customItems} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Auto-generated Breadcrumbs', () => {
    it('generates breadcrumbs for SuperAdmin routes', () => {
      mockUsePathname.mockReturnValue('/superadmin/organizations');
      mockUseAuth.mockReturnValue({
        profile: { role: 'superadmin' }
      } as any);

      render(<Breadcrumbs />);

      expect(screen.getByText('SuperAdmin')).toBeInTheDocument();
      expect(screen.getByText('Organizaciones')).toBeInTheDocument();
    });

    it('generates breadcrumbs for regular user routes', () => {
      mockUsePathname.mockReturnValue('/appointments/book');
      mockUseAuth.mockReturnValue({
        profile: { role: 'patient' }
      } as any);

      render(<Breadcrumbs />);

      expect(screen.getByText('Citas')).toBeInTheDocument();
      expect(screen.getByText('Agendar')).toBeInTheDocument();
    });

    it('handles dashboard root path correctly', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });

    it('handles dynamic ID segments', () => {
      mockUsePathname.mockReturnValue('/users/123e4567-e89b-12d3-a456-426614174000');
      mockUseAuth.mockReturnValue({
        profile: { role: 'admin' }
      } as any);

      render(<Breadcrumbs />);

      expect(screen.getByText('Usuarios')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('renders clickable links for non-active items', () => {
      const customItems = [
        { label: 'Home', href: '/' },
        { label: 'Current', isActive: true }
      ];

      render(<Breadcrumbs items={customItems} />);

      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink).toHaveAttribute('href', '/');

      const currentItem = screen.getByText('Current');
      expect(currentItem).not.toHaveAttribute('href');
    });

    it('applies correct styling for active items', () => {
      const customItems = [
        { label: 'Active Item', isActive: true }
      ];

      render(<Breadcrumbs items={customItems} />);

      const activeItem = screen.getByText('Active Item');
      expect(activeItem).toHaveClass('text-gray-900', 'font-medium');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA label', () => {
      const customItems = [
        { label: 'Test', isActive: true }
      ];

      render(<Breadcrumbs items={customItems} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('uses ordered list structure', () => {
      const customItems = [
        { label: 'First', href: '/first' },
        { label: 'Second', isActive: true }
      ];

      render(<Breadcrumbs items={customItems} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3); // Home + 2 custom items
    });
  });

  describe('Edge Cases', () => {
    it('returns null when no breadcrumb items', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });

    it('handles missing organization data', () => {
      mockUsePathname.mockReturnValue('/organizations/123');
      mockUseTenant.mockReturnValue({
        organization: null
      } as any);

      render(<Breadcrumbs />);

      expect(screen.getByText('Organización')).toBeInTheDocument();
    });

    it('handles missing user profile', () => {
      mockUsePathname.mockReturnValue('/users');
      mockUseAuth.mockReturnValue({
        profile: null
      } as any);

      render(<Breadcrumbs />);

      expect(screen.getByText('Users')).toBeInTheDocument();
    });
  });
});

describe('useBreadcrumbs Hook', () => {
  const TestComponent = ({ customItems }: { customItems?: any[] }) => {
    const breadcrumbs = useBreadcrumbs(customItems);
    return (
      <div>
        {breadcrumbs.map((item, index) => (
          <span key={index}>{item.label}</span>
        ))}
      </div>
    );
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      profile: { role: 'admin' }
    } as any);

    mockUseTenant.mockReturnValue({
      organization: { name: 'Test Org' }
    } as any);
  });

  it('returns custom items when provided', () => {
    const customItems = [
      { label: 'Custom', isActive: true }
    ];

    render(<TestComponent customItems={customItems} />);

    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('generates breadcrumbs from pathname when no custom items', () => {
    mockUsePathname.mockReturnValue('/users');

    render(<TestComponent />);

    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('updates when pathname changes', () => {
    mockUsePathname.mockReturnValue('/users');

    const { rerender } = render(<TestComponent />);
    expect(screen.getByText('Usuarios')).toBeInTheDocument();

    mockUsePathname.mockReturnValue('/settings');
    rerender(<TestComponent />);
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });
});
