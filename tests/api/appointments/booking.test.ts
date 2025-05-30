/**
 * @fileoverview Tests for Appointment Booking API endpoints
 * @description Validates core appointment booking functionality
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/appointments/route';
import { createMockSupabaseClient } from '../../__mocks__/supabase';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: jest.fn(() => createMockSupabaseClient()),
}));

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
  })),
}));

describe('/api/appointments', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('POST /api/appointments', () => {
    const validAppointmentData = {
      patient_id: 'patient-123',
      doctor_id: 'doctor-456',
      service_id: 'service-789',
      location_id: 'location-101',
      appointment_date: '2024-01-15',
      start_time: '09:00',
      end_time: '10:00',
      notes: 'Consulta de rutina',
    };

    /**
     * Test successful appointment creation
     */
    it('should create appointment successfully', async () => {
      const mockCreatedAppointment = {
        id: 'new-appointment-id',
        ...validAppointmentData,
        status: 'confirmed',
        created_at: '2024-01-10T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [mockCreatedAppointment],
            error: null,
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(validAppointmentData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: 'new-appointment-id',
        status: 'confirmed',
      });
    });

    /**
     * Test missing required fields
     */
    it('should return 400 when required fields are missing', async () => {
      const incompleteData = {
        patient_id: 'patient-123',
        // Missing doctor_id, service_id, etc.
      };

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(incompleteData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    /**
     * Test invalid date format
     */
    it('should return 400 for invalid date format', async () => {
      const invalidDateData = {
        ...validAppointmentData,
        appointment_date: 'invalid-date',
      };

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(invalidDateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid date format');
    });

    /**
     * Test time conflict detection
     */
    it('should detect time conflicts', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { 
              code: '23505', 
              message: 'duplicate key value violates unique constraint' 
            },
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(validAppointmentData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('conflict');
    });

    /**
     * Test invalid time range
     */
    it('should validate time range (start_time < end_time)', async () => {
      const invalidTimeData = {
        ...validAppointmentData,
        start_time: '10:00',
        end_time: '09:00', // End before start
      };

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(invalidTimeData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('End time must be after start time');
    });

    /**
     * Test past date validation
     */
    it('should reject appointments in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const pastDateData = {
        ...validAppointmentData,
        appointment_date: pastDate.toISOString().split('T')[0],
      };

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(pastDateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cannot book appointments in the past');
    });

    /**
     * Test database error handling
     */
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation does not exist' },
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(validAppointmentData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database error');
    });

    /**
     * Test JSON parsing error
     */
    it('should handle invalid JSON gracefully', async () => {
      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: 'invalid-json',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid JSON');
    });

    /**
     * Test appointment status default
     */
    it('should set default status to confirmed for manual bookings', async () => {
      const mockCreatedAppointment = {
        id: 'new-appointment-id',
        ...validAppointmentData,
        status: 'confirmed',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [mockCreatedAppointment],
            error: null,
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3001/api/appointments',
        {
          method: 'POST',
          body: JSON.stringify(validAppointmentData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      await POST(request);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
        })
      );
    });
  });
});
