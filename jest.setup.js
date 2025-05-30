import '@testing-library/jest-dom';

// Mock global APIs for Jest environment
global.TransformStream = class TransformStream {};
global.ReadableStream = class ReadableStream {};
global.WritableStream = class WritableStream {};

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock context hooks - these will be overridden by renderWithProviders
jest.mock('@/contexts/auth-context', () => {
  const React = require('react');

  // Default mock values
  const defaultAuthValue = {
    user: null,
    profile: null,
    session: null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn()
  };

  return {
    useAuth: () => {
      // Try to use mock context if available, otherwise use default
      try {
        const { useMockAuth } = require('../tests/utils/test-helpers');
        return useMockAuth();
      } catch {
        return defaultAuthValue;
      }
    },
    AuthProvider: ({ children }) => children
  };
});

jest.mock('@/contexts/tenant-context', () => {
  const React = require('react');

  // Default mock values
  const defaultTenantValue = {
    organization: null,
    setOrganization: jest.fn(),
    loading: false
  };

  return {
    useTenant: () => {
      // Try to use mock context if available, otherwise use default
      try {
        const { useMockTenant } = require('../tests/utils/test-helpers');
        return useMockTenant();
      } catch {
        return defaultTenantValue;
      }
    },
    TenantProvider: ({ children }) => children
  };
});

jest.mock('@/contexts/ai-context', () => {
  const React = require('react');

  // Default mock values
  const defaultAIValue = {
    isProcessing: false,
    lastResponse: null,
    processMessage: jest.fn()
  };

  return {
    useAI: () => {
      // Try to use mock context if available, otherwise use default
      try {
        const { useMockAI } = require('../tests/utils/test-helpers');
        return useMockAI();
      } catch {
        return defaultAIValue;
      }
    },
    AIProvider: ({ children }) => children
  };
});
