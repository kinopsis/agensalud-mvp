/**
 * WhatsApp Webhook Processor Service
 * 
 * Handles processing of Evolution API webhook events including message processing,
 * conversation management, and integration with AgentSalud appointment system.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  EvolutionWebhookEvent, 
  WhatsAppInstance, 
  WhatsAppConversation,
  WhatsAppMessage,
  MessageProcessingResult 
} from '@/types/whatsapp';
import { WhatsAppMessageProcessor } from './WhatsAppMessageProcessor';

// =====================================================
// WEBHOOK PROCESSING RESULT TYPES
// =====================================================

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  eventType?: string;
  instanceName?: string;
}

// =====================================================
// WHATSAPP WEBHOOK PROCESSOR CLASS
// =====================================================

/**
 * WhatsApp Webhook Processor
 * 
 * Processes Evolution API webhook events and manages WhatsApp conversations
 * with integration to AgentSalud appointment booking system.
 */
export class WhatsAppWebhookProcessor {
  private supabase: SupabaseClient;
  private whatsappInstance: WhatsAppInstance;
  private messageProcessor: WhatsAppMessageProcessor;

  constructor(supabase: SupabaseClient, whatsappInstance: WhatsAppInstance) {
    this.supabase = supabase;
    this.whatsappInstance = whatsappInstance;
    this.messageProcessor = new WhatsAppMessageProcessor(supabase, whatsappInstance);
  }

  // =====================================================
  // MESSAGE EVENT PROCESSING
  // =====================================================

  /**
   * Process incoming message events
   * 
   * @description Handles new messages from WhatsApp users, creates/updates conversations,
   * stores messages, and triggers AI processing for appointment booking.
   * 
   * @param event - Evolution API webhook event
   * @returns Processing result with conversation and message data
   */
  async processMessageEvent(event: EvolutionWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      const { data } = event;
      
      // Skip messages sent by us (fromMe = true)
      if (data.key?.fromMe) {
        return {
          success: true,
          message: 'Outbound message ignored',
          eventType: 'messages.upsert'
        };
      }

      // Extract message information
      const contactJid = data.key?.remoteJid;
      const messageId = data.key?.id;
      const pushName = data.pushName;
      const messageType = data.messageType;
      const messageTimestamp = data.messageTimestamp;

      if (!contactJid || !messageId) {
        throw new Error('Missing required message data: contactJid or messageId');
      }

      // Extract message content based on type
      let messageContent = '';
      let mediaUrl = '';
      let mediaCaption = '';

      switch (messageType) {
        case 'conversation':
          messageContent = data.message?.conversation || '';
          break;
        case 'imageMessage':
          mediaUrl = data.message?.imageMessage?.url || '';
          mediaCaption = data.message?.imageMessage?.caption || '';
          messageContent = mediaCaption;
          break;
        case 'audioMessage':
          mediaUrl = data.message?.audioMessage?.url || '';
          messageContent = '[Audio message]';
          break;
        case 'documentMessage':
          mediaUrl = data.message?.documentMessage?.url || '';
          messageContent = data.message?.documentMessage?.fileName || '[Document]';
          mediaCaption = data.message?.documentMessage?.caption || '';
          break;
        default:
          messageContent = `[${messageType} message]`;
      }

      console.log(`📩 Processing message from ${contactJid}: "${messageContent}"`);

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(contactJid, pushName);

      // Store message in database
      const { data: storedMessage, error: messageError } = await this.supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          message_id: messageId,
          direction: 'inbound',
          message_type: messageType,
          content: messageContent,
          media_url: mediaUrl || null,
          media_caption: mediaCaption || null,
          processed: false,
          created_at: new Date(messageTimestamp).toISOString()
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error storing message:', messageError);
        throw new Error(`Failed to store message: ${messageError.message}`);
      }

      // Update conversation last message timestamp
      await this.supabase
        .from('whatsapp_conversations')
        .update({ 
          last_message_at: new Date(messageTimestamp).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      // Process message with AI if it's a text message
      let processingResult: MessageProcessingResult | null = null;
      if (messageType === 'conversation' && messageContent.trim()) {
        try {
          processingResult = await this.messageProcessor.processIncomingMessage(
            storedMessage,
            conversation,
            messageContent
          );
        } catch (processingError) {
          console.error('Error processing message with AI:', processingError);
          // Continue without AI processing - message is still stored
        }
      }

      return {
        success: true,
        message: 'Message processed successfully',
        data: {
          conversationId: conversation.id,
          messageId: storedMessage.id,
          messageContent,
          messageType,
          aiProcessing: processingResult
        },
        eventType: 'messages.upsert',
        instanceName: event.instance
      };

    } catch (error) {
      console.error('Error processing message event:', error);
      return {
        success: false,
        message: 'Failed to process message event',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: 'messages.upsert',
        instanceName: event.instance
      };
    }
  }

  /**
   * Process message update events
   * 
   * @description Handles message status updates (delivered, read, etc.)
   * 
   * @param event - Evolution API webhook event
   * @returns Processing result
   */
  async processMessageUpdate(event: EvolutionWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      console.log('📝 Message update event received:', event.data);
      
      // For now, we'll just log message updates
      // In the future, we could update message status in database
      
      return {
        success: true,
        message: 'Message update processed',
        eventType: 'messages.update',
        instanceName: event.instance
      };
    } catch (error) {
      console.error('Error processing message update:', error);
      return {
        success: false,
        message: 'Failed to process message update',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: 'messages.update',
        instanceName: event.instance
      };
    }
  }

  // =====================================================
  // CONNECTION EVENT PROCESSING
  // =====================================================

  /**
   * Process connection update events
   * 
   * @description Handles WhatsApp connection status changes (connected, disconnected, etc.)
   * 
   * @param event - Evolution API webhook event
   * @returns Processing result
   */
  async processConnectionUpdate(event: EvolutionWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      console.log('🔗 Connection update event:', event.data);

      // Update instance status based on connection state
      // This would typically come in the event data
      const connectionState = event.data.messageType; // This might contain connection info
      
      let newStatus = this.whatsappInstance.status;
      if (connectionState === 'open' || connectionState === 'connected') {
        newStatus = 'active';
      } else if (connectionState === 'close' || connectionState === 'disconnected') {
        newStatus = 'inactive';
      }

      if (newStatus !== this.whatsappInstance.status) {
        await this.supabase
          .from('whatsapp_instances')
          .update({ 
            status: newStatus,
            last_connected_at: newStatus === 'active' ? new Date().toISOString() : this.whatsappInstance.last_connected_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.whatsappInstance.id);

        console.log(`📱 Instance ${this.whatsappInstance.instance_name} status updated: ${this.whatsappInstance.status} → ${newStatus}`);
      }

      return {
        success: true,
        message: 'Connection update processed',
        data: { previousStatus: this.whatsappInstance.status, newStatus },
        eventType: 'connection.update',
        instanceName: event.instance
      };
    } catch (error) {
      console.error('Error processing connection update:', error);
      return {
        success: false,
        message: 'Failed to process connection update',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: 'connection.update',
        instanceName: event.instance
      };
    }
  }

  /**
   * Process QR code update events
   * 
   * @description Handles QR code updates during connection process
   * 
   * @param event - Evolution API webhook event
   * @returns Processing result
   */
  async processQRUpdate(event: EvolutionWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      console.log('📱 QR code update event received');

      // Update QR code in database if provided
      // The QR code data would typically be in event.data
      await this.supabase
        .from('whatsapp_instances')
        .update({ 
          status: 'connecting',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.whatsappInstance.id);

      return {
        success: true,
        message: 'QR code update processed',
        eventType: 'qr.updated',
        instanceName: event.instance
      };
    } catch (error) {
      console.error('Error processing QR update:', error);
      return {
        success: false,
        message: 'Failed to process QR update',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: 'qr.updated',
        instanceName: event.instance
      };
    }
  }

  /**
   * Process instance creation events
   * 
   * @description Handles instance creation confirmations
   * 
   * @param event - Evolution API webhook event
   * @returns Processing result
   */
  async processInstanceCreated(event: EvolutionWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      console.log('🆕 Instance creation event received');

      // Update instance status to confirm creation
      await this.supabase
        .from('whatsapp_instances')
        .update({ 
          status: 'connecting',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.whatsappInstance.id);

      return {
        success: true,
        message: 'Instance creation processed',
        eventType: 'instance.created',
        instanceName: event.instance
      };
    } catch (error) {
      console.error('Error processing instance creation:', error);
      return {
        success: false,
        message: 'Failed to process instance creation',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: 'instance.created',
        instanceName: event.instance
      };
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Get existing conversation or create new one
   * 
   * @description Retrieves existing conversation for contact or creates a new one
   * 
   * @param contactJid - WhatsApp contact JID
   * @param contactName - Contact display name
   * @returns Conversation record
   */
  private async getOrCreateConversation(contactJid: string, contactName?: string): Promise<WhatsAppConversation> {
    // Try to get existing conversation
    const { data: existingConversation } = await this.supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('whatsapp_instance_id', this.whatsappInstance.id)
      .eq('contact_jid', contactJid)
      .single();

    if (existingConversation) {
      // Update contact name if provided and different
      if (contactName && contactName !== existingConversation.contact_name) {
        await this.supabase
          .from('whatsapp_conversations')
          .update({ 
            contact_name: contactName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConversation.id);
        
        existingConversation.contact_name = contactName;
      }
      
      return existingConversation;
    }

    // Create new conversation
    const { data: newConversation, error: conversationError } = await this.supabase
      .from('whatsapp_conversations')
      .insert({
        organization_id: this.whatsappInstance.organization_id,
        whatsapp_instance_id: this.whatsappInstance.id,
        contact_jid: contactJid,
        contact_name: contactName || null,
        conversation_state: 'active',
        context_data: {},
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (conversationError) {
      throw new Error(`Failed to create conversation: ${conversationError.message}`);
    }

    console.log(`💬 New conversation created for ${contactJid}`);
    return newConversation;
  }
}

export default WhatsAppWebhookProcessor;
