/**
 * Availability Engine
 * Calculates available time slots for appointment booking
 * Handles doctor schedules, existing appointments, and availability blocks
 */

import { createClient } from '@/lib/supabase/server';

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
   * Calculate available time slots for a given date and criteria
   */
  async calculateAvailability(request: AvailabilityRequest): Promise<TimeSlot[]> {
    const { organizationId, date, doctorId, serviceId, duration = 30 } = request;

    try {
      // Get day of week (0 = Sunday, 6 = Saturday)
      const requestDate = new Date(date);
      const dayOfWeek = requestDate.getDay();

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

      // Sort by time
      allSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      return allSlots;

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
}
