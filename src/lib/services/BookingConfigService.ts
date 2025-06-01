/**
 * Booking Configuration Service
 * Manages tenant-specific booking rules and validation
 * 
 * @description Centralized service for handling configurable advance booking rules,
 * timezone-aware date validation, and tenant-specific booking policies
 */

import { createClient } from '@/lib/supabase/server';

export interface BookingSettings {
  advance_booking_hours: number;
  max_advance_booking_days: number;
  allow_same_day_booking: boolean;
  booking_window_start: string; // HH:MM format
  booking_window_end: string; // HH:MM format
  weekend_booking_enabled: boolean;
  auto_confirmation: boolean;
  cancellation_deadline_hours: number;
  reschedule_deadline_hours: number;
}

export interface DateValidationResult {
  isValid: boolean;
  reason?: string;
  hoursUntilValid?: number;
  nextValidTime?: string;
  validTimeSlots?: string[];
  userRole?: string;
  appliedRule?: 'standard' | 'privileged';
}

export interface TimeSlotValidationResult {
  isValid: boolean;
  reason?: string;
  meetsAdvanceRule: boolean;
  withinBookingWindow: boolean;
  weekendAllowed: boolean;
  userRole?: string;
  appliedRule?: 'standard' | 'privileged';
}

export interface RoleBasedValidationOptions {
  userRole?: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
  organizationId?: string;
  skipAdvanceBookingValidation?: boolean;
  useStandardRules?: boolean; // Force standard rules even for privileged users
}

export class BookingConfigService {
  private static instance: BookingConfigService;
  private configCache = new Map<string, { settings: BookingSettings; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): BookingConfigService {
    if (!BookingConfigService.instance) {
      BookingConfigService.instance = new BookingConfigService();
    }
    return BookingConfigService.instance;
  }

  /**
   * Get booking settings for an organization with caching
   */
  async getBookingSettings(organizationId: string): Promise<BookingSettings> {
    // Check cache first
    const cached = this.configCache.get(organizationId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.settings;
    }

    try {
      const supabase = await createClient();
      
      const { data, error } = await supabase
        .from('organizations')
        .select('booking_settings')
        .eq('id', organizationId)
        .eq('is_active', true)
        .single();

      if (error || !data?.booking_settings) {
        console.warn(`Failed to fetch booking settings for org ${organizationId}, using defaults:`, error);
        return this.getDefaultSettings();
      }

      const settings = data.booking_settings as BookingSettings;
      
      // Cache the result
      this.configCache.set(organizationId, {
        settings,
        timestamp: Date.now()
      });

      return settings;
    } catch (error) {
      console.error('Error fetching booking settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update booking settings for an organization
   */
  async updateBookingSettings(organizationId: string, settings: Partial<BookingSettings>): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      // Get current settings
      const currentSettings = await this.getBookingSettings(organizationId);
      const updatedSettings = { ...currentSettings, ...settings };

      // Validate settings
      if (!this.validateSettings(updatedSettings)) {
        throw new Error('Invalid booking settings provided');
      }

      const { error } = await supabase
        .from('organizations')
        .update({ booking_settings: updatedSettings })
        .eq('id', organizationId);

      if (error) {
        console.error('Error updating booking settings:', error);
        return false;
      }

      // Clear cache
      this.configCache.delete(organizationId);
      
      return true;
    } catch (error) {
      console.error('Error updating booking settings:', error);
      return false;
    }
  }

  /**
   * Validate if a date has any valid appointment slots with role-based rules
   * MVP SIMPLIFIED: 24-hour rule for patients, real-time for admin/staff
   */
  async validateDateAvailabilityWithRole(
    organizationId: string,
    date: string,
    availableSlots: string[] = [],
    options: RoleBasedValidationOptions = {}
  ): Promise<DateValidationResult> {
    try {
      const { userRole = 'patient', useStandardRules = false } = options;

      // Determine if user is privileged (can book same-day)
      const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
      const usePrivilegedRules = isPrivilegedUser && !useStandardRules;

      console.log(`🔐 ROLE-BASED VALIDATION - User: ${userRole}, Privileged: ${usePrivilegedRules}`);

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
          reason: 'Fecha pasada - No se pueden agendar citas en fechas anteriores',
          userRole,
          appliedRule: usePrivilegedRules ? 'privileged' : 'standard'
        };
      }

      // MVP SIMPLIFIED RULES:
      if (usePrivilegedRules) {
        // PRIVILEGED USERS: Can book same-day based on current time and availability
        return this.validatePrivilegedUserBooking(organizationId, date, availableSlots, userRole);
      } else {
        // STANDARD USERS: Must book at least 24 hours in advance (next business day)
        return this.validateStandardUserBooking(organizationId, date, availableSlots, userRole);
      }

    } catch (error) {
      console.error('Error in role-based date validation:', error);
      return {
        isValid: false,
        reason: 'Error validando disponibilidad de fecha',
        userRole: options.userRole,
        appliedRule: 'standard'
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async validateDateAvailability(
    organizationId: string,
    date: string,
    availableSlots: string[] = []
  ): Promise<DateValidationResult> {
    try {
      const settings = await this.getBookingSettings(organizationId);
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

      // Check if weekend booking is allowed
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      if (isWeekend && !settings.weekend_booking_enabled) {
        return {
          isValid: false,
          reason: 'Reservas de fin de semana no están habilitadas para esta organización'
        };
      }

      // Check if same day booking is allowed
      const isToday = dateObj.getTime() === today.getTime();
      if (isToday && !settings.allow_same_day_booking) {
        return {
          isValid: false,
          reason: 'Reservas el mismo día no están permitidas para esta organización'
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

      // Generate business hours if no slots provided
      const slotsToCheck = availableSlots.length > 0 
        ? availableSlots 
        : this.generateBusinessHours(settings.booking_window_start, settings.booking_window_end);
      
      // Check each time slot against advance booking rule
      const validSlots = slotsToCheck.filter(slot => {
        const slotValidation = this.validateTimeSlot(organizationId, date, slot, settings);
        return slotValidation.isValid;
      });
      
      if (validSlots.length === 0) {
        const nextValidTime = this.calculateNextValidTime(date, settings);
        const hoursUntilValid = this.calculateHoursUntilValid(date, settings);
        
        return {
          isValid: false,
          reason: hoursUntilValid > 0 
            ? `Reserva con mínimo ${settings.advance_booking_hours} horas de anticipación requerida`
            : 'No hay horarios disponibles que cumplan con la anticipación mínima',
          hoursUntilValid,
          nextValidTime
        };
      }
      
      return {
        isValid: true,
        validTimeSlots: validSlots
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
   * Validate booking for standard users (patients) - 24-hour advance rule
   */
  private async validateStandardUserBooking(
    organizationId: string,
    date: string,
    availableSlots: string[],
    userRole: string
  ): Promise<DateValidationResult> {
    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    // Calculate 24 hours from now
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const isToday = dateObj.getTime() === new Date().setHours(0, 0, 0, 0);

    if (isToday) {
      return {
        isValid: false,
        reason: 'Los pacientes deben reservar citas con al menos 24 horas de anticipación',
        hoursUntilValid: 24,
        nextValidTime: '08:00',
        userRole,
        appliedRule: 'standard'
      };
    }

    // For future dates, check if slots are available
    const validSlots = availableSlots.length > 0
      ? availableSlots
      : this.generateBusinessHours('08:00', '18:00');

    return {
      isValid: true,
      validTimeSlots: validSlots,
      userRole,
      appliedRule: 'standard'
    };
  }

  /**
   * Validate booking for privileged users (admin/staff) - real-time booking allowed
   */
  private async validatePrivilegedUserBooking(
    organizationId: string,
    date: string,
    availableSlots: string[],
    userRole: string
  ): Promise<DateValidationResult> {
    const settings = await this.getBookingSettings(organizationId);
    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    // Check weekend policy
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend && !settings.weekend_booking_enabled) {
      return {
        isValid: false,
        reason: 'Reservas de fin de semana no están habilitadas para esta organización',
        userRole,
        appliedRule: 'privileged'
      };
    }

    // Check max advance booking limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxAdvanceDate = new Date(today);
    maxAdvanceDate.setDate(today.getDate() + settings.max_advance_booking_days);

    if (dateObj.getTime() > maxAdvanceDate.getTime()) {
      return {
        isValid: false,
        reason: `No se pueden hacer reservas con más de ${settings.max_advance_booking_days} días de anticipación`,
        userRole,
        appliedRule: 'privileged'
      };
    }

    // For same-day booking, filter slots based on current time
    const isToday = dateObj.getTime() === today.getTime();
    let validSlots = availableSlots.length > 0
      ? availableSlots
      : this.generateBusinessHours(settings.booking_window_start, settings.booking_window_end);

    if (isToday) {
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
      appliedRule: 'privileged'
    };
  }

  /**
   * Validate a specific time slot against tenant configuration
   */
  validateTimeSlot(
    organizationId: string,
    date: string,
    time: string,
    settings?: BookingSettings
  ): TimeSlotValidationResult {
    try {
      if (!settings) {
        // This would be async in real implementation, but for validation we use sync
        throw new Error('Settings required for time slot validation');
      }

      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      const slotDateTime = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();

      // Check advance booking rule
      const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
      const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));
      const meetsAdvanceRule = timeDifferenceMinutes >= (settings.advance_booking_hours * 60);

      // Check booking window
      const withinBookingWindow = this.isWithinBookingWindow(time, settings);

      // Check weekend policy
      const dayOfWeek = slotDateTime.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendAllowed = !isWeekend || settings.weekend_booking_enabled;

      const isValid = meetsAdvanceRule && withinBookingWindow && weekendAllowed;

      let reason: string | undefined;
      if (!meetsAdvanceRule) {
        reason = `Requiere mínimo ${settings.advance_booking_hours} horas de anticipación`;
      } else if (!withinBookingWindow) {
        reason = `Fuera del horario de reservas (${settings.booking_window_start} - ${settings.booking_window_end})`;
      } else if (!weekendAllowed) {
        reason = 'Reservas de fin de semana no permitidas';
      }

      return {
        isValid,
        reason,
        meetsAdvanceRule,
        withinBookingWindow,
        weekendAllowed
      };

    } catch (error) {
      console.error('Error validating time slot:', error);
      return {
        isValid: false,
        reason: 'Error validando horario',
        meetsAdvanceRule: false,
        withinBookingWindow: false,
        weekendAllowed: false
      };
    }
  }

  /**
   * Get default booking settings
   */
  private getDefaultSettings(): BookingSettings {
    return {
      advance_booking_hours: 4,
      max_advance_booking_days: 90,
      allow_same_day_booking: true,
      booking_window_start: '08:00',
      booking_window_end: '18:00',
      weekend_booking_enabled: false,
      auto_confirmation: true,
      cancellation_deadline_hours: 2,
      reschedule_deadline_hours: 2
    };
  }

  /**
   * Validate booking settings structure and values
   */
  private validateSettings(settings: BookingSettings): boolean {
    // Check advance booking hours (0-72 hours)
    if (settings.advance_booking_hours < 0 || settings.advance_booking_hours > 72) {
      return false;
    }

    // Check max advance booking days (1-365 days)
    if (settings.max_advance_booking_days < 1 || settings.max_advance_booking_days > 365) {
      return false;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(settings.booking_window_start) || !timeRegex.test(settings.booking_window_end)) {
      return false;
    }

    return true;
  }

  /**
   * Generate business hours array
   */
  private generateBusinessHours(startTime: string, endTime: string): string[] {
    const hours: string[] = [];
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);

    for (let hour = startHour; hour < endHour; hour++) {
      hours.push(`${hour.toString().padStart(2, '0')}:00`);
      hours.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    return hours;
  }

  /**
   * Check if time is within booking window
   */
  private isWithinBookingWindow(time: string, settings: BookingSettings): boolean {
    const [hours, minutes] = time.split(':').map(Number);
    const timeMinutes = hours * 60 + minutes;

    const [startHours, startMins] = settings.booking_window_start.split(':').map(Number);
    const startMinutes = startHours * 60 + startMins;

    const [endHours, endMins] = settings.booking_window_end.split(':').map(Number);
    const endMinutes = endHours * 60 + endMins;

    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  /**
   * Calculate next valid time for a date
   */
  private calculateNextValidTime(date: string, settings: BookingSettings): string {
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
   * Calculate hours until date becomes valid
   */
  private calculateHoursUntilValid(date: string, settings: BookingSettings): number {
    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);
    const dateStart = new Date(year, month - 1, day, 8, 0); // Assume 8 AM start
    
    const timeDifferenceMs = dateStart.getTime() - now.getTime();
    const hoursDifference = Math.ceil(timeDifferenceMs / (1000 * 60 * 60));
    
    return Math.max(0, settings.advance_booking_hours - hoursDifference);
  }

  /**
   * Clear configuration cache (useful for testing)
   */
  clearCache(): void {
    this.configCache.clear();
  }
}

export default BookingConfigService;
