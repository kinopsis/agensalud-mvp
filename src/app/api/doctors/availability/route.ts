/**
 * API Route for Doctor Availability
 * Provides available time slots for appointment booking
 *
 * @route GET /api/doctors/availability - Get available time slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for availability query
const availabilityQuerySchema = z.object({
  organizationId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  duration: z.string().transform(Number).pipe(z.number().min(15).max(240)).default('30'), // minutes
});

interface TimeSlot {
  start_time: string;
  end_time: string;
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  consultation_fee: number;
  available: boolean;
}

// GET /api/doctors/availability
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Extract and validate query parameters
    const queryParams = {
      organizationId: searchParams.get('organizationId'),
      serviceId: searchParams.get('serviceId') || undefined,
      doctorId: searchParams.get('doctorId') || undefined,
      date: searchParams.get('date'),
      duration: searchParams.get('duration') || '30',
    };

    const validationResult = availabilityQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      console.error('Validation failed for availability query:', {
        queryParams,
        errors: validationResult.error.errors
      });
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
          received: queryParams
        },
        { status: 400 }
      );
    }

    const { organizationId, serviceId, doctorId, date, duration } = validationResult.data;

    // Parse date and get day of week
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Use a simplified approach - get all doctors first, then filter
    console.log('Fetching doctors for organization:', organizationId, 'day:', dayOfWeek);

    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('DEBUG: Auth user:', user?.id || 'No user', 'Auth error:', authError?.message || 'None');

    // Use service role client for public availability data
    const { createClient: createServiceClient } = await import('@/lib/supabase/service');
    const serviceSupabase = createServiceClient();

    let allDoctors;

    if (serviceId) {
      // First get doctor IDs who can provide the specific service
      const { data: doctorServices, error: serviceError } = await serviceSupabase
        .from('doctor_services')
        .select('doctor_id')
        .eq('service_id', serviceId);

      if (serviceError) {
        console.error('Error fetching doctor services:', serviceError);
        return NextResponse.json(
          { error: 'Failed to fetch doctor services' },
          { status: 500 }
        );
      }

      const doctorIds = doctorServices?.map(ds => ds.doctor_id) || [];

      if (doctorIds.length === 0) {
        return NextResponse.json({
          success: true,
          slots: [],
          message: 'No doctors available for this service'
        });
      }

      // Filter doctors who can provide the specific service
      // CRITICAL FIX: doctorIds contains profile_id values from doctor_services table
      // We need to search by profile_id, not id
      const { data: filteredDoctors, error: doctorsError } = await serviceSupabase
        .from('doctors')
        .select(`
          id,
          profile_id,
          specialization,
          consultation_fee,
          profiles(id, first_name, last_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('is_available', true)
        .in('profile_id', doctorIds);

      allDoctors = { data: filteredDoctors, error: doctorsError };
    } else {
      // Return all available doctors
      const { data: allDoctorsData, error: doctorsError } = await serviceSupabase
        .from('doctors')
        .select(`
          id,
          profile_id,
          specialization,
          consultation_fee,
          profiles(id, first_name, last_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('is_available', true);

      allDoctors = { data: allDoctorsData, error: doctorsError };
    }

    const { data: doctorsData, error: doctorsError } = allDoctors;

    if (doctorsError) {
      console.error('Error fetching doctors:', doctorsError);
      return NextResponse.json(
        { error: 'Failed to fetch doctor availability' },
        { status: 500 }
      );
    }

    console.log('DEBUG: All doctors fetched:', doctorsData?.length || 0);

    // Filter by specific doctor if doctorId is provided
    let filteredDoctorsData = doctorsData;
    if (doctorId && doctorsData) {
      filteredDoctorsData = doctorsData.filter(doctor => doctor.id === doctorId);
      console.log('DEBUG: Filtered to specific doctor:', doctorId, 'Found:', filteredDoctorsData.length);

      if (filteredDoctorsData.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'Specified doctor not found or not available'
        });
      }
    }

    // Get schedules for these doctors for the target day
    // Use profile_id since doctor_availability.doctor_id references profiles.id
    const profileIds = filteredDoctorsData?.map(d => d.profile_id).filter(Boolean) || [];
    if (profileIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: doctorId ? 'Specified doctor not found' : (serviceId ? 'No doctors available for this service' : 'No doctors found in organization')
      });
    }

    console.log('DEBUG: Profile IDs for schedule lookup:', profileIds);
    console.log('DEBUG: Looking for day_of_week:', dayOfWeek);

    // Optimize: Get schedules and appointments in parallel
    const [schedulesResult, appointmentsResult] = await Promise.all([
      serviceSupabase
        .from('doctor_availability')
        .select('doctor_id, day_of_week, start_time, end_time, is_active')
        .in('doctor_id', profileIds)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true),
      serviceSupabase
        .from('appointments')
        .select('doctor_id, start_time, end_time')
        .eq('appointment_date', date)
        .in('status', ['confirmed', 'pending'])
    ]);

    const { data: schedules, error: schedulesError } = schedulesResult;
    const { data: existingAppointments, error: appointmentsError } = appointmentsResult;

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      console.error('Query parameters - profileIds:', profileIds, 'dayOfWeek:', dayOfWeek);
      return NextResponse.json(
        { error: 'Failed to fetch doctor schedules' },
        { status: 500 }
      );
    }

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to check existing appointments' },
        { status: 500 }
      );
    }

    console.log('DEBUG: Schedules found:', schedules?.length || 0);
    console.log('DEBUG: Existing appointments:', existingAppointments?.length || 0);

    // Combine doctors with their schedules
    // Match schedules using profile_id since doctor_availability.doctor_id references profiles.id
    const doctors = filteredDoctorsData?.filter(doctor => {
      const profileId = doctor.profile_id;
      const doctorSchedules = schedules?.filter(s => s.doctor_id === profileId) || [];
      if (doctorSchedules.length > 0) {
        doctor.schedules = doctorSchedules;
        return true;
      }
      return false;
    }) || [];

    console.log('DEBUG: Doctors with schedules:', doctors.length);

    // Get service pricing if serviceId is provided
    let servicePrice = null;
    if (serviceId) {
      const { data: serviceData, error: serviceError } = await serviceSupabase
        .from('services')
        .select('price')
        .eq('id', serviceId)
        .single();

      if (!serviceError && serviceData) {
        servicePrice = serviceData.price;
      }
    }

    // Generate available time slots with deduplication
    const availableSlots: TimeSlot[] = [];
    const slotMap = new Map<string, TimeSlot>(); // Use map to deduplicate by time + doctor

    for (const doctor of doctors) {
      const profileId = doctor.profile_id;
      const doctorAppointments = existingAppointments?.filter(
        apt => apt.doctor_id === profileId
      ) || [];

      // Get doctor's schedule for the day
      const schedules = doctor.schedules || [];

      // Merge overlapping schedules to avoid duplicates
      const mergedSchedules = mergeSchedules(schedules);

      for (const schedule of mergedSchedules) {
        if (schedule) {
          const slots = generateTimeSlots(
            schedule.start_time,
            schedule.end_time,
            duration,
            doctorAppointments
          );

          for (const slot of slots) {
            const profile = doctor.profiles;
            const slotKey = `${doctor.id}-${slot.start_time}`;

            // Only add if not already exists (prevents duplicates)
            if (!slotMap.has(slotKey)) {
              const timeSlot: TimeSlot = {
                start_time: slot.start_time,
                end_time: slot.end_time,
                doctor_id: doctor.id,
                doctor_name: profile
                  ? `Dr. ${profile.first_name} ${profile.last_name}`
                  : `Dr. ${doctor.specialization}`,
                specialization: doctor.specialization,
                consultation_fee: servicePrice || doctor.consultation_fee, // Use service price if available
                available: slot.available
              };

              slotMap.set(slotKey, timeSlot);
              availableSlots.push(timeSlot);
            }
          }
        }
      }
    }

    // Sort slots by time and filter only available ones
    const sortedAvailableSlots = availableSlots
      .filter(slot => slot.available)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    return NextResponse.json({
      success: true,
      data: sortedAvailableSlots,
      count: sortedAvailableSlots.length,
      date: date,
      day_of_week: dayOfWeek,
      duration_minutes: duration
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/doctors/availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate time slots for a given time range
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  existingAppointments: Array<{ start_time: string; end_time: string }>
): Array<{ start_time: string; end_time: string; available: boolean }> {
  const slots: Array<{ start_time: string; end_time: string; available: boolean }> = [];

  // Convert time strings to minutes since midnight
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // Generate slots
  for (let currentMinutes = startMinutes; currentMinutes + durationMinutes <= endMinutes; currentMinutes += durationMinutes) {
    const slotStart = minutesToTime(currentMinutes);
    const slotEnd = minutesToTime(currentMinutes + durationMinutes);

    // Check if slot conflicts with existing appointments
    const hasConflict = existingAppointments.some(appointment => {
      const aptStart = timeToMinutes(appointment.start_time);
      const aptEnd = timeToMinutes(appointment.end_time);

      return (
        (currentMinutes >= aptStart && currentMinutes < aptEnd) ||
        (currentMinutes + durationMinutes > aptStart && currentMinutes + durationMinutes <= aptEnd) ||
        (currentMinutes <= aptStart && currentMinutes + durationMinutes >= aptEnd)
      );
    });

    slots.push({
      start_time: slotStart,
      end_time: slotEnd,
      available: !hasConflict
    });
  }

  return slots;
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Merge overlapping schedules to prevent duplicate time slots
 */
function mergeSchedules(schedules: Array<{ start_time: string; end_time: string }>): Array<{ start_time: string; end_time: string }> {
  if (schedules.length <= 1) return schedules;

  // Sort schedules by start time
  const sorted = schedules
    .map(s => ({
      start_time: s.start_time,
      end_time: s.end_time,
      startMinutes: timeToMinutes(s.start_time),
      endMinutes: timeToMinutes(s.end_time)
    }))
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const merged: Array<{ start_time: string; end_time: string }> = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // If current schedule overlaps or is adjacent to next, merge them
    if (current.endMinutes >= next.startMinutes) {
      current = {
        start_time: current.start_time,
        end_time: current.endMinutes >= next.endMinutes ? current.end_time : next.end_time,
        startMinutes: current.startMinutes,
        endMinutes: Math.max(current.endMinutes, next.endMinutes)
      };
    } else {
      // No overlap, add current to merged and move to next
      merged.push({
        start_time: current.start_time,
        end_time: current.end_time
      });
      current = next;
    }
  }

  // Add the last schedule
  merged.push({
    start_time: current.start_time,
    end_time: current.end_time
  });

  return merged;
}
