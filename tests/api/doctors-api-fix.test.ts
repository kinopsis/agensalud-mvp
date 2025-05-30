/**
 * Test to verify the doctors API fix for the "0 available doctors" issue
 * This test validates that the API correctly returns doctors filtered by service
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/doctors/route';

// Mock Next.js globals
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(public url: string, public init?: RequestInit) {}
  }
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(public body?: any, public init?: ResponseInit) {}
    json() { return Promise.resolve(this.body); }
  }
});

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

describe('Doctors API Fix - Service Filtering', () => {
  let mockSupabase: any;
  const TEST_ORG_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
  const TEST_SERVICE_ID = '0c98efc9-b65c-4913-aa23-9952493d7d9d';

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn()
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return doctors when service filter is applied', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    });

    // Mock doctor_services query
    const mockDoctorServicesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    };

    mockDoctorServicesQuery.eq.mockResolvedValue({
      data: [
        { doctor_id: 'doctor-1' },
        { doctor_id: 'doctor-2' }
      ],
      error: null
    });

    // Mock doctors query
    const mockDoctorsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis()
    };

    mockDoctorsQuery.in.mockResolvedValue({
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
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'doctor_services') {
        return mockDoctorServicesQuery;
      }
      if (table === 'doctors') {
        return mockDoctorsQuery;
      }
      return {};
    });

    // Create test request
    const url = `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}&serviceId=${TEST_SERVICE_ID}`;
    const request = new NextRequest(url);

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.doctors).toHaveLength(2);
    expect(data.doctors[0]).toMatchObject({
      id: 'doctor-1',
      name: 'Ana Rodríguez',
      specialization: 'Optometría Clínica',
      consultation_fee: 60.00,
      is_available: true
    });
    expect(data.doctors[1]).toMatchObject({
      id: 'doctor-2',
      name: 'Pedro Sánchez',
      specialization: 'Contactología',
      consultation_fee: 50.00,
      is_available: true
    });

    // Verify correct API calls were made
    expect(mockSupabase.from).toHaveBeenCalledWith('doctor_services');
    expect(mockSupabase.from).toHaveBeenCalledWith('doctors');
    expect(mockDoctorServicesQuery.eq).toHaveBeenCalledWith('service_id', TEST_SERVICE_ID);
    expect(mockDoctorsQuery.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    expect(mockDoctorsQuery.eq).toHaveBeenCalledWith('is_available', true);
    expect(mockDoctorsQuery.in).toHaveBeenCalledWith('profile_id', ['doctor-1', 'doctor-2']);
  });

  it('should return empty array when no doctors provide the service', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    });

    // Mock doctor_services query returning no results
    const mockDoctorServicesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    };

    mockDoctorServicesQuery.eq.mockResolvedValue({
      data: [],
      error: null
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'doctor_services') {
        return mockDoctorServicesQuery;
      }
      return {};
    });

    // Create test request
    const url = `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}&serviceId=${TEST_SERVICE_ID}`;
    const request = new NextRequest(url);

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.doctors).toHaveLength(0);
  });

  it('should return all doctors when no service filter is applied', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    });

    // Mock doctors query for all doctors
    const mockDoctorsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    };

    mockDoctorsQuery.eq.mockResolvedValue({
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
        }
      ],
      error: null
    });

    mockSupabase.from.mockReturnValue(mockDoctorsQuery);

    // Create test request without service filter
    const url = `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}`;
    const request = new NextRequest(url);

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.doctors).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('doctors');
    expect(mockDoctorsQuery.eq).toHaveBeenCalledWith('organization_id', TEST_ORG_ID);
    expect(mockDoctorsQuery.eq).toHaveBeenCalledWith('is_available', true);
  });

  it('should handle authentication errors', async () => {
    // Mock authentication failure
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    // Create test request
    const url = `http://localhost:3000/api/doctors?organizationId=${TEST_ORG_ID}`;
    const request = new NextRequest(url);

    // Call the API
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
