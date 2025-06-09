import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/dashboard/admin/stats
 * Fetch comprehensive statistics for admin dashboard
 * Includes appointments, patients, doctors, and trends
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

    // Verify user has admin access to this organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get date ranges
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // Fetch total appointments this month
    const { data: thisMonthAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('appointment_date', thisMonth)
      .lte('appointment_date', today);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments data' },
        { status: 500 }
      );
    }

    // Fetch last month appointments for trend calculation
    const { data: lastMonthAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('appointment_date', lastMonth)
      .lte('appointment_date', lastMonthEnd);

    // Fetch today's appointments
    const { data: todayAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('appointment_date', today);

    // Fetch total patients from patients table (CORRECCIÓN CRÍTICA)
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select(`
        id,
        created_at,
        profiles!patients_profile_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId);

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return NextResponse.json(
        { error: 'Failed to fetch patients data' },
        { status: 500 }
      );
    }

    // Fetch total doctors from doctors table (CORRECCIÓN CRÍTICA)
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select(`
        id,
        specialization,
        profiles!doctors_profile_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId);

    if (doctorsError) {
      console.error('Error fetching doctors:', doctorsError);
      return NextResponse.json(
        { error: 'Failed to fetch doctors data' },
        { status: 500 }
      );
    }

    // Fetch pending appointments
    const { data: pendingAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

    // Fetch completed appointments
    const { data: completedAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'completed');

    // Calculate trends
    const thisMonthCount = thisMonthAppointments?.length || 0;
    const lastMonthCount = lastMonthAppointments?.length || 0;
    const appointmentsTrend = lastMonthCount > 0
      ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : 0;

    // Calculate new patients this month
    const newPatientsThisMonth = patients?.filter(patient => {
      if (!patient.created_at || !thisMonth) return false;
      try {
        const createdDate = new Date(patient.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= thisMonth;
      } catch {
        return false;
      }
    }).length || 0;

    const newPatientsLastMonth = patients?.filter(patient => {
      if (!patient.created_at || !lastMonth || !lastMonthEnd) return false;
      try {
        const createdDate = new Date(patient.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= lastMonth && createdDate <= lastMonthEnd;
      } catch {
        return false;
      }
    }).length || 0;

    const patientsTrend = newPatientsLastMonth > 0
      ? Math.round(((newPatientsThisMonth - newPatientsLastMonth) / newPatientsLastMonth) * 100)
      : newPatientsThisMonth > 0 ? 100 : 0;

    const stats = {
      totalAppointments: thisMonthCount,
      todayAppointments: todayAppointments?.length || 0,
      totalPatients: patients?.length || 0,
      totalDoctors: doctors?.length || 0,
      appointmentsTrend,
      patientsTrend,
      pendingAppointments: pendingAppointments?.length || 0,
      completedAppointments: completedAppointments?.length || 0
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error in admin stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
