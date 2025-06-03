/**
 * Appointment Status Management Service
 * Handles state transitions with validation and audit logging
 * 
 * @description Centralized service for managing appointment status changes
 * with role-based validation, audit trail, and compliance features
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import { 
  AppointmentStatus, 
  StatusChangeRequest, 
  StatusChangeResult, 
  StatusChangeParams,
  AppointmentStatusHistory,
  UserRole,
  TransitionValidationParams,
  StatusTransitionResult,
  getAvailableTransitions,
  isValidTransition,
  getRolePermissions
} from '@/types/appointment-states';

export class AppointmentStatusService {
  private static instance: AppointmentStatusService;
  private validationCache = new Map<string, { result: boolean; timestamp: number }>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  private constructor() {}

  public static getInstance(): AppointmentStatusService {
    if (!AppointmentStatusService.instance) {
      AppointmentStatusService.instance = new AppointmentStatusService();
    }
    return AppointmentStatusService.instance;
  }

  /**
   * Change appointment status with comprehensive validation and audit trail
   */
  async changeStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    userId: string,
    userRole: UserRole,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<StatusChangeResult> {
    try {
      console.log(`🔄 STATUS CHANGE REQUEST - Appointment: ${appointmentId}, New Status: ${newStatus}, User: ${userRole}`);

      // 1. Get current appointment data
      const currentAppointment = await this.getCurrentAppointment(appointmentId);
      if (!currentAppointment.success || !currentAppointment.data) {
        return {
          success: false,
          error: currentAppointment.error || 'Appointment not found'
        };
      }

      const currentStatus = currentAppointment.data.status as AppointmentStatus;
      
      // 2. Validate transition using SQL function
      const transitionValidation = await this.validateTransitionWithSQL(
        appointmentId,
        newStatus,
        userRole
      );

      if (!transitionValidation.valid) {
        console.log(`❌ INVALID TRANSITION - From: ${currentStatus} To: ${newStatus}, Reason: ${transitionValidation.reason}`);
        return {
          success: false,
          error: transitionValidation.reason || 'Invalid status transition'
        };
      }

      // 3. Validate role permissions
      const roleValidation = this.validateRolePermissions(currentStatus, newStatus, userRole);
      if (!roleValidation.valid) {
        console.log(`❌ INSUFFICIENT PERMISSIONS - User: ${userRole}, Transition: ${currentStatus} → ${newStatus}`);
        return {
          success: false,
          error: roleValidation.reason || 'Insufficient permissions for this status change'
        };
      }

      // 4. Update appointment status
      const updateResult = await this.updateAppointmentStatus(appointmentId, newStatus);
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || 'Failed to update appointment status'
        };
      }

      // 5. Log status change in audit trail
      const auditResult = await this.logStatusChange({
        appointmentId,
        previousStatus: currentStatus,
        newStatus,
        changedBy: userId,
        userRole,
        reason,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          validationMethod: 'sql_function'
        }
      });

      if (!auditResult.success) {
        console.warn(`⚠️ AUDIT LOGGING FAILED - Status change succeeded but audit trail failed: ${auditResult.error}`);
      }

      console.log(`✅ STATUS CHANGE SUCCESS - ${currentStatus} → ${newStatus} for appointment ${appointmentId}`);

      return {
        success: true,
        auditId: auditResult.auditId
      };

    } catch (error) {
      console.error('❌ ERROR in changeStatus:', error);
      return {
        success: false,
        error: 'Internal error during status change'
      };
    }
  }

  /**
   * Get available transitions for current appointment status and user role
   */
  async getAvailableTransitions(
    appointmentId: string,
    userRole: UserRole
  ): Promise<{ success: boolean; transitions?: AppointmentStatus[]; error?: string }> {
    try {
      const currentAppointment = await this.getCurrentAppointment(appointmentId);
      if (!currentAppointment.success || !currentAppointment.data) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }

      const currentStatus = currentAppointment.data.status as AppointmentStatus;
      const availableTransitions = getAvailableTransitions(currentStatus, userRole);

      return {
        success: true,
        transitions: availableTransitions
      };

    } catch (error) {
      console.error('Error getting available transitions:', error);
      return {
        success: false,
        error: 'Failed to get available transitions'
      };
    }
  }

  /**
   * Get audit trail for an appointment
   */
  async getAuditTrail(
    appointmentId: string,
    limit: number = 50
  ): Promise<{ success: boolean; history?: AppointmentStatusHistory[]; error?: string }> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('appointment_status_history')
        .select(`
          id,
          appointment_id,
          previous_status,
          new_status,
          changed_by,
          reason,
          user_role,
          ip_address,
          metadata,
          created_at,
          profiles!appointment_status_history_changed_by_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching audit trail:', error);
        return {
          success: false,
          error: 'Failed to fetch audit trail'
        };
      }

      return {
        success: true,
        history: data as AppointmentStatusHistory[]
      };

    } catch (error) {
      console.error('Error in getAuditTrail:', error);
      return {
        success: false,
        error: 'Internal error fetching audit trail'
      };
    }
  }

  /**
   * Validate status transition using SQL function
   */
  private async validateTransitionWithSQL(
    appointmentId: string,
    newStatus: AppointmentStatus,
    userRole: UserRole
  ): Promise<StatusTransitionResult> {
    try {
      // Check cache first
      const cacheKey = `${appointmentId}-${newStatus}-${userRole}`;
      const cached = this.validationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return { valid: cached.result };
      }

      const supabase = await createClient();

      const { data, error } = await supabase
        .rpc('validate_appointment_status_transition', {
          p_appointment_id: appointmentId,
          p_new_status: newStatus,
          p_user_role: userRole
        });

      if (error) {
        console.error('SQL validation error:', error);
        return {
          valid: false,
          reason: 'Database validation failed'
        };
      }

      // Cache the result
      this.validationCache.set(cacheKey, {
        result: data,
        timestamp: Date.now()
      });

      return {
        valid: data,
        reason: data ? undefined : 'Transition not allowed by business rules'
      };

    } catch (error) {
      console.error('Error in SQL validation:', error);
      return {
        valid: false,
        reason: 'Validation error'
      };
    }
  }

  /**
   * Validate role permissions for status change
   */
  private validateRolePermissions(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
    userRole: UserRole
  ): StatusTransitionResult {
    try {
      const isValid = isValidTransition(currentStatus, newStatus, userRole);
      const rolePermissions = getRolePermissions(userRole);

      if (!isValid) {
        return {
          valid: false,
          reason: `Role '${userRole}' does not have permission for this status change`
        };
      }

      // Additional role-specific validations
      switch (newStatus) {
        case AppointmentStatus.EN_CURSO:
          if (!rolePermissions.canMarkInProgress) {
            return {
              valid: false,
              reason: 'User does not have permission to mark appointments as in progress'
            };
          }
          break;

        case AppointmentStatus.COMPLETED:
          if (!rolePermissions.canComplete) {
            return {
              valid: false,
              reason: 'User does not have permission to complete appointments'
            };
          }
          break;

        case AppointmentStatus.CANCELADA_PACIENTE:
          if (userRole !== 'patient' && !rolePermissions.canCancel) {
            return {
              valid: false,
              reason: 'Only patients or authorized staff can cancel appointments as patient cancellation'
            };
          }
          break;

        case AppointmentStatus.CANCELADA_CLINICA:
          if (userRole === 'patient') {
            return {
              valid: false,
              reason: 'Patients cannot cancel appointments as clinic cancellation'
            };
          }
          break;
      }

      return { valid: true };

    } catch (error) {
      console.error('Error validating role permissions:', error);
      return {
        valid: false,
        reason: 'Permission validation error'
      };
    }
  }

  /**
   * Get current appointment data
   */
  private async getCurrentAppointment(
    appointmentId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('appointments')
        .select('id, status, patient_id, doctor_id, organization_id')
        .eq('id', appointmentId)
        .single();

      if (error) {
        console.error('Error fetching appointment:', error);
        return {
          success: false,
          error: 'Appointment not found'
        };
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('Error in getCurrentAppointment:', error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  /**
   * Update appointment status in database
   */
  private async updateAppointmentStatus(
    appointmentId: string,
    newStatus: AppointmentStatus
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('appointments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) {
        console.error('Error updating appointment status:', error);
        return {
          success: false,
          error: 'Failed to update appointment status'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error in updateAppointmentStatus:', error);
      return {
        success: false,
        error: 'Database update error'
      };
    }
  }

  /**
   * Log status change to audit trail
   */
  private async logStatusChange(
    params: StatusChangeParams
  ): Promise<{ success: boolean; auditId?: string; error?: string }> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('appointment_status_history')
        .insert({
          appointment_id: params.appointmentId,
          previous_status: params.previousStatus,
          new_status: params.newStatus,
          changed_by: params.changedBy,
          reason: params.reason,
          user_role: params.userRole,
          ip_address: params.metadata?.ipAddress,
          user_agent: params.metadata?.userAgent,
          metadata: params.metadata || {}
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error logging status change:', error);
        return {
          success: false,
          error: 'Failed to log status change'
        };
      }

      return {
        success: true,
        auditId: data.id
      };

    } catch (error) {
      console.error('Error in logStatusChange:', error);
      return {
        success: false,
        error: 'Audit logging error'
      };
    }
  }

  /**
   * Clear validation cache (useful for testing or cache invalidation)
   */
  public clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics (for monitoring and debugging)
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.validationCache.size,
      entries: Array.from(this.validationCache.keys())
    };
  }
}

// Export singleton instance
export default AppointmentStatusService.getInstance();
