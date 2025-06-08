/**
 * WhatsApp Instance Helper Functions
 * 
 * Utility functions for managing WhatsApp instances, including validation
 * for the one instance per tenant limit and instance status management.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// INSTANCE VALIDATION FUNCTIONS
// =====================================================

/**
 * Check if organization already has a WhatsApp instance
 * 
 * @description Validates the one instance per tenant limit for WhatsApp channels.
 * Used during simplified creation flow to prevent multiple instances.
 * 
 * @param supabase - Supabase client instance
 * @param organizationId - Organization ID to check
 * @returns Promise<boolean> - True if instance exists, false otherwise
 */
export async function hasExistingWhatsAppInstance(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  try {
    const { data: instances, error } = await supabase
      .from('channel_instances')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('channel_type', 'whatsapp')
      .limit(1);

    if (error) {
      console.error('Error checking existing WhatsApp instances:', error);
      return false;
    }

    return instances && instances.length > 0;
  } catch (error) {
    console.error('Unexpected error checking WhatsApp instances:', error);
    return false;
  }
}

/**
 * Get lightweight WhatsApp instances for organization
 *
 * @description Retrieves basic instance information for validation purposes.
 * Used to check instance limits and display basic instance data.
 *
 * @param supabase - Supabase client instance
 * @param organizationId - Organization ID to query (null for all organizations - superadmin only)
 * @returns Promise<Array> - Array of basic instance data
 */
export async function getWhatsAppInstancesLightweight(
  supabase: SupabaseClient,
  organizationId: string | null
) {
  try {
    // Build query based on organization scope
    let query = supabase
      .from('channel_instances')
      .select(`
        id,
        instance_name,
        status,
        created_at,
        organization_id,
        config
      `)
      .eq('channel_type', 'whatsapp')
      .order('created_at', { ascending: false });

    // Apply organization filter only if organizationId is provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: instances, error } = await query;

    if (error) {
      console.error('Error fetching WhatsApp instances:', error);
      return [];
    }

    return instances || [];
  } catch (error) {
    console.error('Unexpected error fetching WhatsApp instances:', error);
    return [];
  }
}

/**
 * Validate instance creation permissions
 * 
 * @description Checks if user has permission to create WhatsApp instances
 * based on role and existing instance limits.
 * 
 * @param userRole - User's role (admin, superadmin, etc.)
 * @param organizationId - Organization ID
 * @param supabase - Supabase client instance
 * @returns Promise<{canCreate: boolean, reason?: string}> - Validation result
 */
export async function validateInstanceCreationPermissions(
  userRole: string,
  organizationId: string,
  supabase: SupabaseClient
): Promise<{ canCreate: boolean; reason?: string }> {
  // Check role permissions
  if (!['admin', 'superadmin'].includes(userRole)) {
    return {
      canCreate: false,
      reason: 'Solo los administradores pueden crear instancias de WhatsApp'
    };
  }

  // For non-superadmin users, check instance limit
  if (userRole !== 'superadmin') {
    const hasExisting = await hasExistingWhatsAppInstance(supabase, organizationId);
    if (hasExisting) {
      return {
        canCreate: false,
        reason: 'Solo se permite una instancia de WhatsApp por organización. Elimina la instancia existente para crear una nueva.'
      };
    }
  }

  return { canCreate: true };
}

// =====================================================
// INSTANCE STATUS HELPERS
// =====================================================

/**
 * Get user-friendly status information
 * 
 * @description Converts technical status codes to user-friendly messages
 * with appropriate styling and descriptions.
 * 
 * @param status - Technical status code
 * @param errorMessage - Optional error message
 * @returns Object with display information
 */
export function getInstanceStatusInfo(status: string, errorMessage?: string | null) {
  const statusMap: Record<string, {
    label: string;
    description: string;
    color: 'green' | 'yellow' | 'red' | 'gray' | 'blue';
    icon: string;
  }> = {
    connected: {
      label: 'Conectado',
      description: 'La instancia está conectada y funcionando correctamente',
      color: 'green',
      icon: '✅'
    },
    connecting: {
      label: 'Conectando',
      description: 'La instancia se está conectando a WhatsApp',
      color: 'yellow',
      icon: '🔄'
    },
    disconnected: {
      label: 'Desconectado',
      description: 'La instancia está desconectada. Escanea el código QR para conectar',
      color: 'gray',
      icon: '⚪'
    },
    waiting_qr_scan: {
      label: 'Esperando QR',
      description: 'Escanea el código QR con WhatsApp para completar la conexión',
      color: 'blue',
      icon: '📱'
    },
    error: {
      label: 'Error',
      description: errorMessage || 'Ha ocurrido un error con la instancia',
      color: 'red',
      icon: '❌'
    },
    suspended: {
      label: 'Suspendido',
      description: 'La instancia ha sido suspendida temporalmente',
      color: 'red',
      icon: '⏸️'
    }
  };

  return statusMap[status] || {
    label: 'Estado desconocido',
    description: 'El estado de la instancia no es reconocido',
    color: 'gray' as const,
    icon: '❓'
  };
}

/**
 * Check if instance requires QR code scan
 * 
 * @description Determines if the instance needs QR code authentication
 * based on its current status.
 * 
 * @param status - Current instance status
 * @returns boolean - True if QR scan is required
 */
export function requiresQRScan(status: string): boolean {
  return ['disconnected', 'waiting_qr_scan', 'error'].includes(status);
}

/**
 * Check if instance is operational
 * 
 * @description Determines if the instance can send/receive messages
 * based on its current status.
 * 
 * @param status - Current instance status
 * @returns boolean - True if instance is operational
 */
export function isInstanceOperational(status: string): boolean {
  return status === 'connected';
}

/**
 * Check if instance is in transition state
 * 
 * @description Determines if the instance is currently changing states
 * (connecting, disconnecting, etc.)
 * 
 * @param status - Current instance status
 * @returns boolean - True if instance is in transition
 */
export function isInstanceInTransition(status: string): boolean {
  return ['connecting', 'disconnecting', 'restarting'].includes(status);
}

// =====================================================
// INSTANCE CONFIGURATION HELPERS
// =====================================================

/**
 * Extract phone number from instance configuration
 * 
 * @description Safely extracts the phone number from instance config
 * with fallback handling for different config structures.
 * 
 * @param config - Instance configuration object
 * @returns string | null - Phone number or null if not found
 */
export function extractPhoneNumber(config: any): string | null {
  try {
    // Try different possible paths for phone number
    return config?.whatsapp?.phone_number || 
           config?.phone_number || 
           config?.whatsapp_config?.phone_number || 
           null;
  } catch (error) {
    console.warn('Error extracting phone number from config:', error);
    return null;
  }
}

/**
 * Extract Evolution API instance name from configuration
 * 
 * @description Safely extracts the Evolution API instance name from config
 * with fallback handling for different config structures.
 * 
 * @param config - Instance configuration object
 * @returns string | null - Instance name or null if not found
 */
export function extractEvolutionInstanceName(config: any): string | null {
  try {
    return config?.whatsapp?.evolution_api?.instance_name || 
           config?.evolution_api?.instance_name || 
           null;
  } catch (error) {
    console.warn('Error extracting Evolution API instance name from config:', error);
    return null;
  }
}

/**
 * Check if instance has AI bot enabled
 * 
 * @description Determines if the AI bot is enabled for the instance
 * based on configuration settings.
 * 
 * @param config - Instance configuration object
 * @returns boolean - True if AI bot is enabled
 */
export function hasAIBotEnabled(config: any): boolean {
  try {
    return config?.ai_config?.enabled === true;
  } catch (error) {
    console.warn('Error checking AI bot status from config:', error);
    return false;
  }
}

export default {
  hasExistingWhatsAppInstance,
  getWhatsAppInstancesLightweight,
  validateInstanceCreationPermissions,
  getInstanceStatusInfo,
  requiresQRScan,
  isInstanceOperational,
  isInstanceInTransition,
  extractPhoneNumber,
  extractEvolutionInstanceName,
  hasAIBotEnabled
};
