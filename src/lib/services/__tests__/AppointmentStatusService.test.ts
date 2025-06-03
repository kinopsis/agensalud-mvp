/**
 * AppointmentStatusService Unit Tests
 * Tests for appointment status management with validation and audit trail
 * 
 * @description Comprehensive tests for status transitions, role validation,
 * and audit trail functionality
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import { AppointmentStatusService } from '../AppointmentStatusService';
import { AppointmentStatus, UserRole } from '@/types/appointment-states';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn()
      }))
    })),
    rpc: jest.fn()
  }))
}));

describe('AppointmentStatusService', () => {
  let service: AppointmentStatusService;
  const mockAppointmentId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '987fcdeb-51a2-43d1-9f12-345678901234';

  beforeEach(() => {
    service = AppointmentStatusService.getInstance();
    service.clearCache();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AppointmentStatusService.getInstance();
      const instance2 = AppointmentStatusService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Role Permission Validation', () => {
    it('should allow patient to cancel their own appointment', async () => {
      // Mock current appointment data
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: mockAppointmentId,
          status: 'confirmed',
          patient_id: mockUserId,
          doctor_id: 'doctor-id',
          organization_id: 'org-id'
        },
        error: null
      });

      // Mock SQL validation
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      // Mock update success
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      // Mock audit trail success
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'audit-id' },
        error: null
      });

      const result = await service.changeStatus(
        mockAppointmentId,
        AppointmentStatus.CANCELADA_PACIENTE,
        mockUserId,
        'patient',
        'Patient requested cancellation'
      );

      expect(result.success).toBe(true);
      expect(result.auditId).toBe('audit-id');
    });

    it('should prevent patient from marking appointment as in progress', async () => {
      // Mock current appointment data
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: mockAppointmentId,
          status: 'confirmed',
          patient_id: mockUserId,
          doctor_id: 'doctor-id',
          organization_id: 'org-id'
        },
        error: null
      });

      // Mock SQL validation (should pass)
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      const result = await service.changeStatus(
        mockAppointmentId,
        AppointmentStatus.EN_CURSO,
        mockUserId,
        'patient',
        'Trying to mark as in progress'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have permission');
    });

    it('should allow staff to change any status', async () => {
      // Mock current appointment data
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: mockAppointmentId,
          status: 'confirmed',
          patient_id: 'patient-id',
          doctor_id: 'doctor-id',
          organization_id: 'org-id'
        },
        error: null
      });

      // Mock SQL validation
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      // Mock update success
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      // Mock audit trail success
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'audit-id' },
        error: null
      });

      const result = await service.changeStatus(
        mockAppointmentId,
        AppointmentStatus.EN_CURSO,
        mockUserId,
        'staff',
        'Staff marking as in progress'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Status Transition Validation', () => {
    it('should validate transitions using SQL function', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient();
      
      // Mock current appointment
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: mockAppointmentId,
          status: 'confirmed',
          patient_id: 'patient-id',
          doctor_id: 'doctor-id',
          organization_id: 'org-id'
        },
        error: null
      });

      // Mock SQL validation returning false
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      });

      const result = await service.changeStatus(
        mockAppointmentId,
        AppointmentStatus.COMPLETED,
        mockUserId,
        'patient',
        'Invalid transition attempt'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('business rules');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_appointment_status_transition', {
        p_appointment_id: mockAppointmentId,
        p_new_status: AppointmentStatus.COMPLETED,
        p_user_role: 'patient'
      });
    });
  });

  describe('Available Transitions', () => {
    it('should return available transitions for current status and role', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: mockAppointmentId,
          status: 'confirmed',
          patient_id: 'patient-id',
          doctor_id: 'doctor-id',
          organization_id: 'org-id'
        },
        error: null
      });

      const result = await service.getAvailableTransitions(mockAppointmentId, 'patient');

      expect(result.success).toBe(true);
      expect(result.transitions).toContain(AppointmentStatus.CANCELADA_PACIENTE);
      expect(result.transitions).toContain(AppointmentStatus.REAGENDADA);
      expect(result.transitions).not.toContain(AppointmentStatus.EN_CURSO);
    });
  });

  describe('Audit Trail', () => {
    it('should fetch audit trail for appointment', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient();
      
      const mockAuditData = [
        {
          id: 'audit-1',
          appointment_id: mockAppointmentId,
          previous_status: 'pending',
          new_status: 'confirmed',
          changed_by: mockUserId,
          reason: 'Confirmed by staff',
          user_role: 'staff',
          created_at: '2025-01-28T10:00:00Z',
          profiles: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          }
        }
      ];

      mockSupabase.from().select().eq().order().limit.mockResolvedValue({
        data: mockAuditData,
        error: null
      });

      const result = await service.getAuditTrail(mockAppointmentId, 10);

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.history![0].new_status).toBe('confirmed');
    });
  });

  describe('Error Handling', () => {
    it('should handle appointment not found', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient();
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const result = await service.changeStatus(
        'non-existent-id',
        AppointmentStatus.CONFIRMED,
        mockUserId,
        'staff'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient();
      
      mockSupabase.from().select().eq().single.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.changeStatus(
        mockAppointmentId,
        AppointmentStatus.CONFIRMED,
        mockUserId,
        'staff'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal error');
    });
  });

  describe('Cache Management', () => {
    it('should cache validation results', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient();
      
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      });

      // First call
      await service['validateTransitionWithSQL'](mockAppointmentId, AppointmentStatus.CONFIRMED, 'staff');
      
      // Second call should use cache
      await service['validateTransitionWithSQL'](mockAppointmentId, AppointmentStatus.CONFIRMED, 'staff');

      // RPC should only be called once due to caching
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should clear cache when requested', () => {
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
