import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/doctors/[id]/schedule/[scheduleId]
 * Update a specific schedule entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const { id: doctorId, scheduleId } = params;
    const body = await request.json();
    const {
      day_of_week,
      start_time,
      end_time,
      is_available,
      notes
    } = body;

    if (!doctorId || !scheduleId) {
      return NextResponse.json(
        { error: 'Doctor ID and Schedule ID are required' },
        { status: 400 }
      );
    }

    // Validation
    if (day_of_week !== undefined && (day_of_week < 0 || day_of_week > 6)) {
      return NextResponse.json(
        { error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (start_time && !timeRegex.test(start_time)) {
      return NextResponse.json(
        { error: 'Invalid start_time format. Use HH:MM format' },
        { status: 400 }
      );
    }

    if (end_time && !timeRegex.test(end_time)) {
      return NextResponse.json(
        { error: 'Invalid end_time format. Use HH:MM format' },
        { status: 400 }
      );
    }

    // Validate time range if both times are provided
    if (start_time && end_time && start_time >= end_time) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has appropriate access (staff, admin, superadmin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get doctor's organization to verify access
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('organization_id')
      .eq('profile_id', doctorId)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // For non-superadmin users, ensure they can only manage doctors in their organization
    if (profile.role !== 'superadmin' && profile.organization_id !== doctor.organization_id) {
      return NextResponse.json(
        { error: 'Cannot manage doctors from other organizations' },
        { status: 403 }
      );
    }

    // Get existing schedule to verify it exists and belongs to the doctor
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('id', scheduleId)
      .eq('doctor_id', doctorId)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (day_of_week !== undefined) updateData.day_of_week = day_of_week;
    if (start_time !== undefined) updateData.start_time = `${start_time}:00`;
    if (end_time !== undefined) updateData.end_time = `${end_time}:00`;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (notes !== undefined) updateData.notes = notes;

    // Check for overlapping schedules if day or time is being changed
    if (day_of_week !== undefined || start_time !== undefined || end_time !== undefined) {
      const checkDay = day_of_week !== undefined ? day_of_week : existingSchedule.day_of_week;
      const checkStartTime = start_time !== undefined ? start_time : existingSchedule.start_time.substring(0, 5);
      const checkEndTime = end_time !== undefined ? end_time : existingSchedule.end_time.substring(0, 5);

      const { data: otherSchedules, error: overlapError } = await supabase
        .from('doctor_availability')
        .select('id, start_time, end_time')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', checkDay)
        .neq('id', scheduleId); // Exclude current schedule

      if (overlapError) {
        console.error('Error checking for overlapping schedules:', overlapError);
        return NextResponse.json(
          { error: 'Failed to validate schedule' },
          { status: 500 }
        );
      }

      // Check for time overlaps
      const hasOverlap = otherSchedules?.some(schedule => {
        const existingStart = schedule.start_time.substring(0, 5);
        const existingEnd = schedule.end_time.substring(0, 5);
        
        return (
          (checkStartTime >= existingStart && checkStartTime < existingEnd) ||
          (checkEndTime > existingStart && checkEndTime <= existingEnd) ||
          (checkStartTime <= existingStart && checkEndTime >= existingEnd)
        );
      });

      if (hasOverlap) {
        return NextResponse.json(
          { error: 'Schedule overlaps with existing schedule for this day' },
          { status: 400 }
        );
      }
    }

    // Update the schedule
    const { data: schedule, error } = await supabase
      .from('doctor_availability')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error) {
      console.error('Error updating doctor schedule:', error);
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Error in PUT /api/doctors/[id]/schedule/[scheduleId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/doctors/[id]/schedule/[scheduleId]
 * Delete a specific schedule entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; scheduleId: string } }
) {
  try {
    const { id: doctorId, scheduleId } = params;

    if (!doctorId || !scheduleId) {
      return NextResponse.json(
        { error: 'Doctor ID and Schedule ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has appropriate access (staff, admin, superadmin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['staff', 'admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get doctor's organization to verify access
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('organization_id')
      .eq('profile_id', doctorId)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // For non-superadmin users, ensure they can only manage doctors in their organization
    if (profile.role !== 'superadmin' && profile.organization_id !== doctor.organization_id) {
      return NextResponse.json(
        { error: 'Cannot manage doctors from other organizations' },
        { status: 403 }
      );
    }

    // Check if schedule has future appointments
    const { data: futureAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .limit(1);

    if (appointmentsError) {
      console.error('Error checking future appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to verify schedule usage' },
        { status: 500 }
      );
    }

    if (futureAppointments && futureAppointments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete schedule that has future appointments. Please reschedule appointments first.' },
        { status: 400 }
      );
    }

    // Delete the schedule
    const { error } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', scheduleId)
      .eq('doctor_id', doctorId);

    if (error) {
      console.error('Error deleting doctor schedule:', error);
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
    console.error('Error in DELETE /api/doctors/[id]/schedule/[scheduleId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
