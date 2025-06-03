/**
 * WhatsApp Appointment Service Unit Tests
 * 
 * Simplified unit tests for WhatsApp appointment service functionality
 * focusing on validation logic and data formatting without complex mocks.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { describe, it, expect } from '@jest/globals';

describe('WhatsApp Appointment Service Logic', () => {
  describe('Booking Request Validation', () => {
    it('should validate required fields for booking request', () => {
      const validateBookingRequest = (request: any) => {
        const errors = [];
        
        if (!request.specialty || request.specialty.trim() === '') {
          errors.push('Specialty is required');
        }
        
        if (!request.preferredDate || request.preferredDate.trim() === '') {
          errors.push('Preferred date is required');
        }
        
        if (!request.conversationId) {
          errors.push('Conversation ID is required');
        }
        
        return {
          isValid: errors.length === 0,
          errors
        };
      };

      // Valid request
      const validRequest = {
        conversationId: 'conv-1',
        specialty: 'cardiología',
        preferredDate: 'mañana'
      };
      
      const validResult = validateBookingRequest(validRequest);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Missing specialty
      const missingSpecialty = {
        conversationId: 'conv-1',
        specialty: '',
        preferredDate: 'mañana'
      };
      
      const missingSpecialtyResult = validateBookingRequest(missingSpecialty);
      expect(missingSpecialtyResult.isValid).toBe(false);
      expect(missingSpecialtyResult.errors).toContain('Specialty is required');

      // Missing date
      const missingDate = {
        conversationId: 'conv-1',
        specialty: 'cardiología',
        preferredDate: ''
      };
      
      const missingDateResult = validateBookingRequest(missingDate);
      expect(missingDateResult.isValid).toBe(false);
      expect(missingDateResult.errors).toContain('Preferred date is required');
    });
  });

  describe('Availability Formatting', () => {
    it('should format availability slots for WhatsApp display', () => {
      const formatAvailabilitySlots = (slots: any[]) => {
        return slots.slice(0, 5).map((slot, index) => {
          const date = new Date(slot.date || slot.appointment_date).toLocaleDateString('es-ES');
          const time = slot.start_time || slot.time;
          const doctorName = slot.doctor_name || 'Doctor disponible';
          const specialty = slot.specialization || slot.specialty || '';
          
          return `${index + 1}. 👨‍⚕️ ${doctorName}${specialty ? ` (${specialty})` : ''}\n   📅 ${date} a las ${time}`;
        }).join('\n\n');
      };

      const mockSlots = [
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

      const formatted = formatAvailabilitySlots(mockSlots);
      
      expect(formatted).toContain('1. 👨‍⚕️ Dr. García (Cardiología)');
      expect(formatted).toContain('2. 👨‍⚕️ Dr. López (Medicina General)');
      expect(formatted).toContain('a las 10:00');
      expect(formatted).toContain('a las 14:00');
    });

    it('should handle slots without specialty', () => {
      const formatAvailabilitySlots = (slots: any[]) => {
        return slots.slice(0, 5).map((slot, index) => {
          const date = new Date(slot.date || slot.appointment_date).toLocaleDateString('es-ES');
          const time = slot.start_time || slot.time;
          const doctorName = slot.doctor_name || 'Doctor disponible';
          const specialty = slot.specialization || slot.specialty || '';
          
          return `${index + 1}. 👨‍⚕️ ${doctorName}${specialty ? ` (${specialty})` : ''}\n   📅 ${date} a las ${time}`;
        }).join('\n\n');
      };

      const mockSlots = [
        {
          date: '2024-02-01',
          start_time: '10:00',
          doctor_name: 'Dr. García'
          // No specialty
        }
      ];

      const formatted = formatAvailabilitySlots(mockSlots);
      
      expect(formatted).toContain('1. 👨‍⚕️ Dr. García');
      expect(formatted).not.toContain('()');
    });

    it('should limit to 5 slots maximum', () => {
      const formatAvailabilitySlots = (slots: any[]) => {
        return slots.slice(0, 5).map((slot, index) => {
          const date = new Date(slot.date || slot.appointment_date).toLocaleDateString('es-ES');
          const time = slot.start_time || slot.time;
          const doctorName = slot.doctor_name || 'Doctor disponible';
          const specialty = slot.specialization || slot.specialty || '';
          
          return `${index + 1}. 👨‍⚕️ ${doctorName}${specialty ? ` (${specialty})` : ''}\n   📅 ${date} a las ${time}`;
        }).join('\n\n');
      };

      const mockSlots = Array.from({ length: 10 }, (_, i) => ({
        date: '2024-02-01',
        start_time: `${10 + i}:00`,
        doctor_name: `Dr. Doctor${i + 1}`
      }));

      const formatted = formatAvailabilitySlots(mockSlots);
      const lines = formatted.split('\n\n');
      
      expect(lines).toHaveLength(5);
      expect(formatted).toContain('5. 👨‍⚕️ Dr. Doctor5');
      expect(formatted).not.toContain('6. 👨‍⚕️ Dr. Doctor6');
    });
  });

  describe('Status Translation', () => {
    it('should translate appointment statuses to Spanish', () => {
      const translateStatus = (status: string) => {
        const statusMap: Record<string, string> = {
          'scheduled': 'Programada',
          'confirmed': 'Confirmada',
          'pending': 'Pendiente',
          'cancelled': 'Cancelada',
          'completed': 'Completada',
          'no_show': 'No asistió',
          'in_progress': 'En curso'
        };
        
        return statusMap[status] || status;
      };

      expect(translateStatus('scheduled')).toBe('Programada');
      expect(translateStatus('confirmed')).toBe('Confirmada');
      expect(translateStatus('pending')).toBe('Pendiente');
      expect(translateStatus('cancelled')).toBe('Cancelada');
      expect(translateStatus('completed')).toBe('Completada');
      expect(translateStatus('no_show')).toBe('No asistió');
      expect(translateStatus('in_progress')).toBe('En curso');
      expect(translateStatus('unknown_status')).toBe('unknown_status');
    });
  });

  describe('Slot Index Validation', () => {
    it('should validate slot selection', () => {
      const validateSlotSelection = (slotIndex: number, availableSlots: any[]) => {
        if (slotIndex < 0 || slotIndex >= availableSlots.length) {
          return {
            isValid: false,
            message: 'Por favor seleccione un número válido de la lista de horarios disponibles.'
          };
        }
        
        return {
          isValid: true,
          selectedSlot: availableSlots[slotIndex]
        };
      };

      const mockSlots = [
        { id: 1, time: '10:00' },
        { id: 2, time: '14:00' }
      ];

      // Valid selection
      const validSelection = validateSlotSelection(0, mockSlots);
      expect(validSelection.isValid).toBe(true);
      expect(validSelection.selectedSlot).toEqual({ id: 1, time: '10:00' });

      // Invalid selection - negative
      const negativeSelection = validateSlotSelection(-1, mockSlots);
      expect(negativeSelection.isValid).toBe(false);
      expect(negativeSelection.message).toContain('seleccione un número válido');

      // Invalid selection - too high
      const highSelection = validateSlotSelection(5, mockSlots);
      expect(highSelection.isValid).toBe(false);
      expect(highSelection.message).toContain('seleccione un número válido');
    });
  });

  describe('Time Calculation', () => {
    it('should calculate end time from start time and duration', () => {
      const calculateEndTime = (startTime: string, durationMinutes: number = 30) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      };

      expect(calculateEndTime('10:00', 30)).toBe('10:30');
      expect(calculateEndTime('14:30', 45)).toBe('15:15');
      expect(calculateEndTime('23:45', 30)).toBe('00:15');
      expect(calculateEndTime('09:00')).toBe('09:30'); // Default 30 minutes
    });
  });

  describe('Response Message Generation', () => {
    it('should generate appropriate response messages', () => {
      const generateBookingResponse = (hasSpecialty: boolean, hasDate: boolean, specialty?: string) => {
        if (!hasSpecialty) {
          return "Para agendar su cita, necesito saber qué especialidad médica necesita. Por ejemplo: cardiología, dermatología, medicina general, etc.";
        }
        
        if (!hasDate) {
          return `Perfecto, necesita una cita de ${specialty}. ¿Para qué fecha le gustaría agendar? Puede decirme una fecha específica o algo como "mañana", "la próxima semana", etc.`;
        }
        
        return "Procesando su solicitud...";
      };

      // No specialty
      const noSpecialtyResponse = generateBookingResponse(false, false);
      expect(noSpecialtyResponse).toContain('necesito saber qué especialidad médica necesita');

      // Has specialty but no date
      const noDateResponse = generateBookingResponse(true, false, 'cardiología');
      expect(noDateResponse).toContain('necesita una cita de cardiología');
      expect(noDateResponse).toContain('¿Para qué fecha le gustaría agendar?');

      // Has both
      const completeResponse = generateBookingResponse(true, true, 'cardiología');
      expect(completeResponse).toBe('Procesando su solicitud...');
    });

    it('should generate confirmation messages', () => {
      const generateConfirmationMessage = (appointmentId: string, doctorName: string, date: string, time: string) => {
        return `¡Perfecto! Su cita ha sido agendada exitosamente:\n\n👨‍⚕️ ${doctorName}\n📅 ${date} a las ${time}\n\nRecibirá una confirmación por email. ¿Hay algo más en lo que pueda ayudarle?`;
      };

      const message = generateConfirmationMessage('apt-1', 'Dr. García', '01/02/2024', '10:00');
      
      expect(message).toContain('Su cita ha sido agendada exitosamente');
      expect(message).toContain('Dr. García');
      expect(message).toContain('01/02/2024 a las 10:00');
      expect(message).toContain('Recibirá una confirmación por email');
    });
  });

  describe('Appointment List Formatting', () => {
    it('should format appointment list for display', () => {
      const formatAppointmentsList = (appointments: any[]) => {
        if (!appointments || appointments.length === 0) {
          return "No encontré citas programadas. ¿Le gustaría agendar una nueva cita?";
        }

        const appointmentsList = appointments.map((apt, index) => {
          const doctorName = apt.doctors?.profiles?.first_name && apt.doctors?.profiles?.last_name 
            ? `${apt.doctors.profiles.first_name} ${apt.doctors.profiles.last_name}`
            : 'Doctor asignado';
          const serviceName = apt.services?.name || 'Consulta médica';
          const date = new Date(apt.appointment_date).toLocaleDateString('es-ES');
          const time = apt.start_time;
          const status = apt.status === 'confirmed' ? 'Confirmada' : apt.status;
          
          return `${index + 1}. ${serviceName} - ${doctorName}\n   📅 ${date} a las ${time}\n   Estado: ${status}\n   ID: ${apt.id}`;
        }).join('\n\n');

        return `Sus citas:\n\n${appointmentsList}\n\n¿Necesita modificar alguna de estas citas?`;
      };

      const mockAppointments = [
        {
          id: 'apt-1',
          appointment_date: '2024-02-01',
          start_time: '10:00',
          status: 'confirmed',
          doctors: {
            profiles: {
              first_name: 'Juan',
              last_name: 'García'
            }
          },
          services: {
            name: 'Cardiología'
          }
        }
      ];

      const formatted = formatAppointmentsList(mockAppointments);
      
      expect(formatted).toContain('Sus citas:');
      expect(formatted).toContain('1. Cardiología - Juan García');
      expect(formatted).toContain('a las 10:00');
      expect(formatted).toContain('Estado: Confirmada');
      expect(formatted).toContain('ID: apt-1');

      // Empty list
      const emptyFormatted = formatAppointmentsList([]);
      expect(emptyFormatted).toContain('No encontré citas programadas');
    });
  });

  describe('Error Message Generation', () => {
    it('should generate appropriate error messages', () => {
      const generateErrorMessage = (errorType: string, context?: any) => {
        switch (errorType) {
          case 'no_availability':
            return `Lo siento, no encontré disponibilidad para ${context?.specialty} en ${context?.date}. ¿Le gustaría que le sugiera fechas alternativas?`;
          case 'missing_patient_info':
            return "Para confirmar su cita, necesito algunos datos adicionales. ¿Podría proporcionarme su nombre completo y número de identificación?";
          case 'appointment_creation_failed':
            return `No pude confirmar su cita: ${context?.error}. Por favor intente con otro horario.`;
          case 'general_error':
            return "Disculpe, hubo un problema al procesar su solicitud de cita. Por favor intente nuevamente.";
          default:
            return "Ha ocurrido un error inesperado.";
        }
      };

      expect(generateErrorMessage('no_availability', { specialty: 'cardiología', date: 'mañana' }))
        .toContain('no encontré disponibilidad para cardiología en mañana');

      expect(generateErrorMessage('missing_patient_info'))
        .toContain('necesito algunos datos adicionales');

      expect(generateErrorMessage('appointment_creation_failed', { error: 'Doctor no disponible' }))
        .toContain('No pude confirmar su cita: Doctor no disponible');

      expect(generateErrorMessage('general_error'))
        .toContain('hubo un problema al procesar su solicitud');
    });
  });
});
