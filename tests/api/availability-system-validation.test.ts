/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/doctors/availability/route';

// Mock Supabase
const mockServiceSupabase = {
  from: jest.fn()
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    }
  }))
}));

jest.mock('@/lib/supabase/service', () => ({
  createClient: jest.fn(() => mockServiceSupabase)
}));

// Use proper UUIDs for testing
const ORG_ID = '123e4567-e89b-12d3-a456-426614174000';
const DOCTOR_1_ID = '123e4567-e89b-12d3-a456-426614174001';
const DOCTOR_2_ID = '123e4567-e89b-12d3-a456-426614174002';
const DOCTOR_3_ID = '123e4567-e89b-12d3-a456-426614174003';

const mockDoctors = [
  {
    id: DOCTOR_1_ID,
    specialization: 'Medicina General',
    consultation_fee: 50000,
    profiles: { first_name: 'Juan', last_name: 'Pérez', email: 'juan@example.com' }
  },
  {
    id: DOCTOR_2_ID,
    specialization: 'Cardiología',
    consultation_fee: 75000,
    profiles: { first_name: 'María', last_name: 'García', email: 'maria@example.com' }
  },
  {
    id: DOCTOR_3_ID,
    specialization: 'Dermatología',
    consultation_fee: 60000,
    profiles: { first_name: 'Carlos', last_name: 'López', email: 'carlos@example.com' }
  }
];

const mockSchedules = [
  { doctor_id: DOCTOR_1_ID, day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_available: true },
  { doctor_id: DOCTOR_2_ID, day_of_week: 1, start_time: '08:00:00', end_time: '16:00:00', is_available: true },
  { doctor_id: DOCTOR_3_ID, day_of_week: 1, start_time: '10:00:00', end_time: '18:00:00', is_available: true }
];

const mockAppointments = [
  { doctor_id: DOCTOR_1_ID, start_time: '09:00:00', end_time: '09:30:00' },
  { doctor_id: DOCTOR_2_ID, start_time: '10:00:00', end_time: '10:30:00' }
];

describe('Availability System Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('"Sin Preferencia" Doctor Option', () => {
    it('should return availability from ALL doctors when no doctorId specified', async () => {
      // Mock the database queries
      mockServiceSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockDoctors,
                error: null
              })
            })
          })
        });

      // Mock Promise.all for schedules and appointments
      const mockSchedulesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockSchedules,
                error: null
              })
            })
          })
        })
      };

      const mockAppointmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockAppointments,
              error: null
            })
          })
        })
      };

      mockServiceSupabase.from
        .mockReturnValueOnce(mockSchedulesQuery)
        .mockReturnValueOnce(mockAppointmentsQuery);

      const request = new NextRequest(
        `http://localhost/api/doctors/availability?organizationId=${ORG_ID}&date=2024-01-15&duration=30`
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Should include slots from all doctors
      const doctorIds = [...new Set(result.data.map((slot: any) => slot.doctor_id))];
      expect(doctorIds.length).toBeGreaterThan(1); // Multiple doctors
    });

    it('should filter by specific doctor when doctorId is provided', async () => {
      // Mock for specific doctor query
      mockServiceSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [mockDoctors[0]], // Only first doctor
                error: null
              })
            })
          })
        });

      const mockSchedulesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [mockSchedules[0]], // Only first doctor's schedule
                error: null
              })
            })
          })
        })
      };

      const mockAppointmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      mockServiceSupabase.from
        .mockReturnValueOnce(mockSchedulesQuery)
        .mockReturnValueOnce(mockAppointmentsQuery);

      const request = new NextRequest(
        `http://localhost/api/doctors/availability?organizationId=${ORG_ID}&doctorId=${DOCTOR_1_ID}&date=2024-01-15&duration=30`
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Should only include slots from specified doctor
      const doctorIds = [...new Set(result.data.map((slot: any) => slot.doctor_id))];
      expect(doctorIds).toEqual([DOCTOR_1_ID]);
    });

    it('should handle organization with single doctor', async () => {
      // Mock single doctor organization
      mockServiceSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [mockDoctors[0]], // Only one doctor
                error: null
              })
            })
          })
        });

      const mockSchedulesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [mockSchedules[0]],
                error: null
              })
            })
          })
        })
      };

      const mockAppointmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      mockServiceSupabase.from
        .mockReturnValueOnce(mockSchedulesQuery)
        .mockReturnValueOnce(mockAppointmentsQuery);

      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=org-123&date=2024-01-15&duration=30'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle no available doctors gracefully', async () => {
      // Mock no doctors available
      mockServiceSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        });

      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=org-123&date=2024-01-15&duration=30'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('No doctors found in organization');
    });
  });

  describe('Availability Filtering', () => {
    it('should validate required parameters', async () => {
      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=invalid-id&date=2024-01-15'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid query parameters');
    });

    it('should validate date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=org-123&date=invalid-date'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid query parameters');
    });

    it('should validate duration parameter', async () => {
      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=org-123&date=2024-01-15&duration=5'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid query parameters');
    });

    it('should use default duration when not specified', async () => {
      // Mock successful response
      mockServiceSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockDoctors,
                error: null
              })
            })
          })
        });

      const mockSchedulesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockSchedules,
                error: null
              })
            })
          })
        })
      };

      const mockAppointmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      mockServiceSupabase.from
        .mockReturnValueOnce(mockSchedulesQuery)
        .mockReturnValueOnce(mockAppointmentsQuery);

      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=org-123&date=2024-01-15'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.duration_minutes).toBe(30); // Default duration
    });
  });

  describe('Time Slot Generation', () => {
    it('should exclude conflicting appointments', async () => {
      // Mock with conflicting appointments
      mockServiceSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [mockDoctors[0]],
                error: null
              })
            })
          })
        });

      const mockSchedulesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [mockSchedules[0]],
                error: null
              })
            })
          })
        })
      };

      const mockAppointmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: mockAppointments,
              error: null
            })
          })
        })
      };

      mockServiceSupabase.from
        .mockReturnValueOnce(mockSchedulesQuery)
        .mockReturnValueOnce(mockAppointmentsQuery);

      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=org-123&date=2024-01-15&duration=30'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Should not include conflicting time slots
      const conflictingSlot = result.data.find((slot: any) =>
        slot.doctor_id === 'doctor-1' && slot.start_time === '09:00:00'
      );
      expect(conflictingSlot).toBeUndefined();
    });

    it('should sort slots by time', async () => {
      // Mock successful response
      mockServiceSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockDoctors,
                error: null
              })
            })
          })
        });

      const mockSchedulesQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockSchedules,
                error: null
              })
            })
          })
        })
      };

      const mockAppointmentsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      };

      mockServiceSupabase.from
        .mockReturnValueOnce(mockSchedulesQuery)
        .mockReturnValueOnce(mockAppointmentsQuery);

      const request = new NextRequest(
        'http://localhost/api/doctors/availability?organizationId=org-123&date=2024-01-15&duration=30'
      );

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Check if slots are sorted by time
      if (result.data.length > 1) {
        for (let i = 1; i < result.data.length; i++) {
          expect(result.data[i].start_time >= result.data[i-1].start_time).toBe(true);
        }
      }
    });
  });
});
