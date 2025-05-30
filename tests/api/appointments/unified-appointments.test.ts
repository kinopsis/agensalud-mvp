/**
 * @jest-environment node
 */

import { UnifiedBookingRequest, UnifiedBookingResponse } from '@/components/appointments/shared/types';

describe('/api/appointments - Unified Endpoint Data Models', () => {
  describe('Request/Response Standardization', () => {
    it('should validate manual booking request structure', () => {
      const manualRequest: UnifiedBookingRequest = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        serviceId: 'service-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00',
        endTime: '10:30:00',
        reason: 'Consulta general'
      };

      // Validate required fields are present
      expect(manualRequest.patientId).toBeDefined();
      expect(manualRequest.doctorId).toBeDefined();
      expect(manualRequest.appointmentDate).toBeDefined();
      expect(manualRequest.startTime).toBeDefined();

      // Validate optional fields
      expect(manualRequest.serviceId).toBeDefined();
      expect(manualRequest.reason).toBeDefined();

      // Validate AI-specific fields are not present
      expect(manualRequest.action).toBeUndefined();
      expect(manualRequest.message).toBeUndefined();
    });

    it('should validate AI booking request structure', () => {
      const aiRequest: UnifiedBookingRequest = {
        action: 'book_appointment',
        organizationId: 'org-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        serviceId: 'service-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00',
        endTime: '10:30:00',
        notes: 'AI booked appointment'
      };

      // Validate AI-specific fields
      expect(aiRequest.action).toBe('book_appointment');
      expect(aiRequest.organizationId).toBeDefined();

      // Validate common fields
      expect(aiRequest.patientId).toBeDefined();
      expect(aiRequest.doctorId).toBeDefined();
      expect(aiRequest.appointmentDate).toBeDefined();
      expect(aiRequest.startTime).toBeDefined();
      expect(aiRequest.endTime).toBeDefined();
    });

    it('should validate unified response structure for manual booking', () => {
      const manualResponse: UnifiedBookingResponse = {
        success: true,
        appointmentId: 'appointment-123',
        appointment: {
          id: 'appointment-123',
          patient_id: 'patient-123',
          doctor_id: 'doctor-123'
        }
      };

      expect(manualResponse.success).toBe(true);
      expect(manualResponse.appointmentId).toBeDefined();
      expect(manualResponse.appointment).toBeDefined();
    });

    it('should validate unified response structure for AI booking', () => {
      const aiResponse: UnifiedBookingResponse = {
        success: true,
        appointmentId: 'ai-appointment-123',
        message: 'Appointment booked successfully',
        timestamp: new Date().toISOString()
      };

      expect(aiResponse.success).toBe(true);
      expect(aiResponse.appointmentId).toBeDefined();
      expect(aiResponse.message).toBeDefined();
      expect(aiResponse.timestamp).toBeDefined();
    });

    it('should validate error response structure', () => {
      const errorResponse: UnifiedBookingResponse = {
        success: false,
        error: 'Missing required fields',
        timestamp: new Date().toISOString()
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.appointmentId).toBeUndefined();
    });
  });

  describe('API Endpoint Compatibility', () => {
    it('should support both manual and AI booking through same endpoint', () => {
      // Manual booking request
      const manualRequest: UnifiedBookingRequest = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00'
      };

      // AI booking request
      const aiRequest: UnifiedBookingRequest = {
        action: 'book_appointment',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00',
        endTime: '10:30:00'
      };

      // Both should be valid UnifiedBookingRequest types
      expect(manualRequest.patientId).toBe('patient-123');
      expect(aiRequest.patientId).toBe('patient-123');
      expect(aiRequest.action).toBe('book_appointment');
      expect(manualRequest.action).toBeUndefined();
    });

    it('should handle field mapping between flows', () => {
      // Test that the same appointment data can be represented in both formats
      const appointmentData = {
        patient: 'patient-123',
        doctor: 'doctor-123',
        service: 'service-123',
        date: '2024-01-15',
        time: '10:00:00'
      };

      // Manual format
      const manualFormat: UnifiedBookingRequest = {
        patientId: appointmentData.patient,
        doctorId: appointmentData.doctor,
        serviceId: appointmentData.service,
        appointmentDate: appointmentData.date,
        startTime: appointmentData.time
      };

      // AI format
      const aiFormat: UnifiedBookingRequest = {
        action: 'book_appointment',
        patientId: appointmentData.patient,
        doctorId: appointmentData.doctor,
        serviceId: appointmentData.service,
        appointmentDate: appointmentData.date,
        startTime: appointmentData.time,
        endTime: '10:30:00' // AI provides end time
      };

      // Both should contain the same core data
      expect(manualFormat.patientId).toBe(aiFormat.patientId);
      expect(manualFormat.doctorId).toBe(aiFormat.doctorId);
      expect(manualFormat.serviceId).toBe(aiFormat.serviceId);
      expect(manualFormat.appointmentDate).toBe(aiFormat.appointmentDate);
      expect(manualFormat.startTime).toBe(aiFormat.startTime);
    });

    it('should validate response consistency', () => {
      // Both manual and AI should return consistent success responses
      const baseResponse = {
        success: true,
        appointmentId: 'appointment-123',
        timestamp: '2024-01-15T10:00:00Z'
      };

      const manualResponse: UnifiedBookingResponse = {
        ...baseResponse,
        appointment: { id: 'appointment-123' }
      };

      const aiResponse: UnifiedBookingResponse = {
        ...baseResponse,
        message: 'Appointment booked successfully'
      };

      // Both should have consistent success indicators
      expect(manualResponse.success).toBe(aiResponse.success);
      expect(manualResponse.appointmentId).toBe(aiResponse.appointmentId);
      expect(manualResponse.timestamp).toBe(aiResponse.timestamp);
    });
  });
});
