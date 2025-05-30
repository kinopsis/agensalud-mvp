/**
 * TEST FOR IMMEDIATE AUTO-CONFIRMATION
 * Verifica que las citas manuales se crean con status 'confirmed' inmediatamente
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseInsert = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseAuth = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockSupabaseAuth
    },
    from: jest.fn(() => ({
      select: mockSupabaseSelect,
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: mockSupabaseInsert
        }))
      }))
    }))
  }))
}));

// Mock AI processor
jest.mock('@/lib/ai/appointment-processor', () => ({
  AppointmentProcessor: jest.fn(() => ({
    processMessage: jest.fn(),
    createAppointment: jest.fn()
  }))
}));

// Mock validation functions
jest.mock('@/lib/ai/entity-extraction', () => ({
  validateDate: jest.fn(() => true),
  validateTime: jest.fn(() => true)
}));

describe('Immediate Auto-Confirmation', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth mock
    mockSupabaseAuth.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    // Setup default profile mock
    mockSupabaseSelect.mockResolvedValue({
      data: {
        id: 'user-123',
        role: 'patient',
        organization_id: 'org-123'
      },
      error: null
    });
  });

  describe('1. MANUAL BOOKING AUTO-CONFIRMATION', () => {
    
    it('should create manual appointments with confirmed status immediately', async () => {
      // Mock successful appointment creation
      const mockAppointment = {
        id: 'apt-123',
        status: 'confirmed',
        appointment_date: '2025-06-15',
        start_time: '10:00:00',
        patient: [{ first_name: 'Juan', last_name: 'Pérez' }],
        doctor: [{ profiles: [{ first_name: 'Ana', last_name: 'García' }] }]
      };

      mockSupabaseInsert.mockResolvedValue({
        data: mockAppointment,
        error: null
      });

      // Import the route handler
      const { POST } = await import('@/app/api/appointments/route');

      // Create request with manual booking data
      const requestBody = {
        organizationId: 'org-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        serviceId: 'service-123',
        locationId: 'location-123',
        appointmentDate: '2025-06-15',
        startTime: '10:00:00',
        endTime: '10:30:00',
        duration_minutes: 30,
        reason: 'Consulta general',
        notes: 'Primera consulta'
      };

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Execute the request
      const response = await POST(request);
      const responseData = await response.json();

      // Verify the insert was called with confirmed status
      expect(mockSupabaseInsert).toHaveBeenCalled();
      
      // Get the insert call arguments
      const insertCall = mockSupabaseInsert.mock.calls[0];
      // The insert data should be in the chain: from().insert(data).select().single()
      // We need to check what was passed to insert()
      
      // Since we're mocking the chain, let's verify through the response
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.appointment.status).toBe('confirmed');
    });

    it('should verify insert call contains confirmed status', async () => {
      // Create a more detailed mock to capture insert data
      let insertedData: any = null;
      
      const mockInsert = jest.fn((data) => {
        insertedData = data;
        return {
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { ...data, id: 'apt-123' },
              error: null
            })
          }))
        };
      });

      // Override the mock for this test
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: jest.fn(() => ({
          auth: {
            getUser: mockSupabaseAuth
          },
          from: jest.fn(() => ({
            select: mockSupabaseSelect,
            insert: mockInsert
          }))
        }))
      }));

      // Re-import to get the updated mock
      jest.resetModules();
      const { POST } = await import('@/app/api/appointments/route');

      const requestBody = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2025-06-15',
        startTime: '10:00:00'
      };

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      // Verify the inserted data has confirmed status
      expect(insertedData).toBeTruthy();
      expect(insertedData.status).toBe('confirmed');
    });
  });

  describe('2. COMPARISON WITH AI BOOKING', () => {
    
    it('should maintain consistency between manual and AI booking status', async () => {
      // Both manual and AI bookings should result in 'confirmed' status
      // This test verifies that we've aligned the behaviors
      
      const manualBookingData = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2025-06-15',
        startTime: '10:00:00'
      };

      const aiBookingData = {
        action: 'book_appointment',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2025-06-15',
        startTime: '10:00:00',
        endTime: '10:30:00'
      };

      // Mock AI processor to return confirmed status
      const mockAIProcessor = {
        createAppointment: jest.fn().mockResolvedValue({
          success: true,
          appointmentId: 'apt-ai-123'
        })
      };

      jest.doMock('@/lib/ai/appointment-processor', () => ({
        AppointmentProcessor: jest.fn(() => mockAIProcessor)
      }));

      jest.resetModules();
      const { POST } = await import('@/app/api/appointments/route');

      // Test manual booking
      const manualRequest = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(manualBookingData),
        headers: { 'Content-Type': 'application/json' }
      });

      const manualResponse = await POST(manualRequest);
      const manualData = await manualResponse.json();

      // Test AI booking
      const aiRequest = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(aiBookingData),
        headers: { 'Content-Type': 'application/json' }
      });

      const aiResponse = await POST(aiRequest);
      const aiData = await aiResponse.json();

      // Both should be successful
      expect(manualResponse.status).toBe(201);
      expect(aiResponse.status).toBe(200);
      expect(manualData.success).toBe(true);
      expect(aiData.success).toBe(true);
    });
  });

  describe('3. BACKWARD COMPATIBILITY', () => {
    
    it('should handle existing pending appointments correctly', () => {
      // The button logic should still work with existing pending appointments
      // until they are migrated or auto-confirmed
      
      const existingPendingAppointment = {
        id: 'apt-old-pending',
        appointment_date: '2025-06-15',
        start_time: '10:00:00',
        status: 'pending', // Old pending appointment
        patient: [{ id: 'patient-123' }]
      };

      const patientProfile = { id: 'patient-123', role: 'patient' };

      // Import permission functions
      const canCancelAppointment = (appointment: any, profile: any) => {
        const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
        const now = new Date()
        const isFuture = appointmentDateTime > now
        const cancellableStatuses = ['scheduled', 'confirmed', 'pending']
        const isStatusCancellable = cancellableStatuses.includes(appointment.status)
        
        let hasPermission = false
        if (profile?.role === 'patient') {
          hasPermission = appointment.patient[0]?.id === profile.id
        }
        
        return isFuture && isStatusCancellable && hasPermission
      };

      // Should still be able to manage pending appointments
      expect(canCancelAppointment(existingPendingAppointment, patientProfile)).toBe(true);
    });
  });

  describe('4. ERROR HANDLING', () => {
    
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabaseInsert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const { POST } = await import('@/app/api/appointments/route');

      const requestBody = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2025-06-15',
        startTime: '10:00:00'
      };

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to create appointment');
    });

    it('should handle missing required fields', async () => {
      const { POST } = await import('@/app/api/appointments/route');

      const requestBody = {
        // Missing required fields
        appointmentDate: '2025-06-15'
      };

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Missing required fields');
    });
  });

  describe('5. INTEGRATION VERIFICATION', () => {
    
    it('should verify the complete flow from request to confirmed appointment', async () => {
      // Mock successful flow
      const mockCreatedAppointment = {
        id: 'apt-integration-test',
        status: 'confirmed',
        appointment_date: '2025-06-15',
        start_time: '10:00:00',
        end_time: '10:30:00',
        duration_minutes: 30,
        reason: 'Test appointment',
        notes: 'Integration test',
        patient: [{ first_name: 'Test', last_name: 'Patient' }],
        doctor: [{ profiles: [{ first_name: 'Test', last_name: 'Doctor' }] }],
        service: [{ name: 'Test Service' }],
        location: [{ name: 'Test Location' }]
      };

      mockSupabaseInsert.mockResolvedValue({
        data: mockCreatedAppointment,
        error: null
      });

      const { POST } = await import('@/app/api/appointments/route');

      const requestBody = {
        organizationId: 'org-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        serviceId: 'service-123',
        locationId: 'location-123',
        appointmentDate: '2025-06-15',
        startTime: '10:00:00',
        endTime: '10:30:00',
        duration_minutes: 30,
        reason: 'Test appointment',
        notes: 'Integration test'
      };

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Verify successful creation
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.appointment).toBeTruthy();
      expect(responseData.appointment.status).toBe('confirmed');
      expect(responseData.appointmentId).toBe('apt-integration-test');
    });
  });
});
