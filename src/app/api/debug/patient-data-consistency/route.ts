import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';

/**
 * DEBUG ENDPOINT: Patient Data Consistency Analysis
 * Investigates inconsistencias entre dashboard stats y appointment history
 * Específicamente para resolver el caso de María García (13 citas vs 0 citas)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientEmail = searchParams.get('email') || 'maria.garcia@example.com';
    const organizationId = searchParams.get('organizationId');

    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const targetOrgId = organizationId || profile.organization_id;

    // 1. Find María García's profile
    const { data: mariaProfile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('email', patientEmail)
      .single();

    if (profileError || !mariaProfile) {
      return NextResponse.json({
        error: 'Patient not found',
        email: patientEmail,
        profileError: profileError?.message
      });
    }

    // 2. Find María García's patient record
    const { data: mariaPatient, error: patientError } = await serviceSupabase
      .from('patients')
      .select('*')
      .eq('profile_id', mariaProfile.id)
      .eq('organization_id', targetOrgId)
      .single();

    if (patientError || !mariaPatient) {
      return NextResponse.json({
        error: 'Patient record not found',
        profile: mariaProfile,
        patientError: patientError?.message
      });
    }

    // 3. Get appointments using DASHBOARD STATS logic (from /api/dashboard/patient/stats)
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().split(' ')[0];
    const currentTime = timeString ? timeString.substring(0, 5) : '00:00';

    // Dashboard Stats Query - Total Appointments
    const { data: dashboardTotal, error: dashboardTotalError } = await serviceSupabase
      .from('appointments')
      .select('id, appointment_date, start_time, status, reason')
      .eq('patient_id', mariaPatient.id);

    // Dashboard Stats Query - Upcoming Appointments
    const { data: dashboardUpcoming, error: dashboardUpcomingError } = await serviceSupabase
      .from('appointments')
      .select('id, appointment_date, start_time, status')
      .eq('patient_id', mariaPatient.id)
      .in('status', ['confirmed', 'pending'])
      .or(`appointment_date.gt.${currentDate},and(appointment_date.eq.${currentDate},start_time.gte.${currentTime})`);

    // 4. Get appointments using APPOINTMENTS PAGE logic (from /appointments page)
    const today = new Date().toISOString().split('T')[0];

    // Appointments Page Query - All appointments
    const { data: pageAll, error: pageAllError } = await serviceSupabase
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
        )
      `)
      .eq('organization_id', targetOrgId)
      .eq('patient_id', mariaPatient.id)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Appointments Page Query - Past appointments (view=history)
    const { data: pagePast, error: pagePastError } = await serviceSupabase
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
        )
      `)
      .eq('organization_id', targetOrgId)
      .eq('patient_id', mariaPatient.id)
      .lt('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    // 5. Get appointments using USER CLIENT (RLS applied)
    const { data: userClientData, error: userClientError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, status')
      .eq('patient_id', mariaPatient.id);

    // 6. Analysis and comparison
    const analysis = {
      patient: {
        profile: mariaProfile,
        patientRecord: mariaPatient
      },
      queries: {
        dashboardStats: {
          total: {
            count: dashboardTotal?.length || 0,
            data: dashboardTotal,
            error: dashboardTotalError?.message
          },
          upcoming: {
            count: dashboardUpcoming?.length || 0,
            data: dashboardUpcoming,
            error: dashboardUpcomingError?.message
          }
        },
        appointmentsPage: {
          all: {
            count: pageAll?.length || 0,
            data: pageAll,
            error: pageAllError?.message
          },
          past: {
            count: pagePast?.length || 0,
            data: pagePast,
            error: pagePastError?.message
          }
        },
        userClient: {
          count: userClientData?.length || 0,
          data: userClientData,
          error: userClientError?.message
        }
      },
      inconsistencies: [],
      recommendations: []
    };

    // Detect inconsistencies
    const dashboardCount = analysis.queries.dashboardStats.total.count;
    const pageAllCount = analysis.queries.appointmentsPage.all.count;
    const userClientCount = analysis.queries.userClient.count;

    if (dashboardCount !== pageAllCount) {
      analysis.inconsistencies.push({
        type: 'COUNT_MISMATCH',
        description: `Dashboard shows ${dashboardCount} appointments, but appointments page shows ${pageAllCount}`,
        severity: 'HIGH'
      });
    }

    if (dashboardCount !== userClientCount) {
      analysis.inconsistencies.push({
        type: 'RLS_ISSUE',
        description: `Service client shows ${dashboardCount} appointments, but user client shows ${userClientCount}`,
        severity: 'CRITICAL'
      });
    }

    // Add recommendations
    if (analysis.inconsistencies.length === 0) {
      analysis.recommendations.push('No inconsistencies detected. Data appears consistent across all queries.');
    } else {
      analysis.recommendations.push('Check RLS policies on appointments table');
      analysis.recommendations.push('Verify patient_id foreign key relationships');
      analysis.recommendations.push('Check organization_id filtering logic');
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
