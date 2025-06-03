/**
 * Base Appointment Service
 * 
 * Abstract base class for handling appointment operations across different communication channels.
 * Provides common functionality for booking, querying, and managing appointments.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChannelType,
  ChannelInstance,
  ChannelBookingRequest,
  ChannelBookingResult,
  ChannelAppointmentQuery,
  ExtractedEntities
} from '@/types/channels';
import { AppointmentProcessor } from '@/lib/ai/appointment-processor';

// =====================================================
// ABSTRACT BASE CLASS
// =====================================================

/**
 * BaseAppointmentService
 * 
 * Abstract base class that provides common appointment functionality.
 * Each specific channel appointment service extends this class.
 */
export abstract class BaseAppointmentService {
  protected supabase: SupabaseClient;
  protected channelInstance: ChannelInstance;
  protected organizationId: string;
  protected appointmentProcessor: AppointmentProcessor;

  constructor(supabase: SupabaseClient, channelInstance: ChannelInstance) {
    this.supabase = supabase;
    this.channelInstance = channelInstance;
    this.organizationId = channelInstance.organization_id;
    this.appointmentProcessor = new AppointmentProcessor();
  }

  // =====================================================
  // ABSTRACT METHODS (Must be implemented by subclasses)
  // =====================================================

  /**
   * Get the channel type for this service
   */
  abstract getChannelType(): ChannelType;

  /**
   * Format availability slots for the specific channel
   */
  abstract formatAvailabilitySlots(slots: any[]): string;

  /**
   * Format appointment list for the specific channel
   */
  abstract formatAppointmentsList(appointments: any[]): string;

  /**
   * Format confirmation message for the specific channel
   */
  abstract formatConfirmationMessage(appointmentId: string, details: any): string;

  /**
   * Format error message for the specific channel
   */
  abstract formatErrorMessage(errorType: string, context?: any): string;

  // =====================================================
  // COMMON IMPLEMENTATION (Shared across all channels)
  // =====================================================

  /**
   * Process appointment booking request
   */
  async processBookingRequest(request: ChannelBookingRequest): Promise<ChannelBookingResult> {
    try {
      console.log(`🔄 Processing ${this.getChannelType()} booking request:`, request);

      // Validate required information
      const validation = this.validateBookingRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          next_step: validation.nextStep
        };
      }

      // Check availability using the AI processor
      const availabilityResult = await this.appointmentProcessor.processMessage(
        this.buildBookingMessage(request),
        {
          organizationId: this.organizationId,
          userId: request.patient_id || 'channel-user',
          includeAvailability: true
        }
      );

      if (availabilityResult.availability && availabilityResult.availability.length > 0) {
        // Format availability for the specific channel
        const formattedSlots = this.formatAvailabilitySlots(availabilityResult.availability);
        
        return {
          success: true,
          message: `Encontré estas opciones disponibles para ${request.specialty}:\n\n${formattedSlots}\n\n¿Cuál horario le conviene más? Responda con el número de la opción.`,
          available_slots: availabilityResult.availability,
          next_step: 'confirm_slot'
        };
      } else {
        // No availability found, suggest alternatives
        const alternatives = await this.suggestAlternatives(request.specialty, request.preferred_date);
        
        return {
          success: false,
          message: `Lo siento, no encontré disponibilidad para ${request.specialty} en ${request.preferred_date}. ${alternatives}`,
          next_step: 'suggest_alternatives'
        };
      }

    } catch (error) {
      console.error('Error processing booking request:', error);
      return {
        success: false,
        message: this.formatErrorMessage('booking_error', { error: error.message }),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Confirm and create appointment from selected slot
   */
  async confirmAppointmentSlot(
    conversationId: string,
    slotIndex: number,
    availableSlots: any[],
    patientId?: string
  ): Promise<ChannelBookingResult> {
    try {
      // Validate slot selection
      if (slotIndex < 0 || slotIndex >= availableSlots.length) {
        return {
          success: false,
          message: this.formatErrorMessage('invalid_slot_selection')
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
          message: this.formatErrorMessage('missing_patient_info'),
          next_step: 'provide_patient_info'
        };
      }

      // Create the appointment using the appointment processor
      const result = await this.appointmentProcessor.createAppointment({
        organizationId: this.organizationId,
        patientId: finalPatientId,
        doctorId: selectedSlot.doctor_id,
        serviceId: selectedSlot.service_id || null,
        locationId: selectedSlot.location_id || null,
        appointmentDate: selectedSlot.date || selectedSlot.appointment_date,
        startTime: selectedSlot.start_time || selectedSlot.time,
        endTime: selectedSlot.end_time || this.calculateEndTime(selectedSlot.start_time || selectedSlot.time, 30),
        notes: `Cita agendada vía ${this.getChannelType()}`
      });

      if (result.success) {
        // Create audit log
        await this.createAuditLog(conversationId, 'appointment_created', {
          appointmentId: result.appointmentId,
          patientId: finalPatientId,
          doctorId: selectedSlot.doctor_id,
          appointmentDate: selectedSlot.date || selectedSlot.appointment_date,
          startTime: selectedSlot.start_time || selectedSlot.time
        });

        return {
          success: true,
          appointment_id: result.appointmentId,
          message: this.formatConfirmationMessage(result.appointmentId, selectedSlot)
        };
      } else {
        return {
          success: false,
          message: this.formatErrorMessage('appointment_creation_failed', { error: result.error }),
          error: result.error
        };
      }

    } catch (error) {
      console.error('Error confirming appointment slot:', error);
      return {
        success: false,
        message: this.formatErrorMessage('confirmation_error'),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Query patient appointments
   */
  async queryAppointments(query: ChannelAppointmentQuery): Promise<string> {
    try {
      if (!query.patient_id) {
        return this.formatErrorMessage('missing_patient_id');
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
        .eq('patient_id', query.patient_id)
        .eq('organization_id', this.organizationId)
        .in('status', query.status || ['scheduled', 'confirmed', 'pending'])
        .order('appointment_date', { ascending: true })
        .limit(5);

      if (appointments && appointments.length > 0) {
        return this.formatAppointmentsList(appointments);
      } else {
        return "No encontré citas programadas. ¿Le gustaría agendar una nueva cita?";
      }

    } catch (error) {
      console.error('Error querying appointments:', error);
      return this.formatErrorMessage('query_error');
    }
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<ChannelBookingResult> {
    try {
      // Update appointment status to cancelled
      const { data: appointment, error: updateError } = await this.supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          notes: `Cancelada vía ${this.getChannelType()}${reason ? `: ${reason}` : ''}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .eq('organization_id', this.organizationId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          message: this.formatErrorMessage('cancellation_failed'),
          error: updateError.message
        };
      }

      // Create audit log
      await this.createAuditLog('', 'appointment_cancelled', {
        appointmentId,
        reason: reason || `Cancelada por el paciente vía ${this.getChannelType()}`,
        cancelledAt: new Date().toISOString()
      });

      const date = new Date(appointment.appointment_date).toLocaleDateString('es-ES');
      const time = appointment.start_time;

      return {
        success: true,
        message: `Su cita del ${date} a las ${time} ha sido cancelada exitosamente. ¿Hay algo más en lo que pueda ayudarle?`,
        appointment_id: appointmentId
      };

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return {
        success: false,
        message: this.formatErrorMessage('cancellation_error'),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // VALIDATION AND HELPERS
  // =====================================================

  /**
   * Validate booking request
   */
  protected validateBookingRequest(request: ChannelBookingRequest): {
    isValid: boolean;
    message: string;
    nextStep?: string;
  } {
    if (!request.specialty || request.specialty.trim() === '') {
      return {
        isValid: false,
        message: "Para agendar su cita, necesito saber qué especialidad médica necesita. Por ejemplo: cardiología, dermatología, medicina general, etc.",
        nextStep: 'provide_specialty'
      };
    }

    if (!request.preferred_date || request.preferred_date.trim() === '') {
      return {
        isValid: false,
        message: `Perfecto, necesita una cita de ${request.specialty}. ¿Para qué fecha le gustaría agendar? Puede decirme una fecha específica o algo como "mañana", "la próxima semana", etc.`,
        nextStep: 'provide_date'
      };
    }

    return {
      isValid: true,
      message: 'Valid request'
    };
  }

  /**
   * Build booking message for AI processor
   */
  protected buildBookingMessage(request: ChannelBookingRequest): string {
    let message = `Necesito una cita de ${request.specialty} para ${request.preferred_date}`;
    
    if (request.preferred_time) {
      message += ` a las ${request.preferred_time}`;
    }
    
    if (request.urgency && request.urgency !== 'low') {
      message += ` (urgencia: ${request.urgency})`;
    }
    
    if (request.symptoms && request.symptoms.length > 0) {
      message += `. Síntomas: ${request.symptoms.join(', ')}`;
    }

    return message;
  }

  /**
   * Suggest alternative dates/times
   */
  protected async suggestAlternatives(specialty: string, requestedDate: string): Promise<string> {
    try {
      // Get next available dates
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const alternatives = await this.appointmentProcessor.getAvailability({
        organizationId: this.organizationId,
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
  protected calculateEndTime(startTime: string, durationMinutes: number = 30): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Get conversation by ID
   */
  protected async getConversation(conversationId: string): Promise<any | null> {
    const { data } = await this.supabase
      .from('channel_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    return data;
  }

  /**
   * Find or create patient from conversation
   */
  protected async findOrCreatePatient(conversation: any): Promise<{id: string, name: string} | null> {
    // Implementation would go here - for now return null
    // This would involve patient lookup by phone number and creation if needed
    return null;
  }

  /**
   * Create audit log entry
   */
  protected async createAuditLog(
    conversationId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('channel_audit_logs')
        .insert({
          organization_id: this.organizationId,
          conversation_id: conversationId || null,
          channel_type: this.getChannelType(),
          action,
          actor_type: 'patient',
          instance_id: this.channelInstance.id,
          details,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Translate appointment status to Spanish
   */
  protected translateStatus(status: string): string {
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
