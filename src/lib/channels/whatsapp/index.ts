/**
 * WhatsApp Channel Module
 * 
 * Main export file for WhatsApp channel implementation including
 * services, processors, and compatibility wrappers.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ChannelManager, getChannelManager } from '../ChannelManager';
import { WhatsAppChannelService } from './WhatsAppChannelService';
import { WhatsAppMessageProcessor } from './WhatsAppMessageProcessor';
import { WhatsAppAppointmentService } from './WhatsAppAppointmentService';
import { WhatsAppCompatibilityWrapper } from './compatibility-wrappers';

// =====================================================
// EXPORTS
// =====================================================

export { WhatsAppChannelService };
export { WhatsAppMessageProcessor };
export { WhatsAppAppointmentService };
export { WhatsAppCompatibilityWrapper };

// Compatibility exports (for existing system)
export {
  createWhatsAppCompatibilityWrapper,
  createLegacyWhatsAppMessageProcessor,
  createLegacyWhatsAppAppointmentService
} from './compatibility-wrappers';

// =====================================================
// CHANNEL REGISTRATION
// =====================================================

/**
 * Register WhatsApp services with ChannelManager
 */
export function registerWhatsAppChannel(supabase: SupabaseClient, organizationId: string): ChannelManager {
  const manager = getChannelManager(supabase, organizationId);
  
  // Register WhatsApp services
  manager.registerChannelService('whatsapp', WhatsAppChannelService);
  manager.registerMessageProcessor('whatsapp', WhatsAppMessageProcessor);
  manager.registerAppointmentService('whatsapp', WhatsAppAppointmentService);
  
  console.log('✅ WhatsApp channel registered successfully');
  
  return manager;
}

/**
 * Initialize WhatsApp channel with ChannelManager
 */
export function initializeWhatsAppChannel(supabase: SupabaseClient, organizationId: string): {
  manager: ChannelManager;
  channelService: WhatsAppChannelService;
  compatibilityWrapper: WhatsAppCompatibilityWrapper;
} {
  // Register channel
  const manager = registerWhatsAppChannel(supabase, organizationId);
  
  // Get services
  const channelService = manager.getChannelService('whatsapp') as WhatsAppChannelService;
  const compatibilityWrapper = new WhatsAppCompatibilityWrapper(supabase, organizationId);
  
  return {
    manager,
    channelService,
    compatibilityWrapper
  };
}

// =====================================================
// COMPATIBILITY LAYER
// =====================================================

/**
 * Legacy WhatsApp service factory (for backward compatibility)
 * 
 * @deprecated Use ChannelManager.getChannelService('whatsapp') instead
 */
export function createWhatsAppService(supabase: SupabaseClient, organizationId: string): WhatsAppCompatibilityWrapper {
  console.warn('⚠️ createWhatsAppService is deprecated. Use ChannelManager.getChannelService("whatsapp") instead.');
  return new WhatsAppCompatibilityWrapper(supabase, organizationId);
}

/**
 * Legacy message processor factory (for backward compatibility)
 * 
 * @deprecated Use ChannelManager.createMessageProcessor('whatsapp', instance) instead
 */
export function createWhatsAppMessageProcessor(supabase: SupabaseClient, whatsappInstance: any): WhatsAppMessageProcessor {
  console.warn('⚠️ createWhatsAppMessageProcessor is deprecated. Use ChannelManager.createMessageProcessor("whatsapp", instance) instead.');
  
  const wrapper = new WhatsAppCompatibilityWrapper(supabase, whatsappInstance.organization_id);
  return wrapper.createMessageProcessor(whatsappInstance);
}

/**
 * Legacy appointment service factory (for backward compatibility)
 * 
 * @deprecated Use ChannelManager.createAppointmentService('whatsapp', instance) instead
 */
export function createWhatsAppAppointmentService(supabase: SupabaseClient, whatsappInstance: any): WhatsAppAppointmentService {
  console.warn('⚠️ createWhatsAppAppointmentService is deprecated. Use ChannelManager.createAppointmentService("whatsapp", instance) instead.');
  
  const wrapper = new WhatsAppCompatibilityWrapper(supabase, whatsappInstance.organization_id);
  return wrapper.createAppointmentService(whatsappInstance);
}

// =====================================================
// MIGRATION HELPERS
// =====================================================

/**
 * Migrate existing WhatsApp instances to new architecture
 */
export async function migrateExistingWhatsAppInstances(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ migrated: number; errors: string[] }> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    console.log('🔄 Starting WhatsApp instances migration...');

    // Get existing WhatsApp instances
    const { data: existingInstances, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      errors.push(`Failed to fetch existing instances: ${error.message}`);
      return { migrated, errors };
    }

    if (!existingInstances || existingInstances.length === 0) {
      console.log('ℹ️ No existing WhatsApp instances to migrate');
      return { migrated, errors };
    }

    const channelService = new WhatsAppChannelService(supabase, organizationId);

    for (const instance of existingInstances) {
      try {
        // Check if already migrated
        const { data: existingChannelInstance } = await supabase
          .from('channel_instances')
          .select('id')
          .eq('id', instance.id)
          .eq('channel_type', 'whatsapp')
          .single();

        if (existingChannelInstance) {
          console.log(`⏭️ Instance ${instance.instance_name} already migrated`);
          continue;
        }

        // Convert to new format
        const config = {
          auto_reply: true,
          business_hours: {
            enabled: false,
            timezone: 'UTC',
            schedule: {}
          },
          ai_config: {
            enabled: true,
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            max_tokens: 500,
            timeout_seconds: 30
          },
          webhook: {
            url: instance.webhook_url || '',
            secret: '',
            events: ['MESSAGE_RECEIVED']
          },
          limits: {
            max_concurrent_chats: 100,
            message_rate_limit: 60,
            session_timeout_minutes: 30
          },
          whatsapp: {
            phone_number: instance.phone_number || '',
            evolution_api: instance.evolution_api_config || {
              base_url: process.env.EVOLUTION_API_BASE_URL || '',
              api_key: process.env.EVOLUTION_API_KEY || '',
              instance_name: instance.instance_name
            },
            qr_code: {
              enabled: true,
              auto_refresh: true,
              refresh_interval_minutes: 5
            },
            features: {
              read_receipts: true,
              typing_indicator: true,
              presence_update: true
            }
          }
        };

        // Insert into channel_instances table
        const { error: insertError } = await supabase
          .from('channel_instances')
          .insert({
            id: instance.id, // Keep same ID for compatibility
            organization_id: instance.organization_id,
            channel_type: 'whatsapp',
            instance_name: instance.instance_name,
            status: instance.status === 'active' ? 'connected' : 'disconnected',
            config,
            created_at: instance.created_at,
            updated_at: instance.updated_at
          });

        if (insertError) {
          errors.push(`Failed to migrate instance ${instance.instance_name}: ${insertError.message}`);
          continue;
        }

        migrated++;
        console.log(`✅ Migrated instance: ${instance.instance_name}`);

      } catch (instanceError) {
        errors.push(`Error migrating instance ${instance.instance_name}: ${instanceError}`);
      }
    }

    console.log(`🎉 Migration completed: ${migrated} instances migrated, ${errors.length} errors`);

  } catch (error) {
    errors.push(`Migration failed: ${error}`);
  }

  return { migrated, errors };
}

/**
 * Validate migration integrity
 */
export async function validateMigrationIntegrity(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Check if all WhatsApp instances have corresponding channel instances
    const { data: whatsappInstances } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name')
      .eq('organization_id', organizationId);

    const { data: channelInstances } = await supabase
      .from('channel_instances')
      .select('id, instance_name')
      .eq('organization_id', organizationId)
      .eq('channel_type', 'whatsapp');

    const whatsappIds = new Set(whatsappInstances?.map(i => i.id) || []);
    const channelIds = new Set(channelInstances?.map(i => i.id) || []);

    // Check for missing migrations
    for (const id of whatsappIds) {
      if (!channelIds.has(id)) {
        const instance = whatsappInstances?.find(i => i.id === id);
        issues.push(`WhatsApp instance "${instance?.instance_name}" not migrated to channel_instances`);
      }
    }

    // Check for orphaned channel instances
    for (const id of channelIds) {
      if (!whatsappIds.has(id)) {
        const instance = channelInstances?.find(i => i.id === id);
        issues.push(`Channel instance "${instance?.instance_name}" has no corresponding WhatsApp instance`);
      }
    }

  } catch (error) {
    issues.push(`Validation failed: ${error}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export default {
  WhatsAppChannelService,
  WhatsAppMessageProcessor,
  WhatsAppAppointmentService,
  WhatsAppCompatibilityWrapper,
  registerWhatsAppChannel,
  initializeWhatsAppChannel,
  migrateExistingWhatsAppInstances,
  validateMigrationIntegrity
};
