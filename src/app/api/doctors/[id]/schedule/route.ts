/**
 * API Routes for Doctor Schedule Management
 * Handles CRUD operations for doctor schedules
 *
 * @route GET /api/doctors/[id]/schedule - Get doctor schedules
 * @route POST /api/doctors/[id]/schedule - Create new schedule
 * @route PUT /api/doctors/[id]/schedule - Update schedule
 * @route DELETE /api/doctors/[id]/schedule - Delete schedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';
import { withSchemaCacheMonitoring, logSchemaCacheError, isSchemaCacheError } from '@/lib/monitoring/supabase-monitor';

// Validation schemas
const scheduleSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  is_available: z.boolean().default(true), // Frontend uses is_available, maps to is_active in DB
  notes: z.string().optional(),
});

const updateScheduleSchema = scheduleSchema.extend({
  id: z.string().uuid(),
});

// GET /api/doctors/[id]/schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    const doctorId = params.id;

    // Validate doctor ID format
    if (!doctorId) {
      console.error('Doctor ID is missing from request params');
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    if (doctorId === 'undefined' || doctorId === 'null') {
      console.error('Doctor ID is undefined or null:', doctorId);
      return NextResponse.json(
        { error: 'Invalid doctor ID: received undefined or null' },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId)) {
      console.error('Doctor ID format is invalid:', doctorId);
      return NextResponse.json(
        { error: 'Invalid doctor ID format. Expected UUID format.' },
        { status: 400 }
      );
    }

    // First, get the profile_id from the doctors table
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('profile_id')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctor) {
      console.error('Doctor not found:', doctorError);
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    const profileId = doctor.profile_id;
    console.log('DEBUG: Doctor ID:', doctorId, 'Profile ID:', profileId);

    // Get doctor schedules directly from doctor_availability table with monitoring
    console.log('DEBUG: Querying doctor_availability for profile_id:', profileId);

    const { data: schedules, error } = await withSchemaCacheMonitoring(
      () => serviceSupabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', profileId)
        .order('day_of_week'),
      {
        endpoint: `/api/doctors/${doctorId}/schedule`,
        table: 'doctor_availability',
        operation: 'SELECT',
      }
    );

    console.log('DEBUG: Schedules query result:', { schedules, error });

    if (error && isSchemaCacheError(error)) {
      console.log('🚨 Schema cache error detected in doctor schedules');
      logSchemaCacheError(error, {
        endpoint: `/api/doctors/${doctorId}/schedule`,
        table: 'doctor_availability',
        operation: 'SELECT',
      });
    }

    console.log('DEBUG: Table query completed successfully');

    // If table doesn't exist, return empty schedules with instructions
    if (error && error.message?.includes('does not exist')) {
      console.log('⚠️ TABLA doctor_availability NO EXISTE - Devolviendo datos vacíos');
      console.log('📋 INSTRUCCIONES: Ejecutar script SQL en Supabase para crear la tabla');

      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Tabla doctor_availability no existe. Ejecutar script SQL para crearla.',
        instructions: 'Ver archivo DOCTOR_SCHEDULES_FIX_COMPLETE.md para instrucciones'
      });
    }

    if (error) {
      console.error('Error fetching doctor schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      );
    }

    // Transform data for better client consumption (simplified for testing)
    const transformedSchedules = schedules?.map(schedule => ({
      id: schedule.id,
      day_of_week: schedule.day_of_week,
      day_name: getDayName(schedule.day_of_week),
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      is_available: schedule.is_active,
      notes: schedule.notes,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
      doctor: {
        id: profileId,
        name: 'Doctor Name', // Temporary placeholder
        email: 'doctor@example.com', // Temporary placeholder
        specialization: 'General',
      }
    }));

    return NextResponse.json({
      success: true,
      data: transformedSchedules || [],
      count: transformedSchedules?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/doctors/[id]/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/doctors/[id]/schedule
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const doctorId = params.id;
    const body = await request.json();

    // Validate input
    const validationResult = scheduleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const scheduleData = validationResult.data;

    // Validate time range
    if (scheduleData.start_time >= scheduleData.end_time) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    // First, get the profile_id from the doctors table
    const { data: doctorRecord, error: doctorError } = await supabase
      .from('doctors')
      .select('profile_id, organization_id')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctorRecord) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    const profileId = doctorRecord.profile_id;

    // Check for schedule conflicts
    const { data: existingSchedules, error: conflictError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', profileId)
      .eq('day_of_week', scheduleData.day_of_week);

    if (conflictError) {
      console.error('Error checking schedule conflicts:', conflictError);
      return NextResponse.json(
        { error: 'Failed to validate schedule' },
        { status: 500 }
      );
    }

    // Check for time overlaps
    const hasConflict = existingSchedules?.some(existing => {
      const existingStart = existing.start_time;
      const existingEnd = existing.end_time;
      const newStart = scheduleData.start_time;
      const newEnd = scheduleData.end_time;

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Schedule conflict detected for this day and time' },
        { status: 409 }
      );
    }

    // Get default location for the organization
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', doctorRecord.organization_id)
      .limit(1)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'No location found for organization' },
        { status: 400 }
      );
    }

    // Create new schedule (map is_available to is_active)
    const { is_available, ...otherData } = scheduleData;
    const { data: newSchedule, error: createError } = await supabase
      .from('doctor_availability')
      .insert({
        doctor_id: profileId,
        location_id: location.id,
        is_active: is_available,
        ...otherData
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating schedule:', createError);
      return NextResponse.json(
        { error: 'Failed to create schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newSchedule,
        day_name: getDayName(newSchedule.day_of_week)
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/doctors/[id]/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/doctors/[id]/schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const doctorId = params.id;
    const body = await request.json();

    // Validate input
    const validationResult = updateScheduleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { id: scheduleId, ...scheduleData } = validationResult.data;

    // Validate time range
    if (scheduleData.start_time >= scheduleData.end_time) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    // First, get the profile_id from the doctors table
    const { data: doctorRecord, error: doctorError } = await supabase
      .from('doctors')
      .select('profile_id')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctorRecord) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    const profileId = doctorRecord.profile_id;

    // Update schedule (map is_available to is_active)
    const { is_available, ...otherData } = scheduleData;
    const updateData = {
      is_active: is_available,
      ...otherData
    };

    const { data: updatedSchedule, error: updateError } = await supabase
      .from('doctor_availability')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('doctor_id', profileId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating schedule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    if (!updatedSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedSchedule,
        day_name: getDayName(updatedSchedule.day_of_week)
      }
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/doctors/[id]/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/doctors/[id]/schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const doctorId = params.id;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    // First, get the profile_id from the doctors table
    const { data: doctorRecord, error: doctorError } = await supabase
      .from('doctors')
      .select('profile_id')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctorRecord) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    const profileId = doctorRecord.profile_id;

    // Delete schedule
    const { error: deleteError } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', scheduleId)
      .eq('doctor_id', profileId);

    if (deleteError) {
      console.error('Error deleting schedule:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/doctors/[id]/schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get day name
function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayOfWeek] || 'Desconocido';
}

// Force recompilation - updated with profile_id fix
