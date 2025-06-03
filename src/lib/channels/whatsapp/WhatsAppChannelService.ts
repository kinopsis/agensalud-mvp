/**
 * WhatsApp Channel Service
 * 
 * WhatsApp-specific implementation of BaseChannelService that integrates
 * with Evolution API v2 for WhatsApp Business API functionality.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChannelType,
  ChannelInstance,
  ChannelInstanceConfig,
  ChannelStatus,
  IncomingMessage,
  OutgoingMessage,
  MessageProcessingResult,
  WhatsAppChannelConfig
} from '@/types/channels';
import { BaseChannelService } from '../core/BaseChannelService';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import type { WhatsAppInstance } from '@/types/whatsapp';

// =====================================================
// WHATSAPP CHANNEL SERVICE
// =====================================================

/**
 * WhatsAppChannelService
 * 
 * Manages WhatsApp instances using Evolution API v2 integration.
 * Extends BaseChannelService with WhatsApp-specific functionality.
 */
export class WhatsAppChannelService extends BaseChannelService {
  private evolutionAPI: ReturnType<typeof createEvolutionAPIService>;

  constructor(supabase: SupabaseClient, organizationId: string) {
    super(supabase, organizationId);
    this.evolutionAPI = createEvolutionAPIService();
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
   * Validate WhatsApp-specific configuration
   */
  async validateConfig(config: ChannelInstanceConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate common configuration
    if (!config.ai_config?.enabled && !config.auto_reply) {
      errors.push('Either AI or auto-reply must be enabled');
    }

    // Validate WhatsApp-specific configuration
    const whatsappConfig = config.whatsapp;
    if (!whatsappConfig) {
      errors.push('WhatsApp configuration is required');
      return { valid: false, errors };
    }

    if (!whatsappConfig.phone_number || !whatsappConfig.phone_number.match(/^\+\d{10,15}$/)) {
      errors.push('Valid phone number is required (format: +1234567890)');
    }

    if (!whatsappConfig.evolution_api?.instance_name || whatsappConfig.evolution_api.instance_name.length < 3) {
      errors.push('Evolution API instance name must be at least 3 characters');
    }

    if (!whatsappConfig.evolution_api?.base_url || !whatsappConfig.evolution_api.base_url.match(/^https?:\/\//)) {
      errors.push('Valid Evolution API base URL is required');
    }

    if (!whatsappConfig.evolution_api?.api_key || whatsappConfig.evolution_api.api_key.length < 10) {
      errors.push('Evolution API key is required');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Connect to Evolution API and create WhatsApp instance
   */
  async connect(instance: ChannelInstance): Promise<void> {
    try {
      const whatsappConfig = instance.config.whatsapp;
      if (!whatsappConfig) {
        throw new Error('WhatsApp configuration not found');
      }

      console.log(`🔗 Connecting WhatsApp instance: ${instance.instance_name}`);

      // Create instance in Evolution API
      const evolutionResponse = await this.evolutionAPI.createInstance({
        instanceName: whatsappConfig.evolution_api.instance_name,
        integration: 'WHATSAPP-BUSINESS',
        qrcode: whatsappConfig.qr_code?.enabled || true,
        webhook: instance.config.webhook.url,
        webhookByEvents: true,
        webhookBase64: false,
        events: instance.config.webhook.events || ['MESSAGE_RECEIVED', 'CONNECTION_UPDATE', 'QR_UPDATED']
      });

      // Update instance with Evolution API data
      await this.supabase
        .from('channel_instances')
        .update({
          status: 'connecting',
          config: {
            ...instance.config,
            whatsapp: {
              ...whatsappConfig,
              evolution_instance_id: evolutionResponse.instance?.instanceName,
              evolution_status: evolutionResponse.instance?.status
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', instance.id);

      // Log connection attempt
      await this.logActivity(instance.id, 'connection_initiated', {
        evolutionInstanceName: whatsappConfig.evolution_api.instance_name,
        evolutionStatus: evolutionResponse.instance?.status
      });

      console.log(`✅ WhatsApp instance connected: ${instance.instance_name}`);

    } catch (error) {
      console.error(`❌ Failed to connect WhatsApp instance ${instance.instance_name}:`, error);
      
      await this.updateInstanceStatus(instance.id, 'error', error instanceof Error ? error.message : 'Connection failed');
      
      throw error;
    }
  }

  /**
   * Disconnect from Evolution API
   */
  async disconnect(instanceId: string): Promise<void> {
    try {
      // Get instance configuration
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (!instance || !instance.config.whatsapp) {
        throw new Error('WhatsApp instance not found');
      }

      const whatsappConfig = instance.config.whatsapp;
      
      console.log(`🔌 Disconnecting WhatsApp instance: ${instance.instance_name}`);

      // Logout from Evolution API
      await this.evolutionAPI.logoutInstance(whatsappConfig.evolution_api.instance_name);

      // Update instance status
      await this.updateInstanceStatus(instanceId, 'disconnected');

      // Log disconnection
      await this.logActivity(instanceId, 'disconnection_completed', {
        evolutionInstanceName: whatsappConfig.evolution_api.instance_name
      });

      console.log(`✅ WhatsApp instance disconnected: ${instance.instance_name}`);

    } catch (error) {
      console.error(`❌ Failed to disconnect WhatsApp instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Send message through Evolution API
   */
  async sendMessage(instanceId: string, message: OutgoingMessage): Promise<void> {
    try {
      // Get instance configuration
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (!instance || !instance.config.whatsapp) {
        throw new Error('WhatsApp instance not found');
      }

      const whatsappConfig = instance.config.whatsapp;
      
      // Extract phone number from conversation_id (assuming format: phone@s.whatsapp.net)
      const phoneNumber = message.conversation_id.replace('@s.whatsapp.net', '');

      // Send message via Evolution API
      await this.evolutionAPI.sendMessage(whatsappConfig.evolution_api.instance_name, {
        number: phoneNumber,
        text: message.content.text || '',
        delay: 1000
      });

      // Log message sent
      await this.logActivity(instanceId, 'message_sent', {
        conversationId: message.conversation_id,
        messageType: message.content.type,
        hasMedia: !!message.content.media_url
      });

    } catch (error) {
      console.error(`❌ Failed to send WhatsApp message:`, error);
      throw error;
    }
  }

  /**
   * Process incoming message (delegated to WhatsAppMessageProcessor)
   */
  async processIncomingMessage(message: IncomingMessage): Promise<MessageProcessingResult> {
    try {
      // This will be handled by the migrated WhatsAppMessageProcessor
      // For now, return a basic response
      return {
        success: true,
        intent: 'unknown',
        entities: {},
        response: 'Message received',
        next_actions: ['process_with_ai'],
        confidence: 0.5
      };
    } catch (error) {
      console.error('Error processing incoming WhatsApp message:', error);
      return {
        success: false,
        intent: 'unknown',
        entities: {},
        response: 'Error processing message',
        next_actions: ['escalate_to_human'],
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get real-time status from Evolution API
   */
  async getExternalStatus(instanceId: string): Promise<ChannelStatus> {
    try {
      // Get instance configuration
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (!instance || !instance.config.whatsapp) {
        return 'error';
      }

      const whatsappConfig = instance.config.whatsapp;
      
      // Check status via Evolution API
      const status = await this.evolutionAPI.getInstanceStatus(whatsappConfig.evolution_api.instance_name);
      
      // Map Evolution API status to ChannelStatus
      switch (status.instance?.state) {
        case 'open':
          return 'connected';
        case 'connecting':
          return 'connecting';
        case 'close':
          return 'disconnected';
        default:
          return 'error';
      }

    } catch (error) {
      console.error(`Error getting WhatsApp instance status:`, error);
      return 'error';
    }
  }

  // =====================================================
  // WHATSAPP-SPECIFIC METHODS
  // =====================================================

  /**
   * Get QR code for WhatsApp connection
   */
  async getQRCode(instanceId: string): Promise<{ qrCode?: string; status: string }> {
    try {
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (!instance || !instance.config.whatsapp) {
        throw new Error('WhatsApp instance not found');
      }

      const whatsappConfig = instance.config.whatsapp;
      
      // Get QR code from Evolution API
      const qrResponse = await this.evolutionAPI.getQRCode(whatsappConfig.evolution_api.instance_name);
      
      return {
        qrCode: qrResponse.base64,
        status: qrResponse.pairingCode ? 'pairing_available' : 'qr_available'
      };

    } catch (error) {
      console.error('Error getting QR code:', error);
      return {
        status: 'error'
      };
    }
  }

  /**
   * Restart WhatsApp instance
   */
  async restartInstance(instanceId: string): Promise<void> {
    try {
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .single();

      if (!instance || !instance.config.whatsapp) {
        throw new Error('WhatsApp instance not found');
      }

      const whatsappConfig = instance.config.whatsapp;
      
      // Restart via Evolution API
      await this.evolutionAPI.restartInstance(whatsappConfig.evolution_api.instance_name);
      
      // Update status
      await this.updateInstanceStatus(instanceId, 'connecting');
      
      // Log restart
      await this.logActivity(instanceId, 'instance_restarted', {
        evolutionInstanceName: whatsappConfig.evolution_api.instance_name
      });

    } catch (error) {
      console.error('Error restarting WhatsApp instance:', error);
      throw error;
    }
  }

  // =====================================================
  // COMPATIBILITY METHODS (for existing WhatsApp system)
  // =====================================================

  /**
   * Create WhatsApp instance (compatibility wrapper)
   */
  async createWhatsAppInstance(organizationId: string, config: any): Promise<WhatsAppInstance> {
    // Convert old config format to new unified format
    const unifiedConfig: ChannelInstanceConfig = {
      auto_reply: config.autoReply || false,
      business_hours: config.businessHours || {
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
        url: config.webhookUrl || '',
        secret: config.webhookSecret || '',
        events: config.webhookEvents || ['MESSAGE_RECEIVED']
      },
      limits: {
        max_concurrent_chats: config.maxConcurrentChats || 100,
        message_rate_limit: 60,
        session_timeout_minutes: 30
      },
      whatsapp: {
        phone_number: config.phoneNumber || '',
        business_id: config.businessId,
        evolution_api: {
          base_url: config.evolutionApiUrl || process.env.EVOLUTION_API_BASE_URL || '',
          api_key: config.evolutionApiKey || process.env.EVOLUTION_API_KEY || '',
          instance_name: config.instanceName || `agentsalud-${Date.now()}`
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

    // Create using unified method
    const instance = await this.createInstance(organizationId, unifiedConfig);
    
    // Return in old format for compatibility
    return {
      id: instance.id,
      organization_id: instance.organization_id,
      instance_name: instance.instance_name,
      phone_number: unifiedConfig.whatsapp?.phone_number || '',
      status: instance.status as any,
      evolution_api_config: unifiedConfig.whatsapp?.evolution_api,
      webhook_url: unifiedConfig.webhook.url,
      created_at: instance.created_at,
      updated_at: instance.updated_at
    } as WhatsAppInstance;
  }
}
