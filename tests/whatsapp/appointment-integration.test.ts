/**
 * WhatsApp Appointment Integration Tests
 * 
 * Unit tests for WhatsApp appointment booking, querying, and management
 * functionality including AI integration and appointment service.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WhatsAppAppointmentService } from '@/lib/services/WhatsAppAppointmentService';

// Mock dependencies
jest.mock('@/lib/ai/appointment-processor');

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

const mockAppointmentProcessor = {
  processMessage: jest.fn(),
  createAppointment: jest.fn(),
  getAvailability: jest.fn()
};

// Mock AppointmentProcessor
jest.mock('@/lib/ai/appointment-processor', () => ({
  AppointmentProcessor: jest.fn(() => mockAppointmentProcessor)
}));

describe('WhatsApp Appointment Integration', () => {
  let appointmentService: WhatsAppAppointmentService;
  let mockWhatsAppInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWhatsAppInstance = {
      id: 'instance-1',
      instance_name: 'test-instance',
      organization_id: 'org-1'
    };

    appointmentService = new WhatsAppAppointmentService(mockSupabase as any, mockWhatsAppInstance);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processBookingRequest', () => {
    it('should handle complete booking request successfully', async () => {
      // Mock availability response
      mockAppointmentProcessor.processMessage.mockResolvedValue({
        availability: [
          {
            date: '2024-02-01',
            start_time: '10:00',
            doctor_id: 'doc-1',
            doctor_name: 'Dr. García',
            specialty: 'Cardiología'
          },
          {
            date: '2024-02-01',
            start_time: '14:00',
            doctor_id: 'doc-2',
            doctor_name: 'Dr. López',
            specialty: 'Cardiología'
          }
        ]
      });

      const request = {
        conversationId: 'conv-1',
        patientId: 'patient-1',
        specialty: 'cardiología',
        preferredDate: 'mañana',
        preferredTime: 'mañana'
      };

      const result = await appointmentService.processBookingRequest(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Encontré estas opciones disponibles');
      expect(result.message).toContain('Dr. García');
      expect(result.message).toContain('Dr. López');
      expect(result.nextStep).toBe('confirm_slot');
      expect(result.availableSlots).toHaveLength(2);
    });

    it('should request specialty when missing', async () => {
      const request = {
        conversationId: 'conv-1',
        specialty: '',
        preferredDate: 'mañana'
      };

      const result = await appointmentService.processBookingRequest(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('necesito saber qué especialidad médica necesita');
      expect(result.nextStep).toBe('provide_patient_info');
    });

    it('should request date when missing', async () => {
      const request = {
        conversationId: 'conv-1',
        specialty: 'cardiología',
        preferredDate: ''
      };

      const result = await appointmentService.processBookingRequest(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('¿Para qué fecha le gustaría agendar?');
      expect(result.nextStep).toBe('provide_patient_info');
    });

    it('should handle no availability gracefully', async () => {
      mockAppointmentProcessor.processMessage.mockResolvedValue({
        availability: []
      });

      mockAppointmentProcessor.getAvailability.mockResolvedValue([
        { date: '2024-02-05', start_time: '10:00' }
      ]);

      const request = {
        conversationId: 'conv-1',
        specialty: 'cardiología',
        preferredDate: 'mañana'
      };

      const result = await appointmentService.processBookingRequest(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontré disponibilidad');
      expect(result.nextStep).toBe('suggest_alternatives');
    });

    it('should handle appointment processor errors', async () => {
      mockAppointmentProcessor.processMessage.mockRejectedValue(
        new Error('Appointment processor failed')
      );

      const request = {
        conversationId: 'conv-1',
        specialty: 'cardiología',
        preferredDate: 'mañana'
      };

      const result = await appointmentService.processBookingRequest(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('hubo un problema al procesar su solicitud');
      expect(result.error).toBe('Appointment processor failed');
    });
  });

  describe('confirmAppointmentSlot', () => {
    it('should confirm appointment successfully', async () => {
      const availableSlots = [
        {
          date: '2024-02-01',
          start_time: '10:00',
          doctor_id: 'doc-1',
          doctor_name: 'Dr. García',
          service_id: 'service-1',
          location_id: 'location-1'
        }
      ];

      // Mock conversation lookup
      const mockConversationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'conv-1',
            patient_id: 'patient-1',
            contact_jid: '1234567890@s.whatsapp.net'
          }
        })
      };

      mockSupabase.from.mockReturnValue(mockConversationQuery);

      // Mock appointment creation
      mockAppointmentProcessor.createAppointment.mockResolvedValue({
        success: true,
        appointmentId: 'apt-1'
      });

      // Mock audit log
      mockSupabase.rpc.mockResolvedValue({ data: 'audit-id', error: null });

      const result = await appointmentService.confirmAppointmentSlot(
        'conv-1',
        0,
        availableSlots,
        'patient-1'
      );

      expect(result.success).toBe(true);
      expect(result.appointmentId).toBe('apt-1');
      expect(result.message).toContain('Su cita ha sido agendada exitosamente');
      expect(result.message).toContain('Dr. García');
      expect(mockAppointmentProcessor.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          doctorId: 'doc-1',
          appointmentDate: '2024-02-01',
          startTime: '10:00'
        })
      );
    });

    it('should handle invalid slot index', async () => {
      const availableSlots = [
        { date: '2024-02-01', start_time: '10:00', doctor_id: 'doc-1' }
      ];

      const result = await appointmentService.confirmAppointmentSlot(
        'conv-1',
        5, // Invalid index
        availableSlots
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('seleccione un número válido');
    });

    it('should handle missing patient information', async () => {
      const availableSlots = [
        { date: '2024-02-01', start_time: '10:00', doctor_id: 'doc-1' }
      ];

      // Mock conversation lookup returning no patient_id
      const mockConversationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'conv-1',
            patient_id: null,
            contact_jid: '1234567890@s.whatsapp.net'
          }
        })
      };

      mockSupabase.from.mockReturnValue(mockConversationQuery);

      const result = await appointmentService.confirmAppointmentSlot(
        'conv-1',
        0,
        availableSlots
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('necesito algunos datos adicionales');
      expect(result.nextStep).toBe('provide_patient_info');
    });

    it('should handle appointment creation failure', async () => {
      const availableSlots = [
        { date: '2024-02-01', start_time: '10:00', doctor_id: 'doc-1' }
      ];

      const mockConversationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'conv-1', patient_id: 'patient-1' }
        })
      };

      mockSupabase.from.mockReturnValue(mockConversationQuery);

      mockAppointmentProcessor.createAppointment.mockResolvedValue({
        success: false,
        error: 'Doctor not available'
      });

      const result = await appointmentService.confirmAppointmentSlot(
        'conv-1',
        0,
        availableSlots,
        'patient-1'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No pude confirmar su cita');
      expect(result.error).toBe('Doctor not available');
    });
  });

  describe('queryAppointments', () => {
    it('should return formatted appointment list', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'apt-1',
              appointment_date: '2024-02-01',
              start_time: '10:00',
              status: 'confirmed',
              reason: 'Consulta general',
              doctors: {
                profiles: {
                  first_name: 'Juan',
                  last_name: 'García'
                }
              },
              services: {
                name: 'Cardiología'
              }
            },
            {
              id: 'apt-2',
              appointment_date: '2024-02-05',
              start_time: '14:00',
              status: 'scheduled',
              reason: 'Control',
              doctors: {
                profiles: {
                  first_name: 'María',
                  last_name: 'López'
                }
              },
              services: {
                name: 'Medicina General'
              }
            }
          ]
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await appointmentService.queryAppointments({
        conversationId: 'conv-1',
        patientId: 'patient-1'
      });

      expect(result).toContain('Sus citas:');
      expect(result).toContain('Juan García');
      expect(result).toContain('María López');
      expect(result).toContain('Cardiología');
      expect(result).toContain('Medicina General');
      expect(result).toContain('Confirmada');
      expect(result).toContain('Programada');
    });

    it('should handle no appointments found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: []
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await appointmentService.queryAppointments({
        conversationId: 'conv-1',
        patientId: 'patient-1'
      });

      expect(result).toContain('No encontré citas programadas');
      expect(result).toContain('¿Le gustaría agendar una nueva cita?');
    });

    it('should handle missing patient ID', async () => {
      const result = await appointmentService.queryAppointments({
        conversationId: 'conv-1'
      });

      expect(result).toContain('necesito que me proporcione su número de identificación');
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await appointmentService.queryAppointments({
        conversationId: 'conv-1',
        patientId: 'patient-1'
      });

      expect(result).toContain('hubo un problema al consultar sus citas');
    });
  });

  describe('Helper Methods', () => {
    it('should format availability slots correctly', async () => {
      const slots = [
        {
          date: '2024-02-01',
          start_time: '10:00',
          doctor_name: 'Dr. García',
          specialty: 'Cardiología'
        },
        {
          date: '2024-02-01',
          start_time: '14:00',
          doctor_name: 'Dr. López',
          specialty: 'Medicina General'
        }
      ];

      // Access the private method through a test request
      const request = {
        conversationId: 'conv-1',
        specialty: 'cardiología',
        preferredDate: 'mañana'
      };

      mockAppointmentProcessor.processMessage.mockResolvedValue({
        availability: slots
      });

      const result = await appointmentService.processBookingRequest(request);

      expect(result.message).toContain('1. 👨‍⚕️ Dr. García (Cardiología)');
      expect(result.message).toContain('2. 👨‍⚕️ Dr. López (Medicina General)');
      expect(result.message).toContain('01/02/2024 a las 10:00');
      expect(result.message).toContain('01/02/2024 a las 14:00');
    });

    it('should translate appointment statuses correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'apt-1',
              appointment_date: '2024-02-01',
              start_time: '10:00',
              status: 'confirmed',
              doctors: { profiles: { first_name: 'Juan', last_name: 'García' } },
              services: { name: 'Cardiología' }
            }
          ]
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await appointmentService.queryAppointments({
        conversationId: 'conv-1',
        patientId: 'patient-1'
      });

      expect(result).toContain('Estado: Confirmada');
    });
  });
});
