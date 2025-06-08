/**
 * WhatsApp Retry Service
 * 
 * Handles retry mechanisms for failed WhatsApp notifications with exponential backoff,
 * maximum retry limits, and comprehensive error tracking. Integrates with the notification
 * system to ensure reliable message delivery.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import { WhatsAppNotificationService } from './WhatsAppNotificationService';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface FailedNotification {
  id: string;
  appointmentId: string;
  patientPhone: string;
  templateId: string;
  status: string;
  retryCount: number;
  lastError: string;
  sentAt: string;
}

export interface RetryResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 60000, // 1 minute
  maxDelayMs: 3600000, // 1 hour
  backoffMultiplier: 2
};

// =====================================================
// WHATSAPP RETRY SERVICE
// =====================================================

/**
 * WhatsApp Retry Service Class
 * 
 * @description Manages retry logic for failed WhatsApp notifications
 * with intelligent backoff and error handling.
 */
export class WhatsAppRetryService {
  private supabase: any;
  private notificationService: WhatsAppNotificationService;
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.supabase = createClient();
    this.notificationService = new WhatsAppNotificationService(this.supabase);
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  // =====================================================
  // RETRY PROCESSING
  // =====================================================

  /**
   * Process all failed notifications eligible for retry
   */
  async processRetries(): Promise<RetryResult> {
    try {
      console.log('🔄 Starting WhatsApp notification retry process...');

      // Get failed notifications eligible for retry
      const failedNotifications = await this.getFailedNotifications();
      
      if (failedNotifications.length === 0) {
        console.log('✅ No failed notifications to retry');
        return {
          processed: 0,
          successful: 0,
          failed: 0,
          errors: []
        };
      }

      console.log(`📱 Found ${failedNotifications.length} failed notifications to retry`);

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each failed notification
      for (const notification of failedNotifications) {
        try {
          const retryResult = await this.retryNotification(notification);
          
          if (retryResult.success) {
            successful++;
            console.log(`✅ Retry successful for notification ${notification.id}`);
          } else {
            failed++;
            errors.push(`Notification ${notification.id}: ${retryResult.error}`);
            console.error(`❌ Retry failed for notification ${notification.id}:`, retryResult.error);
          }

          // Add delay between retries to avoid overwhelming the API
          await this.delay(1000);

        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Notification ${notification.id}: ${errorMessage}`);
          console.error(`❌ Error processing retry for notification ${notification.id}:`, error);
        }
      }

      console.log(`🔄 Retry process completed: ${successful} successful, ${failed} failed`);

      return {
        processed: failedNotifications.length,
        successful,
        failed,
        errors
      };

    } catch (error) {
      console.error('❌ Error in retry process:', error);
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Retry a specific failed notification
   */
  async retryNotification(notification: FailedNotification): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if notification has exceeded max retries
      if (notification.retryCount >= this.config.maxRetries) {
        await this.markAsMaxRetriesExceeded(notification.id);
        return {
          success: false,
          error: `Max retries (${this.config.maxRetries}) exceeded`
        };
      }

      // Calculate delay for exponential backoff
      const delay = this.calculateBackoffDelay(notification.retryCount);
      const timeSinceLastAttempt = Date.now() - new Date(notification.sentAt).getTime();

      if (timeSinceLastAttempt < delay) {
        return {
          success: false,
          error: `Too early to retry (need to wait ${Math.ceil((delay - timeSinceLastAttempt) / 1000)}s more)`
        };
      }

      // Get appointment context for retry
      const context = await this.getAppointmentContext(notification.appointmentId);
      if (!context) {
        await this.markAsContextError(notification.id);
        return {
          success: false,
          error: 'Appointment context not found'
        };
      }

      // Update retry count before attempting
      await this.incrementRetryCount(notification.id);

      // Attempt to send notification
      const result = await this.notificationService.sendAppointmentNotification(context);

      if (result.success) {
        // Mark as successful
        await this.markAsSuccessful(notification.id, result.messageId);
        return { success: true };
      } else {
        // Update with new error
        await this.updateRetryError(notification.id, result.error || 'Unknown error');
        return {
          success: false,
          error: result.error || 'Unknown error'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateRetryError(notification.id, errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // =====================================================
  // DATABASE OPERATIONS
  // =====================================================

  /**
   * Get failed notifications eligible for retry
   */
  private async getFailedNotifications(): Promise<FailedNotification[]> {
    const { data, error } = await this.supabase
      .rpc('retry_failed_whatsapp_notifications', {
        p_max_retries: this.config.maxRetries,
        p_retry_after_minutes: Math.ceil(this.config.baseDelayMs / 60000)
      });

    if (error) {
      console.error('❌ Error getting failed notifications:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get appointment context for notification retry
   */
  private async getAppointmentContext(appointmentId: string): Promise<any> {
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
      console.error('❌ Error getting appointment context for retry:', error);
      return null;
    }
  }

  /**
   * Increment retry count for a notification
   */
  private async incrementRetryCount(notificationId: string): Promise<void> {
    await this.supabase
      .from('whatsapp_notifications')
      .update({
        retry_count: this.supabase.raw('retry_count + 1'),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
  }

  /**
   * Mark notification as successful
   */
  private async markAsSuccessful(notificationId: string, messageId?: string): Promise<void> {
    await this.supabase
      .from('whatsapp_notifications')
      .update({
        success: true,
        message_id: messageId,
        error_message: null,
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
  }

  /**
   * Update retry error message
   */
  private async updateRetryError(notificationId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from('whatsapp_notifications')
      .update({
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
  }

  /**
   * Mark notification as max retries exceeded
   */
  private async markAsMaxRetriesExceeded(notificationId: string): Promise<void> {
    await this.supabase
      .from('whatsapp_notifications')
      .update({
        error_message: `Max retries (${this.config.maxRetries}) exceeded`,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
  }

  /**
   * Mark notification as context error
   */
  private async markAsContextError(notificationId: string): Promise<void> {
    await this.supabase
      .from('whatsapp_notifications')
      .update({
        error_message: 'Appointment context not found',
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, retryCount);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
   */
  async getRetryStatistics(organizationId?: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_whatsapp_notification_stats', {
          p_organization_id: organizationId,
          p_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          p_end_date: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error getting retry statistics:', error);
        return null;
      }

      return data?.[0] || null;

    } catch (error) {
      console.error('❌ Error getting retry statistics:', error);
      return null;
    }
  }
}
