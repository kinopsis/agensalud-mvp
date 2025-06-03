import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/appointments/[id]
 * Get a specific appointment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    // Get appointment with related data
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        duration_minutes,
        status,
        reason,
        notes,
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(first_name, last_name)
        ),
        patient:profiles!appointments_patient_id_fkey(
          id,
          first_name,
          last_name
        ),
        location:locations!appointments_location_id_fkey(
          id,
          name,
          address
        ),
        service:services!appointments_service_id_fkey(
          id,
          name,
          duration_minutes,
          price
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching appointment:', error)
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: appointment
    })

  } catch (error) {
    console.error('Error in GET /api/appointments/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/appointments/[id]
 * Update an appointment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { appointment_date, start_time, status, duration_minutes, reason, notes } = body

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (appointment_date !== undefined) updateData.appointment_date = appointment_date
    if (start_time !== undefined) updateData.start_time = start_time
    if (status !== undefined) updateData.status = status
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes
    if (reason !== undefined) updateData.reason = reason
    if (notes !== undefined) updateData.notes = notes

    // Update the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating appointment:', error)
      return NextResponse.json(
        { success: false, error: 'Error al actualizar la cita' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: appointment
    })

  } catch (error) {
    console.error('Error in PATCH /api/appointments/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/appointments/[id]
 * Delete an appointment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    // Delete the appointment
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting appointment:', error)
      return NextResponse.json(
        { success: false, error: 'Error al eliminar la cita' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cita eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error in DELETE /api/appointments/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
