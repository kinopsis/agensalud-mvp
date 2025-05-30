import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';

/**
 * AUTO-CONFIRMATION SYSTEM FOR PENDING APPOINTMENTS
 * 
 * This endpoint handles automatic confirmation of appointments that have been
 * in 'pending' status for more than 15 minutes. This prevents appointment
 * limbo and ensures better user experience.
 * 
 * Business Logic:
 * - Appointments created via manual form start as 'pending'
 * - After 15 minutes without staff action, they auto-confirm to 'confirmed'
 * - AI and Express bookings bypass this and go directly to 'confirmed'
 */
export async function POST(request: NextRequest) {
  try {
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

    // Verify user has admin/staff access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'staff', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Calculate cutoff time (15 minutes ago)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 15);
    const cutoffTimeString = cutoffTime.toISOString();

    // Find pending appointments older than 15 minutes
    const { data: pendingAppointments, error: fetchError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        created_at,
        appointment_date,
        start_time,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name),
        doctor:doctors!appointments_doctor_id_fkey(
          profiles(first_name, last_name)
        ),
        organization_id
      `)
      .eq('status', 'pending')
      .lt('created_at', cutoffTimeString)
      .gte('appointment_date', new Date().toISOString().split('T')[0]); // Only future appointments

    if (fetchError) {
      console.error('Error fetching pending appointments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch pending appointments' },
        { status: 500 }
      );
    }

    if (!pendingAppointments || pendingAppointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending appointments found for auto-confirmation',
        autoConfirmed: 0
      });
    }

    // Filter by organization if not superadmin
    const appointmentsToConfirm = profile.role === 'superadmin' 
      ? pendingAppointments
      : pendingAppointments.filter(apt => apt.organization_id === profile.organization_id);

    if (appointmentsToConfirm.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending appointments in your organization for auto-confirmation',
        autoConfirmed: 0
      });
    }

    // Auto-confirm the appointments
    const appointmentIds = appointmentsToConfirm.map(apt => apt.id);
    
    const { data: updatedAppointments, error: updateError } = await serviceSupabase
      .from('appointments')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
        notes: 'Auto-confirmada después de 15 minutos'
      })
      .in('id', appointmentIds)
      .select();

    if (updateError) {
      console.error('Error auto-confirming appointments:', updateError);
      return NextResponse.json(
        { error: 'Failed to auto-confirm appointments' },
        { status: 500 }
      );
    }

    // Log the auto-confirmation activity
    console.log(`Auto-confirmed ${updatedAppointments?.length || 0} appointments:`, 
      appointmentsToConfirm.map(apt => ({
        id: apt.id,
        patient: apt.patient?.[0] ? `${apt.patient[0].first_name} ${apt.patient[0].last_name}` : 'Unknown',
        doctor: apt.doctor?.[0]?.profiles?.[0] ? `${apt.doctor[0].profiles[0].first_name} ${apt.doctor[0].profiles[0].last_name}` : 'Unknown',
        date: apt.appointment_date,
        time: apt.start_time,
        createdAt: apt.created_at
      }))
    );

    return NextResponse.json({
      success: true,
      message: `Successfully auto-confirmed ${updatedAppointments?.length || 0} appointments`,
      autoConfirmed: updatedAppointments?.length || 0,
      appointments: appointmentsToConfirm.map(apt => ({
        id: apt.id,
        patient_name: apt.patient?.[0] ? `${apt.patient[0].first_name} ${apt.patient[0].last_name}` : 'Unknown',
        doctor_name: apt.doctor?.[0]?.profiles?.[0] ? `${apt.doctor[0].profiles[0].first_name} ${apt.doctor[0].profiles[0].last_name}` : 'Unknown',
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        created_at: apt.created_at
      }))
    });

  } catch (error) {
    console.error('Auto-confirmation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check pending appointments that are eligible for auto-confirmation
 */
export async function GET(request: NextRequest) {
  try {
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

    // Verify user has admin/staff access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'staff', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Calculate cutoff time (15 minutes ago)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 15);
    const cutoffTimeString = cutoffTime.toISOString();

    // Find pending appointments older than 15 minutes
    const { data: pendingAppointments, error: fetchError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        created_at,
        appointment_date,
        start_time,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name),
        doctor:doctors!appointments_doctor_id_fkey(
          profiles(first_name, last_name)
        ),
        organization_id
      `)
      .eq('status', 'pending')
      .lt('created_at', cutoffTimeString)
      .gte('appointment_date', new Date().toISOString().split('T')[0]);

    if (fetchError) {
      console.error('Error fetching pending appointments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch pending appointments' },
        { status: 500 }
      );
    }

    // Filter by organization if not superadmin
    const eligibleAppointments = profile.role === 'superadmin' 
      ? pendingAppointments || []
      : (pendingAppointments || []).filter(apt => apt.organization_id === profile.organization_id);

    return NextResponse.json({
      success: true,
      eligibleForAutoConfirmation: eligibleAppointments.length,
      cutoffTime: cutoffTimeString,
      appointments: eligibleAppointments.map(apt => ({
        id: apt.id,
        patient_name: apt.patient?.[0] ? `${apt.patient[0].first_name} ${apt.patient[0].last_name}` : 'Unknown',
        doctor_name: apt.doctor?.[0]?.profiles?.[0] ? `${apt.doctor[0].profiles[0].first_name} ${apt.doctor[0].profiles[0].last_name}` : 'Unknown',
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        created_at: apt.created_at,
        minutesPending: Math.floor((new Date().getTime() - new Date(apt.created_at).getTime()) / (1000 * 60))
      }))
    });

  } catch (error) {
    console.error('Error checking auto-confirmation eligibility:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
