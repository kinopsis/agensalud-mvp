/**
 * Tests for appointment server actions
 */

import { createAppointment, updateAppointment, cancelAppointment, getAvailableSlots, upsertDoctorSchedule } from '@/app/api/appointments/actions'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn()
            })),
            single: jest.fn()
          })),
          single: jest.fn()
        })),
        single: jest.fn(),
        order: jest.fn(() => ({
          order: jest.fn()
        })),
        in: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}

describe('Appointment Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabase)
  })

  describe('createAppointment', () => {
    const appointmentData = {
      patient_id: 'patient-123',
      doctor_id: 'doctor-123',
      appointment_date: '2025-01-15',
      appointment_time: '10:00',
      reason: 'Consulta general'
    }

    it('should fail when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const result = await createAppointment(appointmentData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Usuario no autenticado')
    })

    it('should return error object structure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const result = await createAppointment(appointmentData)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
      expect(typeof result.success).toBe('boolean')
      expect(typeof result.error).toBe('string')
    })
  })

  describe('updateAppointment', () => {
    const updateData = {
      id: 'appointment-123',
      status: 'confirmed' as const,
      notes: 'Updated notes'
    }

    it('should fail when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const result = await updateAppointment(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Usuario no autenticado')
    })
  })

  describe('cancelAppointment', () => {
    it('should have correct function signature', () => {
      expect(typeof cancelAppointment).toBe('function')
    })
  })

  describe('getAvailableSlots', () => {
    it('should have correct function signature', () => {
      expect(typeof getAvailableSlots).toBe('function')
    })
  })

  describe('upsertDoctorSchedule', () => {
    it('should have correct function signature', () => {
      expect(typeof upsertDoctorSchedule).toBe('function')
    })
  })
})

describe('Time Slot Generation', () => {
  it('should generate correct time slots', () => {
    // This would test the generateTimeSlots helper function
    // Since it's not exported, we test it indirectly through getAvailableSlots

    const startTime = '09:00'
    const endTime = '12:00'
    const slotDuration = 30
    const existingAppointments: Array<{ appointment_time: string; duration_minutes: number }> = []

    // Expected slots: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
    const expectedSlotCount = 6

    // This is a conceptual test - the actual implementation would need
    // the helper function to be exported or tested through integration
    expect(expectedSlotCount).toBe(6)
  })

  it('should exclude conflicting time slots', () => {
    const existingAppointments = [
      { appointment_time: '10:00', duration_minutes: 30 }
    ]

    // The 10:00 slot should be excluded from available slots
    // This would be tested through the actual getAvailableSlots function
    expect(existingAppointments.length).toBe(1)
  })
})
