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

    console.log('🔍 WhatsApp validation - Full config:', JSON.stringify(config, null, 2));
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

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

    console.log('🔍 WhatsApp config:', JSON.stringify(whatsappConfig, null, 2));

    // Enhanced phone number validation with development mode support
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isQRCodeFlow = !whatsappConfig.phone_number || whatsappConfig.phone_number.trim() === '';

    console.log('🔍 Validation context:', {
      isDevelopment,
      isQRCodeFlow,
      phoneNumber: whatsappConfig.phone_number,
      phoneNumberLength: whatsappConfig.phone_number?.length
    });

    if (isDevelopment && isQRCodeFlow) {
      // Development mode with QR-only flow - phone number is optional
      console.log('🔧 Development mode: Allowing QR-only flow without phone number validation');
    } else {
      // Require phone number in production or when explicitly provided
      console.log('🔍 Checking phone number validation...');
      if (!whatsappConfig.phone_number || !whatsappConfig.phone_number.match(/^\+\d{10,15}$/)) {
        console.log('❌ Phone number validation failed');
        errors.push('Valid phone number is required (format: +1234567890)');
      } else {
        console.log('✅ Phone number validation passed');
      }
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

      // Create instance in Evolution API with confirmed minimal format
      const evolutionResponse = await this.evolutionAPI.createInstance({
        instanceName: whatsappConfig.evolution_api.instance_name,
        integration: 'WHATSAPP-BAILEYS' // Confirmed working integration type
        // Note: Using minimal payload format confirmed working with https://evo.torrecentral.com
      });

      // Configure webhook separately after instance creation
      if (instance.config.webhook.url) {
        try {
          await this.evolutionAPI.configureWebhook(whatsappConfig.evolution_api.instance_name, {
            url: instance.config.webhook.url,
            webhook_by_events: false,
            webhook_base64: false,
            events: instance.config.webhook.events || [
              'QRCODE_UPDATED',
              'MESSAGES_UPSERT',
              'CONNECTION_UPDATE'
            ]
          });
          console.log('✅ Webhook configured successfully for instance:', whatsappConfig.evolution_api.instance_name);
        } catch (webhookError) {
          console.warn('⚠️ Failed to configure webhook, continuing without webhook:', webhookError);
        }
      }

      // Also configure QR code specific webhook
      try {
        const qrWebhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/evolution/qrcode`;
        await this.evolutionAPI.configureWebhook(whatsappConfig.evolution_api.instance_name, {
          url: qrWebhookUrl,
          webhook_by_events: true,
          webhook_base64: true,
          events: ['QRCODE_UPDATED']
        });
        console.log('✅ QR code webhook configured successfully:', qrWebhookUrl);
      } catch (qrWebhookError) {
        console.warn('⚠️ Failed to configure QR code webhook:', qrWebhookError);
      }

      // Update instance with Evolution API data
      await this.supabase
        .from('channel_instances')
        .update({
          status: 'connecting',
          config: {
            ...instance.config,
            whatsapp: {
              ...whatsappConfig,
              evolution_instance_id: evolutionResponse.instance?.instanceId, // Use new instanceId field
              evolution_instance_name: evolutionResponse.instance?.instanceName,
              evolution_status: evolutionResponse.instance?.status,
              evolution_integration: evolutionResponse.instance?.integration
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', instance.id);

      // Log connection attempt with enhanced data
      await this.logActivity(instance.id, 'connection_initiated', {
        evolutionInstanceName: whatsappConfig.evolution_api.instance_name,
        evolutionInstanceId: evolutionResponse.instance?.instanceId,
        evolutionStatus: evolutionResponse.instance?.status,
        evolutionIntegration: evolutionResponse.instance?.integration,
        apiEndpoint: this.evolutionAPI.config.baseUrl
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
      // Only log error if it's not a "Not Found" error to reduce log spam
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('Not Found')) {
        console.error(`Error getting WhatsApp instance status:`, error);
      }
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

      console.log(`🔍 Getting QR code for instance: ${instanceId} (${whatsappConfig.evolution_api.instance_name})`);

      // Get QR code from Evolution API with enhanced error handling
      const qrResponse = await this.evolutionAPI.getQRCode(whatsappConfig.evolution_api.instance_name);

      console.log('📱 Evolution API QR response:', {
        hasBase64: !!qrResponse.base64,
        hasQRCode: !!qrResponse.qrcode,
        status: qrResponse.status,
        responseType: typeof qrResponse
      });

      // Handle different response formats from Evolution API
      let qrCodeData: string | undefined;
      let responseStatus = 'qr_not_ready';

      // Check for connected status first
      if (qrResponse.status === 'connected') {
        return {
          qrCode: undefined,
          status: 'connected'
        };
      }

      // Check for loading status
      if (qrResponse.status === 'loading') {
        return {
          qrCode: undefined,
          status: 'loading'
        };
      }

      // Handle QR code data in various formats
      if (typeof qrResponse === 'string') {
        // Direct base64 string
        qrCodeData = qrResponse;
        responseStatus = 'qr_available';
      } else if (qrResponse.base64) {
        // Object with base64 property (user's confirmed working format)
        qrCodeData = qrResponse.base64;
        responseStatus = 'qr_available';
      } else if (qrResponse.qrcode) {
        // Object with qrcode property
        qrCodeData = qrResponse.qrcode;
        responseStatus = 'qr_available';
      } else if (qrResponse.qr) {
        // Object with qr property
        qrCodeData = qrResponse.qr;
        responseStatus = 'qr_available';
      }

      // Validate that we have a proper base64 image
      if (qrCodeData && !qrCodeData.startsWith('data:image/')) {
        // If it's just the base64 data without the data URL prefix, add it
        if (qrCodeData.length > 100) { // Reasonable check for base64 data
          qrCodeData = `data:image/png;base64,${qrCodeData}`;
        }
      }

      console.log('✅ QR code processing result:', {
        hasQRCode: !!qrCodeData,
        status: responseStatus,
        qrCodeLength: qrCodeData?.length || 0,
        isValidDataURL: qrCodeData?.startsWith('data:image/') || false
      });

      return {
        qrCode: qrCodeData,
        status: responseStatus
      };

    } catch (error) {
      console.error('❌ Error getting QR code:', error);

      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new Error('WhatsApp instance not found in Evolution API');
        }
        if (error.message.includes('already connected')) {
          return {
            qrCode: undefined,
            status: 'connected'
          };
        }
      }

      throw error; // Re-throw to let the API endpoint handle it properly
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
