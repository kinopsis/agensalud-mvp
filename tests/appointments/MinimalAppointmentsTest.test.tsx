/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all external dependencies to isolate the React import issue
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'patient-1', first_name: 'Juan', last_name: 'Pérez', role: 'patient' }
  })
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: { id: 'org-1', name: 'Clínica Test' }
  })
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: jest.fn(() => null) })
}));

jest.mock('@/app/api/appointments/actions', () => ({
  cancelAppointment: jest.fn(),
  updateAppointment: jest.fn()
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }))
}));

// Create a minimal version of the AppointmentsPage to test React imports
function MinimalAppointmentsPage() {
  console.log('React object:', React);
  console.log('React.useState:', React.useState);
  
  // Test if React is properly imported
  if (!React) {
    throw new Error('React is null or undefined');
  }
  
  if (!React.useState) {
    throw new Error('React.useState is null or undefined');
  }
  
  const [state, setState] = React.useState('test');
  
  return React.createElement('div', { 'data-testid': 'minimal-page' }, 'Minimal Page');
}

describe('Minimal Appointments Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render minimal component without React import issues', () => {
    expect(() => {
      render(React.createElement(MinimalAppointmentsPage));
    }).not.toThrow();
  });

  it('should have React properly available in component context', () => {
    const TestComponent = () => {
      expect(React).toBeDefined();
      expect(React.useState).toBeDefined();
      return React.createElement('div', null, 'test');
    };
    
    render(React.createElement(TestComponent));
  });

  it('should be able to import the actual appointments page module', async () => {
    // Test if we can import the module without errors
    let AppointmentsPageModule;
    
    try {
      AppointmentsPageModule = await import('@/app/(dashboard)/appointments/page');
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
    
    expect(AppointmentsPageModule).toBeDefined();
    expect(AppointmentsPageModule.default).toBeDefined();
  });

  it('should check React import in the actual module', async () => {
    // Import the module and check if React is properly imported
    const AppointmentsPageModule = await import('@/app/(dashboard)/appointments/page');
    
    // The module should export a function
    expect(typeof AppointmentsPageModule.default).toBe('function');
  });
});

/**
 * This test isolates the React import issue by creating a minimal component
 * that only tests the React import and useState functionality.
 */
