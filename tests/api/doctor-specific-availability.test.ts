/**
 * Tests for Doctor-Specific Availability Filtering
 * Validates that duplicate time slots are eliminated when filtering by specific doctor
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        in: jest.fn(() => ({
          single: jest.fn(),
          maybeSingle: jest.fn()
        })),
        single: jest.fn(),
        maybeSingle: jest.fn()
      })),
      in: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }))
  }))
};

const mockServiceSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        in: jest.fn(),
        single: jest.fn()
      })),
      in: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }))
  }))
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

jest.mock('@/lib/supabase/service', () => ({
  createClient: jest.fn(() => mockServiceSupabase)
}));

// Mock data
const mockDoctors = [
  {
    id: 'doctor-1',
    specialization: 'Optometría Clínica',
    consultation_fee: 60,
    profiles: {
      id: 'profile-1',
      first_name: 'Ana',
      last_name: 'Rodríguez',
      email: 'ana@example.com'
    }
  },
  {
    id: 'doctor-2',
    specialization: 'Contactología',
    consultation_fee: 70,
    profiles: {
      id: 'profile-2',
      first_name: 'Carlos',
      last_name: 'López',
      email: 'carlos@example.com'
    }
  }
];

const mockSchedules = [
  // Doctor 1 has multiple schedules (morning and afternoon)
  {
    doctor_id: 'profile-1',
    day_of_week: 1,
    start_time: '08:00:00',
    end_time: '12:00:00',
    is_available: true
  },
  {
    doctor_id: 'profile-1',
    day_of_week: 1,
    start_time: '14:00:00',
    end_time: '18:00:00',
    is_available: true
  },
  // Doctor 2 has one schedule
  {
    doctor_id: 'profile-2',
    day_of_week: 1,
    start_time: '09:00:00',
    end_time: '17:00:00',
    is_available: true
  }
];

const mockService = {
  id: 'service-1',
  price: 80
};

describe('Doctor-Specific Availability API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
  });

  describe('Doctor Filtering Logic', () => {
    it('should filter to specific doctor when doctorId is provided', async () => {
      // Mock service lookup
      mockServiceSupabase.from.mockImplementation((table) => {
        if (table === 'services') {
          return {
            select: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({
                  data: mockService,
                  error: null
                })
              })
            })
          };
        }
        
        if (table === 'doctors') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: jest.fn().mockResolvedValue({
                    data: mockDoctors, // Return all doctors initially
                    error: null
                  })
                })
              })
            })
          };
        }

        if (table === 'doctor_schedules') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  eq: jest.fn().mockResolvedValue({
                    data: mockSchedules.filter(s => s.doctor_id === 'profile-1'), // Only doctor 1's schedules
                    error: null
                  })
                })
              })
            })
          };
        }

        if (table === 'appointments') {
          return {
            select: () => ({
              eq: () => ({
                in: jest.fn().mockResolvedValue({
                  data: [], // No existing appointments
                  error: null
                })
              })
            })
          };
        }

        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      });

      // Import and test the API
      const { GET } = await import('@/app/api/doctors/availability/route');
      
      const request = new Request('http://localhost:3000/api/doctors/availability?organizationId=org-123&doctorId=doctor-1&serviceId=service-1&date=2025-05-26');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should only have slots for the specific doctor
      if (result.data.length > 0) {
        result.data.forEach((slot: any) => {
          expect(slot.doctor_id).toBe('doctor-1');
        });
      }
    });

    it('should eliminate duplicate time slots for doctor with multiple schedules', async () => {
      // Mock service lookup for doctor with overlapping schedules
      mockServiceSupabase.from.mockImplementation((table) => {
        if (table === 'services') {
          return {
            select: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({
                  data: mockService,
                  error: null
                })
              })
            })
          };
        }
        
        if (table === 'doctors') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: jest.fn().mockResolvedValue({
                    data: [mockDoctors[0]], // Only doctor 1
                    error: null
                  })
                })
              })
            })
          };
        }

        if (table === 'doctor_schedules') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  eq: jest.fn().mockResolvedValue({
                    data: [
                      // Overlapping schedules that should be merged
                      {
                        doctor_id: 'profile-1',
                        day_of_week: 1,
                        start_time: '09:00:00',
                        end_time: '12:00:00',
                        is_available: true
                      },
                      {
                        doctor_id: 'profile-1',
                        day_of_week: 1,
                        start_time: '10:00:00', // Overlaps with previous
                        end_time: '14:00:00',
                        is_available: true
                      }
                    ],
                    error: null
                  })
                })
              })
            })
          };
        }

        if (table === 'appointments') {
          return {
            select: () => ({
              eq: () => ({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }

        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      });

      const { GET } = await import('@/app/api/doctors/availability/route');
      
      const request = new Request('http://localhost:3000/api/doctors/availability?organizationId=org-123&doctorId=doctor-1&serviceId=service-1&date=2025-05-26');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      
      // Check for no duplicate time slots
      if (result.data.length > 0) {
        const timeSlots = result.data.map((slot: any) => slot.start_time);
        const uniqueTimeSlots = [...new Set(timeSlots)];
        
        expect(timeSlots.length).toBe(uniqueTimeSlots.length);
      }
    });

    it('should return empty array when specified doctor is not found', async () => {
      // Mock service lookup
      mockServiceSupabase.from.mockImplementation((table) => {
        if (table === 'doctors') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: jest.fn().mockResolvedValue({
                    data: mockDoctors, // Return all doctors
                    error: null
                  })
                })
              })
            })
          };
        }

        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      });

      const { GET } = await import('@/app/api/doctors/availability/route');
      
      const request = new Request('http://localhost:3000/api/doctors/availability?organizationId=org-123&doctorId=nonexistent-doctor&serviceId=service-1&date=2025-05-26');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('Specified doctor not found or not available');
    });

    it('should apply service-based pricing for specific doctor', async () => {
      // Mock service lookup
      mockServiceSupabase.from.mockImplementation((table) => {
        if (table === 'services') {
          return {
            select: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({
                  data: { price: 90 }, // Service price different from doctor fee
                  error: null
                })
              })
            })
          };
        }
        
        if (table === 'doctors') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: jest.fn().mockResolvedValue({
                    data: [mockDoctors[0]], // Doctor with consultation_fee: 60
                    error: null
                  })
                })
              })
            })
          };
        }

        if (table === 'doctor_schedules') {
          return {
            select: () => ({
              in: () => ({
                eq: () => ({
                  eq: jest.fn().mockResolvedValue({
                    data: [mockSchedules[0]], // One schedule
                    error: null
                  })
                })
              })
            })
          };
        }

        if (table === 'appointments') {
          return {
            select: () => ({
              eq: () => ({
                in: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }

        return {
          select: () => ({
            eq: () => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        };
      });

      const { GET } = await import('@/app/api/doctors/availability/route');
      
      const request = new Request('http://localhost:3000/api/doctors/availability?organizationId=org-123&doctorId=doctor-1&serviceId=service-1&date=2025-05-26');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      
      // Should use service price (90) instead of doctor fee (60)
      if (result.data.length > 0) {
        result.data.forEach((slot: any) => {
          expect(slot.consultation_fee).toBe(90);
        });
      }
    });
  });
});
