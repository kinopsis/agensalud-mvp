/**
 * Comprehensive Integration Test for Appointment Booking System
 * Tests the complete end-to-end appointment creation flow
 * FIXED: Converted from vitest to Jest
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAppointment, getAvailableSlots } from '@/app/api/appointments/actions';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  maybeSingle: jest.fn(() => mockSupabase)
};

// Mock the Supabase client creation
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabase)
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

describe('Appointment Booking Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Database Schema Consistency', () => {
    it('should use correct foreign key references', async () => {
      // Mock user authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Mock profile lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'profile-123',
          organization_id: 'org-123',
          role: 'patient'
        },
        error: null
      })

      // Mock availability check (no conflicts)
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      })

      // Mock default service lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'service-123' },
        error: null
      })

      // Mock default location lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'location-123' },
        error: null
      })

      // Mock appointment creation
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'appointment-123',
          patient_id: 'profile-123', // Should reference profiles.id
          doctor_id: 'doctor-123',   // Should reference doctors.id
          service_id: 'service-123',
          location_id: 'location-123',
          appointment_date: '2025-06-05',
          start_time: '14:00',
          end_time: '14:30',
          status: 'scheduled'
        },
        error: null
      })

      const appointmentData = {
        patient_id: 'profile-123',  // Profile ID (correct)
        doctor_id: 'doctor-123',    // Doctor record ID (correct)
        appointment_date: '2025-06-05',
        appointment_time: '14:00',
        reason: 'Test appointment',
        notes: 'Integration test'
      }

      const result = await createAppointment(appointmentData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      // Verify the insert was called with correct structure
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          patient_id: 'profile-123',  // Should be profile ID
          doctor_id: 'doctor-123',    // Should be doctor record ID
          service_id: 'service-123',
          location_id: 'location-123',
          start_time: '14:00',
          end_time: expect.any(String), // Calculated end time
          status: 'scheduled'
        })
      )
    })

    it('should handle foreign key constraint violations gracefully', async () => {
      // Mock user authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Mock profile lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'profile-123',
          organization_id: 'org-123',
          role: 'patient'
        },
        error: null
      })

      // Mock availability check (no conflicts)
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      })

      // Mock default service lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'service-123' },
        error: null
      })

      // Mock default location lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'location-123' },
        error: null
      })

      // Mock foreign key constraint violation
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23503',
          message: 'insert or update on table "appointments" violates foreign key constraint'
        }
      })

      const appointmentData = {
        patient_id: 'invalid-profile-id',
        doctor_id: 'invalid-doctor-id',
        appointment_date: '2025-06-05',
        appointment_time: '14:00',
        reason: 'Test appointment',
        notes: 'Integration test'
      }

      const result = await createAppointment(appointmentData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Error al crear la cita')
    })
  })

  describe('Column Name Consistency', () => {
    it('should use start_time instead of appointment_time in database queries', async () => {
      // Mock user authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Mock profile lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'profile-123',
          organization_id: 'org-123',
          role: 'patient'
        },
        error: null
      })

      // Mock availability check - should use start_time column
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      })

      // Mock default service and location
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'service-123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'location-123' }, error: null })

      // Mock successful appointment creation
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'appointment-123' },
        error: null
      })

      const appointmentData = {
        patient_id: 'profile-123',
        doctor_id: 'doctor-123',
        appointment_date: '2025-06-05',
        appointment_time: '14:00',
        reason: 'Test appointment'
      }

      await createAppointment(appointmentData)

      // Verify that the availability check uses start_time, not appointment_time
      expect(mockSupabase.eq).toHaveBeenCalledWith('start_time', '14:00')
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('appointment_time', '14:00')
    })
  })

  describe('End-to-End Appointment Flow', () => {
    it('should complete the full appointment creation workflow', async () => {
      // Mock all required database operations
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Mock profile lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'profile-123',
          organization_id: 'org-123',
          role: 'patient'
        },
        error: null
      })

      // Mock availability check (no conflicts)
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      })

      // Mock service and location lookups
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'service-123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'location-123' }, error: null })

      // Mock successful appointment creation
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'appointment-123',
          patient_id: 'profile-123',
          doctor_id: 'doctor-123',
          appointment_date: '2025-06-05',
          start_time: '14:00',
          end_time: '14:30',
          status: 'scheduled'
        },
        error: null
      })

      const appointmentData = {
        patient_id: 'profile-123',
        doctor_id: 'doctor-123',
        appointment_date: '2025-06-05',
        appointment_time: '14:00',
        duration_minutes: 30,
        reason: 'Regular checkup',
        notes: 'Patient reports no issues'
      }

      const result = await createAppointment(appointmentData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(
        expect.objectContaining({
          id: 'appointment-123',
          patient_id: 'profile-123',
          doctor_id: 'doctor-123',
          status: 'scheduled'
        })
      )
    })
  })
})
