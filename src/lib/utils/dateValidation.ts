/**
 * Enhanced Date Validation Utilities with Tenant Configuration Support
 *
 * Implements configurable advance booking rules with timezone-safe validation
 * and tenant-specific booking policies
 */

import BookingConfigService, { type BookingSettings } from '@/lib/services/BookingConfigService';
import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';

export interface DateValidationResult {
  isValid: boolean;
  reason?: string;
  hoursUntilValid?: number;
  nextValidTime?: string;
  validTimeSlots?: string[];
  organizationSettings?: BookingSettings;
  userRole?: string;
  appliedRule?: 'standard' | 'privileged';
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

export interface EnhancedValidationOptions {
  organizationId?: string;
  useDefaultRules?: boolean;
  customSettings?: Partial<BookingSettings>;
  userRole?: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
  useStandardRules?: boolean; // Force standard rules even for privileged users
}

/**
 * Enhanced date validation with tenant configuration support
 *
 * @param date - Date string in YYYY-MM-DD format
 * @param availableSlots - Array of available time slots for the date
 * @param options - Validation options including organization ID
 * @returns Enhanced validation result with tenant-specific details
 */
export async function validateDateAvailabilityEnhanced(
  date: string,
  availableSlots: TimeSlot[] = [],
  options: EnhancedValidationOptions = {}
): Promise<DateValidationResult> {
  try {
    if (options.organizationId && options.userRole) {
      // Use role-based validation (MVP SIMPLIFIED)
      const bookingService = BookingConfigService.getInstance();
      const timeSlots = availableSlots.map(slot => slot.time);
      return await bookingService.validateDateAvailabilityWithRole(
        options.organizationId,
        date,
        timeSlots,
        {
          userRole: options.userRole,
          useStandardRules: options.useStandardRules,
          organizationId: options.organizationId
        }
      );
    } else if (options.organizationId) {
      // Use tenant-specific validation (legacy)
      const bookingService = BookingConfigService.getInstance();
      const timeSlots = availableSlots.map(slot => slot.time);
      return await bookingService.validateDateAvailability(options.organizationId, date, timeSlots);
    } else {
      // Fallback to legacy validation with default rules
      return validateDateAvailabilityLegacy(date, availableSlots, options.customSettings);
    }
  } catch (error) {
    console.error('Error in enhanced date validation:', error);
    return validateDateAvailabilityLegacy(date, availableSlots, options.customSettings);
  }
}

/**
 * MVP SIMPLIFIED: Role-based date validation
 * Standard users (patients): 24-hour advance booking rule
 * Privileged users (admin/staff): Real-time booking allowed
 */
export async function validateDateAvailabilityWithRole(
  date: string,
  availableSlots: TimeSlot[] = [],
  userRole: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin' = 'patient',
  organizationId?: string
): Promise<DateValidationResult> {
  try {
    if (organizationId) {
      return await validateDateAvailabilityEnhanced(date, availableSlots, {
        organizationId,
        userRole
      });
    }

    // Fallback to simplified role-based validation without organization context
    return validateSimplifiedRoleBasedBooking(date, availableSlots, userRole);
  } catch (error) {
    console.error('Error in role-based date validation:', error);
    return {
      isValid: false,
      reason: 'Error validando disponibilidad de fecha',
      userRole,
      appliedRule: 'standard'
    };
  }
}

/**
 * Simplified role-based validation without organization context
 */
function validateSimplifiedRoleBasedBooking(
  date: string,
  availableSlots: TimeSlot[],
  userRole: string
): DateValidationResult {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  // Check if date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dateObj.setHours(0, 0, 0, 0);

  if (dateObj.getTime() < today.getTime()) {
    return {
      isValid: false,
      reason: 'Fecha pasada - No se pueden agendar citas en fechas anteriores',
      userRole,
      appliedRule: ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole) ? 'privileged' : 'standard'
    };
  }

  const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
  // FIXED: Use ImmutableDateSystem for consistent timezone-safe validation
  const isToday = ImmutableDateSystem.isToday(date);

  if (!isPrivilegedUser && isToday) {
    // Standard users (patients) cannot book same-day appointments
    return {
      isValid: false,
      reason: 'Los pacientes deben reservar citas con al menos 24 horas de anticipación',
      hoursUntilValid: 24,
      nextValidTime: '08:00',
      userRole,
      appliedRule: 'standard'
    };
  }

  // For privileged users or future dates, check availability
  let validSlots = availableSlots.length > 0
    ? availableSlots.map(slot => slot.time)
    : ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  if (isPrivilegedUser && isToday) {
    // Filter out past time slots for today
    const currentTime = now.getHours() * 60 + now.getMinutes();
    validSlots = validSlots.filter(slot => {
      const [hours, minutes] = slot.split(':').map(Number);
      const slotTime = hours * 60 + minutes;
      return slotTime > currentTime;
    });
  }

  return {
    isValid: validSlots.length > 0,
    reason: validSlots.length === 0 ? 'No hay horarios disponibles para esta fecha' : undefined,
    validTimeSlots: validSlots,
    userRole,
    appliedRule: isPrivilegedUser ? 'privileged' : 'standard'
  };
}

/**
 * Legacy date validation with configurable rules (backward compatibility)
 *
 * @param date - Date string in YYYY-MM-DD format
 * @param availableSlots - Array of available time slots for the date
 * @param customSettings - Optional custom booking settings
 * @returns Validation result with details
 */
export function validateDateAvailabilityLegacy(
  date: string,
  availableSlots: TimeSlot[] = [],
  customSettings?: Partial<BookingSettings>
): DateValidationResult {
  // Use custom settings or defaults
  const defaultSettings = {
    advance_booking_hours: 4,
    max_advance_booking_days: 90,
    allow_same_day_booking: true,
    booking_window_start: '08:00',
    booking_window_end: '18:00',
    weekend_booking_enabled: false
  };

  const settings = { ...defaultSettings, ...customSettings };
  const MINIMUM_ADVANCE_MINUTES = settings.advance_booking_hours * 60;

  try {
    const now = new Date();

    // Parse date components using timezone-safe method
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

    // Check weekend policy
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend && !settings.weekend_booking_enabled) {
      return {
        isValid: false,
        reason: 'Reservas de fin de semana no están habilitadas'
      };
    }

    // Check same day booking policy
    const isToday = dateObj.getTime() === today.getTime();
    if (isToday && !settings.allow_same_day_booking) {
      return {
        isValid: false,
        reason: 'Reservas el mismo día no están permitidas'
      };
    }

    // Check max advance booking limit
    const maxAdvanceDate = new Date(today);
    maxAdvanceDate.setDate(today.getDate() + settings.max_advance_booking_days);

    if (dateObj.getTime() > maxAdvanceDate.getTime()) {
      return {
        isValid: false,
        reason: `No se pueden hacer reservas con más de ${settings.max_advance_booking_days} días de anticipación`
      };
    }

    // If no slots provided, generate business hours for validation
    const slotsToCheck = availableSlots.length > 0
      ? availableSlots
      : generateTypicalBusinessHours(date, settings);

    // Check each time slot against advance booking rule and booking window
    const validSlots = slotsToCheck.filter(slot => {
      if (!slot.available) return false;

      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotDateTime = new Date(year, month - 1, day, hours, minutes);

      // Check advance booking rule
      const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
      const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));
      const meetsAdvanceRule = timeDifferenceMinutes >= MINIMUM_ADVANCE_MINUTES;

      // Check booking window
      const withinBookingWindow = isWithinBookingWindow(slot.time, settings);

      return meetsAdvanceRule && withinBookingWindow;
    });

    if (validSlots.length === 0) {
      // Calculate when the date becomes valid
      const nextValidTime = calculateNextValidTimeLegacy(date, settings);
      const hoursUntilValid = calculateHoursUntilValidLegacy(date, settings);

      return {
        isValid: false,
        reason: hoursUntilValid > 0
          ? `Reserva con mínimo ${settings.advance_booking_hours} horas de anticipación requerida`
          : 'No hay horarios disponibles que cumplan con la anticipación mínima',
        hoursUntilValid,
        nextValidTime,
        validTimeSlots: []
      };
    }

    return {
      isValid: true,
      validTimeSlots: validSlots.map(slot => slot.time)
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
 * Generates typical business hours for a date with configurable settings
 */
function generateTypicalBusinessHours(date: string, settings?: any): TimeSlot[] {
  if (!settings) {
    // Fallback to default hours
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

  const businessHours: string[] = [];

  // Parse start and end times
  const [startHour, startMin] = settings.booking_window_start.split(':').map(Number);
  const [endHour, endMin] = settings.booking_window_end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Generate 30-minute intervals
  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    businessHours.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
  }

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
 * Check if time is within booking window
 */
function isWithinBookingWindow(time: string, settings: any): boolean {
  const [hours, minutes] = time.split(':').map(Number);
  const timeMinutes = hours * 60 + minutes;

  const [startHours, startMins] = settings.booking_window_start.split(':').map(Number);
  const startMinutes = startHours * 60 + startMins;

  const [endHours, endMins] = settings.booking_window_end.split(':').map(Number);
  const endMinutes = endHours * 60 + endMins;

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Calculates the next valid time for a date (legacy version)
 */
function calculateNextValidTimeLegacy(date: string, settings: any): string {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];

  if (date === currentDate) {
    const nextValidDateTime = new Date(now.getTime() + (settings.advance_booking_hours * 60 * 60 * 1000));
    return nextValidDateTime.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  return settings.booking_window_start;
}

/**
 * Calculates hours until a date becomes valid for booking (legacy version)
 */
function calculateHoursUntilValidLegacy(date: string, settings: any): number {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const [startHour, startMin] = settings.booking_window_start.split(':').map(Number);
  const dateStart = new Date(year, month - 1, day, startHour, startMin);

  const timeDifferenceMs = dateStart.getTime() - now.getTime();
  const hoursDifference = Math.ceil(timeDifferenceMs / (1000 * 60 * 60));

  return Math.max(0, settings.advance_booking_hours - hoursDifference);
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
 * Enhanced multiple dates validation with tenant configuration
 */
export async function validateMultipleDatesEnhanced(
  dates: string[],
  availableSlotsByDate: Record<string, TimeSlot[]> = {},
  options: EnhancedValidationOptions = {}
): Promise<Record<string, DateValidationResult>> {
  const results: Record<string, DateValidationResult> = {};

  for (const date of dates) {
    const slots = availableSlotsByDate[date] || [];
    results[date] = await validateDateAvailabilityEnhanced(date, slots, options);
  }

  return results;
}

// Legacy function for backward compatibility
export function validateDateAvailability(
  date: string,
  availableSlots: TimeSlot[] = []
): DateValidationResult {
  return validateDateAvailabilityLegacy(date, availableSlots);
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
