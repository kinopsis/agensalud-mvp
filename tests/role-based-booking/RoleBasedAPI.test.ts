/**
 * Role-Based API Integration Tests (MVP SIMPLIFIED)
 * Tests for appointment creation and availability APIs with role-based validation
 * 
 * @description Integration tests for role-based booking endpoints
 */

import { NextRequest } from 'next/server';
import { POST as appointmentsPost } from '@/app/api/appointments/route';
import { GET as availabilityGet } from '@/app/api/appointments/availability/route';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        neq: jest.fn(() => ({
          or: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn()
      })),
      filter: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('Role-Based API Integration Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-30T10:00:00.000Z'));
    
    // Default auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Appointments API - Role-Based Validation', () => {
    describe('Patient Role - 24-Hour Rule', () => {
      beforeEach(() => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  role: 'patient',
                  organization_id: mockOrganizationId
                },
                error: null
              })
            }))
          }))
        });
      });

      it('should reject same-day appointment creation for patients', async () => {
        const requestBody = {
          organizationId: mockOrganizationId,
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          serviceId: 'service-123',
          appointmentDate: '2025-05-30', // Today
          startTime: '15:00',
          endTime: '15:30',
          notes: 'Test appointment'
        };

        const request = new NextRequest('http://localhost/api/appointments', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await appointmentsPost(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('24 horas de anticipación');
        expect(data.code).toBe('ADVANCE_BOOKING_REQUIRED');
        expect(data.requiredAdvanceHours).toBe(24);
        expect(data.userRole).toBe('patient');
      });

      it('should allow future day appointment creation for patients', async () => {
        // Mock successful appointment creation
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  role: 'patient',
                  organization_id: mockOrganizationId
                },
                error: null
              }),
              neq: jest.fn(() => ({
                or: jest.fn().mockResolvedValue({
                  data: [], // No conflicts
                  error: null
                })
              }))
            })),
            insert: jest.fn(() => ({
              select: jest.fn().mockResolvedValue({
                data: [{ id: 'appointment-123' }],
                error: null
              })
            }))
          }))
        });

        const requestBody = {
          organizationId: mockOrganizationId,
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          serviceId: 'service-123',
          appointmentDate: '2025-05-31', // Tomorrow
          startTime: '15:00',
          endTime: '15:30',
          notes: 'Test appointment'
        };

        const request = new NextRequest('http://localhost/api/appointments', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await appointmentsPost(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.appointment).toBeDefined();
      });
    });

    describe('Privileged Roles - Real-Time Booking', () => {
      const privilegedRoles = ['admin', 'staff', 'doctor', 'superadmin'];

      privilegedRoles.forEach(role => {
        describe(`${role} role`, () => {
          beforeEach(() => {
            mockSupabaseClient.from.mockReturnValue({
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      role,
                      organization_id: mockOrganizationId
                    },
                    error: null
                  }),
                  neq: jest.fn(() => ({
                    or: jest.fn().mockResolvedValue({
                      data: [], // No conflicts
                      error: null
                    })
                  }))
                })),
                insert: jest.fn(() => ({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: 'appointment-123' }],
                    error: null
                  })
                }))
              }))
            });
          });

          it(`should allow same-day appointment creation for ${role}`, async () => {
            const requestBody = {
              organizationId: mockOrganizationId,
              patientId: 'patient-123',
              doctorId: 'doctor-123',
              serviceId: 'service-123',
              appointmentDate: '2025-05-30', // Today
              startTime: '15:00', // Future time
              endTime: '15:30',
              notes: 'Test appointment'
            };

            const request = new NextRequest('http://localhost/api/appointments', {
              method: 'POST',
              body: JSON.stringify(requestBody),
              headers: { 'Content-Type': 'application/json' }
            });

            const response = await appointmentsPost(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.appointment).toBeDefined();
          });
        });
      });
    });
  });

  describe('Availability API - Role-Based Filtering', () => {
    beforeEach(() => {
      // Mock availability data
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            filter: jest.fn().mockResolvedValue({
              data: [
                {
                  doctor_id: 'doctor-123',
                  day_of_week: 5, // Friday (2025-05-30)
                  start_time: '08:00',
                  end_time: '18:00',
                  is_active: true,
                  doctor: {
                    id: 'doctor-123',
                    first_name: 'John',
                    last_name: 'Doe',
                    organization_id: mockOrganizationId
                  }
                }
              ],
              error: null
            })
          }))
        }))
      });
    });

    it('should filter same-day slots for patients', async () => {
      const url = new URL('http://localhost/api/appointments/availability');
      url.searchParams.set('organizationId', mockOrganizationId);
      url.searchParams.set('startDate', '2025-05-30');
      url.searchParams.set('endDate', '2025-05-30');
      url.searchParams.set('userRole', 'patient');

      const request = new NextRequest(url.toString());
      const response = await availabilityGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that same-day slots are marked as unavailable for patients
      const todaySlots = data.data['2025-05-30']?.slots || [];
      const availableSlots = todaySlots.filter((slot: any) => slot.available);
      
      expect(availableSlots.length).toBe(0); // No available slots for patients on same day
      
      // Check that unavailable slots have the correct reason
      const unavailableSlots = todaySlots.filter((slot: any) => !slot.available);
      expect(unavailableSlots.length).toBeGreaterThan(0);
      expect(unavailableSlots[0].reason).toContain('24 horas de anticipación');
    });

    it('should allow same-day future slots for admin', async () => {
      const url = new URL('http://localhost/api/appointments/availability');
      url.searchParams.set('organizationId', mockOrganizationId);
      url.searchParams.set('startDate', '2025-05-30');
      url.searchParams.set('endDate', '2025-05-30');
      url.searchParams.set('userRole', 'admin');

      const request = new NextRequest(url.toString());
      const response = await availabilityGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that future slots are available for admin
      const todaySlots = data.data['2025-05-30']?.slots || [];
      const futureSlots = todaySlots.filter((slot: any) => 
        slot.available && slot.time >= '11:00' // After current time (10:00)
      );
      
      expect(futureSlots.length).toBeGreaterThan(0);
      
      // Check that past slots are unavailable
      const pastSlots = todaySlots.filter((slot: any) => 
        !slot.available && slot.time <= '10:00'
      );
      
      expect(pastSlots.length).toBeGreaterThan(0);
      expect(pastSlots[0].reason).toContain('ya pasado');
    });

    it('should force standard rules when useStandardRules is true', async () => {
      const url = new URL('http://localhost/api/appointments/availability');
      url.searchParams.set('organizationId', mockOrganizationId);
      url.searchParams.set('startDate', '2025-05-30');
      url.searchParams.set('endDate', '2025-05-30');
      url.searchParams.set('userRole', 'admin');
      url.searchParams.set('useStandardRules', 'true');

      const request = new NextRequest(url.toString());
      const response = await availabilityGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that all same-day slots are unavailable when forcing standard rules
      const todaySlots = data.data['2025-05-30']?.slots || [];
      const availableSlots = todaySlots.filter((slot: any) => slot.available);
      
      expect(availableSlots.length).toBe(0); // No available slots when forcing standard rules
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' }
      });

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await appointmentsPost(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle missing profile gracefully', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }))
      });

      const request = new NextRequest('http://localhost/api/appointments', {
        method: 'POST',
        body: JSON.stringify({ organizationId: mockOrganizationId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await appointmentsPost(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Profile not found');
    });
  });
});
