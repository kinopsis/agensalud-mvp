/**
 * UNIFIED SLOT GENERATOR - SINGLE SOURCE OF TRUTH
 * 
 * Centralized slot generation logic that eliminates inconsistencies between
 * different booking flows (manual, AI, rescheduling). Uses ImmutableDateSystem
 * for timezone-safe date handling.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0 - Zero Displacement Architecture
 */

import ImmutableDateSystem from '@/lib/core/ImmutableDateSystem';
import { createClient } from '@/lib/supabase/server';

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  available: boolean;
  doctor_id: string;
  doctor_name: string;
  specialization?: string;
  consultation_fee?: number;
  duration_minutes: number;
  reason?: string; // Why slot is unavailable
  service_id?: string;
  location_id?: string;
}

export interface SlotGenerationParams {
  organizationId: string;
  date: string; // YYYY-MM-DD format
  doctorId?: string;
  serviceId?: string;
  locationId?: string;
  duration: number; // Minutes
  userRole: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
  useStandardRules?: boolean; // Force standard rules even for privileged users
  skipAdvanceBookingValidation?: boolean; // For internal use
}

export interface DoctorSchedule {
  doctor_id: string;
  doctor_name: string;
  specialization?: string;
  consultation_fee?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  location_id?: string;
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

/**
 * UNIFIED SLOT GENERATOR CLASS
 * Single source of truth for all slot generation across the system
 */
export class UnifiedSlotGenerator {
  private static instance: UnifiedSlotGenerator;
  
  static getInstance(): UnifiedSlotGenerator {
    if (!UnifiedSlotGenerator.instance) {
      UnifiedSlotGenerator.instance = new UnifiedSlotGenerator();
    }
    return UnifiedSlotGenerator.instance;
  }

  /**
   * MAIN ENTRY POINT: Generate time slots with unified logic
   */
  async generateSlots(params: SlotGenerationParams): Promise<TimeSlot[]> {
    const {
      organizationId,
      date,
      doctorId,
      serviceId,
      locationId,
      duration,
      userRole,
      useStandardRules = false,
      skipAdvanceBookingValidation = false
    } = params;

    console.log(`🔧 UNIFIED SLOT GENERATOR - Date: ${date}, User: ${userRole}, Duration: ${duration}min`);

    try {
      // Validate date format using ImmutableDateSystem
      const validationResult = ImmutableDateSystem.validateAndNormalize(date, 'UnifiedSlotGenerator');
      if (!validationResult.isValid) {
        throw new Error(`Invalid date: ${validationResult.error}`);
      }

      // Get day of week using timezone-safe method
      const dayOfWeek = this.getDayOfWeekSafe(date);

      // Get doctor schedules for this day
      const schedules = await this.getDoctorSchedules(organizationId, dayOfWeek, doctorId, serviceId);

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
          date,
          serviceId,
          locationId
        );
        allSlots.push(...doctorSlots);
      }

      // Apply role-based filtering
      let filteredSlots = allSlots;
      if (!skipAdvanceBookingValidation) {
        filteredSlots = this.applyRoleBasedFiltering(allSlots, date, userRole, useStandardRules);
      }

      // Sort by time and doctor
      filteredSlots.sort((a, b) => {
        const timeComparison = a.start_time.localeCompare(b.start_time);
        if (timeComparison !== 0) return timeComparison;
        return a.doctor_name.localeCompare(b.doctor_name);
      });

      console.log(`✅ UNIFIED SLOT GENERATOR - Generated ${filteredSlots.length} slots (${filteredSlots.filter(s => s.available).length} available)`);

      return filteredSlots;

    } catch (error) {
      console.error('Error in UnifiedSlotGenerator:', error);
      throw new Error(`Failed to generate slots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply role-based filtering with consistent 24-hour rule
   */
  applyRoleBasedFiltering(
    slots: TimeSlot[],
    date: string,
    userRole: string,
    useStandardRules: boolean = false
  ): TimeSlot[] {
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
    const applyPrivilegedRules = isPrivilegedUser && !useStandardRules;
    const isToday = ImmutableDateSystem.isToday(date);

    console.log(`🔐 UNIFIED ROLE FILTER - User: ${userRole}, Privileged: ${applyPrivilegedRules}, IsToday: ${isToday}`);

    return slots.map(slot => {
      // Skip if already unavailable
      if (!slot.available) return slot;

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
        return slot;
      }
    });
  }

  /**
   * Get day of week using ImmutableDateSystem (timezone-safe)
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
   * Check if time is in the past (timezone-safe)
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
   * Get doctor schedules for a specific day
   */
  private async getDoctorSchedules(
    organizationId: string,
    dayOfWeek: number,
    doctorId?: string,
    serviceId?: string
  ): Promise<DoctorSchedule[]> {
    const supabase = await createClient();

    let query = supabase
      .from('doctor_availability')
      .select(`
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        is_active,
        location_id,
        doctor:profiles!doctor_availability_doctor_id_fkey(
          first_name,
          last_name,
          organization_id
        ),
        doctor_profile:doctors!doctor_availability_doctor_id_fkey(
          specialization,
          consultation_fee
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

    // Filter by organization and optionally by service
    let schedules = (data || [])
      .filter(schedule => {
        const doctor = Array.isArray(schedule.doctor) && schedule.doctor.length > 0
          ? schedule.doctor[0]
          : null;
        return doctor?.organization_id === organizationId;
      });

    // If serviceId is provided, filter doctors who offer that service
    if (serviceId) {
      const { data: doctorServices } = await supabase
        .from('doctor_services')
        .select('doctor_id')
        .eq('service_id', serviceId);

      const validDoctorIds = new Set(doctorServices?.map(ds => ds.doctor_id) || []);
      schedules = schedules.filter(schedule => validDoctorIds.has(schedule.doctor_id));
    }

    return schedules.map(schedule => {
      const doctor = Array.isArray(schedule.doctor) && schedule.doctor.length > 0
        ? schedule.doctor[0]
        : null;
      const doctorProfile = Array.isArray(schedule.doctor_profile) && schedule.doctor_profile.length > 0
        ? schedule.doctor_profile[0]
        : null;

      return {
        doctor_id: schedule.doctor_id,
        doctor_name: doctor
          ? `Dr. ${doctor.first_name} ${doctor.last_name}`
          : 'Doctor desconocido',
        specialization: doctorProfile?.specialization,
        consultation_fee: doctorProfile?.consultation_fee,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: schedule.is_active,
        location_id: schedule.location_id
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
    const supabase = await createClient();

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

    const supabase = await createClient();

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
    schedule: DoctorSchedule,
    appointments: ExistingAppointment[],
    blocks: AvailabilityBlock[],
    duration: number,
    date: string,
    serviceId?: string,
    locationId?: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Parse schedule times
    const scheduleStart = this.parseTime(schedule.start_time);
    const scheduleEnd = this.parseTime(schedule.end_time);

    // Generate slots every specified duration
    let currentTime = scheduleStart;

    while (currentTime + duration <= scheduleEnd) {
      const startTime = this.formatTime(currentTime);
      const endTime = this.formatTime(currentTime + duration);

      // Check if slot is available
      const isBlocked = this.isTimeBlocked(currentTime, currentTime + duration, blocks, date);
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
        id: `${schedule.doctor_id}-${date}-${startTime}`,
        start_time: startTime,
        end_time: endTime,
        available,
        doctor_id: schedule.doctor_id,
        doctor_name: schedule.doctor_name,
        specialization: schedule.specialization,
        consultation_fee: schedule.consultation_fee,
        duration_minutes: duration,
        reason: available ? undefined : reason,
        service_id: serviceId,
        location_id: locationId || schedule.location_id
      });

      currentTime += duration;
    }

    return slots;
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
}

export default UnifiedSlotGenerator;
