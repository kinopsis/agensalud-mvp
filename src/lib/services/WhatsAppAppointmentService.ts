/**
 * WhatsApp Appointment Service
 * 
 * Specialized service for handling appointment booking, rescheduling, and cancellation
 * through WhatsApp integration with the existing appointment system.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  WhatsAppInstance, 
  WhatsAppConversation,
  ExtractedEntities 
} from '@/types/whatsapp';
import { AppointmentProcessor } from '@/lib/ai/appointment-processor';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface WhatsAppBookingRequest {
  conversationId: string;
  patientId?: string;
  specialty: string;
  preferredDate: string;
  preferredTime?: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  symptoms?: string[];
  notes?: string;
}

export interface WhatsAppBookingResult {
  success: boolean;
  appointmentId?: string;
  message: string;
  availableSlots?: any[];
  nextStep?: 'confirm_slot' | 'provide_patient_info' | 'suggest_alternatives';
  error?: string;
}

export interface WhatsAppAppointmentQuery {
  conversationId: string;
  patientId?: string;
  appointmentId?: string;
  status?: string[];
}

// =====================================================
// WHATSAPP APPOINTMENT SERVICE CLASS
// =====================================================

/**
 * WhatsApp Appointment Service
 * 
 * Handles appointment operations specifically for WhatsApp users,
 * integrating with the existing appointment system and AI processor.
 */
export class WhatsAppAppointmentService {
  private supabase: SupabaseClient;
  private whatsappInstance: WhatsAppInstance;
  private appointmentProcessor: AppointmentProcessor;

  constructor(supabase: SupabaseClient, whatsappInstance: WhatsAppInstance) {
    this.supabase = supabase;
    this.whatsappInstance = whatsappInstance;
    this.appointmentProcessor = new AppointmentProcessor();
  }

  // =====================================================
  // APPOINTMENT BOOKING
  // =====================================================

  /**
   * Process appointment booking request from WhatsApp
   * 
   * @description Handles the complete booking flow including availability check,
   * patient validation, and appointment creation.
   * 
   * @param request - Booking request data
   * @returns Booking result with next steps
   */
  async processBookingRequest(request: WhatsAppBookingRequest): Promise<WhatsAppBookingResult> {
    try {
      console.log('🔄 Processing WhatsApp booking request:', request);

      // Validate required information
      if (!request.specialty) {
        return {
          success: false,
          message: "Para agendar su cita, necesito saber qué especialidad médica necesita.",
          nextStep: 'provide_patient_info'
        };
      }

      if (!request.preferredDate) {
        return {
          success: false,
          message: `Perfecto, necesita una cita de ${request.specialty}. ¿Para qué fecha le gustaría agendar?`,
          nextStep: 'provide_patient_info'
        };
      }

      // Check availability using the AI processor
      const availabilityResult = await this.appointmentProcessor.processMessage(
        `Necesito una cita de ${request.specialty} para ${request.preferredDate}${request.preferredTime ? ` a las ${request.preferredTime}` : ''}`,
        {
          organizationId: this.whatsappInstance.organization_id,
          userId: request.patientId || 'whatsapp-user',
          includeAvailability: true
        }
      );

      if (availabilityResult.availability && availabilityResult.availability.length > 0) {
        // Format availability for WhatsApp
        const formattedSlots = this.formatAvailabilitySlots(availabilityResult.availability);
        
        return {
          success: true,
          message: `Encontré estas opciones disponibles para ${request.specialty}:\n\n${formattedSlots}\n\n¿Cuál horario le conviene más? Responda con el número de la opción.`,
          availableSlots: availabilityResult.availability,
          nextStep: 'confirm_slot'
        };
      } else {
        // No availability found, suggest alternatives
        const alternatives = await this.suggestAlternatives(request.specialty, request.preferredDate);
        
        return {
          success: false,
          message: `Lo siento, no encontré disponibilidad para ${request.specialty} en ${request.preferredDate}. ${alternatives}`,
          nextStep: 'suggest_alternatives'
        };
      }

    } catch (error) {
      console.error('Error processing booking request:', error);
      return {
        success: false,
        message: "Disculpe, hubo un problema al procesar su solicitud de cita. Por favor intente nuevamente.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Confirm and create appointment from selected slot
   * 
   * @description Creates the actual appointment after user selects a time slot
   * 
   * @param conversationId - WhatsApp conversation ID
   * @param slotIndex - Selected slot index (0-based)
   * @param availableSlots - Previously shown available slots
   * @param patientId - Patient ID (optional)
   * @returns Booking confirmation result
   */
  async confirmAppointmentSlot(
    conversationId: string,
    slotIndex: number,
    availableSlots: any[],
    patientId?: string
  ): Promise<WhatsAppBookingResult> {
    try {
      if (slotIndex < 0 || slotIndex >= availableSlots.length) {
        return {
          success: false,
          message: "Por favor seleccione un número válido de la lista de horarios disponibles."
        };
      }

      const selectedSlot = availableSlots[slotIndex];
      
      // If no patient ID, try to find or create patient
      let finalPatientId = patientId;
      if (!finalPatientId) {
        const conversation = await this.getConversation(conversationId);
        if (conversation) {
          const patientInfo = await this.findOrCreatePatient(conversation);
          finalPatientId = patientInfo?.id;
        }
      }

      if (!finalPatientId) {
        return {
          success: false,
          message: "Para confirmar su cita, necesito algunos datos adicionales. ¿Podría proporcionarme su nombre completo y número de identificación?",
          nextStep: 'provide_patient_info'
        };
      }

      // Create the appointment using the appointment processor
      const result = await this.appointmentProcessor.createAppointment({
        organizationId: this.whatsappInstance.organization_id,
        patientId: finalPatientId,
        doctorId: selectedSlot.doctor_id,
        serviceId: selectedSlot.service_id || null,
        locationId: selectedSlot.location_id || null,
        appointmentDate: selectedSlot.date || selectedSlot.appointment_date,
        startTime: selectedSlot.start_time || selectedSlot.time,
        endTime: selectedSlot.end_time || this.calculateEndTime(selectedSlot.start_time || selectedSlot.time, 30),
        notes: 'Cita agendada vía WhatsApp'
      });

      if (result.success) {
        // Create audit log
        await this.supabase.rpc('create_whatsapp_audit_log', {
          p_organization_id: this.whatsappInstance.organization_id,
          p_conversation_id: conversationId,
          p_action: 'appointment_created',
          p_actor_type: 'patient',
          p_whatsapp_instance_id: this.whatsappInstance.id,
          p_details: {
            appointmentId: result.appointmentId,
            patientId: finalPatientId,
            doctorId: selectedSlot.doctor_id,
            appointmentDate: selectedSlot.date || selectedSlot.appointment_date,
            startTime: selectedSlot.start_time || selectedSlot.time
          }
        });

        const doctorName = selectedSlot.doctor_name || 'Doctor asignado';
        const date = new Date(selectedSlot.date || selectedSlot.appointment_date).toLocaleDateString('es-ES');
        const time = selectedSlot.start_time || selectedSlot.time;

        return {
          success: true,
          appointmentId: result.appointmentId,
          message: `¡Perfecto! Su cita ha sido agendada exitosamente:\n\n👨‍⚕️ ${doctorName}\n📅 ${date} a las ${time}\n\nRecibirá una confirmación por email. ¿Hay algo más en lo que pueda ayudarle?`
        };
      } else {
        return {
          success: false,
          message: `No pude confirmar su cita: ${result.error}. Por favor intente con otro horario.`,
          error: result.error
        };
      }

    } catch (error) {
      console.error('Error confirming appointment slot:', error);
      return {
        success: false,
        message: "Hubo un problema al confirmar su cita. Por favor intente nuevamente.",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // APPOINTMENT QUERIES
  // =====================================================

  /**
   * Query patient appointments
   * 
   * @description Retrieves patient appointments for WhatsApp display
   * 
   * @param query - Query parameters
   * @returns Formatted appointment list
   */
  async queryAppointments(query: WhatsAppAppointmentQuery): Promise<string> {
    try {
      if (!query.patientId) {
        return "Para consultar sus citas, necesito que me proporcione su número de identificación.";
      }

      const { data: appointments } = await this.supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          status,
          reason,
          doctors!inner(profiles!inner(first_name, last_name)),
          services(name)
        `)
        .eq('patient_id', query.patientId)
        .eq('organization_id', this.whatsappInstance.organization_id)
        .in('status', query.status || ['scheduled', 'confirmed', 'pending'])
        .order('appointment_date', { ascending: true })
        .limit(5);

      if (appointments && appointments.length > 0) {
        const appointmentsList = appointments.map((apt, index) => {
          const doctorName = apt.doctors?.profiles?.first_name && apt.doctors?.profiles?.last_name 
            ? `${apt.doctors.profiles.first_name} ${apt.doctors.profiles.last_name}`
            : 'Doctor asignado';
          const serviceName = apt.services?.name || 'Consulta médica';
          const date = new Date(apt.appointment_date).toLocaleDateString('es-ES');
          const time = apt.start_time;
          
          return `${index + 1}. ${serviceName} - ${doctorName}\n   📅 ${date} a las ${time}\n   Estado: ${this.translateStatus(apt.status)}\n   ID: ${apt.id}`;
        }).join('\n\n');

        return `Sus citas:\n\n${appointmentsList}\n\n¿Necesita modificar alguna de estas citas?`;
      } else {
        return "No encontré citas programadas. ¿Le gustaría agendar una nueva cita?";
      }

    } catch (error) {
      console.error('Error querying appointments:', error);
      return "Disculpe, hubo un problema al consultar sus citas. Por favor intente nuevamente.";
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Format availability slots for WhatsApp display
   */
  private formatAvailabilitySlots(slots: any[]): string {
    return slots.slice(0, 5).map((slot, index) => {
      const date = new Date(slot.date || slot.appointment_date).toLocaleDateString('es-ES');
      const time = slot.start_time || slot.time;
      const doctorName = slot.doctor_name || 'Doctor disponible';
      const specialty = slot.specialization || slot.specialty || '';
      
      return `${index + 1}. 👨‍⚕️ ${doctorName}${specialty ? ` (${specialty})` : ''}\n   📅 ${date} a las ${time}`;
    }).join('\n\n');
  }

  /**
   * Suggest alternative dates/times
   */
  private async suggestAlternatives(specialty: string, requestedDate: string): Promise<string> {
    try {
      // Get next available dates
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const alternatives = await this.appointmentProcessor.getAvailability({
        organizationId: this.whatsappInstance.organization_id,
        specialty,
        date: nextWeek.toISOString().split('T')[0]
      });

      if (alternatives.length > 0) {
        const firstAlternative = new Date(alternatives[0].date || alternatives[0].appointment_date).toLocaleDateString('es-ES');
        return `¿Le gustaría que le muestre opciones para ${firstAlternative} o prefiere otra fecha?`;
      } else {
        return "¿Le gustaría que le sugiera fechas alternativas o prefiere contactar directamente con nuestro personal?";
      }
    } catch (error) {
      return "¿Le gustaría que le sugiera fechas alternativas?";
    }
  }

  /**
   * Calculate end time based on start time and duration
   */
  private calculateEndTime(startTime: string, durationMinutes: number = 30): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Get conversation by ID
   */
  private async getConversation(conversationId: string): Promise<WhatsAppConversation | null> {
    const { data } = await this.supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    return data;
  }

  /**
   * Find or create patient from conversation
   */
  private async findOrCreatePatient(conversation: WhatsAppConversation): Promise<{id: string, name: string} | null> {
    // Implementation would go here - for now return null
    // This would involve patient lookup by phone number and creation if needed
    return null;
  }

  /**
   * Translate appointment status
   */
  private translateStatus(status: string): string {
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
  }
}

export default WhatsAppAppointmentService;
