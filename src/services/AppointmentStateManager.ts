/**
 * AppointmentStateManager Service
 * 
 * Enhanced service for managing appointment state transitions with:
 * - Role-based validation
 * - Comprehensive audit trail
 * - Automatic notifications
 * - Business rule enforcement
 * 
 * Implements the optimized flow: Patient originates → Staff/Admin confirm → Doctor attends
 * 
 * @version 1.0.0 - Enhanced state management
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/client';
import {
  AppointmentStatus,
  UserRole,
  ROLE_PERMISSIONS,
  STATUS_CONFIGS,
  type StatusTransition,
  type AuditTrailEntry
} from '@/types/appointment-states';
import { WhatsAppNotificationService } from '@/lib/services/WhatsAppNotificationService';

/**
 * State transition request interface
 */
export interface StateTransitionRequest {
  appointmentId: string;
  newStatus: AppointmentStatus;
  reason?: string;
  metadata?: Record<string, any>;
  userId: string;
  userRole: UserRole;
  organizationId: string;
}

/**
 * State transition result interface
 */
export interface StateTransitionResult {
  success: boolean;
  error?: string;
  auditTrailId?: string;
  notificationsSent?: string[];
  previousStatus?: AppointmentStatus;
  newStatus?: AppointmentStatus;
}

/**
 * Notification configuration
 */
interface NotificationConfig {
  type: 'email' | 'sms' | 'push' | 'system';
  recipients: string[];
  template: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * AppointmentStateManager Class
 */
export class AppointmentStateManager {
  private supabase = createClient();
  private whatsappNotificationService: WhatsAppNotificationService;

  constructor() {
    this.whatsappNotificationService = new WhatsAppNotificationService(this.supabase);
  }

  /**
   * Validate if a state transition is allowed
   */
  async validateTransition(
    appointmentId: string,
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    userRole: UserRole
  ): Promise<{ valid: boolean; reason?: string }> {
    
    // Check role permissions
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions.allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        reason: `Role ${userRole} is not allowed to transition to status ${newStatus}`
      };
    }

    // Check status configuration
    const statusConfig = STATUS_CONFIGS[currentStatus];
    if (!statusConfig.allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        reason: `Transition from ${currentStatus} to ${newStatus} is not allowed`
      };
    }

    // Check if status is final
    if (statusConfig.isFinal) {
      return {
        valid: false,
        reason: `Cannot change status from final state ${currentStatus}`
      };
    }

    // Business rule validations
    const businessRuleValidation = await this.validateBusinessRules(
      appointmentId,
      currentStatus,
      newStatus,
      userRole
    );

    if (!businessRuleValidation.valid) {
      return businessRuleValidation;
    }

    return { valid: true };
  }

  /**
   * Validate business rules for state transitions
   */
  private async validateBusinessRules(
    appointmentId: string,
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    userRole: UserRole
  ): Promise<{ valid: boolean; reason?: string }> {
    
    try {
      // Get appointment details
      const { data: appointment, error } = await this.supabase
        .from('appointments')
        .select('appointment_date, start_time, patient_id, doctor_id')
        .eq('id', appointmentId)
        .single();

      if (error || !appointment) {
        return { valid: false, reason: 'Appointment not found' };
      }

      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const now = new Date();

      // Rule 1: Cannot mark as completed or in progress if appointment is in the future
      if ([AppointmentStatus.COMPLETED, AppointmentStatus.EN_CURSO].includes(newStatus)) {
        if (appointmentDateTime > now) {
          return {
            valid: false,
            reason: 'Cannot mark future appointments as completed or in progress'
          };
        }
      }

      // Rule 2: Only doctors can mark appointments as in progress or completed
      if ([AppointmentStatus.EN_CURSO, AppointmentStatus.COMPLETED].includes(newStatus)) {
        if (!['doctor', 'admin', 'superadmin'].includes(userRole)) {
          return {
            valid: false,
            reason: 'Only doctors and administrators can mark appointments as in progress or completed'
          };
        }
      }

      // Rule 3: Cannot cancel appointments less than 2 hours before start time (for patients)
      if (newStatus === AppointmentStatus.CANCELADA_PACIENTE && userRole === 'patient') {
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilAppointment < 2) {
          return {
            valid: false,
            reason: 'Cannot cancel appointments less than 2 hours before start time'
          };
        }
      }

      // Rule 4: Validate logical flow
      const flowValidation = this.validateLogicalFlow(currentStatus, newStatus);
      if (!flowValidation.valid) {
        return flowValidation;
      }

      return { valid: true };

    } catch (error) {
      console.error('Error validating business rules:', error);
      return { valid: false, reason: 'Error validating business rules' };
    }
  }

  /**
   * Validate logical flow of state transitions
   */
  private validateLogicalFlow(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus
  ): { valid: boolean; reason?: string } {
    
    // Define logical flow rules
    const flowRules: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.PENDING]: [
        AppointmentStatus.PENDIENTE_PAGO,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELADA_CLINICA
      ],
      [AppointmentStatus.PENDIENTE_PAGO]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELADA_CLINICA,
        AppointmentStatus.CANCELADA_PACIENTE
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.EN_CURSO,
        AppointmentStatus.REAGENDADA,
        AppointmentStatus.CANCELADA_PACIENTE,
        AppointmentStatus.CANCELADA_CLINICA,
        AppointmentStatus.NO_SHOW
      ],
      [AppointmentStatus.EN_CURSO]: [
        AppointmentStatus.COMPLETED
      ],
      [AppointmentStatus.REAGENDADA]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELADA_PACIENTE,
        AppointmentStatus.CANCELADA_CLINICA
      ],
      [AppointmentStatus.COMPLETED]: [], // Final state
      [AppointmentStatus.CANCELLED]: [], // Final state
      [AppointmentStatus.CANCELADA_PACIENTE]: [], // Final state
      [AppointmentStatus.CANCELADA_CLINICA]: [], // Final state
      [AppointmentStatus.NO_SHOW]: [] // Final state
    };

    const allowedTransitions = flowRules[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        reason: `Invalid flow: cannot transition from ${currentStatus} to ${newStatus}`
      };
    }

    return { valid: true };
  }

  /**
   * Execute state transition with full audit trail
   */
  async executeTransition(request: StateTransitionRequest): Promise<StateTransitionResult> {
    try {
      // Get current appointment status
      const { data: appointment, error: fetchError } = await this.supabase
        .from('appointments')
        .select('status, patient_id, doctor_id')
        .eq('id', request.appointmentId)
        .single();

      if (fetchError || !appointment) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }

      const currentStatus = appointment.status as AppointmentStatus;

      // Validate transition
      const validation = await this.validateTransition(
        request.appointmentId,
        currentStatus,
        request.newStatus,
        request.userRole
      );

      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason
        };
      }

      // Execute transition in transaction
      const { data: updatedAppointment, error: updateError } = await this.supabase
        .from('appointments')
        .update({ 
          status: request.newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.appointmentId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          error: 'Failed to update appointment status'
        };
      }

      // Create audit trail entry
      const auditTrailId = await this.createAuditTrail({
        appointmentId: request.appointmentId,
        userId: request.userId,
        userRole: request.userRole,
        previousStatus: currentStatus,
        newStatus: request.newStatus,
        reason: request.reason,
        metadata: {
          ...request.metadata,
          organizationId: request.organizationId,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
          ipAddress: 'system' // Would be populated by middleware in production
        }
      });

      // Send notifications
      const notificationsSent = await this.sendNotifications(
        request.appointmentId,
        currentStatus,
        request.newStatus,
        appointment.patient_id,
        appointment.doctor_id
      );

      return {
        success: true,
        auditTrailId,
        notificationsSent,
        previousStatus: currentStatus,
        newStatus: request.newStatus
      };

    } catch (error) {
      console.error('Error executing state transition:', error);
      return {
        success: false,
        error: 'Internal error during state transition'
      };
    }
  }

  /**
   * Create comprehensive audit trail entry
   */
  private async createAuditTrail(entry: Omit<AuditTrailEntry, 'id' | 'created_at'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('appointment_audit_trail')
      .insert({
        ...entry,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating audit trail:', error);
      throw new Error('Failed to create audit trail');
    }

    return data.id;
  }

  /**
   * Send appropriate notifications based on state change
   */
  private async sendNotifications(
    appointmentId: string,
    previousStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    patientId: string,
    doctorId: string
  ): Promise<string[]> {

    const sentNotifications: string[] = [];

    // Define which statuses should trigger WhatsApp notifications
    const whatsappNotificationStatuses = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CANCELADA_CLINICA,
      AppointmentStatus.REAGENDADA,
      AppointmentStatus.COMPLETED
    ];

    // Send WhatsApp notification if status change warrants it
    if (whatsappNotificationStatuses.includes(newStatus)) {
      try {
        console.log(`📱 Sending WhatsApp notification for appointment ${appointmentId}:`, {
          previousStatus,
          newStatus,
          patientId
        });

        // Get appointment context for notification
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

        if (appointment) {
          const patient = appointment.patients;
          const doctor = appointment.doctors.profiles;
          const service = appointment.services;
          const location = appointment.locations;
          const organization = appointment.organizations;

          const notificationContext = {
            appointmentId,
            patientName: `${patient.first_name} ${patient.last_name}`.trim(),
            patientPhone: patient.phone,
            doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
            serviceName: service.name,
            appointmentDate: new Date(appointment.appointment_date).toLocaleDateString('es-ES'),
            appointmentTime: appointment.appointment_time,
            locationName: location?.name,
            organizationName: organization.name,
            previousStatus,
            newStatus
          };

          const whatsappResult = await this.whatsappNotificationService.sendAppointmentNotification(
            notificationContext
          );

          if (whatsappResult.success) {
            sentNotifications.push(`whatsapp:${newStatus}`);
            console.log(`✅ WhatsApp notification sent successfully:`, whatsappResult.messageId);
          } else {
            console.error(`❌ WhatsApp notification failed:`, whatsappResult.error);
            sentNotifications.push(`whatsapp:${newStatus}:failed`);
          }
        }

      } catch (error) {
        console.error('❌ Error sending WhatsApp notification:', error);
        sentNotifications.push(`whatsapp:${newStatus}:error`);
      }
    }

    // Legacy email notifications (placeholder for future implementation)
    const emailNotificationStatuses = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CANCELADA_CLINICA,
      AppointmentStatus.REAGENDADA,
      AppointmentStatus.COMPLETED
    ];

    if (emailNotificationStatuses.includes(newStatus)) {
      console.log(`📧 Email notification would be sent for status: ${newStatus}`);
      sentNotifications.push(`email:${newStatus}:placeholder`);
    }

    return sentNotifications;
  }

  /**
   * Get available transitions for a specific appointment and user role
   */
  async getAvailableTransitions(
    appointmentId: string,
    userRole: UserRole
  ): Promise<AppointmentStatus[]> {

    try {
      const { data: appointment, error } = await this.supabase
        .from('appointments')
        .select('status')
        .eq('id', appointmentId)
        .single();

      if (error || !appointment) {
        return [];
      }

      const currentStatus = appointment.status as AppointmentStatus;
      const statusConfig = STATUS_CONFIGS[currentStatus];
      const rolePermissions = ROLE_PERMISSIONS[userRole];

      // Get intersection of allowed transitions from status and role
      const availableTransitions = statusConfig.allowedTransitions.filter(
        status => rolePermissions.allowedTransitions.includes(status)
      );

      return availableTransitions;

    } catch (error) {
      console.error('Error getting available transitions:', error);
      return [];
    }
  }

  /**
   * Get audit trail for an appointment
   */
  async getAuditTrail(appointmentId: string): Promise<AuditTrailEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('appointment_audit_trail')
        .select('*')
        .eq('appointmentId', appointmentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching audit trail:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting audit trail:', error);
      return [];
    }
  }
}

// Export singleton instance
export const appointmentStateManager = new AppointmentStateManager();
