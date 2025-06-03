/**
 * WhatsApp Message Processor (Migrated)
 * 
 * WhatsApp-specific implementation of BaseMessageProcessor that integrates
 * with the existing AI processing and appointment booking functionality.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type {
  ChannelType,
  ChannelInstance,
  IncomingMessage,
  OutgoingMessage,
  MessageProcessingResult,
  MessageIntent,
  ExtractedEntities
} from '@/types/channels';
import type {
  WhatsAppInstance,
  WhatsAppConversation,
  WhatsAppMessage
} from '@/types/whatsapp';
import { BaseMessageProcessor } from '../core/BaseMessageProcessor';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';

// =====================================================
// AI PROCESSING SCHEMAS (from original)
// =====================================================

const intentSchema = z.object({
  intent: z.enum([
    'appointment_booking',
    'appointment_inquiry', 
    'appointment_reschedule',
    'appointment_cancel',
    'general_inquiry',
    'emergency',
    'greeting',
    'unknown'
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.object({
    specialty: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    doctor_name: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
    symptoms: z.array(z.string()).optional(),
    patient_info: z.object({
      name: z.string().optional(),
      id_number: z.string().optional(),
      phone: z.string().optional()
    }).optional()
  }).optional(),
  suggestedResponse: z.string()
});

// =====================================================
// WHATSAPP MESSAGE PROCESSOR
// =====================================================

/**
 * WhatsAppMessageProcessor
 * 
 * Processes WhatsApp messages using AI for intent detection and entity extraction.
 * Extends BaseMessageProcessor with WhatsApp-specific functionality.
 */
export class WhatsAppMessageProcessor extends BaseMessageProcessor {
  private evolutionAPI: ReturnType<typeof createEvolutionAPIService>;
  private whatsappInstance: WhatsAppInstance;

  constructor(supabase: SupabaseClient, channelInstance: ChannelInstance) {
    super(supabase, channelInstance);
    this.evolutionAPI = createEvolutionAPIService();
    
    // Convert ChannelInstance to WhatsAppInstance for compatibility
    this.whatsappInstance = this.convertToWhatsAppInstance(channelInstance);
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
   * Format response for WhatsApp
   */
  formatResponse(message: string, context?: any): OutgoingMessage {
    return {
      conversation_id: context?.conversationId || '',
      content: {
        type: 'text',
        text: message
      },
      metadata: {
        channel: 'whatsapp',
        timestamp: new Date().toISOString(),
        intent: context?.intent,
        entities: context?.entities
      }
    };
  }

  /**
   * Send message through Evolution API
   */
  async sendMessage(message: OutgoingMessage): Promise<void> {
    try {
      const whatsappConfig = this.channelInstance.config.whatsapp;
      if (!whatsappConfig) {
        throw new Error('WhatsApp configuration not found');
      }

      // Extract phone number from conversation_id
      const phoneNumber = message.conversation_id.replace('@s.whatsapp.net', '');

      // Send via Evolution API
      await this.evolutionAPI.sendMessage(whatsappConfig.evolution_api.instance_name, {
        number: phoneNumber,
        text: message.content.text || '',
        delay: 1000
      });

      console.log(`📤 WhatsApp message sent to ${phoneNumber}`);

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Parse incoming WhatsApp message
   */
  parseIncomingMessage(rawMessage: any): IncomingMessage {
    return {
      id: rawMessage.key?.id || crypto.randomUUID(),
      channel_type: 'whatsapp',
      instance_id: this.channelInstance.id,
      conversation_id: rawMessage.key?.remoteJid || '',
      sender: {
        id: rawMessage.key?.participant || rawMessage.key?.remoteJid || '',
        name: rawMessage.pushName || '',
        phone: rawMessage.key?.remoteJid?.replace('@s.whatsapp.net', '') || '',
        is_verified: false
      },
      content: {
        type: rawMessage.messageType || 'text',
        text: rawMessage.message?.conversation || rawMessage.message?.extendedTextMessage?.text || '',
        media_url: rawMessage.message?.imageMessage?.url || rawMessage.message?.videoMessage?.url,
        media_type: rawMessage.messageType
      },
      timestamp: new Date(rawMessage.messageTimestamp * 1000).toISOString(),
      metadata: {
        evolutionEvent: rawMessage,
        messageType: rawMessage.messageType,
        fromMe: rawMessage.key?.fromMe || false
      }
    };
  }

  /**
   * Validate WhatsApp message
   */
  validateMessage(message: IncomingMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.id) {
      errors.push('Message ID is required');
    }

    if (!message.conversation_id) {
      errors.push('Conversation ID is required');
    }

    if (!message.sender?.id) {
      errors.push('Sender ID is required');
    }

    if (!message.content?.text && !message.content?.media_url) {
      errors.push('Message must have text or media content');
    }

    return { valid: errors.length === 0, errors };
  }

  // =====================================================
  // WHATSAPP-SPECIFIC AI PROCESSING (from original)
  // =====================================================

  /**
   * Analyze message with AI (enhanced from original)
   */
  async analyzeMessageWithAI(messageContent: string, conversationHistory: any[] = []): Promise<any> {
    try {
      console.log('🤖 Analyzing message with OpenAI:', messageContent);

      const contextPrompt = this.buildContextPrompt(conversationHistory);
      
      const result = await generateObject({
        model: openai('gpt-3.5-turbo'),
        schema: intentSchema,
        prompt: `
Eres un asistente médico virtual especializado en agendar citas médicas vía WhatsApp.

${contextPrompt}

Analiza el siguiente mensaje del paciente y determina:
1. La intención principal del mensaje
2. Las entidades médicas relevantes (especialidad, fecha, hora, síntomas, etc.)
3. Una respuesta apropiada y empática

Mensaje del paciente: "${messageContent}"

Responde en español de manera profesional y empática. Si es una emergencia, prioriza la derivación inmediata.
        `,
        temperature: 0.7,
        maxTokens: 500
      });

      console.log('✅ AI analysis completed:', result.object);
      return result.object;

    } catch (error) {
      console.error('❌ Error in AI analysis:', error);
      
      // Fallback response
      return {
        intent: 'unknown',
        confidence: 0.1,
        entities: {},
        suggestedResponse: "Disculpe, no pude procesar su mensaje correctamente. ¿Podría reformularlo o contactar directamente con nuestro personal?"
      };
    }
  }

  /**
   * Build context prompt from conversation history
   */
  private buildContextPrompt(conversationHistory: any[]): string {
    if (!conversationHistory || conversationHistory.length === 0) {
      return "Esta es una nueva conversación.";
    }

    const recentMessages = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.direction === 'incoming' ? 'Paciente' : 'Asistente'}: ${msg.content}`)
      .join('\n');

    return `Contexto de la conversación:\n${recentMessages}\n\nMensaje actual:`;
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(conversationId: string): Promise<any[]> {
    try {
      const { data: messages } = await this.supabase
        .from('whatsapp_messages')
        .select('direction, content, timestamp')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(10);

      return messages || [];
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  // =====================================================
  // COMPATIBILITY METHODS (for existing system)
  // =====================================================

  /**
   * Process incoming message (compatibility wrapper)
   */
  async processIncomingMessage(
    message: WhatsAppMessage,
    conversation: WhatsAppConversation,
    messageContent: string
  ): Promise<any> {
    try {
      // Convert to unified format
      const unifiedMessage: IncomingMessage = {
        id: message.id,
        channel_type: 'whatsapp',
        instance_id: this.channelInstance.id,
        conversation_id: conversation.id,
        sender: {
          id: conversation.contact_jid,
          name: conversation.contact_name || '',
          phone: conversation.contact_phone || '',
          is_verified: false
        },
        content: {
          type: 'text',
          text: messageContent
        },
        timestamp: message.timestamp,
        metadata: {
          originalMessage: message,
          originalConversation: conversation
        }
      };

      // Process using base method
      const result = await super.processMessage(unifiedMessage);

      // Convert back to original format for compatibility
      return {
        success: result.success,
        messageId: message.id,
        conversationId: conversation.id,
        intent: result.intent,
        entities: result.entities,
        aiResponse: result.response,
        appointmentCreated: result.next_actions.includes('appointment_created')
      };

    } catch (error) {
      console.error('Error in compatibility processIncomingMessage:', error);
      return {
        success: false,
        messageId: message.id,
        conversationId: conversation.id,
        intent: 'unknown',
        entities: {},
        aiResponse: 'Error processing message',
        appointmentCreated: false
      };
    }
  }

  /**
   * Convert ChannelInstance to WhatsAppInstance for compatibility
   */
  private convertToWhatsAppInstance(channelInstance: ChannelInstance): WhatsAppInstance {
    const whatsappConfig = channelInstance.config.whatsapp;
    
    return {
      id: channelInstance.id,
      organization_id: channelInstance.organization_id,
      instance_name: channelInstance.instance_name,
      phone_number: whatsappConfig?.phone_number || '',
      status: channelInstance.status as any,
      evolution_api_config: whatsappConfig?.evolution_api,
      webhook_url: channelInstance.config.webhook.url,
      created_at: channelInstance.created_at,
      updated_at: channelInstance.updated_at
    } as WhatsAppInstance;
  }

  /**
   * Update conversation context (compatibility method)
   */
  async updateConversationContext(conversation: WhatsAppConversation, aiResult: any): Promise<void> {
    try {
      await this.supabase
        .from('whatsapp_conversations')
        .update({
          context: {
            ...conversation.context,
            currentIntent: aiResult.intent,
            extractedEntities: aiResult.entities || {},
            lastActivity: new Date().toISOString(),
            aiConfidence: aiResult.confidence
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  }
}

export default WhatsAppMessageProcessor;
