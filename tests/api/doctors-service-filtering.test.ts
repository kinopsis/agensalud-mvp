/**
 * Tests for the doctors API service filtering functionality
 * Ensures the "0 available doctors" issue doesn't regress
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the Supabase clients
const mockSupabaseQuery = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  filter: jest.fn(),
  map: jest.fn()
};

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => mockSupabaseQuery)
};

const mockServiceClient = {
  from: jest.fn(() => mockSupabaseQuery)
};

// Mock the modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

jest.mock('@/lib/supabase/service', () => ({
  createClient: jest.fn(() => mockServiceClient)
}));

// Mock Next.js
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200
    }))
  }
}));

describe('Doctors API - Service Filtering', () => {
  const TEST_ORG_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
  const TEST_SERVICE_ID = '01a50617-121d-4155-b191-7e74e689f685';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user', email: 'test@example.com' } },
      error: null
    });

    // Setup chainable query methods
    mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.in.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.filter.mockReturnValue(mockSupabaseQuery);

    // Reset the from implementations
    mockSupabaseClient.from.mockReturnValue(mockSupabaseQuery);
    mockServiceClient.from.mockReturnValue(mockSupabaseQuery);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully filter doctors by service', async () => {
    // Mock both queries using the service client (as the API uses serviceSupabase for both)
    mockServiceClient.from.mockImplementation((table) => {
      if (table === 'doctor_services') {
        return {
          ...mockSupabaseQuery,
          eq: jest.fn().mockResolvedValue({
            data: [
              { doctor_id: 'profile-1' },
              { doctor_id: 'profile-2' },
              { doctor_id: 'profile-3' }
            ],
            error: null
          })
        };
      }
      if (table === 'doctors') {
        return {
          ...mockSupabaseQuery,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseQuery,
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'doctor-1',
                  specialization: 'Optometría Clínica',
                  consultation_fee: 60.00,
                  is_available: true,
                  profiles: {
                    id: 'profile-1',
                    first_name: 'Ana',
                    last_name: 'Rodríguez',
                    email: 'ana.rodriguez@visualcare.com'
                  }
                },
                {
                  id: 'doctor-2',
                  specialization: 'Contactología',
                  consultation_fee: 50.00,
                  is_available: true,
                  profiles: {
                    id: 'profile-2',
                    first_name: 'Pedro',
                    last_name: 'Sánchez',
                    email: 'pedro.sanchez@visualcare.com'
                  }
                }
              ],
              error: null
            })
          })
        };
      }
      return mockSupabaseQuery;
    });

    // Import and test the API function
    const { GET } = await import('@/app/api/doctors/route');
    const mockRequest = {
      url: `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}&serviceId=${TEST_SERVICE_ID}`,
      nextUrl: {
        searchParams: new URLSearchParams({
          organizationId: TEST_ORG_ID,
          serviceId: TEST_SERVICE_ID
        })
      }
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    // Assertions
    expect(data.success).toBe(true);
    expect(data.doctors).toHaveLength(2);
    expect(data.doctors[0]).toMatchObject({
      id: 'doctor-1',
      name: 'Ana Rodríguez',
      specialization: 'Optometría Clínica',
      is_available: true
    });
  });

  it('should return empty array when no doctors provide the service', async () => {
    // Mock empty doctor_services result
    mockServiceClient.from.mockImplementation((table) => {
      if (table === 'doctor_services') {
        return {
          ...mockSupabaseQuery,
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        };
      }
      return mockSupabaseQuery;
    });

    const { GET } = await import('@/app/api/doctors/route');
    const mockRequest = {
      url: `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}&serviceId=${TEST_SERVICE_ID}`,
      nextUrl: {
        searchParams: new URLSearchParams({
          organizationId: TEST_ORG_ID,
          serviceId: TEST_SERVICE_ID
        })
      }
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.doctors).toHaveLength(0);
  });

  it('should filter out doctors with null profiles', async () => {
    // Mock both queries using the service client (as the API uses serviceSupabase for both)
    mockServiceClient.from.mockImplementation((table) => {
      if (table === 'doctor_services') {
        return {
          ...mockSupabaseQuery,
          eq: jest.fn().mockResolvedValue({
            data: [{ doctor_id: 'profile-1' }, { doctor_id: 'profile-2' }],
            error: null
          })
        };
      }
      if (table === 'doctors') {
        return {
          ...mockSupabaseQuery,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseQuery,
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'doctor-1',
                  specialization: 'Optometría Clínica',
                  consultation_fee: 60.00,
                  is_available: true,
                  profiles: {
                    id: 'profile-1',
                    first_name: 'Ana',
                    last_name: 'Rodríguez',
                    email: 'ana.rodriguez@visualcare.com'
                  }
                },
                {
                  id: 'doctor-2',
                  specialization: 'Contactología',
                  consultation_fee: 50.00,
                  is_available: true,
                  profiles: null // This should be filtered out
                }
              ],
              error: null
            })
          })
        };
      }
      return mockSupabaseQuery;
    });

    const { GET } = await import('@/app/api/doctors/route');
    const mockRequest = {
      url: `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}&serviceId=${TEST_SERVICE_ID}`,
      nextUrl: {
        searchParams: new URLSearchParams({
          organizationId: TEST_ORG_ID,
          serviceId: TEST_SERVICE_ID
        })
      }
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    // Should only return the doctor with valid profile
    expect(data.success).toBe(true);
    expect(data.doctors).toHaveLength(1);
    expect(data.doctors[0].name).toBe('Ana Rodríguez');
  });

  it('should handle authentication errors', async () => {
    // Mock authentication failure
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    const { GET } = await import('@/app/api/doctors/route');
    const mockRequest = {
      url: `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}&serviceId=${TEST_SERVICE_ID}`,
      nextUrl: {
        searchParams: new URLSearchParams({
          organizationId: TEST_ORG_ID,
          serviceId: TEST_SERVICE_ID
        })
      }
    } as any;

    const response = await GET(mockRequest);
    
    expect(response.status).toBe(401);
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    mockServiceClient.from.mockImplementation((table) => {
      if (table === 'doctor_services') {
        return {
          ...mockSupabaseQuery,
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        };
      }
      return mockSupabaseQuery;
    });

    const { GET } = await import('@/app/api/doctors/route');
    const mockRequest = {
      url: `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}&serviceId=${TEST_SERVICE_ID}`,
      nextUrl: {
        searchParams: new URLSearchParams({
          organizationId: TEST_ORG_ID,
          serviceId: TEST_SERVICE_ID
        })
      }
    } as any;

    const response = await GET(mockRequest);
    
    expect(response.status).toBe(500);
  });
});
