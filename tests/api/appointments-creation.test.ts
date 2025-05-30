/**
 * Tests for the appointments API creation functionality
 * Ensures the "invalid input syntax for type uuid" issue doesn't regress
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the Supabase clients
const mockSupabaseQuery = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  eq: jest.fn(),
  single: jest.fn()
};

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => mockSupabaseQuery)
};

// Mock the modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
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

describe('Appointments API - Creation', () => {
  const TEST_ORG_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
  const TEST_USER_ID = '5b361f1e-04b6-4a40-bb61-bd519c0e9be8';
  const TEST_DOCTOR_ID = '5bfbf7b8-e021-4657-ae42-a3fa185d4ab6';
  const TEST_SERVICE_ID = '0c98efc9-b65c-4913-aa23-9952493d7d9d';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful authentication
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@example.com' } },
      error: null
    });

    // Setup default profile response
    mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.single.mockResolvedValue({
      data: {
        id: TEST_USER_ID,
        role: 'patient',
        organization_id: TEST_ORG_ID
      },
      error: null
    });

    // Setup chainable query methods
    mockSupabaseQuery.insert.mockReturnValue(mockSupabaseQuery);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully create appointment with empty string locationId', async () => {
    // Create a spy for the insert function to track calls
    const insertSpy = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-appointment-id',
            organization_id: TEST_ORG_ID,
            patient_id: TEST_USER_ID,
            doctor_id: TEST_DOCTOR_ID,
            service_id: TEST_SERVICE_ID,
            location_id: null, // Should be null, not empty string
            appointment_date: '2025-05-28',
            start_time: '09:30:00',
            end_time: '10:00:00',
            status: 'pending'
          },
          error: null
        })
      })
    });

    // Mock successful appointment creation
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          ...mockSupabaseQuery,
          single: jest.fn().mockResolvedValue({
            data: {
              id: TEST_USER_ID,
              role: 'patient',
              organization_id: TEST_ORG_ID
            },
            error: null
          })
        };
      }
      if (table === 'appointments') {
        return {
          ...mockSupabaseQuery,
          insert: insertSpy
        };
      }
      return mockSupabaseQuery;
    });

    // Import and test the API function
    const { POST } = await import('@/app/api/appointments/route');
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        organizationId: TEST_ORG_ID,
        patientId: TEST_USER_ID,
        doctorId: TEST_DOCTOR_ID,
        serviceId: TEST_SERVICE_ID,
        locationId: '', // Empty string - this was causing the issue
        appointmentDate: '2025-05-28',
        startTime: '09:30',
        endTime: '10:00',
        reason: 'Test appointment',
        notes: 'Test notes'
      })
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    // Verify the appointment was created successfully
    expect(data.success).toBe(true);
    expect(data.appointmentId).toBe('new-appointment-id');

    // Verify that the insert was called with null instead of empty string
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        location_id: null, // Should be null, not empty string
        patient_id: TEST_USER_ID,
        doctor_id: TEST_DOCTOR_ID,
        service_id: TEST_SERVICE_ID
      })
    );
  });

  it('should handle undefined locationId correctly', async () => {
    // Create a spy for the insert function to track calls
    const insertSpy = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-appointment-id-2',
            location_id: null
          },
          error: null
        })
      })
    });

    // Mock successful appointment creation
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          ...mockSupabaseQuery,
          single: jest.fn().mockResolvedValue({
            data: {
              id: TEST_USER_ID,
              role: 'patient',
              organization_id: TEST_ORG_ID
            },
            error: null
          })
        };
      }
      if (table === 'appointments') {
        return {
          ...mockSupabaseQuery,
          insert: insertSpy
        };
      }
      return mockSupabaseQuery;
    });

    const { POST } = await import('@/app/api/appointments/route');
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        organizationId: TEST_ORG_ID,
        patientId: TEST_USER_ID,
        doctorId: TEST_DOCTOR_ID,
        serviceId: TEST_SERVICE_ID,
        // locationId is undefined
        appointmentDate: '2025-05-28',
        startTime: '09:30',
        endTime: '10:00'
      })
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.success).toBe(true);

    // Verify that undefined was converted to null
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        location_id: null
      })
    );
  });

  it('should preserve valid UUID values', async () => {
    const validLocationId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    // Create a spy for the insert function to track calls
    const insertSpy = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-appointment-id-3',
            location_id: validLocationId
          },
          error: null
        })
      })
    });

    // Mock successful appointment creation
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return {
          ...mockSupabaseQuery,
          single: jest.fn().mockResolvedValue({
            data: {
              id: TEST_USER_ID,
              role: 'patient',
              organization_id: TEST_ORG_ID
            },
            error: null
          })
        };
      }
      if (table === 'appointments') {
        return {
          ...mockSupabaseQuery,
          insert: insertSpy
        };
      }
      return mockSupabaseQuery;
    });

    const { POST } = await import('@/app/api/appointments/route');
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        organizationId: TEST_ORG_ID,
        patientId: TEST_USER_ID,
        doctorId: TEST_DOCTOR_ID,
        serviceId: TEST_SERVICE_ID,
        locationId: validLocationId, // Valid UUID
        appointmentDate: '2025-05-28',
        startTime: '09:30',
        endTime: '10:00'
      })
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.success).toBe(true);

    // Verify that valid UUID was preserved
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        location_id: validLocationId
      })
    );
  });

  it('should handle authentication errors', async () => {
    // Mock authentication failure
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    const { POST } = await import('@/app/api/appointments/route');
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        organizationId: TEST_ORG_ID,
        patientId: TEST_USER_ID,
        doctorId: TEST_DOCTOR_ID,
        serviceId: TEST_SERVICE_ID,
        appointmentDate: '2025-05-28',
        startTime: '09:30'
      })
    } as any;

    const response = await POST(mockRequest);
    
    expect(response.status).toBe(401);
  });

  it('should validate required fields', async () => {
    const { POST } = await import('@/app/api/appointments/route');
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        organizationId: TEST_ORG_ID,
        // Missing required fields: patientId, doctorId, appointmentDate, startTime
      })
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });
});
