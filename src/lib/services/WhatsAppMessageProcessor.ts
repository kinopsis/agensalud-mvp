/**
 * WhatsApp Message Processor Service
 * 
 * Handles AI-powered processing of WhatsApp messages including intent detection,
 * entity extraction, and appointment booking integration.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  WhatsAppInstance, 
  WhatsAppConversation,
  WhatsAppMessage,
  MessageProcessingResult,
  MessageIntent,
  ExtractedEntities
} from '@/types/whatsapp';
import { createEvolutionAPIService } from './EvolutionAPIService';
import { WhatsAppAppointmentService } from './WhatsAppAppointmentService';

// =====================================================
// AI PROCESSING SCHEMAS
// =====================================================

/**
 * Schema for WhatsApp message intent detection
 */
const WhatsAppIntentSchema = z.object({
  intent: z.enum([
    'greeting',
    'appointment_booking',
    'appointment_inquiry',
    'appointment_reschedule',
    'appointment_cancel',
    'information_request',
    'complaint',
    'emergency',
    'other'
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.object({
    specialty: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high', 'emergency']).optional(),
    patientName: z.string().optional(),
    symptoms: z.array(z.string()).optional(),
    appointmentId: z.string().optional()
  }).optional(),
  suggestedResponse: z.string(),
  nextActions: z.array(z.string()),
  requiresHumanIntervention: z.boolean().default(false)
});

type WhatsAppIntent = z.infer<typeof WhatsAppIntentSchema>;

// =====================================================
// WHATSAPP MESSAGE PROCESSOR CLASS
// =====================================================

/**
 * WhatsApp Message Processor
 * 
 * Processes incoming WhatsApp messages using AI to detect intent,
 * extract entities, and handle appointment booking workflows.
 */
export class WhatsAppMessageProcessor {
  private supabase: SupabaseClient;
  private whatsappInstance: WhatsAppInstance;
  private evolutionAPI: ReturnType<typeof createEvolutionAPIService>;
  private appointmentService: WhatsAppAppointmentService;

  constructor(supabase: SupabaseClient, whatsappInstance: WhatsAppInstance) {
    this.supabase = supabase;
    this.whatsappInstance = whatsappInstance;
    this.evolutionAPI = createEvolutionAPIService();
    this.appointmentService = new WhatsAppAppointmentService(supabase, whatsappInstance);
  }

  // =====================================================
  // MAIN PROCESSING METHOD
  // =====================================================

  /**
   * Process incoming WhatsApp message with AI
   * 
   * @description Main method that processes incoming messages using OpenAI,
   * detects intent, extracts entities, and handles appropriate responses.
   * 
   * @param message - WhatsApp message record
   * @param conversation - WhatsApp conversation record
   * @param messageContent - Message text content
   * @returns Processing result with AI analysis and actions taken
   */
  async processIncomingMessage(
    message: WhatsAppMessage,
    conversation: WhatsAppConversation,
    messageContent: string
  ): Promise<MessageProcessingResult> {
    try {
      console.log(`🤖 Processing message with AI: "${messageContent}"`);

      // Get conversation history for context
      const conversationHistory = await this.getConversationHistory(conversation.id);

      // Process message with AI
      const aiResult = await this.analyzeMessageWithAI(messageContent, conversationHistory);

      // Update message with AI analysis
      await this.supabase
        .from('whatsapp_messages')
        .update({
          intent_detected: aiResult.intent,
          extracted_entities: aiResult.entities || {},
          ai_confidence: aiResult.confidence,
          processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id);

      // Update conversation context
      await this.updateConversationContext(conversation, aiResult);

      // Handle intent-specific actions
      let appointmentCreated = false;
      let aiResponse = aiResult.suggestedResponse;

      switch (aiResult.intent) {
        case 'appointment_booking':
          const bookingResult = await this.handleAppointmentBooking(conversation, aiResult);
          appointmentCreated = bookingResult.success;
          if (bookingResult.response) {
            aiResponse = bookingResult.response;
          }
          break;

        case 'appointment_inquiry':
          aiResponse = await this.handleAppointmentInquiry(conversation, aiResult);
          break;

        case 'appointment_reschedule':
          aiResponse = await this.handleAppointmentReschedule(conversation, aiResult);
          break;

        case 'appointment_cancel':
          aiResponse = await this.handleAppointmentCancel(conversation, aiResult);
          break;

        case 'emergency':
          aiResponse = await this.handleEmergency(conversation, aiResult);
          break;

        case 'greeting':
          aiResponse = await this.handleGreeting(conversation, aiResult);
          break;

        default:
          // Use the AI-generated response for other intents
          break;
      }

      // Send AI response if auto-reply is enabled
      if (this.whatsappInstance.evolution_api_config?.autoReply && aiResponse) {
        await this.sendResponse(conversation.contact_jid, aiResponse);
      }

      // Create audit log entry
      await this.supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: this.whatsappInstance.organization_id,
        p_conversation_id: conversation.id,
        p_action: 'message_processed',
        p_actor_type: 'ai',
        p_whatsapp_instance_id: this.whatsappInstance.id,
        p_details: {
          messageId: message.id,
          intent: aiResult.intent,
          confidence: aiResult.confidence,
          appointmentCreated,
          autoReplyEnabled: this.whatsappInstance.evolution_api_config?.autoReply || false
        }
      });

      return {
        success: true,
        messageId: message.id,
        conversationId: conversation.id,
        intent: aiResult.intent as MessageIntent,
        entities: aiResult.entities as ExtractedEntities,
        aiResponse,
        appointmentCreated
      };

    } catch (error) {
      console.error('Error processing message with AI:', error);
      
      // Mark message as processed with error
      await this.supabase
        .from('whatsapp_messages')
        .update({
          processed: true,
          ai_confidence: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', message.id);

      return {
        success: false,
        messageId: message.id,
        conversationId: conversation.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // =====================================================
  // AI ANALYSIS METHODS
  // =====================================================

  /**
   * Analyze message with OpenAI
   * 
   * @description Uses OpenAI to analyze message content and extract intent and entities
   * 
   * @param messageContent - Message text to analyze
   * @param conversationHistory - Previous messages for context
   * @returns AI analysis result
   */
  private async analyzeMessageWithAI(
    messageContent: string,
    conversationHistory: string[]
  ): Promise<WhatsAppIntent> {
    const prompt = this.buildAnalysisPrompt(messageContent, conversationHistory);

    const result = await generateObject({
      model: openai('gpt-3.5-turbo'),
      prompt,
      schema: WhatsAppIntentSchema,
    });

    return result.object;
  }

  /**
   * Build AI analysis prompt
   * 
   * @description Creates a comprehensive prompt for AI analysis including context
   * 
   * @param messageContent - Current message content
   * @param conversationHistory - Previous messages
   * @returns Formatted prompt for AI
   */
  private buildAnalysisPrompt(messageContent: string, conversationHistory: string[]): string {
    return `
Eres un asistente médico inteligente especializado en citas médicas para AgentSalud.

CONTEXTO DE LA ORGANIZACIÓN:
- Sistema de citas médicas con especialidades múltiples
- Horarios de atención: Lunes a Viernes 8:00-18:00, Sábados 8:00-14:00
- Servicios: Medicina General, Cardiología, Dermatología, Pediatría, Ginecología, Oftalmología

HISTORIAL DE CONVERSACIÓN:
${conversationHistory.length > 0 ? conversationHistory.join('\n') : 'Nueva conversación'}

MENSAJE ACTUAL DEL PACIENTE:
"${messageContent}"

INSTRUCCIONES:
1. Analiza el intent principal del mensaje
2. Extrae entidades relevantes (especialidad, fecha, hora, síntomas, etc.)
3. Determina el nivel de confianza (0-1)
4. Genera una respuesta apropiada y profesional
5. Sugiere próximas acciones necesarias
6. Identifica si requiere intervención humana

ESPECIALIDADES DISPONIBLES:
- Medicina General
- Cardiología  
- Dermatología
- Pediatría
- Ginecología
- Oftalmología

TIPOS DE URGENCIA:
- low: Consulta rutinaria, chequeo preventivo
- medium: Síntomas molestos pero no graves
- high: Síntomas preocupantes que requieren atención pronta
- emergency: Síntomas graves que requieren atención inmediata

Responde en español con un tono profesional pero cálido.
`;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Get conversation history for context
   * 
   * @description Retrieves recent messages from conversation for AI context
   * 
   * @param conversationId - Conversation ID
   * @returns Array of message contents
   */
  private async getConversationHistory(conversationId: string): Promise<string[]> {
    const { data: messages } = await this.supabase
      .from('whatsapp_messages')
      .select('content, direction, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages) return [];

    return messages
      .reverse()
      .map(msg => `${msg.direction === 'inbound' ? 'Paciente' : 'Asistente'}: ${msg.content}`);
  }

  /**
   * Update conversation context with AI analysis
   * 
   * @description Updates conversation record with latest AI insights
   * 
   * @param conversation - Conversation record
   * @param aiResult - AI analysis result
   */
  private async updateConversationContext(
    conversation: WhatsAppConversation,
    aiResult: WhatsAppIntent
  ): Promise<void> {
    const updatedContext = {
      ...conversation.context_data,
      lastIntent: aiResult.intent,
      lastConfidence: aiResult.confidence,
      extractedEntities: {
        ...conversation.context_data?.extractedEntities,
        ...aiResult.entities
      },
      lastUpdated: new Date().toISOString()
    };

    await this.supabase
      .from('whatsapp_conversations')
      .update({
        context_data: updatedContext,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id);
  }

  /**
   * Send response message via WhatsApp
   * 
   * @description Sends AI-generated response back to the user
   * 
   * @param contactJid - WhatsApp contact JID
   * @param responseText - Response message text
   */
  private async sendResponse(contactJid: string, responseText: string): Promise<void> {
    try {
      // Extract phone number from JID (remove @s.whatsapp.net)
      const phoneNumber = contactJid.replace('@s.whatsapp.net', '');

      await this.evolutionAPI.sendMessage(this.whatsappInstance.instance_name, {
        number: phoneNumber,
        text: responseText
      });

      // Store outbound message in database
      await this.supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: (await this.getConversationByJid(contactJid))?.id,
          message_id: `out_${Date.now()}`,
          direction: 'outbound',
          message_type: 'text',
          content: responseText,
          processed: true
        });

      console.log(`📤 Response sent to ${phoneNumber}: "${responseText}"`);
    } catch (error) {
      console.error('Error sending response:', error);
    }
  }

  /**
   * Get conversation by contact JID
   * 
   * @description Helper to find conversation by contact JID
   * 
   * @param contactJid - WhatsApp contact JID
   * @returns Conversation record or null
   */
  private async getConversationByJid(contactJid: string): Promise<WhatsAppConversation | null> {
    const { data } = await this.supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('whatsapp_instance_id', this.whatsappInstance.id)
      .eq('contact_jid', contactJid)
      .single();

    return data;
  }

  // =====================================================
  // INTENT HANDLERS (TO BE IMPLEMENTED)
  // =====================================================

  private async handleAppointmentBooking(conversation: WhatsAppConversation, aiResult: WhatsAppIntent): Promise<{success: boolean, response?: string}> {
    try {
      const entities = aiResult.entities || {};

      // Use the specialized appointment service
      const bookingResult = await this.appointmentService.processBookingRequest({
        conversationId: conversation.id,
        patientId: conversation.patient_id || undefined,
        specialty: entities.specialty || '',
        preferredDate: entities.date || '',
        preferredTime: entities.time,
        urgency: entities.urgency as any,
        symptoms: entities.symptoms,
        notes: 'Solicitud vía WhatsApp'
      });

      return {
        success: bookingResult.success,
        response: bookingResult.message
      };

    } catch (error) {
      console.error('Error in appointment booking:', error);
      return {
        success: false,
        response: "Disculpe, hubo un problema al procesar su solicitud de cita. Por favor intente nuevamente o contacte a nuestro personal."
      };
    }
  }

  private async handleAppointmentInquiry(conversation: WhatsAppConversation, aiResult: WhatsAppIntent): Promise<string> {
    try {
      // Use the specialized appointment service
      return await this.appointmentService.queryAppointments({
        conversationId: conversation.id,
        patientId: conversation.patient_id || undefined,
        status: ['scheduled', 'confirmed', 'pending']
      });
    } catch (error) {
      console.error('Error querying appointments:', error);
      return "Disculpe, hubo un problema al consultar sus citas. Por favor intente nuevamente.";
    }
  }

  private async handleAppointmentReschedule(conversation: WhatsAppConversation, aiResult: WhatsAppIntent): Promise<string> {
    return "Para reprogramar su cita, necesito el ID de la cita y su nueva fecha preferida.";
  }

  private async handleAppointmentCancel(conversation: WhatsAppConversation, aiResult: WhatsAppIntent): Promise<string> {
    return "Para cancelar su cita, por favor proporcione el ID de la cita.";
  }

  private async handleEmergency(conversation: WhatsAppConversation, aiResult: WhatsAppIntent): Promise<string> {
    return "🚨 Si es una emergencia médica, llame al 911 inmediatamente. Para urgencias, puede llamar a nuestra línea de emergencias: (555) 123-4567";
  }

  private async handleGreeting(conversation: WhatsAppConversation, aiResult: WhatsAppIntent): Promise<string> {
    return "¡Hola! Soy el asistente virtual de AgentSalud. Puedo ayudarte a agendar citas médicas, consultar tus citas existentes o responder preguntas sobre nuestros servicios. ¿En qué puedo ayudarte hoy?";
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Format availability options for WhatsApp display
   *
   * @description Formats availability slots in a user-friendly way for WhatsApp
   *
   * @param availability - Array of available slots
   * @returns Formatted text for WhatsApp
   */
  private formatAvailabilityForWhatsApp(availability: any[]): string {
    return availability.slice(0, 5).map((slot, index) => {
      const date = new Date(slot.date || slot.appointment_date).toLocaleDateString('es-ES');
      const time = slot.start_time || slot.time;
      const doctorName = slot.doctor_name || 'Doctor disponible';
      const specialty = slot.specialization || slot.specialty || '';

      return `${index + 1}. 👨‍⚕️ ${doctorName}${specialty ? ` (${specialty})` : ''}\n   📅 ${date} a las ${time}`;
    }).join('\n\n');
  }

  /**
   * Translate appointment status to Spanish
   *
   * @description Converts appointment status codes to user-friendly Spanish text
   *
   * @param status - Appointment status code
   * @returns Translated status
   */
  private translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'scheduled': 'Programada',
      'confirmed': 'Confirmada',
      'pending': 'Pendiente',
      'cancelled': 'Cancelada',
      'completed': 'Completada',
      'no_show': 'No asistió',
      'in_progress': 'En curso'
    };

    return statusMap[status] || status;
  }

  /**
   * Extract patient information from conversation context
   *
   * @description Attempts to extract or find patient information for appointment booking
   *
   * @param conversation - WhatsApp conversation record
   * @returns Patient information or null
   */
  private async extractPatientInfo(conversation: WhatsAppConversation): Promise<{id: string, name: string} | null> {
    try {
      // If we already have patient_id in conversation
      if (conversation.patient_id) {
        const { data: patient } = await this.supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', conversation.patient_id)
          .single();

        if (patient) {
          return {
            id: patient.id,
            name: `${patient.first_name} ${patient.last_name}`.trim()
          };
        }
      }

      // Try to find patient by phone number or contact name
      const phoneNumber = conversation.contact_jid.replace('@s.whatsapp.net', '');

      const { data: patientByPhone } = await this.supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .eq('organization_id', this.whatsappInstance.organization_id)
        .eq('role', 'patient')
        .ilike('phone', `%${phoneNumber}%`)
        .single();

      if (patientByPhone) {
        // Update conversation with found patient
        await this.supabase
          .from('whatsapp_conversations')
          .update({ patient_id: patientByPhone.id })
          .eq('id', conversation.id);

        return {
          id: patientByPhone.id,
          name: `${patientByPhone.first_name} ${patientByPhone.last_name}`.trim()
        };
      }

      return null;
    } catch (error) {
      console.error('Error extracting patient info:', error);
      return null;
    }
  }
}

export default WhatsAppMessageProcessor;
