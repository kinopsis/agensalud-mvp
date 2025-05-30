/**
 * Jest Setup - Global configuration for all tests
 * Ensures consistent mocking and environment setup
 * UPDATED: Added critical globals for Next.js API testing
 */

import '@testing-library/jest-dom';

// Mock global fetch
global.fetch = jest.fn();

// CRITICAL FIX: Add missing globals for Next.js API testing
global.Request = class MockRequest {
  constructor(public url: string, public init?: RequestInit) {
    this.url = url;
    this.init = init;
  }
} as any;

global.Response = class MockResponse {
  constructor(public body?: any, public init?: ResponseInit) {
    this.body = body;
    this.init = init;
  }

  static json(data: any, init?: ResponseInit) {
    return new MockResponse(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    });
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }
} as any;

// CRITICAL FIX: Add TransformStream for AI SDK compatibility
global.TransformStream = class MockTransformStream {
  readable: any;
  writable: any;

  constructor() {
    this.readable = {};
    this.writable = {};
  }
} as any;

// CRITICAL FIX: Add URL constructor for API route testing
if (typeof global.URL === 'undefined') {
  global.URL = class MockURL {
    searchParams: URLSearchParams;

    constructor(public href: string, base?: string) {
      this.href = href;
      const [url, search] = href.split('?');
      this.searchParams = new URLSearchParams(search || '');
    }
  } as any;
}

// CRITICAL FIX: Set up environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.NODE_ENV = 'test';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/test',
}));

// Mock auth context BEFORE any imports
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'patient',
      organization_id: 'test-org-id',
      profiles: {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com'
      }
    },
    loading: false,
    signOut: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    updateProfile: jest.fn(),
    isAuthenticated: true
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock tenant context BEFORE any imports
jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: {
      id: 'test-org-id',
      name: 'Test Organization',
      slug: 'test-org',
      subscription_plan: 'basic'
    },
    loading: false
  }),
  TenantProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock AI context BEFORE any imports
jest.mock('@/contexts/ai-context', () => ({
  useAI: () => ({
    conversations: [],
    currentConversation: null,
    createConversation: jest.fn(),
    addMessage: jest.fn(),
    isAIEnabled: true,
    setIsAIEnabled: jest.fn(),
    isChatOpen: false,
    setIsChatOpen: jest.fn(),
    preferences: { 
      language: 'es', 
      autoSuggestions: true, 
      voiceEnabled: false 
    },
    updatePreferences: jest.fn(),
    analytics: { 
      totalConversations: 0, 
      successfulBookings: 0, 
      averageConversationLength: 0 
    }
  }),
  useAIAppointments: () => ({
    processAppointmentRequest: jest.fn()
  }),
  AIProvider: ({ children }: { children: React.ReactNode }) => children
}));

// ENHANCED: Mock Supabase client with comprehensive API surface
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }),
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        }),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    })
  }
}));

// ENHANCED: Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      })
    })
  }))
}));

// ENHANCED: Mock Supabase service client
jest.mock('@/lib/supabase/service', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        }),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    })
  }))
}));

// CRITICAL FIX: Mock AI SDK to prevent TransformStream errors
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-openai-model')
}));

jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    toAIStreamResponse: jest.fn(() => new Response('Mocked AI response'))
  })),
  generateObject: jest.fn(() => Promise.resolve({
    object: {
      intent: 'book',
      specialty: 'cardiología',
      confidence: 0.9
    }
  })),
  generateText: jest.fn(() => Promise.resolve({
    text: 'Mocked AI response text'
  }))
}));

// Mock AI React hooks to prevent import errors
jest.mock('ai/react', () => ({
  useAssistant: jest.fn(() => ({
    status: 'awaiting_message',
    messages: [],
    input: '',
    submitMessage: jest.fn(),
    handleInputChange: jest.fn(),
    error: null
  })),
  useChat: jest.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    error: null
  }))
}));

// Setup default fetch responses
const setupDefaultFetchMocks = () => {
  (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
    const method = options?.method || 'GET';
    
    // Default successful responses for common endpoints
    if (url.includes('/api/services')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          services: [
            {
              id: 'service-1',
              name: 'Examen Visual Completo',
              description: 'Evaluación completa de la salud visual',
              duration_minutes: 60,
              price: 60,
              organization_id: 'test-org-id'
            }
          ]
        })
      });
    }
    
    if (url.includes('/api/doctors')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          doctors: [
            {
              id: 'doctor-1',
              specialization: 'Optometría',
              experience_years: 5,
              languages: ['es', 'en'],
              is_active: true,
              consultation_fee: 60,
              organization_id: 'test-org-id',
              profiles: {
                first_name: 'Dr. Juan',
                last_name: 'Pérez',
                email: 'dr.perez@test.com'
              }
            }
          ]
        })
      });
    }
    
    if (url.includes('/api/users')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            {
              id: 'user-1',
              email: 'user1@test.com',
              role: 'doctor',
              organization_id: 'test-org-id',
              profiles: {
                first_name: 'Dr. Juan',
                last_name: 'Pérez'
              }
            }
          ]
        })
      });
    }
    
    if (url.includes('/api/dashboard')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          stats: {
            totalAppointments: 10,
            todayAppointments: 3,
            totalPatients: 25,
            systemHealth: 'excellent'
          }
        })
      });
    }
    
    // Default response for any other endpoint
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: []
      })
    });
  });
};

// Setup mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultFetchMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.resetModules();
});

// Suppress console warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') ||
       args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('act(...)')
      )
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('deprecated') ||
       args[0].includes('punycode')
      )
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
