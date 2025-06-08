/**
 * WhatsApp Notification Service
 * 
 * Handles sending appointment notifications via WhatsApp including confirmations,
 * reminders, updates, and cancellations. Integrates with appointment state changes
 * and provides template-based messaging with personalization.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import { EvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import { AppointmentStatus } from '@/types/appointment-states';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface NotificationTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  status: AppointmentStatus[];
  priority: 'low' | 'medium' | 'high';
}

export interface NotificationContext {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  locationName?: string;
  organizationName: string;
  previousStatus?: AppointmentStatus;
  newStatus: AppointmentStatus;
  reason?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  appointment_confirmed: {
    id: 'appointment_confirmed',
    name: 'Cita Confirmada',
    content: `¡Hola {{patientName}}! 👋

✅ Tu cita ha sido *confirmada*

📅 *Fecha:* {{appointmentDate}}
🕐 *Hora:* {{appointmentTime}}
👨‍⚕️ *Doctor:* {{doctorName}}
🏥 *Servicio:* {{serviceName}}
{{#locationName}}📍 *Ubicación:* {{locationName}}{{/locationName}}

Por favor, llega 15 minutos antes de tu cita.

¿Necesitas reagendar? Responde a este mensaje.

_{{organizationName}}_`,
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'doctorName', 'serviceName', 'locationName', 'organizationName'],
    status: [AppointmentStatus.CONFIRMED],
    priority: 'medium'
  },

  appointment_reminder: {
    id: 'appointment_reminder',
    name: 'Recordatorio de Cita',
    content: `¡Hola {{patientName}}! 🔔

⏰ *Recordatorio de tu cita*

📅 *Mañana:* {{appointmentDate}}
🕐 *Hora:* {{appointmentTime}}
👨‍⚕️ *Doctor:* {{doctorName}}
🏥 *Servicio:* {{serviceName}}
{{#locationName}}📍 *Ubicación:* {{locationName}}{{/locationName}}

Recuerda llegar 15 minutos antes.

¿Necesitas reagendar? Responde a este mensaje.

_{{organizationName}}_`,
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'doctorName', 'serviceName', 'locationName', 'organizationName'],
    status: [AppointmentStatus.CONFIRMED],
    priority: 'high'
  },

  appointment_cancelled_clinic: {
    id: 'appointment_cancelled_clinic',
    name: 'Cita Cancelada por Clínica',
    content: `Hola {{patientName}}, 

❌ Lamentamos informarte que tu cita ha sido *cancelada*

📅 *Fecha original:* {{appointmentDate}}
🕐 *Hora original:* {{appointmentTime}}
👨‍⚕️ *Doctor:* {{doctorName}}

{{#reason}}*Motivo:* {{reason}}{{/reason}}

Por favor contáctanos para reagendar tu cita lo antes posible.

Disculpas por las molestias.

_{{organizationName}}_`,
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'doctorName', 'reason', 'organizationName'],
    status: [AppointmentStatus.CANCELADA_CLINICA],
    priority: 'high'
  },

  appointment_rescheduled: {
    id: 'appointment_rescheduled',
    name: 'Cita Reagendada',
    content: `¡Hola {{patientName}}! 📅

🔄 Tu cita ha sido *reagendada*

📅 *Nueva fecha:* {{appointmentDate}}
🕐 *Nueva hora:* {{appointmentTime}}
👨‍⚕️ *Doctor:* {{doctorName}}
🏥 *Servicio:* {{serviceName}}
{{#locationName}}📍 *Ubicación:* {{locationName}}{{/locationName}}

{{#reason}}*Motivo del cambio:* {{reason}}{{/reason}}

Por favor confirma tu asistencia respondiendo a este mensaje.

_{{organizationName}}_`,
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'doctorName', 'serviceName', 'locationName', 'reason', 'organizationName'],
    status: [AppointmentStatus.REAGENDADA],
    priority: 'medium'
  },

  appointment_completed: {
    id: 'appointment_completed',
    name: 'Cita Completada',
    content: `¡Hola {{patientName}}! ✅

Gracias por asistir a tu cita con {{doctorName}}.

¿Cómo fue tu experiencia? Tu opinión es muy importante para nosotros.

Si necesitas una nueva cita o tienes alguna consulta, no dudes en contactarnos.

¡Que tengas un excelente día!

_{{organizationName}}_`,
    variables: ['patientName', 'doctorName', 'organizationName'],
    status: [AppointmentStatus.COMPLETED],
    priority: 'low'
  }
};

// =====================================================
// WHATSAPP NOTIFICATION SERVICE
// =====================================================

/**
 * WhatsApp Notification Service Class
 * 
 * @description Manages WhatsApp notifications for appointment state changes
 * with template-based messaging and Evolution API integration.
 */
export class WhatsAppNotificationService {
  private supabase: any;
  private evolutionAPI: EvolutionAPIService;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.evolutionAPI = new EvolutionAPIService();
  }

  // =====================================================
  // TEMPLATE PROCESSING
  // =====================================================

  /**
   * Process template with context variables
   */
  private processTemplate(template: NotificationTemplate, context: NotificationContext): string {
    let content = template.content;

    // Replace simple variables
    template.variables.forEach(variable => {
      const value = (context as any)[variable] || '';
      const regex = new RegExp(`{{${variable}}}`, 'g');
      content = content.replace(regex, value);
    });

    // Handle conditional blocks ({{#variable}}...{{/variable}})
    content = content.replace(/{{#(\w+)}}(.*?){{\/\1}}/gs, (match, variable, block) => {
      const value = (context as any)[variable];
      return value ? block.replace(`{{${variable}}}`, value) : '';
    });

    return content.trim();
  }

  /**
   * Get template for appointment status
   */
  private getTemplateForStatus(status: AppointmentStatus, isReminder = false): NotificationTemplate | null {
    if (isReminder && status === AppointmentStatus.CONFIRMED) {
      return NOTIFICATION_TEMPLATES.appointment_reminder;
    }

    const template = Object.values(NOTIFICATION_TEMPLATES).find(t => 
      t.status.includes(status)
    );

    return template || null;
  }

  // =====================================================
  // NOTIFICATION SENDING
  // =====================================================

  /**
   * Send appointment notification via WhatsApp
   */
  async sendAppointmentNotification(
    context: NotificationContext,
    isReminder = false
  ): Promise<NotificationResult> {
    try {
      console.log('📱 Sending WhatsApp notification:', {
        appointmentId: context.appointmentId,
        status: context.newStatus,
        patient: context.patientName,
        isReminder
      });

      // Get appropriate template
      const template = this.getTemplateForStatus(context.newStatus, isReminder);
      if (!template) {
        return {
          success: false,
          error: `No template found for status: ${context.newStatus}`,
          timestamp: new Date().toISOString()
        };
      }

      // Process template with context
      const message = this.processTemplate(template, context);

      // Find active WhatsApp instance for organization
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('channel_type', 'whatsapp')
        .eq('status', 'connected')
        .limit(1)
        .single();

      if (!instance) {
        return {
          success: false,
          error: 'No active WhatsApp instance found',
          timestamp: new Date().toISOString()
        };
      }

      // Format phone number for WhatsApp
      const phoneNumber = this.formatPhoneNumber(context.patientPhone);
      const instanceName = instance.config?.whatsapp?.evolution_api?.instance_name;

      if (!instanceName) {
        return {
          success: false,
          error: 'WhatsApp instance not properly configured',
          timestamp: new Date().toISOString()
        };
      }

      // Send message via Evolution API
      const messageResult = await this.evolutionAPI.sendMessage(instanceName, {
        number: phoneNumber,
        text: message,
        delay: 1000
      });

      // Log notification sent
      await this.logNotification(context, template, true, messageResult.messageId);

      return {
        success: true,
        messageId: messageResult.messageId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error sending WhatsApp notification:', error);
      
      // Log failed notification
      await this.logNotification(context, null, false, undefined, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send appointment reminder (24 hours before)
   */
  async sendAppointmentReminder(appointmentId: string): Promise<NotificationResult> {
    try {
      // Get appointment details
      const context = await this.getAppointmentContext(appointmentId);
      if (!context) {
        return {
          success: false,
          error: 'Appointment not found or incomplete data',
          timestamp: new Date().toISOString()
        };
      }

      // Send reminder notification
      return await this.sendAppointmentNotification(context, true);

    } catch (error) {
      console.error('❌ Error sending appointment reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Format phone number for WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing (assuming Colombia +57)
    if (!cleaned.startsWith('57') && cleaned.length === 10) {
      cleaned = '57' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Get appointment context for notifications
   */
  private async getAppointmentContext(appointmentId: string): Promise<NotificationContext | null> {
    try {
      const { data: appointment } = await this.supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(first_name, last_name, phone),
          doctors!inner(profiles!inner(first_name, last_name)),
          services!inner(name),
          locations(name),
          organizations!inner(name)
        `)
        .eq('id', appointmentId)
        .single();

      if (!appointment) return null;

      const patient = appointment.patients;
      const doctor = appointment.doctors.profiles;
      const service = appointment.services;
      const location = appointment.locations;
      const organization = appointment.organizations;

      return {
        appointmentId,
        patientName: `${patient.first_name} ${patient.last_name}`.trim(),
        patientPhone: patient.phone,
        doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
        serviceName: service.name,
        appointmentDate: new Date(appointment.appointment_date).toLocaleDateString('es-ES'),
        appointmentTime: appointment.appointment_time,
        locationName: location?.name,
        organizationName: organization.name,
        newStatus: appointment.status
      };

    } catch (error) {
      console.error('❌ Error getting appointment context:', error);
      return null;
    }
  }

  /**
   * Log notification attempt
   */
  private async logNotification(
    context: NotificationContext,
    template: NotificationTemplate | null,
    success: boolean,
    messageId?: string,
    error?: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('whatsapp_notifications')
        .insert({
          appointment_id: context.appointmentId,
          patient_phone: context.patientPhone,
          template_id: template?.id,
          status: context.newStatus,
          success,
          message_id: messageId,
          error_message: error ? (error instanceof Error ? error.message : String(error)) : null,
          sent_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('⚠️ Failed to log notification:', logError);
    }
  }
}
