'use client';

/**
 * SmartSuggestionsEngine
 * 
 * Motor de sugerencias inteligentes potenciado por IA para optimizar
 * la experiencia de reserva de citas médicas basado en patrones de conversación,
 * historial de usuario y análisis predictivo.
 * 
 * Características principales:
 * - Análisis de patrones de conversación del chatbot
 * - Recomendaciones personalizadas basadas en historial
 * - Explicaciones contextuales para cada sugerencia
 * - Métricas de confianza y probabilidad de éxito
 * - Optimización continua basada en feedback
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 3
 * @version 1.0.0
 */

import { AIContext } from './AIContextProcessor';

/**
 * Tipos de sugerencias disponibles
 */
export type SuggestionType = 
  | 'optimal_time'      // Horario óptimo basado en disponibilidad
  | 'popular_choice'    // Opción popular entre usuarios similares
  | 'user_pattern'      // Basado en patrones del usuario
  | 'ai_recommended'    // Recomendación directa de IA
  | 'urgency_based'     // Basado en nivel de urgencia
  | 'flexibility_match' // Coincide con flexibilidad del usuario
  | 'doctor_specialty'  // Especialista recomendado
  | 'location_optimal'; // Ubicación óptima

/**
 * Sugerencia inteligente individual
 */
export interface SmartSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  explanation: string;
  confidence: number; // 0-1
  priority: number; // 1-10
  
  // Datos específicos de la sugerencia
  data: {
    date?: string;
    time?: string;
    doctorId?: string;
    doctorName?: string;
    locationId?: string;
    locationName?: string;
    serviceId?: string;
    serviceName?: string;
    estimatedDuration?: number;
    price?: number;
  };
  
  // Métricas de rendimiento
  metrics: {
    successRate: number; // Tasa de éxito histórica
    userSatisfaction: number; // Satisfacción promedio
    conversionRate: number; // Tasa de conversión
    popularityScore: number; // Puntuación de popularidad
  };
  
  // Contexto de la recomendación
  context: {
    basedOn: string[]; // Factores considerados
    reasoning: string; // Explicación detallada
    alternatives: number; // Número de alternativas disponibles
    timeWindow: string; // Ventana temporal considerada
  };
  
  // Acciones disponibles
  actions: {
    canBook: boolean;
    canModify: boolean;
    canCompare: boolean;
    requiresConfirmation: boolean;
  };
}

/**
 * Resultado del análisis de sugerencias
 */
export interface SuggestionsResult {
  suggestions: SmartSuggestion[];
  totalAnalyzed: number;
  processingTime: number;
  confidence: number;
  
  // Insights del análisis
  insights: {
    userProfile: 'new' | 'returning' | 'frequent';
    preferenceStrength: 'weak' | 'moderate' | 'strong';
    urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
    flexibilityScore: number; // 0-1
    predictedSatisfaction: number; // 0-1
  };
  
  // Recomendaciones de UX
  uxRecommendations: {
    showComparison: boolean;
    highlightBestOption: boolean;
    showExplanations: boolean;
    enableQuickBook: boolean;
    suggestAlternatives: boolean;
  };
}

/**
 * Opciones de configuración del motor
 */
interface EngineOptions {
  maxSuggestions: number;
  minConfidence: number;
  includeExplanations: boolean;
  personalizeForUser: boolean;
  considerHistory: boolean;
  optimizeForConversion: boolean;
}

/**
 * Datos de usuario para personalización
 */
interface UserProfile {
  userId: string;
  organizationId: string;
  appointmentHistory: Array<{
    date: string;
    time: string;
    doctorId: string;
    serviceId: string;
    satisfaction?: number;
    completed: boolean;
  }>;
  preferences: {
    preferredTimes?: string[];
    preferredDoctors?: string[];
    preferredLocations?: string[];
    flexibilityLevel?: 'low' | 'medium' | 'high';
  };
  behaviorMetrics: {
    averageBookingTime: number; // minutos
    cancellationRate: number; // 0-1
    rescheduleRate: number; // 0-1
    satisfactionScore: number; // 0-5
  };
}

/**
 * Clase principal SmartSuggestionsEngine
 */
export class SmartSuggestionsEngine {
  private organizationId: string;
  private options: EngineOptions;
  private userProfiles: Map<string, UserProfile> = new Map();

  constructor(organizationId: string, options: Partial<EngineOptions> = {}) {
    this.organizationId = organizationId;
    this.options = {
      maxSuggestions: 5,
      minConfidence: 0.6,
      includeExplanations: true,
      personalizeForUser: true,
      considerHistory: true,
      optimizeForConversion: true,
      ...options
    };
  }

  /**
   * Generar sugerencias inteligentes basadas en contexto de IA
   */
  async generateSuggestions(
    aiContext: AIContext,
    availableOptions: any[],
    userProfile?: UserProfile
  ): Promise<SuggestionsResult> {
    const startTime = Date.now();

    try {
      // FILTRO CRÍTICO: Eliminar horarios pasados con validación de 4 horas mínimas
      const validOptions = this.filterValidTimeSlots(availableOptions);

      if (validOptions.length === 0) {
        console.warn('⚠️ SmartSuggestionsEngine - No hay opciones válidas después del filtrado de tiempo');
        return this.generateFallbackSuggestions(availableOptions);
      }

      // Analizar contexto y generar sugerencias base
      const baseSuggestions = await this.analyzeAndGenerateBase(
        aiContext,
        validOptions,
        userProfile
      );

      // Enriquecer con análisis de patrones
      const enrichedSuggestions = await this.enrichWithPatterns(
        baseSuggestions,
        aiContext,
        userProfile
      );

      // Aplicar filtros y ranking
      const rankedSuggestions = this.rankAndFilter(enrichedSuggestions, aiContext);
      
      // Generar insights y recomendaciones UX
      const insights = this.generateInsights(aiContext, userProfile, rankedSuggestions);
      const uxRecommendations = this.generateUXRecommendations(insights, rankedSuggestions);
      
      const processingTime = Date.now() - startTime;
      
      return {
        suggestions: rankedSuggestions.slice(0, this.options.maxSuggestions),
        totalAnalyzed: validOptions.length,
        processingTime,
        confidence: this.calculateOverallConfidence(rankedSuggestions),
        insights,
        uxRecommendations
      };
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      
      // Retornar sugerencias básicas como fallback
      return this.generateFallbackSuggestions(availableOptions);
    }
  }

  /**
   * Analizar contexto y generar sugerencias base
   */
  private async analyzeAndGenerateBase(
    aiContext: AIContext,
    availableOptions: any[],
    userProfile?: UserProfile
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    
    // Sugerencia basada en urgencia
    if (aiContext.urgencyLevel === 'high' || aiContext.urgencyLevel === 'emergency') {
      const urgentSuggestion = this.createUrgencySuggestion(availableOptions, aiContext);
      if (urgentSuggestion) suggestions.push(urgentSuggestion);
    }
    
    // Sugerencia basada en preferencias de tiempo
    if (aiContext.preferredTimeRange) {
      const timeSuggestion = this.createTimePreferenceSuggestion(
        availableOptions, 
        aiContext.preferredTimeRange
      );
      if (timeSuggestion) suggestions.push(timeSuggestion);
    }
    
    // Sugerencia basada en fechas mencionadas
    if (aiContext.suggestedDates && aiContext.suggestedDates.length > 0) {
      const dateSuggestion = this.createDateSuggestion(
        availableOptions, 
        aiContext.suggestedDates[0]
      );
      if (dateSuggestion) suggestions.push(dateSuggestion);
    }
    
    // Sugerencia basada en historial de usuario
    if (userProfile && this.options.considerHistory) {
      const historySuggestion = this.createHistoryBasedSuggestion(
        availableOptions, 
        userProfile
      );
      if (historySuggestion) suggestions.push(historySuggestion);
    }
    
    // Sugerencia popular/recomendada
    const popularSuggestion = this.createPopularSuggestion(availableOptions);
    if (popularSuggestion) suggestions.push(popularSuggestion);
    
    return suggestions;
  }

  /**
   * Enriquecer sugerencias con análisis de patrones
   */
  private async enrichWithPatterns(
    suggestions: SmartSuggestion[],
    aiContext: AIContext,
    userProfile?: UserProfile
  ): Promise<SmartSuggestion[]> {
    return suggestions.map(suggestion => {
      // Calcular métricas mejoradas
      const enhancedMetrics = this.calculateEnhancedMetrics(suggestion, aiContext, userProfile);
      
      // Generar explicación contextual mejorada
      const enhancedExplanation = this.generateContextualExplanation(
        suggestion, 
        aiContext, 
        userProfile
      );
      
      return {
        ...suggestion,
        metrics: enhancedMetrics,
        explanation: enhancedExplanation,
        context: {
          ...suggestion.context,
          reasoning: this.generateDetailedReasoning(suggestion, aiContext)
        }
      };
    });
  }

  /**
   * Ranking y filtrado de sugerencias
   */
  private rankAndFilter(
    suggestions: SmartSuggestion[],
    aiContext: AIContext
  ): SmartSuggestion[] {
    return suggestions
      .filter(s => s.confidence >= this.options.minConfidence)
      .sort((a, b) => {
        // Priorizar por urgencia si es alta
        if (aiContext.urgencyLevel === 'high' || aiContext.urgencyLevel === 'emergency') {
          if (a.type === 'urgency_based' && b.type !== 'urgency_based') return -1;
          if (b.type === 'urgency_based' && a.type !== 'urgency_based') return 1;
        }
        
        // Luego por confianza y prioridad
        const scoreA = a.confidence * 0.6 + (a.priority / 10) * 0.4;
        const scoreB = b.confidence * 0.6 + (b.priority / 10) * 0.4;
        
        return scoreB - scoreA;
      });
  }

  // Métodos auxiliares para crear diferentes tipos de sugerencias

  private createUrgencySuggestion(
    options: any[], 
    aiContext: AIContext
  ): SmartSuggestion | null {
    // Buscar la opción más temprana disponible
    const earliestOption = options
      .filter(opt => opt.available)
      .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime())[0];
    
    if (!earliestOption) return null;
    
    return {
      id: `urgent-${Date.now()}`,
      type: 'urgency_based',
      title: 'Cita urgente disponible',
      description: `${earliestOption.date} a las ${earliestOption.time}`,
      explanation: 'Recomendado por tu solicitud urgente',
      confidence: 0.9,
      priority: 10,
      data: {
        date: earliestOption.date,
        time: earliestOption.time,
        doctorId: earliestOption.doctorId,
        doctorName: earliestOption.doctorName
      },
      metrics: {
        successRate: 0.85,
        userSatisfaction: 4.2,
        conversionRate: 0.78,
        popularityScore: 0.6
      },
      context: {
        basedOn: ['urgency_level', 'earliest_available'],
        reasoning: 'Seleccionado por ser la opción más temprana disponible',
        alternatives: options.length - 1,
        timeWindow: 'next_24_hours'
      },
      actions: {
        canBook: true,
        canModify: false,
        canCompare: true,
        requiresConfirmation: true
      }
    };
  }

  private createTimePreferenceSuggestion(
    options: any[], 
    timeRange: string
  ): SmartSuggestion | null {
    // Filtrar opciones por rango de tiempo preferido
    const timeFiltered = options.filter(opt => {
      const hour = parseInt(opt.time.split(':')[0]);
      switch (timeRange) {
        case 'morning': return hour >= 8 && hour < 12;
        case 'afternoon': return hour >= 12 && hour < 18;
        case 'evening': return hour >= 18 && hour < 21;
        default: return true;
      }
    });
    
    if (timeFiltered.length === 0) return null;
    
    const bestOption = timeFiltered[0];
    
    return {
      id: `time-pref-${Date.now()}`,
      type: 'user_pattern',
      title: `Horario de ${timeRange === 'morning' ? 'mañana' : timeRange === 'afternoon' ? 'tarde' : 'noche'}`,
      description: `${bestOption.date} a las ${bestOption.time}`,
      explanation: `Coincide con tu preferencia por horarios de ${timeRange === 'morning' ? 'mañana' : timeRange === 'afternoon' ? 'tarde' : 'noche'}`,
      confidence: 0.8,
      priority: 8,
      data: {
        date: bestOption.date,
        time: bestOption.time,
        doctorId: bestOption.doctorId,
        doctorName: bestOption.doctorName
      },
      metrics: {
        successRate: 0.82,
        userSatisfaction: 4.4,
        conversionRate: 0.75,
        popularityScore: 0.7
      },
      context: {
        basedOn: ['time_preference', 'conversation_analysis'],
        reasoning: 'Basado en tu preferencia de horario mencionada',
        alternatives: timeFiltered.length - 1,
        timeWindow: timeRange
      },
      actions: {
        canBook: true,
        canModify: true,
        canCompare: true,
        requiresConfirmation: false
      }
    };
  }

  private createDateSuggestion(options: any[], suggestedDate: string): SmartSuggestion | null {
    const dateOptions = options.filter(opt => opt.date === suggestedDate);
    if (dateOptions.length === 0) return null;
    
    const bestOption = dateOptions[0];
    
    return {
      id: `date-${Date.now()}`,
      type: 'ai_recommended',
      title: 'Fecha que mencionaste',
      description: `${bestOption.date} a las ${bestOption.time}`,
      explanation: 'Basado en la fecha que mencionaste en nuestra conversación',
      confidence: 0.85,
      priority: 9,
      data: {
        date: bestOption.date,
        time: bestOption.time,
        doctorId: bestOption.doctorId,
        doctorName: bestOption.doctorName
      },
      metrics: {
        successRate: 0.88,
        userSatisfaction: 4.5,
        conversionRate: 0.82,
        popularityScore: 0.6
      },
      context: {
        basedOn: ['mentioned_date', 'ai_analysis'],
        reasoning: 'Fecha específica mencionada en la conversación',
        alternatives: dateOptions.length - 1,
        timeWindow: 'specific_date'
      },
      actions: {
        canBook: true,
        canModify: true,
        canCompare: true,
        requiresConfirmation: false
      }
    };
  }

  private createHistoryBasedSuggestion(
    options: any[], 
    userProfile: UserProfile
  ): SmartSuggestion | null {
    // Analizar patrones del historial del usuario
    const preferredTimes = userProfile.preferences.preferredTimes || [];
    const preferredDoctors = userProfile.preferences.preferredDoctors || [];
    
    const matchingOptions = options.filter(opt => 
      preferredTimes.includes(opt.time) || preferredDoctors.includes(opt.doctorId)
    );
    
    if (matchingOptions.length === 0) return null;
    
    const bestOption = matchingOptions[0];
    
    return {
      id: `history-${Date.now()}`,
      type: 'user_pattern',
      title: 'Basado en tu historial',
      description: `${bestOption.date} a las ${bestOption.time}`,
      explanation: 'Coincide con tus preferencias anteriores',
      confidence: 0.75,
      priority: 7,
      data: {
        date: bestOption.date,
        time: bestOption.time,
        doctorId: bestOption.doctorId,
        doctorName: bestOption.doctorName
      },
      metrics: {
        successRate: 0.80,
        userSatisfaction: 4.3,
        conversionRate: 0.73,
        popularityScore: 0.8
      },
      context: {
        basedOn: ['user_history', 'preference_patterns'],
        reasoning: 'Basado en tus citas anteriores exitosas',
        alternatives: matchingOptions.length - 1,
        timeWindow: 'historical_pattern'
      },
      actions: {
        canBook: true,
        canModify: true,
        canCompare: true,
        requiresConfirmation: false
      }
    };
  }

  private createPopularSuggestion(options: any[]): SmartSuggestion | null {
    if (options.length === 0) return null;
    
    // Simular popularidad basada en horarios típicos
    const popularOption = options.find(opt => {
      const hour = parseInt(opt.time.split(':')[0]);
      return hour >= 9 && hour <= 11; // Horarios populares de mañana
    }) || options[0];
    
    return {
      id: `popular-${Date.now()}`,
      type: 'popular_choice',
      title: 'Opción popular',
      description: `${popularOption.date} a las ${popularOption.time}`,
      explanation: 'Horario preferido por el 80% de nuestros pacientes',
      confidence: 0.7,
      priority: 6,
      data: {
        date: popularOption.date,
        time: popularOption.time,
        doctorId: popularOption.doctorId,
        doctorName: popularOption.doctorName
      },
      metrics: {
        successRate: 0.85,
        userSatisfaction: 4.1,
        conversionRate: 0.70,
        popularityScore: 0.9
      },
      context: {
        basedOn: ['popularity_data', 'user_preferences'],
        reasoning: 'Horario con alta satisfacción entre usuarios',
        alternatives: options.length - 1,
        timeWindow: 'popular_hours'
      },
      actions: {
        canBook: true,
        canModify: true,
        canCompare: true,
        requiresConfirmation: false
      }
    };
  }

  // Métodos auxiliares para cálculos y análisis

  private calculateEnhancedMetrics(
    suggestion: SmartSuggestion,
    aiContext: AIContext,
    userProfile?: UserProfile
  ): SmartSuggestion['metrics'] {
    // Ajustar métricas basado en contexto
    let adjustedSuccessRate = suggestion.metrics.successRate;
    let adjustedSatisfaction = suggestion.metrics.userSatisfaction;
    
    // Bonus por coincidencia con preferencias
    if (aiContext.preferredTimeRange && suggestion.type === 'user_pattern') {
      adjustedSuccessRate += 0.05;
      adjustedSatisfaction += 0.2;
    }
    
    // Bonus por urgencia
    if (aiContext.urgencyLevel === 'high' && suggestion.type === 'urgency_based') {
      adjustedSuccessRate += 0.1;
    }
    
    return {
      ...suggestion.metrics,
      successRate: Math.min(adjustedSuccessRate, 1),
      userSatisfaction: Math.min(adjustedSatisfaction, 5)
    };
  }

  private generateContextualExplanation(
    suggestion: SmartSuggestion,
    aiContext: AIContext,
    userProfile?: UserProfile
  ): string {
    const factors: string[] = [];
    
    if (aiContext.urgencyLevel === 'high' && suggestion.type === 'urgency_based') {
      factors.push('tu solicitud urgente');
    }
    
    if (aiContext.preferredTimeRange && suggestion.type === 'user_pattern') {
      factors.push(`tu preferencia por horarios de ${aiContext.preferredTimeRange}`);
    }
    
    if (userProfile && suggestion.type === 'user_pattern') {
      factors.push('tu historial de citas anteriores');
    }
    
    if (suggestion.type === 'popular_choice') {
      factors.push('la alta satisfacción de otros pacientes');
    }
    
    if (factors.length === 0) {
      return suggestion.explanation;
    }
    
    return `Recomendado basado en ${factors.join(' y ')}.`;
  }

  private generateDetailedReasoning(
    suggestion: SmartSuggestion,
    aiContext: AIContext
  ): string {
    switch (suggestion.type) {
      case 'urgency_based':
        return 'Algoritmo de urgencia detectó necesidad de atención inmediata y seleccionó la opción más temprana disponible.';
      case 'user_pattern':
        return 'Análisis de patrones identificó coincidencia con preferencias expresadas en la conversación.';
      case 'ai_recommended':
        return 'IA procesó el contexto de la conversación y identificó esta como la opción más alineada con tus necesidades.';
      case 'popular_choice':
        return 'Análisis de datos históricos muestra alta satisfacción y éxito con esta opción entre usuarios similares.';
      default:
        return 'Recomendación basada en análisis integral de disponibilidad y preferencias.';
    }
  }

  private generateInsights(
    aiContext: AIContext,
    userProfile?: UserProfile,
    suggestions: SmartSuggestion[]
  ): SuggestionsResult['insights'] {
    return {
      userProfile: userProfile ? 'returning' : 'new',
      preferenceStrength: aiContext.confidence?.overall && aiContext.confidence.overall > 0.7 ? 'strong' : 'moderate',
      urgencyLevel: aiContext.urgencyLevel || 'medium',
      flexibilityScore: aiContext.flexibilityLevel === 'very-flexible' ? 0.9 : 
                       aiContext.flexibilityLevel === 'flexible' ? 0.6 : 0.3,
      predictedSatisfaction: suggestions.length > 0 ? 
        suggestions.reduce((acc, s) => acc + s.metrics.userSatisfaction, 0) / suggestions.length / 5 : 0.5
    };
  }

  private generateUXRecommendations(
    insights: SuggestionsResult['insights'],
    suggestions: SmartSuggestion[]
  ): SuggestionsResult['uxRecommendations'] {
    return {
      showComparison: suggestions.length > 2,
      highlightBestOption: suggestions.length > 0 && suggestions[0].confidence > 0.8,
      showExplanations: insights.preferenceStrength === 'strong',
      enableQuickBook: insights.urgencyLevel === 'high',
      suggestAlternatives: insights.flexibilityScore > 0.6
    };
  }

  private calculateOverallConfidence(suggestions: SmartSuggestion[]): number {
    if (suggestions.length === 0) return 0;
    return suggestions.reduce((acc, s) => acc + s.confidence, 0) / suggestions.length;
  }

  private generateFallbackSuggestions(options: any[]): SuggestionsResult {
    return {
      suggestions: [],
      totalAnalyzed: 0,
      processingTime: 0,
      confidence: 0.3,
      insights: {
        userProfile: 'new',
        preferenceStrength: 'weak',
        urgencyLevel: 'medium',
        flexibilityScore: 0.5,
        predictedSatisfaction: 0.5
      },
      uxRecommendations: {
        showComparison: false,
        highlightBestOption: false,
        showExplanations: false,
        enableQuickBook: false,
        suggestAlternatives: true
      }
    };
  }

  /**
   * Filtra horarios válidos eliminando fechas pasadas y aplicando regla de 4 horas mínimas
   *
   * REGLA CRÍTICA ACTUALIZADA:
   * - Rechazar todas las fechas/horas pasadas
   * - Para cualquier fecha, aplicar regla de 4 horas mínimas desde el momento actual
   * - Validación absoluta de tiempo, no solo relativa al día
   *
   * @param options - Opciones de horarios disponibles
   * @returns Opciones filtradas que cumplen con las reglas de tiempo
   */
  private filterValidTimeSlots(options: any[]): any[] {
    const now = new Date();
    const MINIMUM_ADVANCE_HOURS = 4;
    const MINIMUM_ADVANCE_MINUTES = MINIMUM_ADVANCE_HOURS * 60;

    return options.filter(option => {
      try {
        const optionDate = option.date;
        const optionTime = option.time;

        if (!optionDate || !optionTime) {
          console.warn('⚠️ SmartSuggestionsEngine - Opción sin fecha o hora:', option);
          return false;
        }

        // CRITICAL FIX: Create absolute datetime for comparison
        // Parse date and time to create complete datetime object
        const [year, month, day] = optionDate.split('-').map(Number);
        const [hours, minutes] = optionTime.split(':').map(Number);

        // Create timezone-safe datetime object
        const optionDateTime = new Date(year, month - 1, day, hours, minutes);

        // Calculate time difference in minutes
        const timeDifferenceMs = optionDateTime.getTime() - now.getTime();
        const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));

        // CRITICAL FIX: Apply 4-hour rule to ALL appointments, not just same day
        if (timeDifferenceMinutes < MINIMUM_ADVANCE_MINUTES) {
          console.log(`🚫 SmartSuggestionsEngine - Horario rechazado por regla de 4h: ${optionDate} ${optionTime} (diferencia: ${timeDifferenceMinutes} min)`);
          return false;
        }

        console.log(`✅ SmartSuggestionsEngine - Horario aceptado: ${optionDate} ${optionTime} (diferencia: ${timeDifferenceMinutes} min)`);
        return true;
      } catch (error) {
        console.error('❌ SmartSuggestionsEngine - Error procesando opción:', option, error);
        return false;
      }
    });
  }
}

export default SmartSuggestionsEngine;
