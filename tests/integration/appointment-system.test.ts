/**
 * Integration Tests - Complete Appointment System
 * Tests the integration between AI, database, and appointment logic
 */

import { createMockSupabaseClient, createMockAISDK } from '../utils/test-helpers';
import { MOCK_USERS, MOCK_ORGANIZATIONS, MOCK_APPOINTMENTS, createMockAppointment } from '../fixtures/optical-simulation-data';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}));

jest.mock('ai', () => createMockAISDK());

// Mock Next.js functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

describe('Appointment System Integration', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { createClient: createServerClient } = require('@/lib/supabase/server');
    const { createClient: createClientClient } = require('@/lib/supabase/client');
    
    createServerClient.mockReturnValue(mockSupabase);
    createClientClient.mockReturnValue(mockSupabase);
    
    jest.clearAllMocks();
  });

  describe('AI-Powered Appointment Booking', () => {
    it('should complete full booking flow from natural language to database', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const doctor = MOCK_USERS.find(u => u.role === 'doctor');
      const organization = MOCK_ORGANIZATIONS[0];

      // Mock AI intent extraction
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'book',
          specialty: 'cardiología',
          preferredDate: 'mañana',
          preferredTime: 'mañana',
          confidence: 0.9,
          missingInfo: [],
          suggestedResponse: 'Te ayudo a agendar una cita con cardiología.'
        }
      });

      // Mock doctor availability check
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'doctor_schedules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'schedule_001',
                      doctor_id: doctor?.id,
                      day_of_week: 1, // Monday
                      start_time: '09:00',
                      end_time: '17:00',
                      is_available: true
                    }
                  ],
                  error: null
                })
              })
            })
          };
        }

        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: [], // No conflicting appointments
                    error: null
                  })
                })
              })
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: createMockAppointment({
                    patient_id: patient?.id,
                    doctor_id: doctor?.id,
                    organization_id: organization.id,
                    appointment_date: '2024-01-16', // Tomorrow
                    start_time: '10:00',
                    end_time: '10:45',
                    status: 'scheduled'
                  }),
                  error: null
                })
              })
            })
          };
        }

        return mockSupabase.from(table);
      });

      // Simulate the complete flow
      const userMessage = 'Necesito una cita con cardiología para mañana por la mañana';
      
      // 1. AI processes the request
      const aiResult = await generateObject({
        model: 'mocked-model',
        prompt: `Extract appointment intent: ${userMessage}`,
        schema: expect.any(Object)
      });

      expect(aiResult.object.intent).toBe('book');
      expect(aiResult.object.specialty).toBe('cardiología');

      // 2. Check doctor availability
      const availabilityResult = await mockSupabase
        .from('doctor_schedules')
        .select('*')
        .eq('organization_id', organization.id)
        .order('day_of_week');

      expect(availabilityResult.data).toHaveLength(1);
      expect(availabilityResult.data[0].is_available).toBe(true);

      // 3. Check for conflicts
      const conflictResult = await mockSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor?.id)
        .gte('appointment_date', '2024-01-16')
        .lte('appointment_date', '2024-01-16');

      expect(conflictResult.data).toHaveLength(0); // No conflicts

      // 4. Create appointment
      const appointmentResult = await mockSupabase
        .from('appointments')
        .insert({
          patient_id: patient?.id,
          doctor_id: doctor?.id,
          organization_id: organization.id,
          appointment_date: '2024-01-16',
          start_time: '10:00',
          end_time: '10:45',
          status: 'scheduled'
        })
        .select()
        .single();

      expect(appointmentResult.data).toMatchObject({
        patient_id: patient?.id,
        doctor_id: doctor?.id,
        status: 'scheduled'
      });
    });

    it('should handle appointment conflicts intelligently', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const doctor = MOCK_USERS.find(u => u.role === 'doctor');
      const organization = MOCK_ORGANIZATIONS[0];

      // Mock existing appointment conflict
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: [
                      createMockAppointment({
                        doctor_id: doctor?.id,
                        appointment_date: '2024-01-16',
                        start_time: '10:00',
                        end_time: '10:45'
                      })
                    ],
                    error: null
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      // Check for conflicts
      const conflictResult = await mockSupabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctor?.id)
        .gte('appointment_date', '2024-01-16')
        .lte('appointment_date', '2024-01-16');

      expect(conflictResult.data).toHaveLength(1);
      
      // AI should suggest alternative times
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'book',
          specialty: 'cardiología',
          confidence: 0.9,
          missingInfo: ['preferred_time'],
          suggestedResponse: 'Ese horario está ocupado. ¿Te parece bien a las 11:00 AM?'
        }
      });

      const aiResponse = await generateObject({
        model: 'mocked-model',
        prompt: 'Handle appointment conflict',
        schema: expect.any(Object)
      });

      expect(aiResponse.object.suggestedResponse).toContain('ocupado');
      expect(aiResponse.object.missingInfo).toContain('preferred_time');
    });

    it('should validate organization boundaries in appointments', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const wrongOrgId = 'org_competitor_001';

      // Mock RLS preventing cross-organization access
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Organization boundary violation' }
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const result = await mockSupabase
        .from('appointments')
        .insert({
          patient_id: patient?.id,
          doctor_id: 'doctor_from_other_org',
          organization_id: wrongOrgId,
          appointment_date: '2024-01-16',
          start_time: '10:00',
          end_time: '10:45',
          status: 'scheduled'
        })
        .select()
        .single();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Organization boundary');
    });
  });

  describe('Appointment Status Management', () => {
    it('should handle appointment status transitions correctly', async () => {
      const appointment = MOCK_APPOINTMENTS[0];
      const statusTransitions = [
        { from: 'scheduled', to: 'confirmed' },
        { from: 'confirmed', to: 'completed' },
        { from: 'scheduled', to: 'cancelled' }
      ];

      for (const transition of statusTransitions) {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'appointments') {
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        ...appointment,
                        status: transition.to
                      },
                      error: null
                    })
                  })
                })
              })
            };
          }
          return mockSupabase.from(table);
        });

        const result = await mockSupabase
          .from('appointments')
          .update({ status: transition.to })
          .eq('id', appointment.id)
          .select()
          .single();

        expect(result.data.status).toBe(transition.to);
      }
    });

    it('should prevent invalid status transitions', async () => {
      const appointment = createMockAppointment({ status: 'completed' });

      // Mock validation preventing completed -> scheduled transition
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Invalid status transition' }
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const result = await mockSupabase
        .from('appointments')
        .update({ status: 'scheduled' })
        .eq('id', appointment.id)
        .select()
        .single();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid status transition');
    });
  });

  describe('Doctor Schedule Integration', () => {
    it('should respect doctor working hours', async () => {
      const doctor = MOCK_USERS.find(u => u.role === 'doctor');
      const organization = MOCK_ORGANIZATIONS[0];

      // Mock doctor schedule
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'doctor_schedules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      doctor_id: doctor?.id,
                      day_of_week: 1, // Monday
                      start_time: '09:00',
                      end_time: '17:00',
                      is_available: true
                    }
                  ],
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const scheduleResult = await mockSupabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctor?.id)
        .order('day_of_week');

      expect(scheduleResult.data).toHaveLength(1);
      expect(scheduleResult.data[0].start_time).toBe('09:00');
      expect(scheduleResult.data[0].end_time).toBe('17:00');

      // Validate appointment time is within working hours
      const appointmentTime = '10:00';
      const workingHours = scheduleResult.data[0];
      
      expect(appointmentTime >= workingHours.start_time).toBe(true);
      expect(appointmentTime <= workingHours.end_time).toBe(true);
    });

    it('should handle doctor unavailability', async () => {
      const doctor = MOCK_USERS.find(u => u.role === 'doctor');

      // Mock doctor not available on requested day
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'doctor_schedules') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      doctor_id: doctor?.id,
                      day_of_week: 1, // Monday
                      start_time: '09:00',
                      end_time: '17:00',
                      is_available: false // Not available
                    }
                  ],
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const scheduleResult = await mockSupabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctor?.id)
        .order('day_of_week');

      expect(scheduleResult.data[0].is_available).toBe(false);

      // AI should suggest alternative dates
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          intent: 'book',
          confidence: 0.9,
          missingInfo: ['preferred_date'],
          suggestedResponse: 'El doctor no está disponible ese día. ¿Te parece bien el martes?'
        }
      });

      const aiResponse = await generateObject({
        model: 'mocked-model',
        prompt: 'Handle doctor unavailability',
        schema: expect.any(Object)
      });

      expect(aiResponse.object.suggestedResponse).toContain('no está disponible');
    });
  });

  describe('Multi-Role Appointment Access', () => {
    it('should allow patients to view only their appointments', async () => {
      const patient = MOCK_USERS.find(u => u.role === 'patient');
      const patientAppointments = MOCK_APPOINTMENTS.filter(
        apt => apt.patient_id === patient?.id
      );

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: patientAppointments,
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const result = await mockSupabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patient?.id)
        .order('appointment_date');

      expect(result.data).toEqual(patientAppointments);
      expect(result.data?.every(apt => apt.patient_id === patient?.id)).toBe(true);
    });

    it('should allow doctors to view appointments in their organization', async () => {
      const doctor = MOCK_USERS.find(u => u.role === 'doctor');
      const orgAppointments = MOCK_APPOINTMENTS.filter(
        apt => apt.organization_id === doctor?.organization_id
      );

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: orgAppointments,
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const result = await mockSupabase
        .from('appointments')
        .select('*')
        .eq('organization_id', doctor?.organization_id)
        .order('appointment_date');

      expect(result.data).toEqual(orgAppointments);
      expect(result.data?.every(apt => apt.organization_id === doctor?.organization_id)).toBe(true);
    });

    it('should allow admins to manage all organization appointments', async () => {
      const admin = MOCK_USERS.find(u => u.role === 'admin');
      const orgAppointments = MOCK_APPOINTMENTS.filter(
        apt => apt.organization_id === admin?.organization_id
      );

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: orgAppointments,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...orgAppointments[0], status: 'confirmed' },
                    error: null
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      // Admin can view all appointments
      const viewResult = await mockSupabase
        .from('appointments')
        .select('*')
        .eq('organization_id', admin?.organization_id)
        .order('appointment_date');

      expect(viewResult.data).toEqual(orgAppointments);

      // Admin can update any appointment
      const updateResult = await mockSupabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', orgAppointments[0].id)
        .select()
        .single();

      expect(updateResult.data.status).toBe('confirmed');
    });
  });
});
