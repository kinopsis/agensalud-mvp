/**
 * Enhanced Availability Engine
 * Calculates available time slots for appointment booking with tenant configuration support
 * Handles doctor schedules, existing appointments, availability blocks, and configurable booking rules
 *
 * MIGRATION: Now uses ImmutableDateSystem for timezone-safe date handling
 * @version 2.0.0 - Displacement-Safe Architecture
 */

import { createClient } from '@/lib/supabase/server';
import BookingConfigService, { type BookingSettings } from '@/lib/services/BookingConfigService';
import ImmutableDateSystem from '@/lib/core/ImmutableDateSystem';

export interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  doctor_id: string;
  doctor_name: string;
  reason?: string; // Why slot is unavailable
}

export interface AvailabilityRequest {
  organizationId: string;
  date: string; // YYYY-MM-DD
  doctorId?: string; // Optional: specific doctor
  serviceId?: string; // Optional: specific service
  duration?: number; // Minutes, default 30
  useConfigurableRules?: boolean; // Whether to apply tenant-specific booking rules
  skipAdvanceBookingValidation?: boolean; // For admin/internal use
  userRole?: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin'; // MVP: Role-based validation
  useStandardRules?: boolean; // Force standard rules even for privileged users
}

export interface DoctorSchedule {
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface ExistingAppointment {
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface AvailabilityBlock {
  doctor_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  block_type: string;
}

export class AvailabilityEngine {
  private async getSupabase() {
    return await createClient();
  }

  /**
   * Calculate available time slots for a given date and criteria with role-based rules
   * MVP SIMPLIFIED: Supports role-based booking validation
   */
  async calculateAvailability(request: AvailabilityRequest): Promise<TimeSlot[]> {
    const {
      organizationId,
      date,
      doctorId,
      serviceId,
      duration = 30,
      useConfigurableRules = true,
      skipAdvanceBookingValidation = false,
      userRole = 'patient',
      useStandardRules = false
    } = request;

    try {
      // Get tenant booking settings if configurable rules are enabled
      let bookingSettings: BookingSettings | null = null;
      if (useConfigurableRules) {
        const bookingService = BookingConfigService.getInstance();
        bookingSettings = await bookingService.getBookingSettings(organizationId);
      }

      // MIGRATION: Use ImmutableDateSystem for timezone-safe day calculation
      const dayOfWeek = this.getDayOfWeekSafe(date);

      console.log(`🔧 AVAILABILITY ENGINE - Using ImmutableDateSystem for date: ${date}, dayOfWeek: ${dayOfWeek}`);

      // Check weekend policy if configurable rules are enabled
      if (useConfigurableRules && bookingSettings) {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend && !bookingSettings.weekend_booking_enabled) {
          console.log(`Weekend booking disabled for organization ${organizationId}`);
          return [];
        }
      }

      // Get doctor schedules for this day
      const schedules = await this.getDoctorSchedules(organizationId, dayOfWeek, doctorId);

      // Get existing appointments for this date
      const appointments = await this.getExistingAppointments(organizationId, date, doctorId);

      // Get availability blocks (vacations, sick days, etc.)
      const blocks = await this.getAvailabilityBlocks(organizationId, date, doctorId);

      // Generate time slots for each doctor
      const allSlots: TimeSlot[] = [];

      for (const schedule of schedules) {
        const doctorSlots = this.generateSlotsForDoctor(
          schedule,
          appointments.filter(apt => apt.doctor_id === schedule.doctor_id),
          blocks.filter(block => block.doctor_id === schedule.doctor_id),
          duration,
          date
        );
        allSlots.push(...doctorSlots);
      }

      // Apply role-based booking rules filtering (MVP SIMPLIFIED)
      let filteredSlots = allSlots;

      if (useConfigurableRules && !skipAdvanceBookingValidation) {
        if (userRole && ['patient', 'admin', 'staff', 'doctor', 'superadmin'].includes(userRole)) {
          // Use role-based filtering
          filteredSlots = await this.applyRoleBasedFilter(allSlots, date, organizationId, userRole, useStandardRules);
        } else if (bookingSettings) {
          // Fallback to legacy configurable rules
          filteredSlots = this.applyBookingRulesFilter(allSlots, date, bookingSettings);
        }
      }

      // Sort by time
      filteredSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      return filteredSlots;

    } catch (error) {
      console.error('Error calculating availability:', error);
      throw new Error('Failed to calculate availability');
    }
  }

  /**
   * Get doctor schedules for a specific day
   */
  private async getDoctorSchedules(
    organizationId: string,
    dayOfWeek: number,
    doctorId?: string
  ): Promise<DoctorSchedule[]> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('doctor_availability')
      .select(`
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        is_active,
        doctor:profiles!doctor_availability_doctor_id_fkey(
          first_name,
          last_name,
          organization_id
        )
      `)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching doctor schedules:', error);
      throw error;
    }

    // Filter by organization through doctor profile
    return (data || [])
      .filter(schedule => {
        const doctor = Array.isArray(schedule.doctor) && schedule.doctor.length > 0
          ? schedule.doctor[0]
          : null;
        return doctor?.organization_id === organizationId;
      })
      .map(schedule => {
        const doctor = Array.isArray(schedule.doctor) && schedule.doctor.length > 0
          ? schedule.doctor[0]
          : null;
        return {
          doctor_id: schedule.doctor_id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: schedule.is_active,
          doctor_name: doctor
            ? `${doctor.first_name} ${doctor.last_name}`
            : 'Doctor desconocido'
        };
      });
  }

  /**
   * Get existing appointments for a specific date
   */
  private async getExistingAppointments(
    organizationId: string,
    date: string,
    doctorId?: string
  ): Promise<ExistingAppointment[]> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('appointments')
      .select('doctor_id, start_time, end_time, status')
      .eq('organization_id', organizationId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching existing appointments:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get availability blocks (vacations, sick days, etc.)
   */
  private async getAvailabilityBlocks(
    organizationId: string,
    date: string,
    doctorId?: string
  ): Promise<AvailabilityBlock[]> {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const supabase = await this.getSupabase();
    let query = supabase
      .from('availability_blocks')
      .select(`
        doctor_id,
        start_datetime,
        end_datetime,
        reason,
        block_type,
        doctor:profiles!availability_blocks_doctor_id_fkey(
          organization_id
        )
      `)
      .lte('start_datetime', endOfDay)
      .gte('end_datetime', startOfDay);

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching availability blocks:', error);
      throw error;
    }

    // Filter by organization
    return (data || [])
      .filter(block => {
        const doctor = Array.isArray(block.doctor) && block.doctor.length > 0
          ? block.doctor[0]
          : null;
        return doctor?.organization_id === organizationId;
      })
      .map(block => ({
        doctor_id: block.doctor_id,
        start_datetime: block.start_datetime,
        end_datetime: block.end_datetime,
        reason: block.reason,
        block_type: block.block_type
      }));
  }

  /**
   * Generate time slots for a specific doctor
   */
  private generateSlotsForDoctor(
    schedule: DoctorSchedule & { doctor_name?: string },
    appointments: ExistingAppointment[],
    blocks: AvailabilityBlock[],
    duration: number,
    date: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const doctorName = schedule.doctor_name || 'Doctor';

    // Parse schedule times
    const scheduleStart = this.parseTime(schedule.start_time);
    const scheduleEnd = this.parseTime(schedule.end_time);

    // Generate slots every 30 minutes (or specified duration)
    let currentTime = scheduleStart;
    const slotDuration = duration;

    while (currentTime + slotDuration <= scheduleEnd) {
      const startTime = this.formatTime(currentTime);
      const endTime = this.formatTime(currentTime + slotDuration);

      // Check if slot is available
      const isBlocked = this.isTimeBlocked(currentTime, currentTime + slotDuration, blocks, date);
      const isBooked = this.isTimeBooked(startTime, endTime, appointments);

      let available = true;
      let reason = '';

      if (isBlocked.blocked) {
        available = false;
        reason = isBlocked.reason || 'No disponible';
      } else if (isBooked) {
        available = false;
        reason = 'Ocupado';
      }

      slots.push({
        start_time: startTime,
        end_time: endTime,
        available,
        doctor_id: schedule.doctor_id,
        doctor_name: doctorName,
        reason: available ? undefined : reason
      });

      currentTime += slotDuration;
    }

    return slots;
  }

  /**
   * Parse time string to minutes since midnight
   */
  private parseTime(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    return hours * 60 + minutes;
  }

  /**
   * Format minutes since midnight to time string
   */
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Check if time slot is blocked by availability blocks
   */
  private isTimeBlocked(
    startMinutes: number,
    endMinutes: number,
    blocks: AvailabilityBlock[],
    date: string
  ): { blocked: boolean; reason?: string } {
    for (const block of blocks) {
      const blockStart = new Date(block.start_datetime);
      const blockEnd = new Date(block.end_datetime);
      const slotDate = new Date(date);

      // Check if block affects this date
      if (slotDate >= blockStart && slotDate <= blockEnd) {
        // If it's a full day block, or if times overlap
        const blockStartMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
        const blockEndMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();

        if (
          (startMinutes < blockEndMinutes && endMinutes > blockStartMinutes) ||
          (blockStart.toDateString() !== blockEnd.toDateString()) // Multi-day block
        ) {
          return {
            blocked: true,
            reason: block.reason || `${block.block_type}`
          };
        }
      }
    }

    return { blocked: false };
  }

  /**
   * Check if time slot is booked by existing appointments
   */
  private isTimeBooked(startTime: string, endTime: string, appointments: ExistingAppointment[]): boolean {
    for (const appointment of appointments) {
      if (
        (startTime < appointment.end_time && endTime > appointment.start_time) &&
        appointment.status !== 'cancelled'
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Apply role-based booking rules to filter time slots (MVP SIMPLIFIED)
   * MIGRATION: Now uses ImmutableDateSystem for timezone-safe date comparisons
   */
  private async applyRoleBasedFilter(
    slots: TimeSlot[],
    date: string,
    organizationId: string,
    userRole: string,
    useStandardRules: boolean = false
  ): Promise<TimeSlot[]> {
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
    const applyPrivilegedRules = isPrivilegedUser && !useStandardRules;
    const today = ImmutableDateSystem.getTodayString();
    const isToday = ImmutableDateSystem.isToday(date);

    console.log(`🔐 ROLE-BASED FILTER - User: ${userRole}, Privileged: ${applyPrivilegedRules}, Date: ${date}, IsToday: ${isToday}`);

    return slots.map(slot => {
      // Skip if already unavailable
      if (!slot.available) return slot;

      // MIGRATION: Use ImmutableDateSystem for time comparisons
      if (applyPrivilegedRules) {
        // PRIVILEGED USERS: Can book same-day, just filter past times
        if (isToday) {
          const isPastTime = this.isTimeInPast(slot.start_time);
          if (isPastTime) {
            return {
              ...slot,
              available: false,
              reason: 'Horario ya pasado'
            };
          }
        }
        // Future dates are always valid for privileged users
        return slot;
      } else {
        // STANDARD USERS (PATIENTS): 24-hour advance booking rule
        if (isToday) {
          return {
            ...slot,
            available: false,
            reason: 'Los pacientes deben reservar citas con al menos 24 horas de anticipación'
          };
        }
        // Future dates are valid for standard users
        return slot;
      }
    });
  }

  /**
   * Apply configurable booking rules to filter time slots (legacy)
   */
  private applyBookingRulesFilter(
    slots: TimeSlot[],
    date: string,
    settings: BookingSettings
  ): TimeSlot[] {
    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);

    return slots.map(slot => {
      // Skip if already unavailable
      if (!slot.available) return slot;

      // Parse slot time
      const [hours, minutes] = slot.start_time.split(':').map(Number);
      const slotDateTime = new Date(year, month - 1, day, hours, minutes);

      // Check advance booking rule
      const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
      const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));
      const meetsAdvanceRule = timeDifferenceMinutes >= (settings.advance_booking_hours * 60);

      // Check booking window
      const withinBookingWindow = this.isWithinBookingWindow(slot.start_time, settings);

      // Check same day booking policy
      const isToday = date === now.toISOString().split('T')[0];
      const sameDayAllowed = !isToday || settings.allow_same_day_booking;

      // Apply all rules
      if (!meetsAdvanceRule) {
        return {
          ...slot,
          available: false,
          reason: `Requiere mínimo ${settings.advance_booking_hours} horas de anticipación`
        };
      }

      if (!withinBookingWindow) {
        return {
          ...slot,
          available: false,
          reason: `Fuera del horario de reservas (${settings.booking_window_start} - ${settings.booking_window_end})`
        };
      }

      if (!sameDayAllowed) {
        return {
          ...slot,
          available: false,
          reason: 'Reservas el mismo día no están permitidas'
        };
      }

      return slot;
    });
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
   * Get available slots for a specific doctor and date (simplified interface)
   */
  async getAvailableSlots(
    organizationId: string,
    doctorId: string,
    date: string,
    duration: number = 30
  ): Promise<string[]> {
    const availability = await this.calculateAvailability({
      organizationId,
      doctorId,
      date,
      duration
    });

    return availability
      .filter(slot => slot.available && slot.doctor_id === doctorId)
      .map(slot => slot.start_time);
  }

  /**
   * MIGRATION HELPER: Get day of week using ImmutableDateSystem (timezone-safe)
   */
  private getDayOfWeekSafe(dateStr: string): number {
    try {
      const components = ImmutableDateSystem.parseDate(dateStr);
      // Create Date object ONLY for day calculation, not manipulation
      const tempDate = new Date(components.year, components.month - 1, components.day);
      return tempDate.getDay(); // 0 = Sunday, 6 = Saturday
    } catch (error) {
      console.error('Error calculating day of week:', error);
      throw new Error(`Invalid date format: ${dateStr}`);
    }
  }

  /**
   * MIGRATION HELPER: Check if time is in the past (timezone-safe)
   */
  private isTimeInPast(timeStr: string): boolean {
    try {
      const now = new Date();
      const [hours, minutes] = timeStr.split(':').map(Number);
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeMinutes = currentHours * 60 + currentMinutes;
      const slotTimeMinutes = hours * 60 + minutes;

      return slotTimeMinutes <= currentTimeMinutes;
    } catch (error) {
      console.error('Error checking if time is in past:', error);
      return false;
    }
  }

  /**
   * Get available slots with configurable rules (enhanced interface)
   */
  async getAvailableSlotsEnhanced(
    organizationId: string,
    doctorId: string,
    date: string,
    duration: number = 30,
    useConfigurableRules: boolean = true
  ): Promise<TimeSlot[]> {
    const availability = await this.calculateAvailability({
      organizationId,
      doctorId,
      date,
      duration,
      useConfigurableRules
    });

    return availability.filter(slot => slot.doctor_id === doctorId);
  }
}
