import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/dashboard/staff/stats
 * Fetch statistics for staff dashboard
 * Includes daily operations, pending tasks, and patient management metrics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
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

    // Verify user has staff access to this organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        !['staff', 'admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get current date
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's appointments
    const { data: todayAppointments, error: todayError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('appointment_date', today);

    if (todayError) {
      console.error('Error fetching today appointments:', todayError);
      return NextResponse.json(
        { error: 'Failed to fetch today appointments' },
        { status: 500 }
      );
    }

    // Fetch pending appointments (all dates)
    const { data: pendingAppointments, error: pendingError } = await supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Error fetching pending appointments:', pendingError);
    }

    // Fetch total patients from patients table (CORRECCIÓN CRÍTICA)
    const { data: totalPatients, error: patientsError } = await supabase
      .from('patients')
      .select(`
        id,
        profiles!patients_profile_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId);

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
    }

    // Fetch total doctors from doctors table (CORRECCIÓN CRÍTICA)
    const { data: totalDoctors, error: doctorsError } = await supabase
      .from('doctors')
      .select(`
        id,
        specialization,
        profiles!doctors_profile_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId);

    if (doctorsError) {
      console.error('Error fetching doctors:', doctorsError);
    }

    // Fetch available doctors count
    const { data: availableDoctors, error: availableDoctorsError } = await supabase
      .from('doctors')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_available', true);

    if (availableDoctorsError) {
      console.error('Error fetching available doctors:', availableDoctorsError);
    }

    // Calculate stats from today's appointments
    const todayTotal = todayAppointments?.length || 0;
    const completedToday = todayAppointments?.filter(apt => apt.status === 'completed').length || 0;
    const upcomingToday = todayAppointments?.filter(apt =>
      ['confirmed', 'pending'].includes(apt.status)
    ).length || 0;

    const stats = {
      todayAppointments: todayTotal,
      pendingAppointments: pendingAppointments?.length || 0,
      totalPatients: totalPatients?.length || 0,
      totalDoctors: totalDoctors?.length || 0,
      availableDoctors: availableDoctors?.length || 0,
      completedToday,
      upcomingToday
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error in staff stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
