/**
 * @fileoverview Mock Supabase client for testing
 * @description Provides mock implementation of Supabase client methods
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

/**
 * Creates a mock Supabase client for testing purposes
 * @returns Mock Supabase client with chainable methods
 */
export const createMockSupabaseClient = () => {
  const mockClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(),
            })),
          })),
          limit: jest.fn(),
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(),
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(),
        })),
        limit: jest.fn(),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    rpc: jest.fn(),
  };

  return mockClient;
};

/**
 * Mock successful database response
 * @param data - Data to return
 * @returns Mock response object
 */
export const mockSuccessResponse = (data: any) => ({
  data,
  error: null,
});

/**
 * Mock database error response
 * @param error - Error object
 * @returns Mock error response
 */
export const mockErrorResponse = (error: any) => ({
  data: null,
  error,
});

/**
 * Common mock data for testing
 */
export const mockData = {
  doctor: {
    id: '5bfbf7b8-e021-4657-ae42-a3fa185d4ab6',
    profile_id: 'c923e0ec-d941-48d1-9fe6-0d75122e3cbe',
    specialization: 'Optometría Clínica',
    is_active: true,
  },
  
  profile: {
    id: 'c923e0ec-d941-48d1-9fe6-0d75122e3cbe',
    first_name: 'Ana',
    last_name: 'Rodríguez',
    email: 'ana.rodriguez@example.com',
    role: 'doctor',
    organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  },

  schedule: {
    id: '49f6f8ee-a51b-44dd-91b0-441bea4ff0bd',
    doctor_id: 'c923e0ec-d941-48d1-9fe6-0d75122e3cbe',
    location_id: '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9',
    day_of_week: 1,
    start_time: '08:00:00',
    end_time: '12:00:00',
    is_active: true,
    notes: 'Consultas generales de optometría',
  },

  appointment: {
    id: 'apt-123',
    patient_id: 'patient-456',
    doctor_id: 'doctor-789',
    service_id: 'service-101',
    location_id: 'location-202',
    appointment_date: '2024-01-15',
    start_time: '09:00:00',
    end_time: '10:00:00',
    status: 'confirmed',
    notes: 'Consulta de rutina',
  },

  organization: {
    id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
    name: 'VisualCare',
    type: 'clinic',
    is_active: true,
  },

  service: {
    id: 'service-123',
    name: 'Consulta General',
    description: 'Examen visual completo',
    duration: 60,
    price: 50000,
  },

  location: {
    id: '3f32d1b7-2ff4-4bfd-95f4-7964db56d7e9',
    name: 'Óptica VisualCare - Sede Principal',
    address: 'Dirección por definir',
    organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  },
};

/**
 * Common error codes for testing
 */
export const mockErrors = {
  notFound: {
    code: 'PGRST116',
    message: 'No rows found',
  },
  
  relationNotExists: {
    code: '42P01',
    message: 'relation does not exist',
  },
  
  schemaCacheError: {
    code: 'PGRST200',
    message: 'Could not find a relationship in the schema cache',
  },
  
  uniqueConstraint: {
    code: '23505',
    message: 'duplicate key value violates unique constraint',
  },
  
  foreignKeyViolation: {
    code: '23503',
    message: 'insert or update on table violates foreign key constraint',
  },
  
  checkConstraintViolation: {
    code: '23514',
    message: 'new row violates check constraint',
  },
};

/**
 * Helper function to create mock chain responses
 * @param finalResponse - The final response to return
 * @returns Chainable mock object
 */
export const createMockChain = (finalResponse: any) => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(finalResponse)),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    delete: jest.fn(() => chain),
  };

  // Make the chain itself a promise for terminal operations
  Object.assign(chain, Promise.resolve(finalResponse));
  
  return chain;
};

/**
 * Mock authentication context
 */
export const mockAuthContext = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    role: 'authenticated',
  },
  session: {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
  },
};

/**
 * Helper to mock multi-tenant data isolation
 * @param organizationId - Organization ID to filter by
 * @param data - Data array to filter
 * @returns Filtered data for organization
 */
export const mockMultiTenantFilter = (organizationId: string, data: any[]) => {
  return data.filter(item => item.organization_id === organizationId);
};

export default createMockSupabaseClient;
