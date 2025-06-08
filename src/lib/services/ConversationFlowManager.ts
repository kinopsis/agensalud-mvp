/**
 * Conversation Flow Manager
 * 
 * Manages multi-turn conversation flows for appointment booking, including
 * state management, context preservation, and conversation routing. Handles
 * complex appointment booking scenarios with confirmation flows.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import { AppointmentNLPService, ConversationIntent, ConversationContext } from './AppointmentNLPService';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface ConversationFlow {
  id: string;
  patientPhone: string;
  currentStep: ConversationStep;
  collectedData: AppointmentData;
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface ConversationStep {
  step: 'greeting' | 'intent_detection' | 'collect_service' | 'collect_date' | 
        'collect_time' | 'collect_doctor' | 'confirm_details' | 'booking' | 
        'completed' | 'escalated' | 'cancelled';
  nextStep?: ConversationStep['step'];
  prompt?: string;
  retryCount: number;
  maxRetries: number;
}

export interface AppointmentData {
  service?: string;
  date?: string;
  time?: string;
  doctor?: string;
  patientName?: string;
  urgency?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface FlowResponse {
  message: string;
  nextStep?: ConversationStep['step'];
  shouldContinue: boolean;
  requiresHumanHandoff: boolean;
  appointmentCreated?: boolean;
  appointmentId?: string;
}

// =====================================================
// CONVERSATION FLOW MANAGER
// =====================================================

/**
 * Conversation Flow Manager Class
 * 
 * @description Manages conversation flows for appointment booking
 * with state persistence and multi-turn conversation handling.
 */
export class ConversationFlowManager {
  private supabase: any;
  private nlpService: AppointmentNLPService;

  constructor() {
    this.supabase = createClient();
    this.nlpService = new AppointmentNLPService();
  }

  // =====================================================
  // FLOW MANAGEMENT
  // =====================================================

  /**
   * Process incoming message and manage conversation flow
   */
  async processMessage(patientPhone: string, message: string): Promise<FlowResponse> {
    try {
      console.log(`💬 Processing message from ${patientPhone}: ${message}`);

      // Get or create conversation flow
      let flow = await this.getActiveFlow(patientPhone);
      if (!flow) {
        flow = await this.createFlow(patientPhone);
      }

      // Check if flow has expired
      if (new Date() > new Date(flow.expiresAt)) {
        await this.expireFlow(flow.id);
        flow = await this.createFlow(patientPhone);
      }

      // Analyze message intent and entities
      const analysis = this.nlpService.analyzeMessage(message, flow.context);

      // Update context
      flow.context.lastMessage = message;
      flow.context.messageCount++;
      flow.context.updatedAt = new Date().toISOString();

      // Process based on current step and intent
      const response = await this.processStep(flow, analysis, message);

      // Update flow state
      if (response.nextStep) {
        flow.currentStep.step = response.nextStep;
        flow.currentStep.retryCount = 0;
      }

      // Save updated flow
      await this.updateFlow(flow);

      return response;

    } catch (error) {
      console.error('❌ Error processing conversation message:', error);
      return {
        message: 'Disculpa, hubo un error procesando tu mensaje. ¿Podrías intentar de nuevo?',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }
  }

  /**
   * Process conversation step based on current state and intent
   */
  private async processStep(
    flow: ConversationFlow, 
    analysis: ConversationIntent, 
    message: string
  ): Promise<FlowResponse> {
    
    // Handle human handoff intent at any step
    if (analysis.intent === 'human_handoff') {
      return await this.handleHumanHandoff(flow);
    }

    // Handle cancellation intent
    if (message.toLowerCase().includes('#salir') || analysis.intent === 'cancel_appointment') {
      return await this.handleCancellation(flow);
    }

    switch (flow.currentStep.step) {
      case 'greeting':
        return await this.handleGreeting(flow, analysis);
      
      case 'intent_detection':
        return await this.handleIntentDetection(flow, analysis);
      
      case 'collect_service':
        return await this.handleServiceCollection(flow, analysis);
      
      case 'collect_date':
        return await this.handleDateCollection(flow, analysis);
      
      case 'collect_time':
        return await this.handleTimeCollection(flow, analysis);
      
      case 'collect_doctor':
        return await this.handleDoctorCollection(flow, analysis, message);
      
      case 'confirm_details':
        return await this.handleConfirmation(flow, analysis, message);
      
      case 'booking':
        return await this.handleBooking(flow);
      
      default:
        return {
          message: 'Disculpa, algo salió mal. ¿Podrías empezar de nuevo?',
          nextStep: 'greeting',
          shouldContinue: true,
          requiresHumanHandoff: false
        };
    }
  }

  // =====================================================
  // STEP HANDLERS
  // =====================================================

  /**
   * Handle greeting step
   */
  private async handleGreeting(flow: ConversationFlow, analysis: ConversationIntent): Promise<FlowResponse> {
    if (analysis.intent === 'book_appointment') {
      return {
        message: '¡Perfecto! Te ayudo a agendar tu cita. ¿Qué tipo de servicio necesitas?\n\n• Examen Visual Completo\n• Terapia Visual\n• Adaptación de Lentes de Contacto\n• Control Visual Rápido',
        nextStep: 'collect_service',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }

    return {
      message: 'Entiendo que necesitas ayuda. ¿Te gustaría:\n\n• Agendar una nueva cita\n• Reagendar una cita existente\n• Cancelar una cita\n• Consultar información\n\n¿Qué necesitas?',
      nextStep: 'intent_detection',
      shouldContinue: true,
      requiresHumanHandoff: false
    };
  }

  /**
   * Handle intent detection step
   */
  private async handleIntentDetection(flow: ConversationFlow, analysis: ConversationIntent): Promise<FlowResponse> {
    switch (analysis.intent) {
      case 'book_appointment':
        return {
          message: '¡Perfecto! Te ayudo a agendar tu cita. ¿Qué tipo de servicio necesitas?\n\n• Examen Visual Completo\n• Terapia Visual\n• Adaptación de Lentes de Contacto\n• Control Visual Rápido',
          nextStep: 'collect_service',
          shouldContinue: true,
          requiresHumanHandoff: false
        };
      
      case 'reschedule_appointment':
      case 'cancel_appointment':
      case 'check_availability':
      case 'get_info':
        return {
          message: 'Para este tipo de consulta, te voy a conectar con nuestro personal que te podrá ayudar mejor. Un momento por favor...',
          shouldContinue: false,
          requiresHumanHandoff: true
        };
      
      default:
        flow.currentStep.retryCount++;
        if (flow.currentStep.retryCount >= flow.currentStep.maxRetries) {
          return {
            message: 'Parece que necesitas ayuda específica. Te voy a conectar con nuestro personal.',
            shouldContinue: false,
            requiresHumanHandoff: true
          };
        }
        
        return {
          message: 'No estoy seguro de entender. ¿Podrías decirme si quieres:\n\n• Agendar una nueva cita\n• Reagendar una cita\n• Cancelar una cita\n• Obtener información',
          shouldContinue: true,
          requiresHumanHandoff: false
        };
    }
  }

  /**
   * Handle service collection step
   */
  private async handleServiceCollection(flow: ConversationFlow, analysis: ConversationIntent): Promise<FlowResponse> {
    if (analysis.entities.service) {
      flow.collectedData.service = analysis.entities.service.normalized;
      
      return {
        message: `Perfecto, ${analysis.entities.service.normalized}. ¿Qué día te gustaría la cita? Puedes decirme:\n\n• Un día específico (ej: "mañana", "viernes")\n• Una fecha (ej: "15 de febrero")\n\nRecuerda que necesitamos al menos 24 horas de anticipación.`,
        nextStep: 'collect_date',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }

    flow.currentStep.retryCount++;
    if (flow.currentStep.retryCount >= flow.currentStep.maxRetries) {
      return {
        message: 'Te voy a conectar con nuestro personal para que te ayude a elegir el servicio adecuado.',
        shouldContinue: false,
        requiresHumanHandoff: true
      };
    }

    return {
      message: 'Por favor, elige uno de estos servicios:\n\n• Examen Visual Completo\n• Terapia Visual\n• Adaptación de Lentes de Contacto\n• Control Visual Rápido\n\n¿Cuál necesitas?',
      shouldContinue: true,
      requiresHumanHandoff: false
    };
  }

  /**
   * Handle date collection step
   */
  private async handleDateCollection(flow: ConversationFlow, analysis: ConversationIntent): Promise<FlowResponse> {
    if (analysis.entities.date) {
      const validation = this.nlpService.validateEntities({ date: analysis.entities.date });
      
      if (!validation.valid) {
        return {
          message: `${validation.errors.join('. ')}. ¿Podrías elegir otra fecha?`,
          shouldContinue: true,
          requiresHumanHandoff: false
        };
      }

      flow.collectedData.date = analysis.entities.date.normalized;
      
      return {
        message: `Excelente, el ${new Date(analysis.entities.date.normalized).toLocaleDateString('es-ES')}. ¿A qué hora prefieres? Nuestro horario es de 8:00 AM a 6:00 PM de lunes a viernes, y sábados de 8:00 AM a 2:00 PM.`,
        nextStep: 'collect_time',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }

    flow.currentStep.retryCount++;
    if (flow.currentStep.retryCount >= flow.currentStep.maxRetries) {
      return {
        message: 'Te ayudo mejor por teléfono para coordinar la fecha. Te conecto con nuestro personal.',
        shouldContinue: false,
        requiresHumanHandoff: true
      };
    }

    return {
      message: 'Por favor, dime qué día prefieres. Puedes decir:\n\n• "Mañana"\n• "El viernes"\n• "15 de febrero"\n\nRecuerda que necesitamos 24 horas de anticipación.',
      shouldContinue: true,
      requiresHumanHandoff: false
    };
  }

  /**
   * Handle time collection step
   */
  private async handleTimeCollection(flow: ConversationFlow, analysis: ConversationIntent): Promise<FlowResponse> {
    if (analysis.entities.time) {
      const validation = this.nlpService.validateEntities({ time: analysis.entities.time });
      
      if (!validation.valid) {
        return {
          message: `${validation.errors.join('. ')}. ¿Podrías elegir un horario entre 8:00 AM y 6:00 PM?`,
          shouldContinue: true,
          requiresHumanHandoff: false
        };
      }

      flow.collectedData.time = analysis.entities.time.normalized;
      
      return {
        message: `Perfecto, a las ${analysis.entities.time.value}. ¿Tienes preferencia por algún doctor en particular?\n\n• Dr. Elena López (Optometría Pediátrica)\n• Dr. Ana Rodríguez (Optometría Clínica)\n• Dr. Pedro Sánchez (Contactología)\n\nO puedes decir "cualquiera" si no tienes preferencia.`,
        nextStep: 'collect_doctor',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }

    flow.currentStep.retryCount++;
    if (flow.currentStep.retryCount >= flow.currentStep.maxRetries) {
      return {
        message: 'Te ayudo mejor por teléfono para coordinar el horario. Te conecto con nuestro personal.',
        shouldContinue: false,
        requiresHumanHandoff: true
      };
    }

    return {
      message: 'Por favor, dime a qué hora prefieres. Por ejemplo:\n\n• "10:00 AM"\n• "2:30 PM"\n• "En la mañana"\n\nNuestro horario es de 8:00 AM a 6:00 PM.',
      shouldContinue: true,
      requiresHumanHandoff: false
    };
  }

  /**
   * Handle doctor collection step
   */
  private async handleDoctorCollection(flow: ConversationFlow, analysis: ConversationIntent, message?: string): Promise<FlowResponse> {
    if (analysis.entities.doctor) {
      flow.collectedData.doctor = analysis.entities.doctor.normalized;
    } else if (message && (message.toLowerCase().includes('cualquiera') || message.toLowerCase().includes('no importa'))) {
      flow.collectedData.doctor = 'Cualquier doctor disponible';
    }

    if (flow.collectedData.doctor) {
      return {
        message: this.generateConfirmationMessage(flow.collectedData),
        nextStep: 'confirm_details',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }

    flow.currentStep.retryCount++;
    if (flow.currentStep.retryCount >= flow.currentStep.maxRetries) {
      flow.collectedData.doctor = 'Cualquier doctor disponible';
      return {
        message: this.generateConfirmationMessage(flow.collectedData),
        nextStep: 'confirm_details',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }

    return {
      message: 'Por favor, elige un doctor o di "cualquiera":\n\n• Dr. Elena López\n• Dr. Ana Rodríguez\n• Dr. Pedro Sánchez\n• Cualquiera',
      shouldContinue: true,
      requiresHumanHandoff: false
    };
  }

  /**
   * Handle confirmation step
   */
  private async handleConfirmation(flow: ConversationFlow, analysis: ConversationIntent, message: string): Promise<FlowResponse> {
    const isConfirmed = /\b(si|sí|confirmo|correcto|ok|está bien|perfecto)\b/i.test(message);
    const isDenied = /\b(no|incorrecto|cambiar|modificar)\b/i.test(message);

    if (isConfirmed) {
      return {
        message: 'Excelente! Estoy procesando tu cita. Un momento por favor...',
        nextStep: 'booking',
        shouldContinue: true,
        requiresHumanHandoff: false
      };
    }

    if (isDenied) {
      return {
        message: 'Entiendo que quieres hacer cambios. Te conecto con nuestro personal para ajustar los detalles.',
        shouldContinue: false,
        requiresHumanHandoff: true
      };
    }

    flow.currentStep.retryCount++;
    if (flow.currentStep.retryCount >= flow.currentStep.maxRetries) {
      return {
        message: 'Te conecto con nuestro personal para confirmar los detalles.',
        shouldContinue: false,
        requiresHumanHandoff: true
      };
    }

    return {
      message: 'Por favor, responde "Sí" para confirmar o "No" si quieres hacer cambios.',
      shouldContinue: true,
      requiresHumanHandoff: false
    };
  }

  /**
   * Handle booking step
   */
  private async handleBooking(flow: ConversationFlow): Promise<FlowResponse> {
    try {
      // Here we would integrate with the appointment booking system
      // For now, we'll simulate the booking process
      
      const appointmentId = `APT-${Date.now()}`;
      
      return {
        message: `🎉 ¡Cita agendada exitosamente!\n\n📋 **Detalles de tu cita:**\n• Servicio: ${flow.collectedData.service}\n• Fecha: ${new Date(flow.collectedData.date!).toLocaleDateString('es-ES')}\n• Hora: ${flow.collectedData.time}\n• Doctor: ${flow.collectedData.doctor}\n\n📱 **Número de confirmación:** ${appointmentId}\n\nRecibirás un recordatorio 24 horas antes. ¡Nos vemos pronto!`,
        nextStep: 'completed',
        shouldContinue: false,
        requiresHumanHandoff: false,
        appointmentCreated: true,
        appointmentId
      };

    } catch (error) {
      console.error('❌ Error creating appointment:', error);
      return {
        message: 'Hubo un problema al agendar tu cita. Te conecto con nuestro personal para completar el proceso.',
        shouldContinue: false,
        requiresHumanHandoff: true
      };
    }
  }

  /**
   * Handle human handoff
   */
  private async handleHumanHandoff(flow: ConversationFlow): Promise<FlowResponse> {
    flow.currentStep.step = 'escalated';
    
    return {
      message: 'Te estoy conectando con nuestro personal. En un momento alguien te atenderá para ayudarte con tu consulta.',
      shouldContinue: false,
      requiresHumanHandoff: true
    };
  }

  /**
   * Handle conversation cancellation
   */
  private async handleCancellation(flow: ConversationFlow): Promise<FlowResponse> {
    flow.currentStep.step = 'cancelled';
    
    return {
      message: 'Entendido. Si necesitas agendar una cita más tarde, solo escríbeme "Hola" y te ayudo. ¡Que tengas un buen día!',
      shouldContinue: false,
      requiresHumanHandoff: false
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Generate confirmation message
   */
  private generateConfirmationMessage(data: AppointmentData): string {
    return `📋 **Confirma los detalles de tu cita:**\n\n• **Servicio:** ${data.service}\n• **Fecha:** ${new Date(data.date!).toLocaleDateString('es-ES')}\n• **Hora:** ${data.time}\n• **Doctor:** ${data.doctor}\n\n¿Está todo correcto? Responde "Sí" para confirmar o "No" si quieres hacer cambios.`;
  }

  // =====================================================
  // DATABASE OPERATIONS
  // =====================================================

  /**
   * Get active conversation flow for patient
   */
  private async getActiveFlow(patientPhone: string): Promise<ConversationFlow | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_flows')
        .select('*')
        .eq('patient_phone', patientPhone)
        .eq('active', true)
        .single();

      if (error || !data) return null;

      return data;
    } catch (error) {
      console.error('❌ Error getting active flow:', error);
      return null;
    }
  }

  /**
   * Create new conversation flow
   */
  private async createFlow(patientPhone: string): Promise<ConversationFlow> {
    const flow: ConversationFlow = {
      id: `flow-${Date.now()}`,
      patientPhone,
      currentStep: {
        step: 'greeting',
        retryCount: 0,
        maxRetries: 3
      },
      collectedData: {},
      context: {
        patientPhone,
        conversationState: 'greeting',
        lastMessage: '',
        messageCount: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        extractedData: {}
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };

    // In a real implementation, this would be saved to the database
    return flow;
  }

  /**
   * Update conversation flow
   */
  private async updateFlow(flow: ConversationFlow): Promise<void> {
    flow.updatedAt = new Date().toISOString();
    // In a real implementation, this would update the database
  }

  /**
   * Expire conversation flow
   */
  private async expireFlow(flowId: string): Promise<void> {
    // In a real implementation, this would mark the flow as inactive
    console.log(`⏰ Expiring conversation flow: ${flowId}`);
  }
}
