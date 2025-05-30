/**
 * @jest-environment jsdom
 */

import {
  UnifiedBookingRequest,
  UnifiedBookingResponse,
  AppointmentFormData,
  AvailabilitySlot,
  Service,
  Doctor,
  Location
} from '@/components/appointments/shared/types';

describe('Data Model Standardization', () => {
  describe('UnifiedBookingRequest', () => {
    it('should support manual booking data structure', () => {
      const manualBookingRequest: UnifiedBookingRequest = {
        organizationId: 'org-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        serviceId: 'service-123',
        locationId: 'location-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00',
        endTime: '10:30:00',
        duration_minutes: 30,
        reason: 'Consulta general',
        notes: 'Cita agendada via formulario manual'
      };

      expect(manualBookingRequest.patientId).toBe('patient-123');
      expect(manualBookingRequest.doctorId).toBe('doctor-123');
      expect(manualBookingRequest.appointmentDate).toBe('2024-01-15');
      expect(manualBookingRequest.startTime).toBe('10:00:00');
      expect(manualBookingRequest.action).toBeUndefined();
      expect(manualBookingRequest.message).toBeUndefined();
    });

    it('should support AI booking data structure', () => {
      const aiBookingRequest: UnifiedBookingRequest = {
        action: 'book_appointment',
        organizationId: 'org-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        serviceId: 'service-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00',
        endTime: '10:30:00',
        notes: 'Cita agendada via AI Assistant',
        userId: 'patient-123'
      };

      expect(aiBookingRequest.action).toBe('book_appointment');
      expect(aiBookingRequest.patientId).toBe('patient-123');
      expect(aiBookingRequest.userId).toBe('patient-123');
      expect(aiBookingRequest.notes).toContain('AI Assistant');
    });

    it('should support AI message processing structure', () => {
      const aiMessageRequest: UnifiedBookingRequest = {
        message: 'I need to book an appointment for next Monday',
        organizationId: 'org-123',
        userId: 'patient-123',
        // Required fields for type compatibility
        patientId: 'patient-123',
        doctorId: '', // Will be filled by AI processing
        appointmentDate: '', // Will be filled by AI processing
        startTime: '' // Will be filled by AI processing
      };

      expect(aiMessageRequest.message).toBe('I need to book an appointment for next Monday');
      expect(aiMessageRequest.organizationId).toBe('org-123');
      expect(aiMessageRequest.userId).toBe('patient-123');
    });

    it('should validate required fields for manual booking', () => {
      const requiredFields: (keyof UnifiedBookingRequest)[] = [
        'patientId',
        'doctorId',
        'appointmentDate',
        'startTime'
      ];

      const validRequest: UnifiedBookingRequest = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00'
      };

      requiredFields.forEach(field => {
        expect(validRequest[field]).toBeDefined();
        expect(validRequest[field]).not.toBe('');
      });
    });

    it('should validate required fields for AI booking', () => {
      const requiredAIFields: (keyof UnifiedBookingRequest)[] = [
        'action',
        'patientId',
        'doctorId',
        'appointmentDate',
        'startTime',
        'endTime'
      ];

      const validAIRequest: UnifiedBookingRequest = {
        action: 'book_appointment',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00',
        endTime: '10:30:00'
      };

      requiredAIFields.forEach(field => {
        expect(validAIRequest[field]).toBeDefined();
        expect(validAIRequest[field]).not.toBe('');
      });
    });
  });

  describe('UnifiedBookingResponse', () => {
    it('should support manual booking response structure', () => {
      const manualResponse: UnifiedBookingResponse = {
        success: true,
        appointmentId: 'appointment-123',
        appointment: {
          id: 'appointment-123',
          patient_id: 'patient-123',
          doctor_id: 'doctor-123',
          appointment_date: '2024-01-15',
          start_time: '10:00:00'
        }
      };

      expect(manualResponse.success).toBe(true);
      expect(manualResponse.appointmentId).toBe('appointment-123');
      expect(manualResponse.appointment).toBeDefined();
      expect(manualResponse.intent).toBeUndefined();
      expect(manualResponse.availability).toBeUndefined();
    });

    it('should support AI booking response structure', () => {
      const aiResponse: UnifiedBookingResponse = {
        success: true,
        appointmentId: 'ai-appointment-123',
        message: '¡Perfecto! Tu cita ha sido agendada exitosamente.',
        timestamp: '2024-01-15T10:00:00Z'
      };

      expect(aiResponse.success).toBe(true);
      expect(aiResponse.appointmentId).toBe('ai-appointment-123');
      expect(aiResponse.message).toContain('agendada exitosamente');
      expect(aiResponse.timestamp).toBeDefined();
    });

    it('should support AI processing response structure', () => {
      const aiProcessingResponse: UnifiedBookingResponse = {
        success: true,
        intent: { type: 'book_appointment', confidence: 0.95 },
        response: 'I can help you book an appointment. What service do you need?',
        nextActions: ['select_service'],
        canProceed: true,
        availability: [
          {
            start_time: '10:00:00',
            end_time: '10:30:00',
            doctor_id: 'doctor-123',
            doctor_name: 'Dr. Smith',
            specialization: 'General Medicine',
            consultation_fee: 100,
            available: true
          }
        ],
        timestamp: '2024-01-15T10:00:00Z'
      };

      expect(aiProcessingResponse.success).toBe(true);
      expect(aiProcessingResponse.intent).toBeDefined();
      expect(aiProcessingResponse.response).toContain('help you book');
      expect(aiProcessingResponse.nextActions).toContain('select_service');
      expect(aiProcessingResponse.availability).toHaveLength(1);
    });

    it('should support error response structure', () => {
      const errorResponse: UnifiedBookingResponse = {
        success: false,
        error: 'Missing required fields: doctorId, appointmentDate',
        timestamp: '2024-01-15T10:00:00Z'
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toContain('Missing required fields');
      expect(errorResponse.appointmentId).toBeUndefined();
    });
  });

  describe('Data Model Compatibility', () => {
    it('should convert AppointmentFormData to UnifiedBookingRequest', () => {
      const formData: AppointmentFormData = {
        service_id: 'service-123',
        doctor_id: 'doctor-123',
        location_id: 'location-123',
        appointment_date: '2024-01-15',
        appointment_time: '10:00:00',
        reason: 'Consulta general',
        notes: 'Notas adicionales'
      };

      const unifiedRequest: UnifiedBookingRequest = {
        patientId: 'patient-123', // Would come from user context
        doctorId: formData.doctor_id!,
        serviceId: formData.service_id,
        locationId: formData.location_id,
        appointmentDate: formData.appointment_date,
        startTime: formData.appointment_time,
        reason: formData.reason,
        notes: formData.notes
      };

      expect(unifiedRequest.doctorId).toBe(formData.doctor_id);
      expect(unifiedRequest.serviceId).toBe(formData.service_id);
      expect(unifiedRequest.appointmentDate).toBe(formData.appointment_date);
      expect(unifiedRequest.startTime).toBe(formData.appointment_time);
    });

    it('should handle optional fields correctly', () => {
      const minimalRequest: UnifiedBookingRequest = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        appointmentDate: '2024-01-15',
        startTime: '10:00:00'
      };

      // Optional fields should be undefined or empty
      expect(minimalRequest.serviceId).toBeUndefined();
      expect(minimalRequest.locationId).toBeUndefined();
      expect(minimalRequest.reason).toBeUndefined();
      expect(minimalRequest.notes).toBeUndefined();
      expect(minimalRequest.endTime).toBeUndefined();
      expect(minimalRequest.duration_minutes).toBeUndefined();

      // Required fields should be present
      expect(minimalRequest.patientId).toBe('patient-123');
      expect(minimalRequest.doctorId).toBe('doctor-123');
      expect(minimalRequest.appointmentDate).toBe('2024-01-15');
      expect(minimalRequest.startTime).toBe('10:00:00');
    });

    it('should maintain type safety across interfaces', () => {
      const service: Service = {
        id: 'service-123',
        name: 'General Consultation',
        description: 'General medical consultation',
        duration_minutes: 30,
        price: 100,
        organization_id: 'org-123'
      };

      const doctor: Doctor = {
        id: 'doctor-123',
        specialization: 'General Medicine',
        consultation_fee: 100,
        profiles: {
          first_name: 'John',
          last_name: 'Smith',
          email: 'john.smith@example.com'
        }
      };

      const location: Location = {
        id: 'location-123',
        name: 'Main Clinic',
        address: '123 Main St',
        organization_id: 'org-123'
      };

      const slot: AvailabilitySlot = {
        start_time: '10:00:00',
        end_time: '10:30:00',
        doctor_id: doctor.id,
        doctor_name: `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}`,
        specialization: doctor.specialization,
        consultation_fee: doctor.consultation_fee!,
        available: true
      };

      // All interfaces should work together seamlessly
      expect(service.id).toBe('service-123');
      expect(doctor.id).toBe('doctor-123');
      expect(location.id).toBe('location-123');
      expect(slot.doctor_id).toBe(doctor.id);
      expect(slot.consultation_fee).toBe(doctor.consultation_fee);
    });
  });
});
