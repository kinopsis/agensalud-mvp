/**
 * Entity Extraction Utilities
 * Handles parsing and normalization of dates, times, and medical entities
 */

export interface ExtractedDate {
  date: string; // YYYY-MM-DD format
  type: 'specific' | 'relative' | 'flexible';
  confidence: number;
  originalText: string;
}

export interface ExtractedTime {
  time: string; // HH:MM format
  type: 'specific' | 'morning' | 'afternoon' | 'evening' | 'flexible';
  confidence: number;
  originalText: string;
}

export interface ExtractedSpecialty {
  specialty: string;
  serviceType?: string;
  confidence: number;
  originalText: string;
}

/**
 * Parse relative date expressions to specific dates
 */
export function parseRelativeDate(text: string): ExtractedDate | null {
  const textLower = text.toLowerCase();
  const today = new Date();

  // Specific relative dates
  if (textLower.includes('mañana') && !textLower.includes('pasado')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return {
      date: dateStr || tomorrow.toISOString().substring(0, 10),
      type: 'specific',
      confidence: 0.9,
      originalText: text
    };
  }

  if (textLower.includes('pasado mañana')) {
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    const dateStr = dayAfterTomorrow.toISOString().split('T')[0];
    return {
      date: dateStr || dayAfterTomorrow.toISOString().substring(0, 10),
      type: 'specific',
      confidence: 0.9,
      originalText: text
    };
  }

  if (textLower.includes('hoy')) {
    const dateStr = today.toISOString().split('T')[0];
    return {
      date: dateStr || today.toISOString().substring(0, 10),
      type: 'specific',
      confidence: 0.95,
      originalText: text
    };
  }

  // Relative ranges
  if (textLower.includes('próxima semana') || textLower.includes('siguiente semana')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const dateStr = nextWeek.toISOString().split('T')[0];
    return {
      date: dateStr || nextWeek.toISOString().substring(0, 10),
      type: 'relative',
      confidence: 0.7,
      originalText: text
    };
  }

  if (textLower.includes('esta semana')) {
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() + 2); // Default to 2 days from now
    const dateStr = thisWeek.toISOString().split('T')[0];
    return {
      date: dateStr || thisWeek.toISOString().substring(0, 10),
      type: 'relative',
      confidence: 0.6,
      originalText: text
    };
  }

  // Pattern: "en X días"
  const daysMatch = textLower.match(/en (\d+) d[íi]as?/);
  if (daysMatch && daysMatch[1]) {
    const days = parseInt(daysMatch[1], 10);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    const dateStr = futureDate.toISOString().split('T')[0];
    return {
      date: dateStr || futureDate.toISOString().substring(0, 10),
      type: 'specific',
      confidence: 0.85,
      originalText: text
    };
  }

  // Flexible expressions
  if (textLower.includes('cuando pueda') || textLower.includes('cualquier día') || textLower.includes('flexible')) {
    const flexibleDate = new Date(today);
    flexibleDate.setDate(today.getDate() + 3); // Default to 3 days from now
    const dateStr = flexibleDate.toISOString().split('T')[0];
    return {
      date: dateStr || flexibleDate.toISOString().substring(0, 10),
      type: 'flexible',
      confidence: 0.5,
      originalText: text
    };
  }

  // Urgency
  if (textLower.includes('urgente') || textLower.includes('lo antes posible') || textLower.includes('cuanto antes')) {
    const urgent = new Date(today);
    urgent.setDate(today.getDate() + 1); // Tomorrow for urgent
    const dateStr = urgent.toISOString().split('T')[0];
    return {
      date: dateStr || urgent.toISOString().substring(0, 10),
      type: 'specific',
      confidence: 0.8,
      originalText: text
    };
  }

  return null;
}

/**
 * Parse time expressions to specific times
 */
export function parseTimeExpression(text: string): ExtractedTime | null {
  const textLower = text.toLowerCase();

  // Specific times (24h format)
  const time24Match = textLower.match(/(\d{1,2}):(\d{2})/);
  if (time24Match && time24Match[1] && time24Match[2]) {
    const hours = parseInt(time24Match[1], 10);
    const minutes = parseInt(time24Match[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return {
        time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        type: 'specific',
        confidence: 0.95,
        originalText: text
      };
    }
  }

  // Specific times (12h format)
  const time12Match = textLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/);
  if (time12Match && time12Match[1] && time12Match[3]) {
    let hours = parseInt(time12Match[1], 10);
    const minutes = parseInt(time12Match[2] || '0', 10);
    const period = time12Match[3].toLowerCase();

    // Convert to 24h format
    if (period.includes('pm') || period.includes('p.m.')) {
      if (hours !== 12) {
        hours += 12;
      }
      // 12 PM stays as 12
    } else if (period.includes('am') || period.includes('a.m.')) {
      if (hours === 12) {
        hours = 0; // 12 AM becomes 00
      }
      // Other AM hours stay the same
    }

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return {
        time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        type: 'specific',
        confidence: 0.9,
        originalText: text
      };
    }
  }

  // Time periods
  if (textLower.includes('mañana') || textLower.includes('matutino') || textLower.includes('temprano')) {
    return {
      time: '09:00',
      type: 'morning',
      confidence: 0.7,
      originalText: text
    };
  }

  if (textLower.includes('tarde') || textLower.includes('vespertino')) {
    return {
      time: '15:00',
      type: 'afternoon',
      confidence: 0.7,
      originalText: text
    };
  }

  if (textLower.includes('noche') || textLower.includes('nocturno') || textLower.includes('al final del día')) {
    return {
      time: '18:00',
      type: 'evening',
      confidence: 0.7,
      originalText: text
    };
  }

  if (textLower.includes('mediodía') || textLower.includes('medio día')) {
    return {
      time: '12:00',
      type: 'specific',
      confidence: 0.8,
      originalText: text
    };
  }

  // Flexible time
  if (textLower.includes('cualquier hora') || textLower.includes('cuando sea') || textLower.includes('flexible')) {
    return {
      time: '10:00',
      type: 'flexible',
      confidence: 0.5,
      originalText: text
    };
  }

  return null;
}

/**
 * Extract optical specialty from text
 */
export function extractOpticalSpecialty(text: string): ExtractedSpecialty | null {
  const textLower = text.toLowerCase();

  // Specialty mappings for optical clinic (order matters - more specific first)
  const specialtyMappings = [
    {
      keywords: ['pediátrica', 'niños', 'infantil', 'terapia visual', 'niño', 'niña', 'hijo', 'hija', 'años', 'colegio', 'escuela'],
      specialty: 'Optometría Pediátrica',
      serviceType: 'Examen Visual Pediátrico',
      confidence: 0.85
    },
    {
      keywords: ['contactología', 'lentes de contacto', 'lentillas', 'adaptación'],
      specialty: 'Contactología Avanzada',
      serviceType: 'Adaptación de Lentes de Contacto',
      confidence: 0.9
    },
    {
      keywords: ['optometría clínica', 'examen completo', 'examen visual completo', 'examen visual', 'topografía'],
      specialty: 'Optometría Clínica',
      serviceType: 'Examen Visual Completo',
      confidence: 0.9
    },
    {
      keywords: ['baja visión', 'rehabilitación', 'discapacidad visual', 'diabetes', 'problemas de visión', 'especializada'],
      specialty: 'Baja Visión',
      serviceType: 'Evaluación de Baja Visión',
      confidence: 0.9
    },
    {
      keywords: ['control', 'revisión', 'chequeo', 'rutina', 'general'],
      specialty: 'Optometría General',
      serviceType: 'Control Visual Rápido',
      confidence: 0.7
    },
    {
      keywords: ['urgente', 'emergencia', 'dolor', 'molestia'],
      specialty: 'Optometría General',
      serviceType: 'Examen Visual Completo',
      confidence: 0.8
    }
  ];

  // Find matching specialty
  for (const mapping of specialtyMappings) {
    for (const keyword of mapping.keywords) {
      if (textLower.includes(keyword)) {
        return {
          specialty: mapping.specialty,
          serviceType: mapping.serviceType,
          confidence: mapping.confidence,
          originalText: text
        };
      }
    }
  }

  // Default fallback
  if (textLower.includes('cita') || textLower.includes('consulta') || textLower.includes('ver')) {
    return {
      specialty: 'Optometría General',
      serviceType: 'Examen Visual Completo',
      confidence: 0.5,
      originalText: text
    };
  }

  return null;
}

/**
 * Extract urgency level from text
 */
export function extractUrgency(text: string): 'urgent' | 'routine' | 'flexible' {
  const textLower = text.toLowerCase();

  if (textLower.includes('urgente') ||
      textLower.includes('emergencia') ||
      textLower.includes('lo antes posible') ||
      textLower.includes('cuanto antes') ||
      textLower.includes('dolor') ||
      textLower.includes('molestia')) {
    return 'urgent';
  }

  if (textLower.includes('flexible') ||
      textLower.includes('cuando pueda') ||
      textLower.includes('cualquier') ||
      textLower.includes('no hay prisa')) {
    return 'flexible';
  }

  return 'routine';
}

/**
 * Extract patient concerns or symptoms
 */
export function extractPatientConcerns(text: string): string | null {
  const textLower = text.toLowerCase();

  // Common optical concerns
  const concerns = [
    'dolor de cabeza', 'visión borrosa', 'dolor de ojos', 'sequedad',
    'picazón', 'enrojecimiento', 'fatiga visual', 'dificultad para ver',
    'problemas de visión', 'molestias', 'irritación', 'lagrimeo',
    'sensibilidad a la luz', 'visión doble', 'manchas', 'destellos',
    'veo borroso', 'me duelen los ojos'
  ];

  for (const concern of concerns) {
    if (textLower.includes(concern)) {
      return concern === 'veo borroso' ? 'visión borrosa' :
             concern === 'me duelen los ojos' ? 'dolor de ojos' : concern;
    }
  }

  // Look for general concern patterns
  const concernPatterns = [
    /tengo (.*?) en los ojos/,
    /me duele (.*)/,
    /problemas? (?:de|con|para) (.*)/,
    /no (?:puedo|logro) ver (.*)/,
    /siento (.*?) en la vista/,
    /dificultad para ver (.*)/,
    /problemas para ver (.*)/
  ];

  for (const pattern of concernPatterns) {
    const match = textLower.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Validate and normalize extracted date
 */
export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return false;
  }

  // Check if date is not in the past (allow today)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return dateStart >= todayStart;
}

/**
 * Validate and normalize extracted time
 */
export function validateTime(timeString: string): boolean {
  const timeMatch = timeString.match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch || !timeMatch[1] || !timeMatch[2]) {
    return false;
  }

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}
