/**
 * Appointment Natural Language Processing Service
 * 
 * Handles natural language processing for appointment booking conversations
 * in Spanish. Extracts intents, entities, and manages conversation context
 * for medical appointment scheduling in optometry/vision care.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface ConversationIntent {
  intent: 'book_appointment' | 'reschedule_appointment' | 'cancel_appointment' | 
          'check_availability' | 'get_info' | 'human_handoff' | 'unknown';
  confidence: number;
  entities: ExtractedEntities;
}

export interface ExtractedEntities {
  date?: {
    value: string;
    normalized: string; // ISO format
    confidence: number;
  };
  time?: {
    value: string;
    normalized: string; // HH:MM format
    confidence: number;
  };
  service?: {
    value: string;
    normalized: string;
    confidence: number;
  };
  doctor?: {
    value: string;
    normalized: string;
    confidence: number;
  };
  urgency?: {
    value: string;
    level: 'low' | 'medium' | 'high';
    confidence: number;
  };
}

export interface ConversationContext {
  patientPhone: string;
  currentIntent?: string;
  extractedData: Partial<ExtractedEntities>;
  conversationState: 'greeting' | 'collecting_info' | 'confirming' | 'completed' | 'escalated';
  lastMessage: string;
  messageCount: number;
  startedAt: string;
  updatedAt: string;
}

// =====================================================
// APPOINTMENT NLP SERVICE
// =====================================================

/**
 * Appointment NLP Service Class
 * 
 * @description Processes natural language for appointment booking
 * with Spanish language support and medical terminology.
 */
export class AppointmentNLPService {

  // =====================================================
  // INTENT RECOGNITION
  // =====================================================

  /**
   * Analyze message intent and extract entities
   */
  analyzeMessage(message: string, context?: ConversationContext): ConversationIntent {
    const normalizedMessage = this.normalizeMessage(message);
    
    // Detect intent
    const intent = this.detectIntent(normalizedMessage);
    
    // Extract entities
    const entities = this.extractEntities(normalizedMessage, context);
    
    return {
      intent: intent.intent,
      confidence: intent.confidence,
      entities
    };
  }

  /**
   * Detect conversation intent from message
   */
  private detectIntent(message: string): { intent: ConversationIntent['intent']; confidence: number } {
    const intentPatterns = {
      book_appointment: [
        /\b(agendar|reservar|pedir|solicitar|quiero|necesito)\b.*\b(cita|turno|consulta|hora)\b/i,
        /\b(cita|turno|consulta)\b.*\b(nueva|nuevo)\b/i,
        /\bhola\b.*\b(cita|turno|consulta)\b/i,
        /\b(cuando|que dia|que hora)\b.*\b(puedo|podria|disponible)\b/i
      ],
      reschedule_appointment: [
        /\b(cambiar|mover|reagendar|reprogramar)\b.*\b(cita|turno|consulta)\b/i,
        /\b(cita|turno|consulta)\b.*\b(cambiar|mover|otro dia|otra hora)\b/i,
        /\bno puedo\b.*\b(cita|turno|consulta)\b/i
      ],
      cancel_appointment: [
        /\b(cancelar|anular|eliminar)\b.*\b(cita|turno|consulta)\b/i,
        /\b(cita|turno|consulta)\b.*\b(cancelar|anular|no voy)\b/i,
        /\bno voy a poder\b.*\b(cita|turno|consulta)\b/i
      ],
      check_availability: [
        /\b(disponibilidad|horarios|cuando|que dias)\b/i,
        /\b(esta libre|hay lugar|tienen hora)\b/i,
        /\b(que horarios|que dias)\b.*\b(atienden|trabajan|disponible)\b/i
      ],
      get_info: [
        /\b(informacion|info|que servicios|que doctores|precios|costos)\b/i,
        /\b(donde|direccion|ubicacion|telefono|contacto)\b/i,
        /\b(como llegar|horarios de atencion)\b/i
      ],
      human_handoff: [
        /\b(humano|persona|operador|hablar con alguien)\b/i,
        /\b(no entiendo|no me ayuda|problema|reclamo)\b/i,
        /\b#humano\b/i
      ]
    };

    let bestMatch = { intent: 'unknown' as ConversationIntent['intent'], confidence: 0 };

    for (const [intentName, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          const confidence = this.calculatePatternConfidence(message, pattern);
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              intent: intentName as ConversationIntent['intent'],
              confidence
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Extract entities from message
   */
  private extractEntities(message: string, context?: ConversationContext): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Extract date
    const dateEntity = this.extractDate(message);
    if (dateEntity) entities.date = dateEntity;

    // Extract time
    const timeEntity = this.extractTime(message);
    if (timeEntity) entities.time = timeEntity;

    // Extract service
    const serviceEntity = this.extractService(message);
    if (serviceEntity) entities.service = serviceEntity;

    // Extract doctor
    const doctorEntity = this.extractDoctor(message);
    if (doctorEntity) entities.doctor = doctorEntity;

    // Extract urgency
    const urgencyEntity = this.extractUrgency(message);
    if (urgencyEntity) entities.urgency = urgencyEntity;

    return entities;
  }

  // =====================================================
  // ENTITY EXTRACTION
  // =====================================================

  /**
   * Extract date entities
   */
  private extractDate(message: string): ExtractedEntities['date'] | undefined {
    const datePatterns = [
      // Relative dates
      { pattern: /\bhoy\b/i, offset: 0 },
      { pattern: /\bmanana\b/i, offset: 1 },
      { pattern: /\bpasado manana\b/i, offset: 2 },
      { pattern: /\ben (\d+) dias?\b/i, offset: 'dynamic' },
      
      // Days of week
      { pattern: /\b(lunes|monday)\b/i, day: 1 },
      { pattern: /\b(martes|tuesday)\b/i, day: 2 },
      { pattern: /\b(miercoles|wednesday)\b/i, day: 3 },
      { pattern: /\b(jueves|thursday)\b/i, day: 4 },
      { pattern: /\b(viernes|friday)\b/i, day: 5 },
      { pattern: /\b(sabado|saturday)\b/i, day: 6 },
      
      // Specific dates
      { pattern: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, format: 'dd/mm/yyyy' },
      { pattern: /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/, format: 'dd-mm-yyyy' },
      { pattern: /\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i, format: 'dd de mes' }
    ];

    for (const datePattern of datePatterns) {
      const match = message.match(datePattern.pattern);
      if (match) {
        const normalized = this.normalizeDateMatch(match, datePattern);
        if (normalized) {
          return {
            value: match[0],
            normalized,
            confidence: 0.8
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract time entities
   */
  private extractTime(message: string): ExtractedEntities['time'] | undefined {
    const timePatterns = [
      /\b(\d{1,2}):(\d{2})\s*(am|pm|hs|h)?\b/i,
      /\b(\d{1,2})\s*(am|pm)\b/i,
      /\b(\d{1,2})\s*de\s*la\s*(mañana|tarde|noche)\b/i,
      /\b(mañana|tarde|noche)\b/i
    ];

    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        const normalized = this.normalizeTimeMatch(match);
        if (normalized) {
          return {
            value: match[0],
            normalized,
            confidence: 0.7
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract service entities
   */
  private extractService(message: string): ExtractedEntities['service'] | undefined {
    const serviceMap = {
      'examen visual completo': ['examen completo', 'examen visual', 'revision completa', 'chequeo completo'],
      'terapia visual': ['terapia', 'ejercicios visuales', 'rehabilitacion visual'],
      'adaptacion de lentes de contacto': ['lentes de contacto', 'lentillas', 'adaptacion lentes'],
      'control visual rapido': ['control rapido', 'revision rapida', 'chequeo rapido']
    };

    for (const [service, aliases] of Object.entries(serviceMap)) {
      for (const alias of aliases) {
        if (message.toLowerCase().includes(alias)) {
          return {
            value: alias,
            normalized: service,
            confidence: 0.8
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract doctor entities
   */
  private extractDoctor(message: string): ExtractedEntities['doctor'] | undefined {
    const doctorMap = {
      'Dr. Elena López': ['elena', 'lopez', 'elena lopez', 'doctora elena', 'pediatrica'],
      'Dr. Ana Rodríguez': ['ana', 'rodriguez', 'ana rodriguez', 'doctora ana', 'clinica'],
      'Dr. Pedro Sánchez': ['pedro', 'sanchez', 'pedro sanchez', 'doctor pedro', 'contactologia']
    };

    for (const [doctor, aliases] of Object.entries(doctorMap)) {
      for (const alias of aliases) {
        if (message.toLowerCase().includes(alias)) {
          return {
            value: alias,
            normalized: doctor,
            confidence: 0.7
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract urgency entities
   */
  private extractUrgency(message: string): ExtractedEntities['urgency'] | undefined {
    const urgencyPatterns = {
      high: [/\burgente\b/i, /\bemergencia\b/i, /\brapido\b/i, /\bya\b/i],
      medium: [/\bpronto\b/i, /\besta semana\b/i, /\bantes de\b/i],
      low: [/\bcualquier\b/i, /\bno hay apuro\b/i, /\bcuando puedan\b/i]
    };

    for (const [level, patterns] of Object.entries(urgencyPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          return {
            value: pattern.source,
            level: level as 'low' | 'medium' | 'high',
            confidence: 0.6
          };
        }
      }
    }

    return undefined;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Normalize message for processing
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(message: string, pattern: RegExp): number {
    const match = message.match(pattern);
    if (!match) return 0;
    
    // Base confidence
    let confidence = 0.7;
    
    // Boost confidence for longer matches
    if (match[0].length > 10) confidence += 0.1;
    
    // Boost confidence for multiple keyword matches
    const keywords = match[0].split(/\s+/).length;
    if (keywords > 2) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  /**
   * Normalize date match to ISO format
   */
  private normalizeDateMatch(match: RegExpMatchArray, pattern: any): string | undefined {
    try {
      const today = new Date();
      
      if (pattern.offset !== undefined) {
        if (pattern.offset === 'dynamic') {
          const days = parseInt(match[1]);
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + days);
          return targetDate.toISOString().split('T')[0];
        } else {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + pattern.offset);
          return targetDate.toISOString().split('T')[0];
        }
      }
      
      if (pattern.day !== undefined) {
        const targetDate = new Date(today);
        const daysUntilTarget = (pattern.day - today.getDay() + 7) % 7;
        targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
        return targetDate.toISOString().split('T')[0];
      }
      
      if (pattern.format === 'dd/mm/yyyy') {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JS months are 0-indexed
        const year = parseInt(match[3]);
        const date = new Date(year, month, day);
        return date.toISOString().split('T')[0];
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Normalize time match to HH:MM format
   */
  private normalizeTimeMatch(match: RegExpMatchArray): string | undefined {
    try {
      if (match[1] && match[2]) {
        // HH:MM format
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3]?.toLowerCase();
        
        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      if (match[1] && match[2] && !match[3]) {
        // Hour with period (am/pm)
        let hours = parseInt(match[1]);
        const period = match[2].toLowerCase();
        
        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:00`;
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Validate extracted entities
   */
  validateEntities(entities: ExtractedEntities): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate date is in the future
    if (entities.date) {
      const date = new Date(entities.date.normalized);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        errors.push('La fecha debe ser futura');
      }
    }
    
    // Validate time is within business hours
    if (entities.time) {
      const [hours] = entities.time.normalized.split(':').map(Number);
      if (hours < 8 || hours >= 18) {
        errors.push('El horario debe estar entre 8:00 AM y 6:00 PM');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
