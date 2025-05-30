import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/staff/doctors/[id]/availability
 * Update doctor availability status for Staff role
 * Allows Staff to manage doctor availability per PRD2.md Section 5.5
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: doctorId } = params;
    const body = await request.json();
    const { is_available } = body;

    if (typeof is_available !== 'boolean') {
      return NextResponse.json(
        { error: 'is_available must be a boolean value' },
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

    // Verify user has staff, admin, or superadmin access
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

    // Verify doctor exists and belongs to user's organization (for non-superadmin)
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, organization_id, profiles(first_name, last_name)')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Check organization access for non-superadmin users
    if (profile.role !== 'superadmin' && doctor.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Cannot modify doctors from other organizations' },
        { status: 403 }
      );
    }

    // Update doctor availability
    const { data: updatedDoctor, error: updateError } = await supabase
      .from('doctors')
      .update({ 
        is_available,
        updated_at: new Date().toISOString()
      })
      .eq('id', doctorId)
      .select(`
        id,
        is_available,
        specialization,
        profiles(first_name, last_name)
      `)
      .single();

    if (updateError) {
      console.error('Error updating doctor availability:', updateError);
      return NextResponse.json(
        { error: 'Failed to update doctor availability' },
        { status: 500 }
      );
    }

    // Log the availability change for audit purposes
    console.log(`Staff ${profile.role} ${user.id} updated doctor ${doctorId} availability to ${is_available}`);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoctor.id,
        is_available: updatedDoctor.is_available,
        doctor_name: `${updatedDoctor.profiles.first_name} ${updatedDoctor.profiles.last_name}`,
        specialization: updatedDoctor.specialization,
        updated_by: profile.role,
        updated_at: new Date().toISOString()
      },
      message: `Doctor availability updated to ${is_available ? 'available' : 'unavailable'}`
    });

  } catch (error) {
    console.error('Error in staff doctor availability API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staff/doctors/[id]/availability
 * Get doctor availability details for Staff role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: doctorId } = params;
    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has staff, admin, or superadmin access
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

    // Get doctor with availability information
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select(`
        id,
        is_available,
        specialization,
        consultation_fee,
        organization_id,
        profiles(first_name, last_name, email, phone),
        doctor_availability(
          id,
          day_of_week,
          start_time,
          end_time,
          is_available
        )
      `)
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Check organization access for non-superadmin users
    if (profile.role !== 'superadmin' && doctor.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Cannot access doctors from other organizations' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: doctor.id,
        is_available: doctor.is_available,
        specialization: doctor.specialization,
        consultation_fee: doctor.consultation_fee,
        profiles: doctor.profiles,
        availability_schedule: doctor.doctor_availability || []
      }
    });

  } catch (error) {
    console.error('Error in staff doctor availability GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
