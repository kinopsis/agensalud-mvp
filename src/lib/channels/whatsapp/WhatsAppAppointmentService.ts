/**
 * WhatsApp Appointment Service (Migrated)
 * 
 * WhatsApp-specific implementation of BaseAppointmentService that integrates
 * with the existing appointment booking and AI processing functionality.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChannelType,
  ChannelInstance,
  ChannelBookingRequest,
  ChannelBookingResult
} from '@/types/channels';
import type { WhatsAppInstance } from '@/types/whatsapp';
import { BaseAppointmentService } from '../core/BaseAppointmentService';

// =====================================================
// WHATSAPP APPOINTMENT SERVICE
// =====================================================

/**
 * WhatsAppAppointmentService
 * 
 * Handles appointment operations for WhatsApp channel with specialized
 * formatting and integration with existing appointment booking system.
 */
export class WhatsAppAppointmentService extends BaseAppointmentService {
  private whatsappInstance: WhatsAppInstance;

  constructor(supabase: SupabaseClient, channelInstance: ChannelInstance) {
    super(supabase, channelInstance);
    
    // Convert ChannelInstance to WhatsAppInstance for compatibility
    this.whatsappInstance = this.convertToWhatsAppInstance(channelInstance);
  }

  // =====================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // =====================================================

  /**
   * Get channel type
   */
  getChannelType(): ChannelType {
    return 'whatsapp';
  }

  /**
   * Format availability slots for WhatsApp display
   */
  formatAvailabilitySlots(slots: any[]): string {
    return slots.slice(0, 5).map((slot, index) => {
      const date = new Date(slot.date || slot.appointment_date).toLocaleDateString('es-ES');
      const time = slot.start_time || slot.time;
      const doctorName = slot.doctor_name || 'Doctor disponible';
      const specialty = slot.specialization || slot.specialty || '';
      
      return `${index + 1}. 👨‍⚕️ ${doctorName}${specialty ? ` (${specialty})` : ''}\n   📅 ${date} a las ${time}`;
    }).join('\n\n');
  }

  /**
   * Format appointments list for WhatsApp display
   */
  formatAppointmentsList(appointments: any[]): string {
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
      const status = this.translateStatus(apt.status);
      
      return `${index + 1}. ${serviceName} - ${doctorName}\n   📅 ${date} a las ${time}\n   Estado: ${status}\n   ID: ${apt.id}`;
    }).join('\n\n');

    return `Sus citas:\n\n${appointmentsList}\n\n¿Necesita modificar alguna de estas citas?`;
  }

  /**
   * Format confirmation message for WhatsApp
   */
  formatConfirmationMessage(appointmentId: string, details: any): string {
    const doctorName = details.doctor_name || 'Doctor asignado';
    const date = new Date(details.date || details.appointment_date).toLocaleDateString('es-ES');
    const time = details.start_time || details.time;
    const specialty = details.specialty || details.specialization || '';

    return `¡Perfecto! Su cita ha sido agendada exitosamente:

👨‍⚕️ ${doctorName}${specialty ? ` (${specialty})` : ''}
📅 ${date} a las ${time}
🆔 Cita #${appointmentId}

Recibirá una confirmación por email. ¿Hay algo más en lo que pueda ayudarle?`;
  }

  /**
   * Format error message for WhatsApp
   */
  formatErrorMessage(errorType: string, context?: any): string {
    const errorMessages = {
      booking_error: "Disculpe, hubo un problema al procesar su solicitud de cita. Por favor intente nuevamente.",
      invalid_slot_selection: "Por favor seleccione un número válido de la lista de horarios disponibles.",
      missing_patient_info: "Para confirmar su cita, necesito algunos datos adicionales. ¿Podría proporcionarme su nombre completo y número de identificación?",
      appointment_creation_failed: `No pude confirmar su cita: ${context?.error || 'Error desconocido'}. Por favor intente con otro horario.`,
      confirmation_error: "Hubo un problema al confirmar su cita. Por favor contacte a nuestro personal.",
      missing_patient_id: "Para consultar sus citas, necesito que me proporcione su número de identificación o documento.",
      query_error: "Disculpe, hubo un problema al consultar sus citas. Por favor intente nuevamente.",
      cancellation_failed: "No pude cancelar su cita. Por favor contacte a nuestro personal.",
      cancellation_error: "Hubo un problema al cancelar su cita. Por favor intente nuevamente."
    };

    return errorMessages[errorType] || "Ha ocurrido un error inesperado. Por favor contacte a nuestro personal.";
  }

  // =====================================================
  // WHATSAPP-SPECIFIC METHODS
  // =====================================================

  /**
   * Process booking request with WhatsApp-specific formatting
   */
  async processBookingRequest(request: ChannelBookingRequest): Promise<ChannelBookingResult> {
    try {
      console.log(`📱 Processing WhatsApp booking request for ${request.specialty}`);

      // Use base implementation
      const result = await super.processBookingRequest(request);

      // Add WhatsApp-specific enhancements to the response
      if (result.success && result.available_slots) {
        result.message = `Encontré estas opciones disponibles para ${request.specialty}:

${this.formatAvailabilitySlots(result.available_slots)}

¿Cuál horario le conviene más? Responda con el número de la opción.`;
      }

      return result;

    } catch (error) {
      console.error('Error in WhatsApp booking request:', error);
      return {
        success: false,
        message: this.formatErrorMessage('booking_error'),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Confirm appointment slot with WhatsApp formatting
   */
  async confirmAppointmentSlot(
    conversationId: string,
    slotIndex: number,
    availableSlots: any[],
    patientId?: string
  ): Promise<ChannelBookingResult> {
    try {
      console.log(`📱 Confirming WhatsApp appointment slot ${slotIndex}`);

      // Use base implementation
      const result = await super.confirmAppointmentSlot(conversationId, slotIndex, availableSlots, patientId);

      // Enhance with WhatsApp-specific formatting
      if (result.success && result.appointment_id) {
        const selectedSlot = availableSlots[slotIndex];
        result.message = this.formatConfirmationMessage(result.appointment_id, selectedSlot);
      }

      return result;

    } catch (error) {
      console.error('Error confirming WhatsApp appointment:', error);
      return {
        success: false,
        message: this.formatErrorMessage('confirmation_error'),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Query appointments with WhatsApp formatting
   */
  async queryAppointments(query: any): Promise<string> {
    try {
      console.log(`📱 Querying WhatsApp appointments for patient ${query.patientId}`);

      // Use base implementation
      const result = await super.queryAppointments(query);

      return result;

    } catch (error) {
      console.error('Error querying WhatsApp appointments:', error);
      return this.formatErrorMessage('query_error');
    }
  }

  // =====================================================
  // COMPATIBILITY METHODS (for existing system)
  // =====================================================

  /**
   * Process booking request (compatibility wrapper)
   */
  async processBookingRequestLegacy(request: {
    conversationId: string;
    patientId?: string;
    specialty: string;
    preferredDate: string;
    preferredTime?: string;
    urgency?: string;
    symptoms?: string[];
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    availableSlots?: any[];
    nextStep?: string;
    error?: string;
  }> {
    // Convert to unified format
    const unifiedRequest: ChannelBookingRequest = {
      channel_type: 'whatsapp',
      conversation_id: request.conversationId,
      patient_id: request.patientId,
      specialty: request.specialty,
      preferred_date: request.preferredDate,
      preferred_time: request.preferredTime,
      urgency: request.urgency as any,
      symptoms: request.symptoms,
      notes: request.notes
    };

    // Process using unified method
    const result = await this.processBookingRequest(unifiedRequest);

    // Return in legacy format
    return {
      success: result.success,
      message: result.message,
      availableSlots: result.available_slots,
      nextStep: result.next_step,
      error: result.error
    };
  }

  /**
   * Convert ChannelInstance to WhatsAppInstance for compatibility
   */
  private convertToWhatsAppInstance(channelInstance: ChannelInstance): WhatsAppInstance {
    const whatsappConfig = channelInstance.config.whatsapp;
    
    return {
      id: channelInstance.id,
      organization_id: channelInstance.organization_id,
      instance_name: channelInstance.instance_name,
      phone_number: whatsappConfig?.phone_number || '',
      status: channelInstance.status as any,
      evolution_api_config: whatsappConfig?.evolution_api,
      webhook_url: channelInstance.config.webhook.url,
      created_at: channelInstance.created_at,
      updated_at: channelInstance.updated_at
    } as WhatsAppInstance;
  }

  /**
   * Get conversation by ID (compatibility method)
   */
  async getConversationLegacy(conversationId: string): Promise<any | null> {
    try {
      const { data } = await this.supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      return data;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  /**
   * Create audit log (compatibility method)
   */
  async createAuditLogLegacy(
    conversationId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: this.whatsappInstance.organization_id,
        p_conversation_id: conversationId,
        p_action: action,
        p_actor_type: 'patient',
        p_whatsapp_instance_id: this.whatsappInstance.id,
        p_details: details
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }
}

export default WhatsAppAppointmentService;
