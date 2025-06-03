/**
 * WhatsApp Compatibility Wrappers
 * 
 * Wrapper functions to maintain compatibility with existing WhatsApp system
 * while migrating to the new multi-channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  WhatsAppInstance,
  WhatsAppConversation,
  WhatsAppMessage,
  MessageProcessingResult
} from '@/types/whatsapp';
import type { ChannelInstance, ChannelInstanceConfig } from '@/types/channels';
import { WhatsAppChannelService } from './WhatsAppChannelService';
import { WhatsAppMessageProcessor } from './WhatsAppMessageProcessor';
import { WhatsAppAppointmentService } from './WhatsAppAppointmentService';

// =====================================================
// COMPATIBILITY WRAPPER CLASS
// =====================================================

/**
 * WhatsAppCompatibilityWrapper
 * 
 * Provides backward compatibility for existing WhatsApp system
 * while using the new multi-channel architecture underneath.
 */
export class WhatsAppCompatibilityWrapper {
  private supabase: SupabaseClient;
  private organizationId: string;
  private channelService: WhatsAppChannelService;

  constructor(supabase: SupabaseClient, organizationId: string) {
    this.supabase = supabase;
    this.organizationId = organizationId;
    this.channelService = new WhatsAppChannelService(supabase, organizationId);
  }

  // =====================================================
  // INSTANCE MANAGEMENT WRAPPERS
  // =====================================================

  /**
   * Create WhatsApp instance (legacy interface)
   */
  async createInstance(config: {
    instanceName: string;
    phoneNumber: string;
    businessId?: string;
    webhookUrl: string;
    webhookSecret?: string;
    webhookEvents?: string[];
    autoReply?: boolean;
    businessHours?: any;
    evolutionApiUrl?: string;
    evolutionApiKey?: string;
    maxConcurrentChats?: number;
  }): Promise<WhatsAppInstance> {
    return await this.channelService.createWhatsAppInstance(this.organizationId, config);
  }

  /**
   * Get WhatsApp instances (legacy interface)
   */
  async getInstances(): Promise<WhatsAppInstance[]> {
    try {
      const instances = await this.channelService.getInstances(this.organizationId);
      
      // Convert to legacy format
      return instances.map(instance => this.convertToLegacyInstance(instance));
    } catch (error) {
      console.error('Error getting WhatsApp instances:', error);
      return [];
    }
  }

  /**
   * Get instance by ID (legacy interface)
   */
  async getInstance(instanceId: string): Promise<WhatsAppInstance | null> {
    try {
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('channel_type', 'whatsapp')
        .eq('organization_id', this.organizationId)
        .single();

      if (!instance) return null;

      return this.convertToLegacyInstance(instance);
    } catch (error) {
      console.error('Error getting WhatsApp instance:', error);
      return null;
    }
  }

  /**
   * Update instance (legacy interface)
   */
  async updateInstance(instanceId: string, updates: Partial<any>): Promise<WhatsAppInstance> {
    try {
      // Convert legacy updates to unified format
      const unifiedUpdates: Partial<ChannelInstanceConfig> = {};
      
      if (updates.autoReply !== undefined) {
        unifiedUpdates.auto_reply = updates.autoReply;
      }
      
      if (updates.businessHours !== undefined) {
        unifiedUpdates.business_hours = updates.businessHours;
      }

      if (updates.webhookUrl !== undefined) {
        unifiedUpdates.webhook = {
          url: updates.webhookUrl,
          secret: updates.webhookSecret || '',
          events: updates.webhookEvents || ['MESSAGE_RECEIVED']
        };
      }

      // Update using unified service
      const updatedInstance = await this.channelService.updateInstance(instanceId, unifiedUpdates);
      
      return this.convertToLegacyInstance(updatedInstance);
    } catch (error) {
      console.error('Error updating WhatsApp instance:', error);
      throw error;
    }
  }

  /**
   * Delete instance (legacy interface)
   */
  async deleteInstance(instanceId: string): Promise<void> {
    return await this.channelService.deleteInstance(instanceId);
  }

  /**
   * Get instance status (legacy interface)
   */
  async getInstanceStatus(instanceId: string): Promise<string> {
    try {
      const status = await this.channelService.getInstanceStatus(instanceId);
      
      // Map unified status to legacy status
      const statusMap = {
        'connected': 'active',
        'disconnected': 'inactive',
        'connecting': 'connecting',
        'error': 'error',
        'suspended': 'suspended',
        'maintenance': 'inactive'
      };

      return statusMap[status] || 'inactive';
    } catch (error) {
      console.error('Error getting instance status:', error);
      return 'error';
    }
  }

  // =====================================================
  // MESSAGE PROCESSING WRAPPERS
  // =====================================================

  /**
   * Create message processor (legacy interface)
   */
  createMessageProcessor(whatsappInstance: WhatsAppInstance): WhatsAppMessageProcessor {
    const channelInstance = this.convertToChannelInstance(whatsappInstance);
    return new WhatsAppMessageProcessor(this.supabase, channelInstance);
  }

  /**
   * Create appointment service (legacy interface)
   */
  createAppointmentService(whatsappInstance: WhatsAppInstance): WhatsAppAppointmentService {
    const channelInstance = this.convertToChannelInstance(whatsappInstance);
    return new WhatsAppAppointmentService(this.supabase, channelInstance);
  }

  // =====================================================
  // EVOLUTION API WRAPPERS
  // =====================================================

  /**
   * Get QR code (legacy interface)
   */
  async getQRCode(instanceId: string): Promise<{ qrCode?: string; status: string }> {
    return await this.channelService.getQRCode(instanceId);
  }

  /**
   * Restart instance (legacy interface)
   */
  async restartInstance(instanceId: string): Promise<void> {
    return await this.channelService.restartInstance(instanceId);
  }

  /**
   * Connect instance (legacy interface)
   */
  async connectInstance(instanceId: string): Promise<void> {
    const { data: instance } = await this.supabase
      .from('channel_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (instance) {
      await this.channelService.connect(instance);
    }
  }

  /**
   * Disconnect instance (legacy interface)
   */
  async disconnectInstance(instanceId: string): Promise<void> {
    return await this.channelService.disconnect(instanceId);
  }

  // =====================================================
  // CONVERSION HELPERS
  // =====================================================

  /**
   * Convert ChannelInstance to legacy WhatsAppInstance
   */
  private convertToLegacyInstance(instance: ChannelInstance): WhatsAppInstance {
    const whatsappConfig = instance.config.whatsapp;
    
    return {
      id: instance.id,
      organization_id: instance.organization_id,
      instance_name: instance.instance_name,
      phone_number: whatsappConfig?.phone_number || '',
      status: this.mapStatusToLegacy(instance.status),
      evolution_api_config: whatsappConfig?.evolution_api,
      webhook_url: instance.config.webhook.url,
      created_at: instance.created_at,
      updated_at: instance.updated_at
    } as WhatsAppInstance;
  }

  /**
   * Convert legacy WhatsAppInstance to ChannelInstance
   */
  private convertToChannelInstance(whatsappInstance: WhatsAppInstance): ChannelInstance {
    return {
      id: whatsappInstance.id,
      organization_id: whatsappInstance.organization_id,
      channel_type: 'whatsapp',
      instance_name: whatsappInstance.instance_name,
      status: this.mapStatusFromLegacy(whatsappInstance.status),
      config: {
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
          url: whatsappInstance.webhook_url || '',
          secret: '',
          events: ['MESSAGE_RECEIVED']
        },
        limits: {
          max_concurrent_chats: 100,
          message_rate_limit: 60,
          session_timeout_minutes: 30
        },
        whatsapp: {
          phone_number: whatsappInstance.phone_number,
          evolution_api: whatsappInstance.evolution_api_config || {
            base_url: '',
            api_key: '',
            instance_name: whatsappInstance.instance_name
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
      },
      created_at: whatsappInstance.created_at,
      updated_at: whatsappInstance.updated_at
    };
  }

  /**
   * Map unified status to legacy status
   */
  private mapStatusToLegacy(status: string): any {
    const statusMap = {
      'connected': 'active',
      'disconnected': 'inactive',
      'connecting': 'connecting',
      'error': 'error',
      'suspended': 'suspended',
      'maintenance': 'inactive'
    };

    return statusMap[status] || 'inactive';
  }

  /**
   * Map legacy status to unified status
   */
  private mapStatusFromLegacy(status: any): any {
    const statusMap = {
      'active': 'connected',
      'inactive': 'disconnected',
      'connecting': 'connecting',
      'error': 'error',
      'suspended': 'suspended'
    };

    return statusMap[status] || 'disconnected';
  }
}

// =====================================================
// FACTORY FUNCTIONS FOR COMPATIBILITY
// =====================================================

/**
 * Create compatibility wrapper instance
 */
export function createWhatsAppCompatibilityWrapper(
  supabase: SupabaseClient, 
  organizationId: string
): WhatsAppCompatibilityWrapper {
  return new WhatsAppCompatibilityWrapper(supabase, organizationId);
}

/**
 * Get legacy WhatsApp message processor (compatibility)
 */
export function createLegacyWhatsAppMessageProcessor(
  supabase: SupabaseClient,
  whatsappInstance: WhatsAppInstance
): WhatsAppMessageProcessor {
  const wrapper = new WhatsAppCompatibilityWrapper(supabase, whatsappInstance.organization_id);
  return wrapper.createMessageProcessor(whatsappInstance);
}

/**
 * Get legacy WhatsApp appointment service (compatibility)
 */
export function createLegacyWhatsAppAppointmentService(
  supabase: SupabaseClient,
  whatsappInstance: WhatsAppInstance
): WhatsAppAppointmentService {
  const wrapper = new WhatsAppCompatibilityWrapper(supabase, whatsappInstance.organization_id);
  return wrapper.createAppointmentService(whatsappInstance);
}

export default WhatsAppCompatibilityWrapper;
