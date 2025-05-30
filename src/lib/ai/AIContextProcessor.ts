'use client';

/**
 * AIContextProcessor
 * 
 * Procesador avanzado para extraer y transferir contexto de IA
 * desde conversaciones del chatbot hacia el flujo visual de citas.
 * 
 * Características principales:
 * - Extracción de preferencias de conversación
 * - Análisis de patrones temporales y urgencia
 * - Generación de sugerencias contextuales
 * - Preservación de contexto entre transiciones
 * - Métricas de confianza para recomendaciones
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 2
 * @version 1.0.0
 */

import { AppointmentIntent } from './appointment-processor';

/**
 * Contexto de IA extraído de conversaciones
 */
export interface AIContext {
  // Preferencias extraídas
  suggestedDates?: string[];
  preferredTimeRange?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
  flexibilityLevel?: 'rigid' | 'flexible' | 'very-flexible';
  
  // Entidades específicas mencionadas
  mentionedDoctors?: string[];
  mentionedServices?: string[];
  mentionedLocations?: string[];
  
  // Análisis temporal
  timeConstraints?: {
    earliestDate?: string;
    latestDate?: string;
    preferredDays?: string[]; // ['monday', 'tuesday', etc.]
    avoidedDays?: string[];
    preferredTimes?: string[]; // ['09:00', '14:30', etc.]
  };
  
  // Contexto médico
  medicalContext?: {
    symptoms?: string[];
    urgencyIndicators?: string[];
    followUpType?: 'routine' | 'urgent' | 'emergency';
    previousVisitContext?: string;
  };
  
  // Métricas de confianza
  confidence?: {
    overall: number; // 0-1
    datePreference: number;
    timePreference: number;
    urgency: number;
    flexibility: number;
  };
  
  // Metadatos de conversación
  conversationMetadata?: {
    messageCount: number;
    extractedAt: string;
    lastUpdated: string;
    conversationId?: string;
    userId?: string;
  };
  
  // Explicaciones para UI
  explanations?: {
    dateReason?: string;
    timeReason?: string;
    urgencyReason?: string;
    flexibilityReason?: string;
  };
}

/**
 * Mensaje de chat para análisis
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

/**
 * Opciones de procesamiento
 */
interface ProcessingOptions {
  organizationId: string;
  userId?: string;
  includeExplanations?: boolean;
  confidenceThreshold?: number;
}

/**
 * Resultado del procesamiento
 */
interface ProcessingResult {
  context: AIContext;
  recommendations: {
    suggestedDates: Array<{
      date: string;
      reason: string;
      confidence: number;
    }>;
    suggestedTimes: Array<{
      time: string;
      reason: string;
      confidence: number;
    }>;
  };
  nextActions: string[];
  shouldTransitionToVisual: boolean;
}

/**
 * Clase principal AIContextProcessor
 */
export class AIContextProcessor {
  private organizationId: string;
  private confidenceThreshold: number;

  constructor(organizationId: string, confidenceThreshold = 0.6) {
    this.organizationId = organizationId;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Procesar conversación completa y extraer contexto
   */
  async processConversation(
    messages: ChatMessage[],
    currentIntent?: AppointmentIntent,
    options: ProcessingOptions = { organizationId: this.organizationId }
  ): Promise<ProcessingResult> {
    try {
      // Filtrar solo mensajes del usuario
      const userMessages = messages.filter(msg => msg.role === 'user');
      const conversationText = userMessages.map(msg => msg.content).join(' ');

      // Extraer contexto básico
      const context = await this.extractBasicContext(conversationText, currentIntent);
      
      // Enriquecer con análisis temporal
      const enrichedContext = await this.enrichWithTemporalAnalysis(context, userMessages);
      
      // Generar recomendaciones
      const recommendations = await this.generateRecommendations(enrichedContext, options);
      
      // Determinar próximas acciones
      const nextActions = this.determineNextActions(enrichedContext, recommendations);
      
      // Decidir si debe transicionar a visual
      const shouldTransitionToVisual = this.shouldTransitionToVisual(enrichedContext, recommendations);

      return {
        context: enrichedContext,
        recommendations,
        nextActions,
        shouldTransitionToVisual
      };
    } catch (error) {
      console.error('Error processing AI context:', error);
      
      // Retornar contexto básico en caso de error
      return {
        context: this.createFallbackContext(currentIntent),
        recommendations: { suggestedDates: [], suggestedTimes: [] },
        nextActions: ['manual_selection'],
        shouldTransitionToVisual: true
      };
    }
  }

  /**
   * Extraer contexto básico de la conversación
   */
  private async extractBasicContext(
    conversationText: string,
    currentIntent?: AppointmentIntent
  ): Promise<AIContext> {
    const context: AIContext = {
      conversationMetadata: {
        messageCount: conversationText.split(' ').length,
        extractedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };

    // Usar intent actual si está disponible
    if (currentIntent) {
      if (currentIntent.preferredDate) {
        context.suggestedDates = [currentIntent.preferredDate];
      }
      
      if (currentIntent.preferredTime) {
        context.preferredTimeRange = this.categorizeTime(currentIntent.preferredTime);
      }
      
      context.urgencyLevel = this.mapUrgencyLevel(currentIntent.urgency);
      
      context.confidence = {
        overall: currentIntent.confidence,
        datePreference: currentIntent.preferredDate ? 0.8 : 0.3,
        timePreference: currentIntent.preferredTime ? 0.8 : 0.3,
        urgency: 0.7,
        flexibility: 0.5
      };
    }

    // Análisis de texto para extraer preferencias adicionales
    context.flexibilityLevel = this.analyzeFlexibility(conversationText);
    context.timeConstraints = this.extractTimeConstraints(conversationText);
    context.medicalContext = this.extractMedicalContext(conversationText);

    // Generar explicaciones
    if (context.confidence && context.confidence.overall > this.confidenceThreshold) {
      context.explanations = this.generateExplanations(context, conversationText);
    }

    return context;
  }

  /**
   * Enriquecer contexto con análisis temporal
   */
  private async enrichWithTemporalAnalysis(
    context: AIContext,
    userMessages: ChatMessage[]
  ): Promise<AIContext> {
    // Analizar patrones temporales en mensajes
    const temporalPatterns = this.analyzeTemporalPatterns(userMessages);
    
    // Actualizar contexto con patrones encontrados
    if (temporalPatterns.preferredDays.length > 0) {
      context.timeConstraints = {
        ...context.timeConstraints,
        preferredDays: temporalPatterns.preferredDays
      };
    }

    // Generar fechas sugeridas basadas en patrones
    if (!context.suggestedDates || context.suggestedDates.length === 0) {
      context.suggestedDates = this.generateSuggestedDates(temporalPatterns, context);
    }

    return context;
  }

  /**
   * Generar recomendaciones basadas en contexto
   */
  private async generateRecommendations(
    context: AIContext,
    options: ProcessingOptions
  ): Promise<ProcessingResult['recommendations']> {
    const suggestedDates: ProcessingResult['recommendations']['suggestedDates'] = [];
    const suggestedTimes: ProcessingResult['recommendations']['suggestedTimes'] = [];

    // Generar sugerencias de fechas
    if (context.suggestedDates) {
      for (const date of context.suggestedDates) {
        suggestedDates.push({
          date,
          reason: this.generateDateReason(date, context),
          confidence: context.confidence?.datePreference || 0.5
        });
      }
    }

    // Generar sugerencias de horarios
    const timeSlots = this.generateTimeSlots(context);
    for (const time of timeSlots) {
      suggestedTimes.push({
        time,
        reason: this.generateTimeReason(time, context),
        confidence: context.confidence?.timePreference || 0.5
      });
    }

    return { suggestedDates, suggestedTimes };
  }

  /**
   * Determinar próximas acciones recomendadas
   */
  private determineNextActions(
    context: AIContext,
    recommendations: ProcessingResult['recommendations']
  ): string[] {
    const actions: string[] = [];

    if (recommendations.suggestedDates.length > 0) {
      actions.push('show_date_suggestions');
    }

    if (context.urgencyLevel === 'high' || context.urgencyLevel === 'emergency') {
      actions.push('prioritize_earliest_available');
    }

    if (context.flexibilityLevel === 'very-flexible') {
      actions.push('show_express_booking');
    }

    if (context.confidence && context.confidence.overall < this.confidenceThreshold) {
      actions.push('request_clarification');
    } else {
      actions.push('transition_to_visual');
    }

    return actions;
  }

  /**
   * Decidir si debe transicionar a vista visual
   */
  private shouldTransitionToVisual(
    context: AIContext,
    recommendations: ProcessingResult['recommendations']
  ): boolean {
    // Transicionar si hay suficiente confianza
    if (context.confidence && context.confidence.overall >= this.confidenceThreshold) {
      return true;
    }

    // Transicionar si hay sugerencias específicas
    if (recommendations.suggestedDates.length > 0 || recommendations.suggestedTimes.length > 0) {
      return true;
    }

    // Transicionar si el usuario parece listo para seleccionar
    if (context.urgencyLevel === 'high' || context.flexibilityLevel === 'rigid') {
      return true;
    }

    return false;
  }

  // Métodos auxiliares privados

  private categorizeTime(time: string): 'morning' | 'afternoon' | 'evening' | 'flexible' {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  private mapUrgencyLevel(urgency: string): 'low' | 'medium' | 'high' | 'emergency' {
    switch (urgency) {
      case 'urgent': return 'high';
      case 'routine': return 'low';
      case 'flexible': return 'low';
      default: return 'medium';
    }
  }

  private analyzeFlexibility(text: string): 'rigid' | 'flexible' | 'very-flexible' {
    const flexibleKeywords = ['cualquier', 'flexible', 'cuando sea', 'no importa'];
    const rigidKeywords = ['específico', 'exacto', 'solo', 'únicamente'];
    
    const flexibleCount = flexibleKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;
    
    const rigidCount = rigidKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;

    if (flexibleCount > rigidCount && flexibleCount >= 2) return 'very-flexible';
    if (flexibleCount > rigidCount) return 'flexible';
    return 'rigid';
  }

  private extractTimeConstraints(text: string): AIContext['timeConstraints'] {
    // Implementación simplificada - en producción usaría NLP más avanzado
    const constraints: AIContext['timeConstraints'] = {};
    
    // Detectar días preferidos
    const dayKeywords = {
      'lunes': 'monday',
      'martes': 'tuesday',
      'miércoles': 'wednesday',
      'jueves': 'thursday',
      'viernes': 'friday',
      'sábado': 'saturday',
      'domingo': 'sunday'
    };

    constraints.preferredDays = [];
    for (const [spanish, english] of Object.entries(dayKeywords)) {
      if (text.toLowerCase().includes(spanish)) {
        constraints.preferredDays.push(english);
      }
    }

    return constraints;
  }

  private extractMedicalContext(text: string): AIContext['medicalContext'] {
    const urgencyKeywords = ['urgente', 'dolor', 'emergencia', 'inmediato'];
    const routineKeywords = ['control', 'revisión', 'chequeo', 'rutina'];
    
    const hasUrgency = urgencyKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    const hasRoutine = routineKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    return {
      urgencyIndicators: hasUrgency ? urgencyKeywords.filter(k => text.toLowerCase().includes(k)) : [],
      followUpType: hasUrgency ? 'urgent' : hasRoutine ? 'routine' : 'routine'
    };
  }

  private analyzeTemporalPatterns(messages: ChatMessage[]): {
    preferredDays: string[];
    timePatterns: string[];
  } {
    // Análisis simplificado de patrones temporales
    return {
      preferredDays: [],
      timePatterns: []
    };
  }

  private generateSuggestedDates(
    patterns: any,
    context: AIContext
  ): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    // Generar próximas 3 fechas disponibles
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Evitar fines de semana para citas rutinarias
      if (context.medicalContext?.followUpType === 'routine' && 
          (date.getDay() === 0 || date.getDay() === 6)) {
        continue;
      }
      
      dates.push(date.toISOString().split('T')[0]);
      
      if (dates.length >= 3) break;
    }
    
    return dates;
  }

  private generateTimeSlots(context: AIContext): string[] {
    const slots: string[] = [];
    
    switch (context.preferredTimeRange) {
      case 'morning':
        slots.push('09:00', '10:00', '11:00');
        break;
      case 'afternoon':
        slots.push('14:00', '15:00', '16:00');
        break;
      case 'evening':
        slots.push('17:00', '18:00', '19:00');
        break;
      default:
        slots.push('09:00', '14:00', '17:00');
    }
    
    return slots;
  }

  private generateExplanations(context: AIContext, text: string): AIContext['explanations'] {
    return {
      dateReason: context.suggestedDates?.length ? 
        'Basado en tu preferencia mencionada en la conversación' : undefined,
      timeReason: context.preferredTimeRange ? 
        `Prefieres horarios de ${context.preferredTimeRange === 'morning' ? 'mañana' : 
          context.preferredTimeRange === 'afternoon' ? 'tarde' : 'noche'}` : undefined,
      urgencyReason: context.urgencyLevel === 'high' ? 
        'Detectamos urgencia en tu solicitud' : undefined
    };
  }

  private generateDateReason(date: string, context: AIContext): string {
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    
    if (context.explanations?.dateReason) {
      return context.explanations.dateReason;
    }
    
    return `Fecha disponible para ${dayName}`;
  }

  private generateTimeReason(time: string, context: AIContext): string {
    if (context.explanations?.timeReason) {
      return context.explanations.timeReason;
    }
    
    return `Horario disponible`;
  }

  private createFallbackContext(currentIntent?: AppointmentIntent): AIContext {
    return {
      urgencyLevel: 'medium',
      flexibilityLevel: 'flexible',
      confidence: {
        overall: 0.3,
        datePreference: 0.3,
        timePreference: 0.3,
        urgency: 0.5,
        flexibility: 0.5
      },
      conversationMetadata: {
        messageCount: 0,
        extractedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

export default AIContextProcessor;
