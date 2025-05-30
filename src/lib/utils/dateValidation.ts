/**
 * Date Validation Utilities for UI-level date blocking
 * 
 * Implements the same 4-hour advance booking rule as SmartSuggestionsEngine
 * but optimized for UI validation and user experience
 */

export interface DateValidationResult {
  isValid: boolean;
  reason?: string;
  hoursUntilValid?: number;
  nextValidTime?: string;
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

/**
 * Validates if a date has any valid appointment slots based on 4-hour advance booking rule
 * 
 * @param date - Date string in YYYY-MM-DD format
 * @param availableSlots - Array of available time slots for the date
 * @returns Validation result with details
 */
export function validateDateAvailability(
  date: string, 
  availableSlots: TimeSlot[] = []
): DateValidationResult {
  const MINIMUM_ADVANCE_HOURS = 4;
  const MINIMUM_ADVANCE_MINUTES = MINIMUM_ADVANCE_HOURS * 60;
  
  try {
    const now = new Date();
    
    // Parse date components using timezone-safe method (consistent with our timezone fixes)
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    
    if (dateObj.getTime() < today.getTime()) {
      return {
        isValid: false,
        reason: 'Fecha pasada - No se pueden agendar citas en fechas anteriores'
      };
    }
    
    // If no slots provided, generate typical business hours for validation
    const slotsToCheck = availableSlots.length > 0 
      ? availableSlots 
      : generateTypicalBusinessHours(date);
    
    // Check each time slot against 4-hour rule
    const validSlots = slotsToCheck.filter(slot => {
      if (!slot.available) return false;
      
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotDateTime = new Date(year, month - 1, day, hours, minutes);
      
      const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
      const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));
      
      return timeDifferenceMinutes >= MINIMUM_ADVANCE_MINUTES;
    });
    
    if (validSlots.length === 0) {
      // Calculate when the date becomes valid
      const nextValidTime = calculateNextValidTime(date);
      const hoursUntilValid = calculateHoursUntilValid(date);
      
      return {
        isValid: false,
        reason: hoursUntilValid > 0 
          ? `Reserva con mínimo ${MINIMUM_ADVANCE_HOURS} horas de anticipación requerida`
          : 'No hay horarios disponibles que cumplan con la anticipación mínima',
        hoursUntilValid,
        nextValidTime
      };
    }
    
    return {
      isValid: true
    };
    
  } catch (error) {
    console.error('Error validating date availability:', error);
    return {
      isValid: false,
      reason: 'Error validando disponibilidad de fecha'
    };
  }
}

/**
 * Generates typical business hours for a date (used when no specific slots provided)
 */
function generateTypicalBusinessHours(date: string): TimeSlot[] {
  const businessHours = [
    '08:00', '09:00', '10:00', '11:00', 
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];
  
  return businessHours.map(time => ({
    date,
    time,
    available: true
  }));
}

/**
 * Calculates the next valid time for a date
 */
function calculateNextValidTime(date: string): string {
  const MINIMUM_ADVANCE_HOURS = 4;
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  
  // For today, calculate 4 hours from now
  const currentDate = now.toISOString().split('T')[0];
  if (date === currentDate) {
    const nextValidDateTime = new Date(now.getTime() + (MINIMUM_ADVANCE_HOURS * 60 * 60 * 1000));
    return nextValidDateTime.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  // For future dates, first available business hour
  return '08:00';
}

/**
 * Calculates hours until a date becomes valid
 */
function calculateHoursUntilValid(date: string): number {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day, 8, 0); // 8 AM start
  
  const timeDifferenceMs = dateObj.getTime() - now.getTime();
  const hoursUntilValid = Math.ceil(timeDifferenceMs / (1000 * 60 * 60));
  
  return Math.max(0, hoursUntilValid);
}

/**
 * Validates multiple dates and returns a map of validation results
 */
export function validateMultipleDates(
  dates: string[], 
  availableSlotsByDate: Record<string, TimeSlot[]> = {}
): Record<string, DateValidationResult> {
  const results: Record<string, DateValidationResult> = {};
  
  dates.forEach(date => {
    const slots = availableSlotsByDate[date] || [];
    results[date] = validateDateAvailability(date, slots);
  });
  
  return results;
}

/**
 * Checks if current time allows for same-day appointments
 */
export function canBookSameDayAppointments(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's before 4 PM (16:00), there might be valid slots for today
  // (considering 4-hour rule and business hours until 8 PM)
  return currentHour < 16;
}

/**
 * Gets user-friendly message for blocked dates
 */
export function getBlockedDateMessage(validationResult: DateValidationResult): string {
  if (validationResult.isValid) return '';
  
  if (validationResult.reason?.includes('Fecha pasada')) {
    return 'No disponible - Fecha pasada';
  }
  
  if (validationResult.hoursUntilValid && validationResult.hoursUntilValid > 0) {
    return `No disponible - Reserva con 4 horas de anticipación`;
  }
  
  return 'No disponible - Sin horarios válidos';
}

/**
 * Gets accessibility label for blocked dates
 */
export function getBlockedDateAriaLabel(date: string, validationResult: DateValidationResult): string {
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const message = getBlockedDateMessage(validationResult);
  return `${formattedDate}, ${message}`;
}
