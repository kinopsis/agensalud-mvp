'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateAppointmentData {
  patient_id: string
  doctor_id: string
  appointment_date: string
  appointment_time: string
  duration_minutes?: number
  reason?: string
  notes?: string
}

export interface UpdateAppointmentData {
  id: string
  appointment_date?: string
  start_time?: string
  duration_minutes?: number
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  reason?: string
  notes?: string
}

export interface DoctorScheduleData {
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available?: boolean
}

/**
 * Create a new appointment
 */
export async function createAppointment(data: CreateAppointmentData) {
  try {
    const supabase = await createClient()

    // Get current user to verify permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    // Get user profile to check organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Perfil de usuario no encontrado')
    }

    // Check if the appointment slot is available
    const { data: existingAppointment, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', data.doctor_id)
      .eq('appointment_date', data.appointment_date)
      .eq('start_time', data.appointment_time)
      .in('status', ['scheduled', 'confirmed'])
      .maybeSingle()

    if (checkError) {
      console.error('Error checking appointment availability:', checkError)
      throw new Error(`Error verificando disponibilidad: ${checkError.message}`)
    }

    if (existingAppointment) {
      throw new Error('Este horario ya está ocupado')
    }

    // Get default service and location for the organization
    const { data: defaultService } = await supabase
      .from('services')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .limit(1)
      .single()

    const { data: defaultLocation } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .limit(1)
      .single()

    // Calculate end time
    const durationMinutes = data.duration_minutes || 30
    const startTime = new Date(`1970-01-01T${data.appointment_time}`)
    const endTime = new Date(startTime.getTime() + (durationMinutes * 60000))
    const endTimeString = endTime.toTimeString().slice(0, 8) // HH:MM:SS format

    // Create the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        organization_id: profile.organization_id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        service_id: defaultService?.id,
        location_id: defaultLocation?.id,
        appointment_date: data.appointment_date,
        start_time: data.appointment_time,
        end_time: endTimeString,
        duration_minutes: durationMinutes,
        reason: data.reason,
        notes: data.notes,
        status: 'scheduled'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      console.error('Appointment data:', {
        organization_id: profile.organization_id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        appointment_date: data.appointment_date,
        start_time: data.appointment_time
      })
      throw new Error(`Error al crear la cita: ${error.message}`)
    }

    revalidatePath('/appointments')
    revalidatePath('/dashboard')

    return { success: true, data: appointment }
  } catch (error) {
    console.error('Error in createAppointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(data: UpdateAppointmentData) {
  try {
    const supabase = await createClient()

    // Get current user to verify permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    // Update the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        appointment_date: data.appointment_date,
        start_time: data.start_time,
        duration_minutes: data.duration_minutes,
        status: data.status,
        reason: data.reason,
        notes: data.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating appointment:', error)
      throw new Error('Error al actualizar la cita')
    }

    revalidatePath('/appointments')
    revalidatePath('/dashboard')

    return { success: true, data: appointment }
  } catch (error) {
    console.error('Error in updateAppointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(appointmentId: string) {
  try {
    const supabase = await createClient()

    // Get current user to verify permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    // Update appointment status to cancelled
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling appointment:', error)
      throw new Error('Error al cancelar la cita')
    }

    revalidatePath('/appointments')
    revalidatePath('/dashboard')

    return { success: true, data: appointment }
  } catch (error) {
    console.error('Error in cancelAppointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Get available appointment slots for a doctor on a specific date
 */
export async function getAvailableSlots(doctorId: string, date: string) {
  try {
    const supabase = await createClient()

    // Get doctor's schedule for the day of week
    const dayOfWeek = new Date(date).getDay()

    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single()

    if (scheduleError || !schedule) {
      return { success: true, data: [] } // No schedule for this day
    }

    // Get existing appointments for this doctor on this date
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('start_time, duration_minutes')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed'])

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      throw new Error(`Error obteniendo citas existentes: ${appointmentsError.message}`)
    }

    // Generate available slots
    const slots = generateTimeSlots(
      schedule.start_time,
      schedule.end_time,
      30, // 30-minute slots
      appointments || []
    )

    return { success: true, data: slots }
  } catch (error) {
    console.error('Error in getAvailableSlots:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Create or update doctor schedule
 */
export async function upsertDoctorSchedule(data: DoctorScheduleData) {
  try {
    const supabase = await createClient()

    // Get current user to verify permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    // Check if schedule already exists
    const { data: existingSchedule, error: checkError } = await supabase
      .from('doctor_availability')
      .select('id')
      .eq('doctor_id', data.doctor_id)
      .eq('day_of_week', data.day_of_week)
      .single()

    let result
    if (existingSchedule) {
      // Update existing schedule
      const { data: schedule, error } = await supabase
        .from('doctor_availability')
        .update({
          start_time: data.start_time,
          end_time: data.end_time,
          is_available: data.is_available ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSchedule.id)
        .select()
        .single()

      if (error) throw error
      result = schedule
    } else {
      // Create new schedule
      const { data: schedule, error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: data.doctor_id,
          day_of_week: data.day_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
          is_available: data.is_available ?? true
        })
        .select()
        .single()

      if (error) throw error
      result = schedule
    }

    revalidatePath('/doctor/schedule')
    revalidatePath('/appointments')

    return { success: true, data: result }
  } catch (error) {
    console.error('Error in upsertDoctorSchedule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Helper function to generate time slots
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number,
  existingAppointments: Array<{ start_time: string; duration_minutes: number }>
): string[] {
  const slots: string[] = []
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)

  let current = new Date(start)

  while (current < end) {
    const timeString = current.toTimeString().slice(0, 5) // HH:MM format

    // Check if this slot conflicts with existing appointments
    const hasConflict = existingAppointments.some(apt => {
      const aptStart = new Date(`2000-01-01T${apt.start_time}`)
      const aptEnd = new Date(aptStart.getTime() + (apt.duration_minutes * 60000))
      const slotEnd = new Date(current.getTime() + (slotDuration * 60000))

      return (current >= aptStart && current < aptEnd) ||
             (slotEnd > aptStart && slotEnd <= aptEnd) ||
             (current <= aptStart && slotEnd >= aptEnd)
    })

    if (!hasConflict) {
      slots.push(timeString)
    }

    current = new Date(current.getTime() + (slotDuration * 60000))
  }

  return slots
}
