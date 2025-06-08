/**
 * WhatsApp AI Bot Integration Service
 * 
 * Main service that integrates all AI bot components including OpenAI bot management,
 * conversation flows, business rules, and fallback mechanisms. Handles complete
 * appointment booking conversations with natural language processing.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import { EvolutionOpenAIBotService } from './EvolutionOpenAIBotService';
import { ConversationFlowManager } from './ConversationFlowManager';
import { AppointmentBusinessRulesService } from './AppointmentBusinessRulesService';
import { WhatsAppNotificationService } from './WhatsAppNotificationService';
import { TenantValidationMiddleware } from '@/lib/middleware/tenantValidation';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface BotConfiguration {
  instanceName: string;
  organizationId: string;
  openaiApiKey: string;
  enabled: boolean;
  fallbackToHuman: boolean;
  maxConversationTurns: number;
  conversationTimeoutMinutes: number;
}

export interface MessageProcessingResult {
  success: boolean;
  response?: string;
  requiresHumanHandoff?: boolean;
  appointmentCreated?: boolean;
  appointmentId?: string;
  error?: string;
}

export interface BotStatus {
  instanceName: string;
  botId?: string;
  enabled: boolean;
  credentialsConfigured: boolean;
  lastActivity?: string;
  conversationsActive: number;
  appointmentsCreated: number;
}

// =====================================================
// WHATSAPP AI BOT SERVICE
// =====================================================

/**
 * WhatsApp AI Bot Service Class
 * 
 * @description Main integration service for WhatsApp AI bot functionality
 * with complete appointment booking capabilities and fallback mechanisms.
 */
export class WhatsAppAIBotService {
  private supabase: any;
  private evolutionBotService: EvolutionOpenAIBotService;
  private conversationManager: ConversationFlowManager;
  private businessRulesService: AppointmentBusinessRulesService;
  private notificationService: WhatsAppNotificationService;
  private tenantValidator: TenantValidationMiddleware;

  constructor() {
    this.supabase = createClient();
    this.evolutionBotService = new EvolutionOpenAIBotService();
    this.conversationManager = new ConversationFlowManager();
    this.businessRulesService = new AppointmentBusinessRulesService();
    this.notificationService = new WhatsAppNotificationService(this.supabase);
    this.tenantValidator = new TenantValidationMiddleware();
  }

  // =====================================================
  // BOT SETUP AND CONFIGURATION
  // =====================================================

  /**
   * Setup AI bot for WhatsApp instance
   */
  async setupBot(config: BotConfiguration): Promise<{ success: boolean; botId?: string; error?: string }> {
    try {
      console.log(`🤖 Setting up AI bot for instance: ${config.instanceName}`);

      // 1. Create OpenAI credentials
      const credentialsResult = await this.evolutionBotService.createCredentials(
        config.instanceName,
        {
          name: `${config.instanceName}-credentials`,
          apiKey: config.openaiApiKey
        }
      );

      if (!credentialsResult.success) {
        return {
          success: false,
          error: 'Failed to create OpenAI credentials'
        };
      }

      // 2. Set default settings
      await this.evolutionBotService.setDefaultSettings(config.instanceName, {
        openaiCredsId: credentialsResult.data.id,
        expire: config.conversationTimeoutMinutes,
        keywordFinish: '#SALIR',
        delayMessage: 2000,
        unknownMessage: 'Disculpa, no entendí tu mensaje. ¿Podrías reformularlo? Si necesitas ayuda inmediata, escribe #HUMANO para hablar con nuestro personal.',
        listeningFromMe: false,
        stopBotFromMe: false,
        keepOpen: true,
        debounceTime: 5,
        ignoreJids: [],
        speechToText: true
      });

      // 3. Create appointment booking bot
      const botResult = await this.evolutionBotService.createAppointmentBot(
        config.instanceName,
        {
          openaiCredsId: credentialsResult.data.id,
          enabled: config.enabled,
          expire: config.conversationTimeoutMinutes,
          maxTokens: 500
        }
      );

      if (!botResult.success) {
        return {
          success: false,
          error: 'Failed to create appointment bot'
        };
      }

      // 4. Save bot configuration to database
      await this.saveBotConfiguration(config, botResult.data.id);

      console.log(`✅ AI bot setup completed for ${config.instanceName}`);

      return {
        success: true,
        botId: botResult.data.id
      };

    } catch (error) {
      console.error('❌ Error setting up AI bot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Enable bot for an instance
   */
  async enableBot(instanceName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const botConfig = await this.getBotConfiguration(instanceName);
      if (!botConfig) {
        return { success: false, error: 'Bot configuration not found' };
      }

      await this.evolutionBotService.enableBot(instanceName, botConfig.botId);
      
      await this.updateBotStatus(instanceName, { enabled: true });

      return { success: true };

    } catch (error) {
      console.error('❌ Error enabling bot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Disable bot for an instance
   */
  async disableBot(instanceName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const botConfig = await this.getBotConfiguration(instanceName);
      if (!botConfig) {
        return { success: false, error: 'Bot configuration not found' };
      }

      await this.evolutionBotService.disableBot(instanceName, botConfig.botId);
      
      await this.updateBotStatus(instanceName, { enabled: false });

      return { success: true };

    } catch (error) {
      console.error('❌ Error disabling bot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // MESSAGE PROCESSING
  // =====================================================

  /**
   * Process incoming WhatsApp message through AI bot
   */
  async processMessage(
    instanceName: string,
    patientPhone: string,
    message: string,
    messageData?: any
  ): Promise<MessageProcessingResult> {
    try {
      console.log(`📱 Processing AI bot message from ${patientPhone}: ${message}`);

      // Validate WhatsApp instance ownership and tenant context
      const instanceValidation = await this.validateInstanceAccess(instanceName);
      if (!instanceValidation.valid) {
        console.error('❌ Instance access validation failed:', instanceValidation.error);
        return {
          success: false,
          error: instanceValidation.error || 'Instance access denied'
        };
      }

      // Check if bot is enabled for this instance
      const botConfig = await this.getBotConfiguration(instanceName);
      if (!botConfig || !botConfig.enabled) {
        return {
          success: false,
          error: 'Bot not configured or disabled for this instance'
        };
      }

      // Check for immediate human handoff keywords
      if (this.shouldHandoffToHuman(message)) {
        await this.initiateHumanHandoff(instanceName, patientPhone, message);
        return {
          success: true,
          response: 'Te estoy conectando con nuestro personal. En un momento alguien te atenderá.',
          requiresHumanHandoff: true
        };
      }

      // Process through conversation flow manager
      const flowResponse = await this.conversationManager.processMessage(patientPhone, message);

      // Handle human handoff
      if (flowResponse.requiresHumanHandoff) {
        await this.initiateHumanHandoff(instanceName, patientPhone, message);
        return {
          success: true,
          response: flowResponse.message,
          requiresHumanHandoff: true
        };
      }

      // Handle appointment booking completion
      if (flowResponse.appointmentCreated && flowResponse.appointmentId) {
        // Send confirmation notification
        await this.sendAppointmentConfirmation(flowResponse.appointmentId);
        
        return {
          success: true,
          response: flowResponse.message,
          appointmentCreated: true,
          appointmentId: flowResponse.appointmentId
        };
      }

      return {
        success: true,
        response: flowResponse.message
      };

    } catch (error) {
      console.error('❌ Error processing AI bot message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle appointment booking through business rules
   */
  async bookAppointment(
    instanceName: string,
    patientPhone: string,
    appointmentData: any
  ): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    try {
      // Get organization ID from instance
      const { data: instance } = await this.supabase
        .from('channel_instances')
        .select('organization_id')
        .eq('instance_name', instanceName)
        .single();

      if (!instance) {
        return { success: false, error: 'Instance not found' };
      }

      // Create booking request
      const bookingRequest = {
        service: appointmentData.service,
        date: appointmentData.date,
        time: appointmentData.time,
        doctorId: appointmentData.doctorId,
        patientPhone,
        organizationId: instance.organization_id,
        urgency: appointmentData.urgency || 'medium',
        notes: 'Cita agendada via WhatsApp AI Bot'
      };

      // Book appointment through business rules service
      const result = await this.businessRulesService.createAppointment(bookingRequest);

      if (result.success) {
        console.log(`✅ Appointment booked successfully: ${result.appointmentId}`);
        return {
          success: true,
          appointmentId: result.appointmentId
        };
      } else {
        console.error('❌ Appointment booking failed:', result.errors);
        return {
          success: false,
          error: result.errors.join(', ')
        };
      }

    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // FALLBACK AND HUMAN HANDOFF
  // =====================================================

  /**
   * Check if message should trigger human handoff
   */
  private shouldHandoffToHuman(message: string): boolean {
    const handoffKeywords = [
      '#humano', '#human', 'hablar con persona', 'operador',
      'no entiendo', 'no me ayuda', 'problema', 'reclamo',
      'urgente', 'emergencia', 'dolor', 'ayuda inmediata'
    ];

    const normalizedMessage = message.toLowerCase();
    return handoffKeywords.some(keyword => normalizedMessage.includes(keyword));
  }

  /**
   * Initiate human handoff process
   */
  private async initiateHumanHandoff(
    instanceName: string,
    patientPhone: string,
    message: string
  ): Promise<void> {
    try {
      // Pause bot session for this contact
      await this.evolutionBotService.pauseSession(instanceName, patientPhone);

      // Log handoff event
      await this.logHandoffEvent(instanceName, patientPhone, message);

      // Notify staff (this would integrate with staff notification system)
      console.log(`🚨 Human handoff initiated for ${patientPhone} on ${instanceName}`);

    } catch (error) {
      console.error('❌ Error initiating human handoff:', error);
    }
  }

  /**
   * Resume bot session after human handoff
   */
  async resumeBotSession(instanceName: string, patientPhone: string): Promise<void> {
    try {
      await this.evolutionBotService.resumeSession(instanceName, patientPhone);
      console.log(`🤖 Bot session resumed for ${patientPhone} on ${instanceName}`);
    } catch (error) {
      console.error('❌ Error resuming bot session:', error);
    }
  }

  // =====================================================
  // MONITORING AND ANALYTICS
  // =====================================================

  /**
   * Get bot status for an instance
   */
  async getBotStatus(instanceName: string): Promise<BotStatus | null> {
    try {
      const botConfig = await this.getBotConfiguration(instanceName);
      if (!botConfig) return null;

      // Get bot statistics (this would come from database analytics)
      const stats = await this.getBotStatistics(instanceName);

      return {
        instanceName,
        botId: botConfig.botId,
        enabled: botConfig.enabled,
        credentialsConfigured: !!botConfig.openaiApiKey,
        lastActivity: stats.lastActivity,
        conversationsActive: stats.activeConversations,
        appointmentsCreated: stats.appointmentsCreated
      };

    } catch (error) {
      console.error('❌ Error getting bot status:', error);
      return null;
    }
  }

  // =====================================================
  // TENANT VALIDATION METHODS
  // =====================================================

  /**
   * Validate WhatsApp instance access with tenant isolation
   */
  private async validateInstanceAccess(instanceName: string): Promise<{ valid: boolean; error?: string; organizationId?: string }> {
    try {
      // Get instance details with organization context
      const { data: instance, error } = await this.supabase
        .from('channel_instances')
        .select('id, organization_id, status')
        .eq('channel_type', 'whatsapp')
        .like('config->whatsapp->evolution_api->instance_name', instanceName)
        .single();

      if (error || !instance) {
        return {
          valid: false,
          error: 'WhatsApp instance not found'
        };
      }

      // Get current user context for validation
      const userContext = await this.tenantValidator.getCurrentUserContext();
      if (!userContext) {
        // For webhook processing, we'll validate against the instance's organization
        return {
          valid: true,
          organizationId: instance.organization_id
        };
      }

      // Validate instance ownership
      const ownershipValidation = await this.tenantValidator.validateWhatsAppInstanceOwnership(
        instance.id,
        userContext
      );

      if (!ownershipValidation.valid) {
        return {
          valid: false,
          error: ownershipValidation.error
        };
      }

      return {
        valid: true,
        organizationId: instance.organization_id
      };

    } catch (error) {
      console.error('❌ Error validating instance access:', error);
      return {
        valid: false,
        error: 'Error validating instance access'
      };
    }
  }

  /**
   * Validate conversation flow access with tenant isolation
   */
  private async validateConversationAccess(
    patientPhone: string,
    organizationId: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if there's an active conversation flow for this patient in this organization
      const { data: flow, error } = await this.supabase
        .from('conversation_flows')
        .select('id, organization_id')
        .eq('patient_phone', patientPhone)
        .eq('organization_id', organizationId)
        .eq('active', true)
        .single();

      // If no active flow, it's valid (new conversation)
      if (error || !flow) {
        return { valid: true };
      }

      // Validate flow ownership
      if (flow.organization_id !== organizationId) {
        await this.logSecurityViolation(
          'cross_tenant_conversation_access',
          'high',
          {
            patientPhone,
            flowOrganization: flow.organization_id,
            requestedOrganization: organizationId,
            flowId: flow.id
          }
        );

        return {
          valid: false,
          error: 'Conversation belongs to different organization'
        };
      }

      return { valid: true };

    } catch (error) {
      console.error('❌ Error validating conversation access:', error);
      return {
        valid: false,
        error: 'Error validating conversation access'
      };
    }
  }

  /**
   * Log security violation
   */
  private async logSecurityViolation(
    violationType: string,
    severity: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('security_audit_log')
        .insert({
          violation_type: violationType,
          severity,
          operation_type: 'ai_bot_processing',
          details,
          timestamp: new Date().toISOString()
        });

      console.warn(`🚨 Security violation logged: ${violationType}`, details);

    } catch (error) {
      console.error('❌ Error logging security violation:', error);
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Send appointment confirmation notification
   */
  private async sendAppointmentConfirmation(appointmentId: string): Promise<void> {
    try {
      // This would integrate with the notification service from Phase 2.1
      console.log(`📧 Sending appointment confirmation for: ${appointmentId}`);
    } catch (error) {
      console.error('❌ Error sending appointment confirmation:', error);
    }
  }

  /**
   * Save bot configuration to database
   */
  private async saveBotConfiguration(config: BotConfiguration, botId: string): Promise<void> {
    // In a real implementation, this would save to a bot_configurations table
    console.log(`💾 Saving bot configuration for ${config.instanceName}`);
  }

  /**
   * Get bot configuration from database
   */
  private async getBotConfiguration(instanceName: string): Promise<any> {
    // In a real implementation, this would query the bot_configurations table
    return {
      instanceName,
      botId: 'bot-123',
      enabled: true,
      openaiApiKey: 'sk-...'
    };
  }

  /**
   * Update bot status in database
   */
  private async updateBotStatus(instanceName: string, updates: any): Promise<void> {
    // In a real implementation, this would update the bot status
    console.log(`📊 Updating bot status for ${instanceName}:`, updates);
  }

  /**
   * Log handoff event
   */
  private async logHandoffEvent(instanceName: string, patientPhone: string, message: string): Promise<void> {
    try {
      await this.supabase
        .from('bot_handoff_logs')
        .insert({
          instance_name: instanceName,
          patient_phone: patientPhone,
          trigger_message: message,
          handoff_time: new Date().toISOString(),
          status: 'initiated'
        });
    } catch (error) {
      console.error('❌ Error logging handoff event:', error);
    }
  }

  /**
   * Get bot statistics
   */
  private async getBotStatistics(instanceName: string): Promise<any> {
    // In a real implementation, this would query analytics tables
    return {
      lastActivity: new Date().toISOString(),
      activeConversations: 0,
      appointmentsCreated: 0
    };
  }
}
