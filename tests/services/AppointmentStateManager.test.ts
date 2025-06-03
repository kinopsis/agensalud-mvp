/**
 * AppointmentStateManager Service Tests
 * 
 * Tests for enhanced appointment state management with focus on:
 * - Role-based validation
 * - Business rule enforcement
 * - Audit trail creation
 * - Notification system
 * - State transition flows
 * 
 * @version 1.0.0 - State manager testing
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import { AppointmentStateManager } from '@/services/AppointmentStateManager';
import { AppointmentStatus, UserRole } from '@/types/appointment-states';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-appointment',
              status: 'confirmed',
              appointment_date: '2025-01-30',
              start_time: '10:00:00',
              patient_id: 'patient-1',
              doctor_id: 'doctor-1'
            },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { id: 'test-appointment', status: 'completed' },
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'audit-trail-1' },
            error: null
          }))
        }))
      }))
    }))
  })
}));

describe('AppointmentStateManager', () => {
  let stateManager: AppointmentStateManager;

  beforeEach(() => {
    stateManager = new AppointmentStateManager();
    jest.clearAllMocks();
  });

  describe('validateTransition', () => {
    it('allows valid transitions for authorized roles', async () => {
      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.EN_CURSO,
        'doctor'
      );

      expect(result.valid).toBe(true);
    });

    it('rejects transitions for unauthorized roles', async () => {
      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.EN_CURSO,
        'patient'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not allowed to transition');
    });

    it('rejects invalid status transitions', async () => {
      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.COMPLETED,
        AppointmentStatus.PENDING,
        'admin'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('rejects transitions from final states', async () => {
      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CONFIRMED,
        'admin'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('final state');
    });
  });

  describe('executeTransition', () => {
    it('successfully executes valid state transitions', async () => {
      const request = {
        appointmentId: 'test-appointment',
        newStatus: AppointmentStatus.EN_CURSO,
        reason: 'Patient arrived for consultation',
        userId: 'doctor-1',
        userRole: 'doctor' as UserRole,
        organizationId: 'org-1',
        metadata: { source: 'dashboard' }
      };

      const result = await stateManager.executeTransition(request);

      expect(result.success).toBe(true);
      expect(result.auditTrailId).toBeDefined();
      expect(result.previousStatus).toBe(AppointmentStatus.CONFIRMED);
      expect(result.newStatus).toBe(AppointmentStatus.EN_CURSO);
    });

    it('fails when appointment is not found', async () => {
      // Mock appointment not found
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      const request = {
        appointmentId: 'non-existent',
        newStatus: AppointmentStatus.COMPLETED,
        userId: 'doctor-1',
        userRole: 'doctor' as UserRole,
        organizationId: 'org-1'
      };

      const result = await stateManager.executeTransition(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Appointment not found');
    });

    it('creates comprehensive audit trail', async () => {
      const request = {
        appointmentId: 'test-appointment',
        newStatus: AppointmentStatus.COMPLETED,
        reason: 'Consultation completed successfully',
        userId: 'doctor-1',
        userRole: 'doctor' as UserRole,
        organizationId: 'org-1',
        metadata: { 
          duration: 30,
          notes: 'Patient responded well to treatment'
        }
      };

      const result = await stateManager.executeTransition(request);

      expect(result.success).toBe(true);
      expect(result.auditTrailId).toBeDefined();
      
      // Verify audit trail creation was called
      const mockSupabase = require('@/lib/supabase/client').createClient();
      expect(mockSupabase.from).toHaveBeenCalledWith('appointment_audit_trail');
    });
  });

  describe('Business Rules Validation', () => {
    it('prevents marking future appointments as completed', async () => {
      // Mock future appointment
      const mockSupabase = require('@/lib/supabase/client').createClient();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          appointment_date: futureDate.toISOString().split('T')[0],
          start_time: '10:00:00',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1'
        },
        error: null
      });

      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        'doctor'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('future appointments');
    });

    it('prevents patient cancellation within 2 hours', async () => {
      // Mock appointment in 1 hour
      const mockSupabase = require('@/lib/supabase/client').createClient();
      const nearFuture = new Date();
      nearFuture.setHours(nearFuture.getHours() + 1);
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          appointment_date: nearFuture.toISOString().split('T')[0],
          start_time: nearFuture.toTimeString().split(' ')[0],
          patient_id: 'patient-1',
          doctor_id: 'doctor-1'
        },
        error: null
      });

      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELADA_PACIENTE,
        'patient'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('less than 2 hours');
    });

    it('allows admin cancellation regardless of timing', async () => {
      // Mock appointment in 1 hour
      const mockSupabase = require('@/lib/supabase/client').createClient();
      const nearFuture = new Date();
      nearFuture.setHours(nearFuture.getHours() + 1);
      
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          appointment_date: nearFuture.toISOString().split('T')[0],
          start_time: nearFuture.toTimeString().split(' ')[0],
          patient_id: 'patient-1',
          doctor_id: 'doctor-1'
        },
        error: null
      });

      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELADA_CLINICA,
        'admin'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Logical Flow Validation', () => {
    it('enforces proper appointment flow', async () => {
      // Test Patient originates → Staff/Admin confirm → Doctor attends flow
      
      // Step 1: Patient creates (PENDING)
      const step1 = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        'staff'
      );
      expect(step1.valid).toBe(true);

      // Step 2: Staff confirms
      const step2 = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.EN_CURSO,
        'doctor'
      );
      expect(step2.valid).toBe(true);

      // Step 3: Doctor attends
      const step3 = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.EN_CURSO,
        AppointmentStatus.COMPLETED,
        'doctor'
      );
      expect(step3.valid).toBe(true);
    });

    it('prevents invalid flow jumps', async () => {
      // Cannot go directly from PENDING to COMPLETED
      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.PENDING,
        AppointmentStatus.COMPLETED,
        'doctor'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid flow');
    });
  });

  describe('getAvailableTransitions', () => {
    it('returns role-appropriate transitions', async () => {
      const transitions = await stateManager.getAvailableTransitions(
        'test-appointment',
        'doctor'
      );

      expect(transitions).toContain(AppointmentStatus.EN_CURSO);
      expect(transitions).toContain(AppointmentStatus.COMPLETED);
      expect(transitions).not.toContain(AppointmentStatus.CANCELADA_PACIENTE);
    });

    it('returns empty array for non-existent appointments', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      const transitions = await stateManager.getAvailableTransitions(
        'non-existent',
        'doctor'
      );

      expect(transitions).toEqual([]);
    });
  });

  describe('Notification System', () => {
    it('sends appropriate notifications for status changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = {
        appointmentId: 'test-appointment',
        newStatus: AppointmentStatus.CONFIRMED,
        userId: 'staff-1',
        userRole: 'staff' as UserRole,
        organizationId: 'org-1'
      };

      const result = await stateManager.executeTransition(request);

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toContain('email:appointment_confirmed');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('📧 Sending email notification'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles database errors gracefully', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select().eq().single.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const result = await stateManager.validateTransition(
        'test-appointment',
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.COMPLETED,
        'doctor'
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Error validating business rules');
    });

    it('handles audit trail creation failures', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().insert().select().single.mockRejectedValueOnce(
        new Error('Audit trail creation failed')
      );

      const request = {
        appointmentId: 'test-appointment',
        newStatus: AppointmentStatus.COMPLETED,
        userId: 'doctor-1',
        userRole: 'doctor' as UserRole,
        organizationId: 'org-1'
      };

      const result = await stateManager.executeTransition(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal error during state transition');
    });
  });
});
