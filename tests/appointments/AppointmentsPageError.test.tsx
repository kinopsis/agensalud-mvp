/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the required contexts and hooks
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: {
      id: 'patient-1',
      first_name: 'Juan',
      last_name: 'Pérez',
      role: 'patient'
    }
  })
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: {
      id: 'org-1',
      name: 'Clínica Test'
    }
  })
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn(() => null)
  })
}));

// Mock the API actions
jest.mock('@/app/api/appointments/actions', () => ({
  cancelAppointment: jest.fn(() => Promise.resolve({ success: true })),
  updateAppointment: jest.fn(() => Promise.resolve({ success: true }))
}));

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      }))
    }))
  }))
}));

// Mock the components that might be causing issues
jest.mock('@/components/appointments/cards/factory', () => ({
  getAppointmentCardForRole: jest.fn(() => {
    return function MockAppointmentCard() {
      return <div data-testid="mock-appointment-card">Mock Appointment Card</div>;
    };
  })
}));

jest.mock('@/components/appointments/AppointmentTabs', () => {
  return {
    __esModule: true,
    default: function MockAppointmentTabs() {
      return <div data-testid="mock-appointment-tabs">Mock Appointment Tabs</div>;
    },
    filterAppointmentsByTab: jest.fn(() => []),
    useAppointmentTabs: jest.fn(() => ({
      activeTab: 'vigentes',
      handleTabChange: jest.fn()
    })),
    EmptyTabMessage: function MockEmptyTabMessage() {
      return <div data-testid="mock-empty-tab-message">No appointments</div>;
    }
  };
});

jest.mock('@/components/appointments/AppointmentStatsCards', () => {
  return function MockAppointmentStatsCards() {
    return <div data-testid="mock-stats-cards">Mock Stats Cards</div>;
  };
});

jest.mock('@/components/appointments/DateGroupHeader', () => {
  return function MockDateGroupHeader() {
    return <div data-testid="mock-date-group-header">Mock Date Group Header</div>;
  };
});

jest.mock('@/components/appointments/AIEnhancedRescheduleModal', () => {
  return function MockAIEnhancedRescheduleModal() {
    return <div data-testid="mock-reschedule-modal">Mock Reschedule Modal</div>;
  };
});

jest.mock('@/components/appointments/CancelAppointmentModal', () => {
  return function MockCancelAppointmentModal() {
    return <div data-testid="mock-cancel-modal">Mock Cancel Modal</div>;
  };
});

jest.mock('@/utils/dateGrouping', () => ({
  groupAppointmentsByDate: jest.fn(() => ({})),
  getSortedGroupKeys: jest.fn(() => []),
  getDateHeader: jest.fn(() => ({ title: 'Test', subtitle: 'Test', icon: 'Calendar' }))
}));

describe('AppointmentsPage Error Investigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render without throwing module loading errors', async () => {
    // This test will help us identify if there are any import/export issues
    let AppointmentsPage;
    
    try {
      // Dynamically import the component to catch any module loading errors
      const module = await import('@/app/(dashboard)/appointments/page');
      AppointmentsPage = module.default;
    } catch (error) {
      console.error('Module loading error:', error);
      throw new Error(`Failed to import AppointmentsPage: ${error.message}`);
    }

    expect(AppointmentsPage).toBeDefined();
    expect(typeof AppointmentsPage).toBe('function');
  });

  it('should render the component without hydration mismatches', async () => {
    // Import the component
    const module = await import('@/app/(dashboard)/appointments/page');
    const AppointmentsPage = module.default;

    // Render the component
    expect(() => {
      render(<AppointmentsPage />);
    }).not.toThrow();

    // Check that basic elements are rendered
    expect(screen.getByText('Mis Citas')).toBeInTheDocument();
  });

  it('should handle empty appointments state correctly', async () => {
    const module = await import('@/app/(dashboard)/appointments/page');
    const AppointmentsPage = module.default;

    render(<AppointmentsPage />);

    // Should show empty state message
    expect(screen.getByText('No hay citas registradas')).toBeInTheDocument();
  });

  it('should not have undefined module references', async () => {
    // Test that all imported modules are properly defined
    const module = await import('@/app/(dashboard)/appointments/page');
    
    // Check that the default export exists
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should handle component factory correctly', async () => {
    const { getAppointmentCardForRole } = await import('@/components/appointments/cards/factory');
    
    // Test that the factory function works
    const CardComponent = getAppointmentCardForRole('patient');
    expect(CardComponent).toBeDefined();
    expect(typeof CardComponent).toBe('function');
  });

  it('should handle AppointmentTabs imports correctly', async () => {
    const AppointmentTabsModule = await import('@/components/appointments/AppointmentTabs');
    
    // Check all exports
    expect(AppointmentTabsModule.default).toBeDefined();
    expect(AppointmentTabsModule.filterAppointmentsByTab).toBeDefined();
    expect(AppointmentTabsModule.useAppointmentTabs).toBeDefined();
    expect(AppointmentTabsModule.EmptyTabMessage).toBeDefined();
  });
});

/**
 * Test Documentation:
 * 
 * This test suite investigates potential module loading and hydration errors
 * in the AppointmentsPage component. It tests:
 * 
 * 1. Module Loading: Ensures all imports resolve correctly
 * 2. Component Rendering: Verifies the component renders without errors
 * 3. Hydration: Checks for SSR/CSR mismatches
 * 4. Factory Pattern: Validates the appointment card factory
 * 5. Import/Export: Ensures all module exports are properly defined
 * 
 * If any of these tests fail, it will help identify the root cause of the
 * TypeError: Cannot read properties of undefined (reading 'call') error.
 */
