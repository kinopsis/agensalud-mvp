/**
 * Comprehensive testing utilities for AgentSalud
 * Based on OPTICAL_SIMULATION.md patterns and MVP requirements
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, createContext, useContext } from 'react';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Mock data types based on database schema
export interface MockUser {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'doctor' | 'staff' | 'patient';
  organization_id?: string;
  profile?: {
    full_name: string;
    phone?: string;
    address?: string;
  };
}

export interface MockOrganization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  description?: string;
}

export interface MockAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  organization_id: string;
  service_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}

// Mock Auth Context
interface MockAuthContextType {
  user: any | null; // Using any to match Supabase User type
  profile: Profile | null;
  session: any | null;
  loading: boolean;
  signIn: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  updateProfile: jest.Mock;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

function MockAuthProvider({
  children,
  initialUser,
  initialProfile
}: {
  children: React.ReactNode;
  initialUser?: MockUser | null;
  initialProfile?: Profile | null;
}) {
  const mockProfile: Profile | null = initialProfile || (initialUser ? {
    id: initialUser.id,
    email: initialUser.email,
    role: initialUser.role as any,
    first_name: initialUser.profile?.full_name?.split(' ')[0] || 'Test',
    last_name: initialUser.profile?.full_name?.split(' ')[1] || 'User',
    phone: initialUser.profile?.phone || null,
    address: initialUser.profile?.address || null,
    organization_id: initialUser.organization_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } : null);

  const mockUser = initialUser ? {
    id: initialUser.id,
    email: initialUser.email,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {}
  } : null;

  const value: MockAuthContextType = {
    user: mockUser,
    profile: mockProfile,
    session: mockUser ? {
      user: mockUser,
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer'
    } : null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn()
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
}

// Mock Tenant Context
interface MockTenantContextType {
  organization: MockOrganization | null;
  setOrganization: jest.Mock;
  loading: boolean;
}

const MockTenantContext = createContext<MockTenantContextType | undefined>(undefined);

function MockTenantProvider({
  children,
  initialOrganization
}: {
  children: React.ReactNode;
  initialOrganization?: MockOrganization | null;
}) {
  const value: MockTenantContextType = {
    organization: initialOrganization || null,
    setOrganization: jest.fn(),
    loading: false
  };

  return (
    <MockTenantContext.Provider value={value}>
      {children}
    </MockTenantContext.Provider>
  );
}

// Mock AI Context
interface MockAIContextType {
  isProcessing: boolean;
  lastResponse: string | null;
  processMessage: jest.Mock;
}

const MockAIContext = createContext<MockAIContextType | undefined>(undefined);

function MockAIProvider({ children }: { children: React.ReactNode }) {
  const value: MockAIContextType = {
    isProcessing: false,
    lastResponse: null,
    processMessage: jest.fn()
  };

  return (
    <MockAIContext.Provider value={value}>
      {children}
    </MockAIContext.Provider>
  );
}

// Enhanced render function with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: MockUser | null;
  initialOrganization?: MockOrganization | null;
  withAI?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    initialUser = null,
    initialOrganization = null,
    withAI = true,
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    const content = (
      <MockAuthProvider initialUser={initialUser}>
        <MockTenantProvider initialOrganization={initialOrganization}>
          {children}
        </MockTenantProvider>
      </MockAuthProvider>
    );

    return withAI ? <MockAIProvider>{content}</MockAIProvider> : content;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock hooks that can be used to override global mocks
export const useMockAuth = () => {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
};

export const useMockTenant = () => {
  const context = useContext(MockTenantContext);
  if (context === undefined) {
    throw new Error('useMockTenant must be used within a MockTenantProvider');
  }
  return context;
};

export const useMockAI = () => {
  const context = useContext(MockAIContext);
  if (context === undefined) {
    throw new Error('useMockAI must be used within a MockAIProvider');
  }
  return context;
};

// Mock Supabase client factory
export function createMockSupabaseClient() {
  const mockClient = {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          maybeSingle: jest.fn(),
        })),
        in: jest.fn(() => ({
          order: jest.fn(),
        })),
        order: jest.fn(),
        limit: jest.fn(),
        range: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    rpc: jest.fn(),
  };

  return mockClient;
}

// AI SDK mocks
export function createMockAISDK() {
  return {
    streamText: jest.fn(() => ({
      toAIStreamResponse: jest.fn(() => new Response('Mocked AI response'))
    })),
    generateObject: jest.fn(() => ({
      object: {
        intent: 'book',
        specialty: 'cardiología',
        preferredDate: 'próxima semana',
        preferredTime: 'mañana',
        confidence: 0.9,
        missingInfo: [],
        suggestedResponse: 'Te ayudo a agendar una cita con cardiología.'
      }
    })),
    generateText: jest.fn(() => ({
      text: 'Mocked AI response text'
    })),
  };
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock localStorage
export function createMockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
}

// Test data validation helpers
export function validateAppointmentData(appointment: Partial<MockAppointment>) {
  const required = ['patient_id', 'doctor_id', 'organization_id', 'appointment_date'];
  const missing = required.filter(field => !appointment[field as keyof MockAppointment]);

  if (missing.length > 0) {
    throw new Error(`Missing required appointment fields: ${missing.join(', ')}`);
  }

  return true;
}

export function validateOrganizationData(org: Partial<MockOrganization>) {
  const required = ['name', 'slug', 'email'];
  const missing = required.filter(field => !org[field as keyof MockOrganization]);

  if (missing.length > 0) {
    throw new Error(`Missing required organization fields: ${missing.join(', ')}`);
  }

  return true;
}

// Performance testing helpers
export function measurePerformance<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();

  const result = fn();

  if (result instanceof Promise) {
    return result.then(res => ({
      result: res,
      duration: performance.now() - start
    }));
  }

  return Promise.resolve({
    result,
    duration: performance.now() - start
  });
}

// Database testing utilities
export function createTestTransaction() {
  const operations: Array<() => Promise<any>> = [];

  return {
    add: (operation: () => Promise<any>) => {
      operations.push(operation);
    },
    execute: async () => {
      const results = [];
      for (const op of operations) {
        results.push(await op());
      }
      return results;
    },
    rollback: jest.fn(),
  };
}

// Error simulation helpers
export function simulateNetworkError() {
  return new Error('Network request failed');
}

export function simulateAuthError() {
  return new Error('Authentication failed');
}

export function simulateValidationError(field: string) {
  return new Error(`Validation failed for field: ${field}`);
}

// Re-export commonly used testing utilities
export * from '@testing-library/react';
export * from '@testing-library/jest-dom';
export { act, waitFor } from '@testing-library/react';
