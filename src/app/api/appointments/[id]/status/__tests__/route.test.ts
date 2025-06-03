/**
 * Appointment Status API Integration Tests
 * Tests for status change and audit trail endpoints
 * 
 * @description Comprehensive tests for appointment status management APIs
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import { NextRequest } from 'next/server';
import { PATCH, GET } from '../route';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}));

jest.mock('@/lib/services/AppointmentStatusService', () => ({
  __esModule: true,
  default: {
    changeStatus: jest.fn(),
    getAvailableTransitions: jest.fn()
  }
}));

describe('/api/appointments/[id]/status', () => {
  const mockAppointmentId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '987fcdeb-51a2-43d1-9f12-345678901234';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH - Change Status', () => {
    it('should successfully change appointment status', async () => {
      // Mock authentication
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock user profile
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          role: 'staff',
          organization_id: 'org-id',
          first_name: 'John',
          last_name: 'Doe'
        },
        error: null
      });

      // Mock appointment access verification
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            patient_id: 'patient-id',
            doctor_id: 'doctor-id',
            organization_id: 'org-id'
          },
          error: null
        });

      // Mock service success
      const mockService = require('@/lib/services/AppointmentStatusService').default;
      mockService.changeStatus.mockResolvedValue({
        success: true,
        auditId: 'audit-123'
      });

      // Create request
      const request = new NextRequest('http://localhost/api/appointments/123/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'confirmed',
          reason: 'Manual confirmation'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: mockAppointmentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.newStatus).toBe('confirmed');
      expect(data.data.auditId).toBe('audit-123');
    });

    it('should reject invalid appointment ID', async () => {
      const request = new NextRequest('http://localhost/api/appointments/invalid/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'confirmed'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid appointment ID format');
    });

    it('should reject unauthorized users', async () => {
      // Mock authentication failure
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' }
      });

      const request = new NextRequest('http://localhost/api/appointments/123/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'confirmed'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: mockAppointmentId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject invalid status values', async () => {
      // Mock authentication
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      const request = new NextRequest('http://localhost/api/appointments/123/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'invalid_status'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: mockAppointmentId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toBeDefined();
    });

    it('should handle service errors', async () => {
      // Mock authentication and profile
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          role: 'staff',
          organization_id: 'org-id',
          first_name: 'John',
          last_name: 'Doe'
        },
        error: null
      });

      // Mock appointment access
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            patient_id: 'patient-id',
            doctor_id: 'doctor-id',
            organization_id: 'org-id'
          },
          error: null
        });

      // Mock service failure
      const mockService = require('@/lib/services/AppointmentStatusService').default;
      mockService.changeStatus.mockResolvedValue({
        success: false,
        error: 'Invalid transition'
      });

      const request = new NextRequest('http://localhost/api/appointments/123/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await PATCH(request, { params: { id: mockAppointmentId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid transition');
      expect(data.code).toBe('STATUS_CHANGE_FAILED');
    });
  });

  describe('GET - Available Transitions', () => {
    it('should return available transitions for user role', async () => {
      // Mock authentication
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock user profile
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          role: 'patient',
          organization_id: 'org-id'
        },
        error: null
      });

      // Mock appointment access
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            patient_id: mockUserId,
            doctor_id: 'doctor-id',
            organization_id: 'org-id'
          },
          error: null
        });

      // Mock service success
      const mockService = require('@/lib/services/AppointmentStatusService').default;
      mockService.getAvailableTransitions.mockResolvedValue({
        success: true,
        transitions: ['cancelada_paciente', 'reagendada']
      });

      const request = new NextRequest(`http://localhost/api/appointments/${mockAppointmentId}/status`);

      const response = await GET(request, { params: { id: mockAppointmentId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.userRole).toBe('patient');
      expect(data.data.availableTransitions).toEqual(['cancelada_paciente', 'reagendada']);
    });

    it('should deny access to unauthorized appointments', async () => {
      // Mock authentication
      const mockSupabase = require('@/lib/supabase/server').createClient();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock user profile
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          role: 'patient',
          organization_id: 'org-id'
        },
        error: null
      });

      // Mock appointment access (different patient)
      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: {
            patient_id: 'different-patient-id',
            doctor_id: 'doctor-id',
            organization_id: 'org-id'
          },
          error: null
        });

      const request = new NextRequest(`http://localhost/api/appointments/${mockAppointmentId}/status`);

      const response = await GET(request, { params: { id: mockAppointmentId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to this appointment');
    });
  });
});
