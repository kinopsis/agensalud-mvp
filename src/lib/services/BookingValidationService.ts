/**
 * BOOKING VALIDATION SERVICE - UNIFIED VALIDATION LOGIC
 * 
 * Provides consistent validation for both new bookings and rescheduling operations.
 * Implements the 24-hour advance booking rule with role-based exceptions.
 * Uses ImmutableDateSystem for timezone-safe date/time calculations.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0 - Zero Displacement Architecture
 */

import ImmutableDateSystem from '@/lib/core/ImmutableDateSystem';
import { createClient } from '@/lib/supabase/server';

export interface ValidationParams {
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime?: string; // HH:MM (optional, will be calculated if not provided)
  duration?: number; // Minutes (default: 30)
  userRole: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
  organizationId: string;
  doctorId?: string;
  serviceId?: string;
  locationId?: string;
  isRescheduling?: boolean; // Whether this is a reschedule operation
  existingAppointmentId?: string; // For rescheduling validation
  useStandardRules?: boolean; // Force standard rules even for privileged users
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  code?: string;
  details?: {
    timeDifferenceHours?: number;
    requiredAdvanceHours?: number;
    userRole?: string;
    appliedRule?: 'standard' | 'privileged';
    isToday?: boolean;
    isPastTime?: boolean;
    conflictingAppointment?: any;
  };
  suggestions?: {
    nextAvailableTime?: string;
    nextAvailableDate?: string;
    alternativeSlots?: string[];
  };
}

export interface ConflictCheckParams {
  appointmentDate: string;
  startTime: string;
  endTime: string;
  doctorId: string;
  organizationId: string;
  excludeAppointmentId?: string; // For rescheduling
}

/**
 * BOOKING VALIDATION SERVICE CLASS
 * Centralized validation logic for all booking operations
 */
export class BookingValidationService {
  private static instance: BookingValidationService;
  
  static getInstance(): BookingValidationService {
    if (!BookingValidationService.instance) {
      BookingValidationService.instance = new BookingValidationService();
    }
    return BookingValidationService.instance;
  }

  /**
   * MAIN VALIDATION METHOD: Validates booking requests with unified logic
   */
  async validateBookingRequest(params: ValidationParams): Promise<ValidationResult> {
    const {
      appointmentDate,
      startTime,
      endTime,
      duration = 30,
      userRole,
      organizationId,
      doctorId,
      isRescheduling = false,
      existingAppointmentId,
      useStandardRules = false
    } = params;

    console.log(`🔐 BOOKING VALIDATION - ${isRescheduling ? 'RESCHEDULE' : 'NEW'} - User: ${userRole}, Date: ${appointmentDate}, Time: ${startTime}`);

    try {
      // 1. Validate date format using ImmutableDateSystem
      const dateValidation = ImmutableDateSystem.validateAndNormalize(appointmentDate, 'BookingValidationService');
      if (!dateValidation.isValid) {
        return {
          isValid: false,
          reason: `Fecha inválida: ${dateValidation.error}`,
          code: 'INVALID_DATE'
        };
      }

      // 2. Validate time format
      const timeValidation = this.validateTimeFormat(startTime);
      if (!timeValidation.isValid) {
        return {
          isValid: false,
          reason: timeValidation.reason,
          code: 'INVALID_TIME'
        };
      }

      // 3. Calculate end time if not provided
      const calculatedEndTime = endTime || this.calculateEndTime(startTime, duration);

      // 4. Validate that appointment is not in the past
      const pastValidation = this.validateNotInPast(appointmentDate, startTime);
      if (!pastValidation.isValid) {
        return pastValidation;
      }

      // 5. Apply role-based advance booking rules
      const advanceBookingValidation = this.validateAdvanceBookingRules(
        appointmentDate,
        startTime,
        userRole,
        useStandardRules,
        isRescheduling
      );
      if (!advanceBookingValidation.isValid) {
        return advanceBookingValidation;
      }

      // 6. Check for scheduling conflicts (if doctor is specified)
      if (doctorId) {
        const conflictValidation = await this.validateNoConflicts({
          appointmentDate,
          startTime,
          endTime: calculatedEndTime,
          doctorId,
          organizationId,
          excludeAppointmentId: existingAppointmentId
        });
        if (!conflictValidation.isValid) {
          return conflictValidation;
        }
      }

      // 7. Validate business hours (if applicable)
      const businessHoursValidation = await this.validateBusinessHours(
        appointmentDate,
        startTime,
        calculatedEndTime,
        doctorId,
        organizationId
      );
      if (!businessHoursValidation.isValid) {
        return businessHoursValidation;
      }

      console.log(`✅ BOOKING VALIDATION - ${isRescheduling ? 'RESCHEDULE' : 'NEW'} - PASSED for ${userRole}`);

      return {
        isValid: true,
        details: {
          userRole,
          appliedRule: this.getAppliedRule(userRole, useStandardRules),
          isToday: ImmutableDateSystem.isToday(appointmentDate)
        }
      };

    } catch (error) {
      console.error('Error in booking validation:', error);
      return {
        isValid: false,
        reason: 'Error interno de validación',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate advance booking rules with role-based logic
   */
  private validateAdvanceBookingRules(
    appointmentDate: string,
    startTime: string,
    userRole: string,
    useStandardRules: boolean,
    isRescheduling: boolean
  ): ValidationResult {
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
    const applyPrivilegedRules = isPrivilegedUser && !useStandardRules;
    const isToday = ImmutableDateSystem.isToday(appointmentDate);

    // For privileged users (unless forcing standard rules)
    if (applyPrivilegedRules) {
      // Privileged users can book same-day, just check if time hasn't passed
      if (isToday) {
        const isPastTime = this.isTimeInPast(startTime);
        if (isPastTime) {
          return {
            isValid: false,
            reason: 'No se puede agendar en horarios que ya han pasado',
            code: 'PAST_TIME',
            details: {
              userRole,
              appliedRule: 'privileged',
              isToday: true,
              isPastTime: true
            }
          };
        }
      }
      return { isValid: true };
    }

    // For standard users (patients) - 24-hour advance booking rule
    if (isToday) {
      return {
        isValid: false,
        reason: isRescheduling 
          ? 'Los pacientes deben reagendar citas con al menos 24 horas de anticipación'
          : 'Los pacientes deben reservar citas con al menos 24 horas de anticipación',
        code: 'ADVANCE_BOOKING_REQUIRED',
        details: {
          requiredAdvanceHours: 24,
          userRole,
          appliedRule: 'standard',
          isToday: true
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Validate that appointment is not in the past
   */
  private validateNotInPast(appointmentDate: string, startTime: string): ValidationResult {
    const isPastDate = ImmutableDateSystem.isPastDate(appointmentDate);
    
    if (isPastDate) {
      return {
        isValid: false,
        reason: 'No se puede agendar citas en fechas pasadas',
        code: 'PAST_DATE'
      };
    }

    // If it's today, check if time has passed
    const isToday = ImmutableDateSystem.isToday(appointmentDate);
    if (isToday) {
      const isPastTime = this.isTimeInPast(startTime);
      if (isPastTime) {
        return {
          isValid: false,
          reason: 'No se puede agendar en horarios que ya han pasado',
          code: 'PAST_TIME',
          details: {
            isToday: true,
            isPastTime: true
          }
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Check if time is in the past (for today's appointments)
   */
  private isTimeInPast(timeStr: string): boolean {
    try {
      const now = new Date();
      const [hours, minutes] = timeStr.split(':').map(Number);
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeMinutes = currentHours * 60 + currentMinutes;
      const appointmentTimeMinutes = hours * 60 + minutes;
      
      return appointmentTimeMinutes <= currentTimeMinutes;
    } catch (error) {
      console.error('Error checking if time is in past:', error);
      return false;
    }
  }

  /**
   * Validate time format (HH:MM)
   */
  private validateTimeFormat(timeStr: string): ValidationResult {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(timeStr)) {
      return {
        isValid: false,
        reason: 'Formato de hora inválido. Use HH:MM',
        code: 'INVALID_TIME_FORMAT'
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate end time based on start time and duration
   */
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + durationMinutes;
      
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating end time:', error);
      throw new Error('Invalid start time format');
    }
  }

  /**
   * Get applied rule type for logging
   */
  private getAppliedRule(userRole: string, useStandardRules: boolean): 'standard' | 'privileged' {
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
    return (isPrivilegedUser && !useStandardRules) ? 'privileged' : 'standard';
  }

  /**
   * Validate no scheduling conflicts exist
   */
  async validateNoConflicts(params: ConflictCheckParams): Promise<ValidationResult> {
    const {
      appointmentDate,
      startTime,
      endTime,
      doctorId,
      organizationId,
      excludeAppointmentId
    } = params;

    try {
      const supabase = await createClient();

      let query = supabase
        .from('appointments')
        .select('id, start_time, end_time, status, patient_id')
        .eq('organization_id', organizationId)
        .eq('doctor_id', doctorId)
        .eq('appointment_date', appointmentDate)
        .neq('status', 'cancelled');

      // Exclude current appointment if rescheduling
      if (excludeAppointmentId) {
        query = query.neq('id', excludeAppointmentId);
      }

      const { data: existingAppointments, error } = await query;

      if (error) {
        console.error('Error checking appointment conflicts:', error);
        return {
          isValid: false,
          reason: 'Error verificando conflictos de horario',
          code: 'CONFLICT_CHECK_ERROR'
        };
      }

      // Check for time overlaps
      for (const appointment of existingAppointments || []) {
        if (this.timesOverlap(startTime, endTime, appointment.start_time, appointment.end_time)) {
          return {
            isValid: false,
            reason: 'Ya existe una cita en este horario',
            code: 'TIME_CONFLICT',
            details: {
              conflictingAppointment: {
                id: appointment.id,
                startTime: appointment.start_time,
                endTime: appointment.end_time,
                status: appointment.status
              }
            }
          };
        }
      }

      return { isValid: true };

    } catch (error) {
      console.error('Error in conflict validation:', error);
      return {
        isValid: false,
        reason: 'Error interno verificando conflictos',
        code: 'CONFLICT_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate appointment is within business hours
   */
  async validateBusinessHours(
    appointmentDate: string,
    startTime: string,
    endTime: string,
    doctorId?: string,
    organizationId?: string
  ): Promise<ValidationResult> {
    // If no doctor specified, skip business hours validation
    if (!doctorId || !organizationId) {
      return { isValid: true };
    }

    try {
      const supabase = await createClient();

      // Get day of week
      const components = ImmutableDateSystem.parseDate(appointmentDate);
      const tempDate = new Date(components.year, components.month - 1, components.day);
      const dayOfWeek = tempDate.getDay();

      // Get doctor's schedule for this day
      const { data: schedules, error } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time, is_active')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (error) {
        console.error('Error checking business hours:', error);
        return {
          isValid: false,
          reason: 'Error verificando horarios de atención',
          code: 'BUSINESS_HOURS_CHECK_ERROR'
        };
      }

      if (!schedules || schedules.length === 0) {
        return {
          isValid: false,
          reason: 'El doctor no tiene horarios de atención configurados para este día',
          code: 'NO_BUSINESS_HOURS'
        };
      }

      // Check if appointment time falls within any of the doctor's schedules
      for (const schedule of schedules) {
        if (this.timeWithinRange(startTime, endTime, schedule.start_time, schedule.end_time)) {
          return { isValid: true };
        }
      }

      return {
        isValid: false,
        reason: 'El horario solicitado está fuera del horario de atención del doctor',
        code: 'OUTSIDE_BUSINESS_HOURS'
      };

    } catch (error) {
      console.error('Error in business hours validation:', error);
      return {
        isValid: false,
        reason: 'Error interno verificando horarios de atención',
        code: 'BUSINESS_HOURS_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Check if two time ranges overlap
   */
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Check if appointment time is within business hours range
   */
  private timeWithinRange(appointmentStart: string, appointmentEnd: string, businessStart: string, businessEnd: string): boolean {
    return appointmentStart >= businessStart && appointmentEnd <= businessEnd;
  }
}

export default BookingValidationService;
