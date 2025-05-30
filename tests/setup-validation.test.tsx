/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component that uses auth context
function TestAuthComponent() {
  const { useAuth } = require('@/contexts/auth-context');
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>No user</div>;
  }

  return (
    <div>
      <h1>Welcome {user.profiles?.first_name}</h1>
      <p>Role: {user.role}</p>
      <p>Organization: {user.organization_id}</p>
    </div>
  );
}

// Simple test component that uses tenant context
function TestTenantComponent() {
  const { useTenant } = require('@/contexts/tenant-context');
  const { organization, loading } = useTenant();

  if (loading) {
    return <div>Loading organization...</div>;
  }

  if (!organization) {
    return <div>No organization</div>;
  }

  return (
    <div>
      <h1>Organization: {organization.name}</h1>
      <p>Plan: {organization.subscription_plan}</p>
    </div>
  );
}

describe('Jest Setup Validation', () => {
  describe('Context Mocks', () => {
    it('should mock auth context correctly', async () => {
      render(<TestAuthComponent />);

      // Should not show loading
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.queryByText('No user')).not.toBeInTheDocument();

      // Should show mocked user data
      expect(screen.getByText('Welcome Test')).toBeInTheDocument();
      expect(screen.getByText('Role: patient')).toBeInTheDocument();
      expect(screen.getByText('Organization: test-org-id')).toBeInTheDocument();
    });

    it('should mock tenant context correctly', async () => {
      render(<TestTenantComponent />);

      // Should not show loading
      expect(screen.queryByText('Loading organization...')).not.toBeInTheDocument();
      expect(screen.queryByText('No organization')).not.toBeInTheDocument();

      // Should show mocked organization data
      expect(screen.getByText('Organization: Test Organization')).toBeInTheDocument();
      expect(screen.getByText('Plan: basic')).toBeInTheDocument();
    });
  });

  describe('Fetch Mocks', () => {
    it('should mock fetch for services API', async () => {
      const response = await fetch('/api/services?organizationId=test-org-id');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.services).toHaveLength(1);
      expect(data.services[0].name).toBe('Examen Visual Completo');
    });

    it('should mock fetch for doctors API', async () => {
      const response = await fetch('/api/doctors?organizationId=test-org-id');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.doctors).toHaveLength(1);
      expect(data.doctors[0].specialization).toBe('Optometría');
    });

    it('should mock fetch for users API', async () => {
      const response = await fetch('/api/users?organizationId=test-org-id');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].role).toBe('doctor');
    });

    it('should mock fetch for dashboard API', async () => {
      const response = await fetch('/api/dashboard/superadmin');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.stats.totalAppointments).toBe(10);
      expect(data.stats.systemHealth).toBe('excellent');
    });
  });

  describe('Router Mocks', () => {
    it('should mock Next.js router', () => {
      const { useRouter } = require('next/navigation');
      const router = useRouter();

      expect(router.push).toBeDefined();
      expect(router.replace).toBeDefined();
      expect(router.back).toBeDefined();
      expect(router.refresh).toBeDefined();
    });

    it('should mock useSearchParams', () => {
      const { useSearchParams } = require('next/navigation');
      const searchParams = useSearchParams();

      expect(searchParams.get).toBeDefined();
    });

    it('should mock usePathname', () => {
      const { usePathname } = require('next/navigation');
      const pathname = usePathname();

      expect(pathname).toBe('/test');
    });
  });

  describe('Global Setup', () => {
    it('should have global fetch mock', () => {
      expect(global.fetch).toBeDefined();
      expect(jest.isMockFunction(global.fetch)).toBe(true);
    });

    it('should clear mocks between tests', () => {
      // This test verifies that mocks are cleared
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(0);
    });
  });
});
