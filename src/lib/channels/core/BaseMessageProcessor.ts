/**
 * Base Message Processor
 * 
 * Abstract base class for processing messages across different communication channels.
 * Provides common functionality for intent detection, entity extraction, and response generation.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChannelType,
  ChannelInstance,
  IncomingMessage,
  OutgoingMessage,
  MessageProcessingResult,
  MessageIntent,
  ExtractedEntities,
  ChannelConversation,
  AIConversationContext
} from '@/types/channels';

// =====================================================
// ABSTRACT BASE CLASS
// =====================================================

/**
 * BaseMessageProcessor
 * 
 * Abstract base class that provides common message processing functionality.
 * Each specific channel processor extends this class and implements channel-specific methods.
 */
export abstract class BaseMessageProcessor {
  protected supabase: SupabaseClient;
  protected channelInstance: ChannelInstance;
  protected organizationId: string;

  constructor(supabase: SupabaseClient, channelInstance: ChannelInstance) {
    this.supabase = supabase;
    this.channelInstance = channelInstance;
    this.organizationId = channelInstance.organization_id;
  }

  // =====================================================
  // ABSTRACT METHODS (Must be implemented by subclasses)
  // =====================================================

  /**
   * Get the channel type for this processor
   */
  abstract getChannelType(): ChannelType;

  /**
   * Format response message for the specific channel
   */
  abstract formatResponse(message: string, context?: any): OutgoingMessage;

  /**
   * Send message through the channel's API
   */
  abstract sendMessage(message: OutgoingMessage): Promise<void>;

  /**
   * Parse incoming message from channel-specific format
   */
  abstract parseIncomingMessage(rawMessage: any): IncomingMessage;

  /**
   * Validate message content for the channel
   */
  abstract validateMessage(message: IncomingMessage): { valid: boolean; errors: string[] };

  // =====================================================
  // COMMON IMPLEMENTATION (Shared across all channels)
  // =====================================================

  /**
   * Main message processing pipeline
   */
  async processMessage(message: IncomingMessage): Promise<MessageProcessingResult> {
    try {
      console.log(`🔄 Processing ${this.getChannelType()} message:`, message.id);

      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
      }

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(message);

      // Detect intent using AI
      const intent = await this.detectIntent(message.content.text || '', conversation.ai_context);

      // Extract entities based on intent
      const entities = await this.extractEntities(message.content.text || '', intent, conversation.ai_context);

      // Generate response
      const response = await this.generateResponse(intent, entities, conversation);

      // Update conversation context
      await this.updateConversationContext(conversation.id, {
        current_intent: intent,
        extracted_entities: entities,
        conversation_stage: this.determineConversationStage(intent, entities),
        confidence_score: this.calculateConfidence(intent, entities)
      });

      // Store message in database
      await this.storeMessage(message, conversation.id);

      // Send response if auto-reply is enabled
      if (this.channelInstance.config.auto_reply && response) {
        const formattedResponse = this.formatResponse(response, { intent, entities });
        await this.sendMessage(formattedResponse);
        await this.storeOutgoingMessage(formattedResponse, conversation.id);
      }

      return {
        success: true,
        intent,
        entities,
        response: response || '',
        next_actions: this.determineNextActions(intent, entities),
        confidence: this.calculateConfidence(intent, entities)
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        intent: 'unknown',
        entities: {},
        response: this.getErrorResponse(error),
        next_actions: ['escalate_to_human'],
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect message intent using AI
   */
  async detectIntent(messageText: string, context?: AIConversationContext): Promise<MessageIntent> {
    try {
      // Use OpenAI to detect intent
      const prompt = this.buildIntentDetectionPrompt(messageText, context);
      
      const response = await fetch('/api/ai/intent-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          organizationId: this.organizationId,
          channelType: this.getChannelType()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to detect intent');
      }

      const result = await response.json();
      return result.intent || 'unknown';

    } catch (error) {
      console.error('Error detecting intent:', error);
      return 'unknown';
    }
  }

  /**
   * Extract entities from message text
   */
  async extractEntities(
    messageText: string, 
    intent: MessageIntent, 
    context?: AIConversationContext
  ): Promise<ExtractedEntities> {
    try {
      // Use OpenAI to extract entities
      const prompt = this.buildEntityExtractionPrompt(messageText, intent, context);
      
      const response = await fetch('/api/ai/entity-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          intent,
          organizationId: this.organizationId,
          channelType: this.getChannelType()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to extract entities');
      }

      const result = await response.json();
      return result.entities || {};

    } catch (error) {
      console.error('Error extracting entities:', error);
      return {};
    }
  }

  /**
   * Generate response based on intent and entities
   */
  async generateResponse(
    intent: MessageIntent, 
    entities: ExtractedEntities, 
    conversation: ChannelConversation
  ): Promise<string> {
    try {
      // Check if we should respond automatically
      if (!this.shouldGenerateResponse(intent, entities)) {
        return '';
      }

      // Use OpenAI to generate response
      const prompt = this.buildResponseGenerationPrompt(intent, entities, conversation);
      
      const response = await fetch('/api/ai/response-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          intent,
          entities,
          organizationId: this.organizationId,
          channelType: this.getChannelType()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const result = await response.json();
      return result.response || this.getDefaultResponse(intent);

    } catch (error) {
      console.error('Error generating response:', error);
      return this.getDefaultResponse(intent);
    }
  }

  // =====================================================
  // CONVERSATION MANAGEMENT
  // =====================================================

  /**
   * Get existing conversation or create new one
   */
  async getOrCreateConversation(message: IncomingMessage): Promise<ChannelConversation> {
    try {
      // Try to find existing conversation
      const { data: existingConversation } = await this.supabase
        .from('channel_conversations')
        .select('*')
        .eq('instance_id', this.channelInstance.id)
        .eq('contact_info->jid', message.sender.id)
        .eq('status', 'active')
        .single();

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation
      const { data: newConversation, error } = await this.supabase
        .from('channel_conversations')
        .insert({
          channel_type: this.getChannelType(),
          instance_id: this.channelInstance.id,
          contact_info: {
            jid: message.sender.id,
            name: message.sender.name,
            phone: message.sender.phone,
            username: message.sender.username
          },
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 0,
          ai_context: {
            current_intent: 'unknown',
            extracted_entities: {},
            conversation_stage: 'initial',
            pending_actions: [],
            confidence_score: 0
          }
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      return newConversation;

    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation AI context
   */
  async updateConversationContext(
    conversationId: string, 
    context: Partial<AIConversationContext>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('channel_conversations')
        .update({
          ai_context: context,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Failed to update conversation context:', error);
      }
    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  }

  // =====================================================
  // MESSAGE STORAGE
  // =====================================================

  /**
   * Store incoming message in database
   */
  async storeMessage(message: IncomingMessage, conversationId: string): Promise<void> {
    try {
      await this.supabase
        .from('channel_messages')
        .insert({
          conversation_id: conversationId,
          channel_type: this.getChannelType(),
          message_id: message.id,
          direction: 'incoming',
          content: message.content,
          sender_info: message.sender,
          timestamp: message.timestamp,
          metadata: message.metadata
        });
    } catch (error) {
      console.error('Error storing message:', error);
    }
  }

  /**
   * Store outgoing message in database
   */
  async storeOutgoingMessage(message: OutgoingMessage, conversationId: string): Promise<void> {
    try {
      await this.supabase
        .from('channel_messages')
        .insert({
          conversation_id: conversationId,
          channel_type: this.getChannelType(),
          message_id: crypto.randomUUID(),
          direction: 'outgoing',
          content: message.content,
          timestamp: new Date().toISOString(),
          metadata: message.metadata
        });
    } catch (error) {
      console.error('Error storing outgoing message:', error);
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Build prompt for intent detection
   */
  protected buildIntentDetectionPrompt(messageText: string, context?: AIConversationContext): string {
    const basePrompt = `
Analiza el siguiente mensaje y determina la intención del usuario.

Intenciones posibles:
- appointment_booking: Usuario quiere agendar una cita
- appointment_inquiry: Usuario pregunta sobre citas existentes
- appointment_reschedule: Usuario quiere reprogramar una cita
- appointment_cancel: Usuario quiere cancelar una cita
- general_inquiry: Pregunta general sobre servicios
- emergency: Situación de emergencia médica
- greeting: Saludo o inicio de conversación
- unknown: No se puede determinar la intención

Mensaje: "${messageText}"
${context ? `Contexto previo: ${JSON.stringify(context)}` : ''}

Responde solo con la intención detectada.
    `;

    return basePrompt.trim();
  }

  /**
   * Build prompt for entity extraction
   */
  protected buildEntityExtractionPrompt(
    messageText: string, 
    intent: MessageIntent, 
    context?: AIConversationContext
  ): string {
    const basePrompt = `
Extrae las entidades relevantes del siguiente mensaje médico.

Mensaje: "${messageText}"
Intención: ${intent}
${context ? `Contexto: ${JSON.stringify(context)}` : ''}

Extrae las siguientes entidades si están presentes:
- specialty: Especialidad médica mencionada
- date: Fecha mencionada (formato relativo o absoluto)
- time: Hora específica mencionada
- doctor_name: Nombre del doctor mencionado
- urgency: Nivel de urgencia (low, medium, high, emergency)
- symptoms: Lista de síntomas mencionados
- patient_info: Información del paciente (nombre, cédula, teléfono)

Responde en formato JSON con las entidades encontradas.
    `;

    return basePrompt.trim();
  }

  /**
   * Build prompt for response generation
   */
  protected buildResponseGenerationPrompt(
    intent: MessageIntent, 
    entities: ExtractedEntities, 
    conversation: ChannelConversation
  ): string {
    const customPrompt = this.channelInstance.config.ai_config.custom_prompt;
    
    const basePrompt = `
${customPrompt || 'Eres un asistente médico virtual profesional y empático.'}

Genera una respuesta apropiada para:
Intención: ${intent}
Entidades: ${JSON.stringify(entities)}
Canal: ${this.getChannelType()}

La respuesta debe ser:
- Profesional y empática
- Específica para el canal ${this.getChannelType()}
- Apropiada para el contexto médico
- Clara y concisa
- En español

Responde solo con el mensaje a enviar.
    `;

    return basePrompt.trim();
  }

  /**
   * Determine conversation stage
   */
  protected determineConversationStage(intent: MessageIntent, entities: ExtractedEntities): string {
    switch (intent) {
      case 'appointment_booking':
        if (entities.specialty && entities.date) return 'booking_ready';
        if (entities.specialty) return 'booking_date_needed';
        return 'booking_specialty_needed';
      case 'appointment_inquiry':
        return 'inquiry_processing';
      case 'greeting':
        return 'greeting_responded';
      case 'emergency':
        return 'emergency_escalated';
      default:
        return 'processing';
    }
  }

  /**
   * Calculate confidence score
   */
  protected calculateConfidence(intent: MessageIntent, entities: ExtractedEntities): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on intent clarity
    if (intent !== 'unknown') confidence += 0.3;

    // Increase confidence based on entities extracted
    const entityCount = Object.keys(entities).length;
    confidence += Math.min(entityCount * 0.1, 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine next actions based on intent and entities
   */
  protected determineNextActions(intent: MessageIntent, entities: ExtractedEntities): string[] {
    const actions: string[] = [];

    switch (intent) {
      case 'appointment_booking':
        if (!entities.specialty) actions.push('request_specialty');
        if (!entities.date) actions.push('request_date');
        if (entities.specialty && entities.date) actions.push('check_availability');
        break;
      case 'emergency':
        actions.push('escalate_to_human', 'provide_emergency_info');
        break;
      case 'appointment_inquiry':
        actions.push('fetch_appointments');
        break;
      default:
        actions.push('continue_conversation');
    }

    return actions;
  }

  /**
   * Check if we should generate automatic response
   */
  protected shouldGenerateResponse(intent: MessageIntent, entities: ExtractedEntities): boolean {
    // Don't respond to unknown intents unless configured to
    if (intent === 'unknown') return false;

    // Always respond to emergencies
    if (intent === 'emergency') return true;

    // Check business hours if configured
    if (this.channelInstance.config.business_hours.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const schedule = this.channelInstance.config.business_hours.schedule;
      const today = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      const todaySchedule = schedule[today];
      if (todaySchedule && todaySchedule.enabled) {
        const startHour = parseInt(todaySchedule.start.split(':')[0]);
        const endHour = parseInt(todaySchedule.end.split(':')[0]);
        
        if (currentHour < startHour || currentHour >= endHour) {
          return false; // Outside business hours
        }
      }
    }

    return true;
  }

  /**
   * Get default response for intent
   */
  protected getDefaultResponse(intent: MessageIntent): string {
    const responses = {
      appointment_booking: "Entiendo que desea agendar una cita. ¿Podría indicarme qué especialidad necesita?",
      appointment_inquiry: "Le ayudo a consultar sus citas. ¿Podría proporcionarme su número de identificación?",
      appointment_reschedule: "Puedo ayudarle a reprogramar su cita. ¿Cuál es el número de su cita actual?",
      appointment_cancel: "Entiendo que desea cancelar una cita. ¿Podría confirmarme los detalles?",
      general_inquiry: "¿En qué puedo ayudarle hoy?",
      emergency: "Entiendo que es una emergencia. Por favor contacte inmediatamente al 911 o diríjase al servicio de urgencias más cercano.",
      greeting: "¡Hola! Soy el asistente virtual de AgentSalud. ¿En qué puedo ayudarle hoy?",
      unknown: "Disculpe, no entendí su mensaje. ¿Podría reformularlo o contactar a nuestro personal?"
    };

    return responses[intent] || responses.unknown;
  }

  /**
   * Get error response
   */
  protected getErrorResponse(error: any): string {
    return "Disculpe, hubo un problema al procesar su mensaje. Por favor intente nuevamente o contacte a nuestro personal.";
  }
}
