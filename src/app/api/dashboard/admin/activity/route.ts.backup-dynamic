import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/admin/activity
 * Fetch recent activity for admin dashboard
 * Includes appointments, user registrations, and system events
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Get recent appointments (created, cancelled, completed)
    const { data: recentAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name),
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(first_name, last_name)
        ),
        service:services(name)
      `)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(limit * 2); // Get more to filter and sort

    if (appointmentsError) {
      console.error('Error fetching recent appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch activity data' },
        { status: 500 }
      );
    }

    // Get recent user registrations
    const { data: recentUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (usersError) {
      console.error('Error fetching recent users:', usersError);
    }

    // Process activity items
    const activities = [];

    // Add appointment activities
    if (recentAppointments) {
      for (const appointment of recentAppointments) {
        console.log('🔍 ACTIVITY DEBUG: Processing appointment', {
          appointmentId: appointment.id,
          patientType: Array.isArray(appointment.patient) ? 'Array' : typeof appointment.patient,
          doctorType: Array.isArray(appointment.doctor) ? 'Array' : typeof appointment.doctor,
          serviceType: Array.isArray(appointment.service) ? 'Array' : typeof appointment.service,
          patientData: appointment.patient,
          doctorData: appointment.doctor,
          serviceData: appointment.service
        });

        // Handle both array and object formats for patient
        const patient = Array.isArray(appointment.patient) && appointment.patient.length > 0
          ? appointment.patient[0]
          : (appointment.patient && typeof appointment.patient === 'object')
          ? appointment.patient
          : null;

        // Handle both array and object formats for doctor
        const doctor = Array.isArray(appointment.doctor) && appointment.doctor.length > 0
          ? appointment.doctor[0]
          : (appointment.doctor && typeof appointment.doctor === 'object')
          ? appointment.doctor
          : null;

        const patientName = patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'Paciente desconocido';

        // Handle nested doctor profile structure with robust handling
        const doctorProfile = doctor?.profiles
          ? (Array.isArray(doctor.profiles) && doctor.profiles.length > 0
            ? doctor.profiles[0]
            : (typeof doctor.profiles === 'object' ? doctor.profiles : null))
          : null;
        const doctorName = doctorProfile
          ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`
          : 'Doctor desconocido';

        // Handle both array and object formats for service
        const service = Array.isArray(appointment.service) && appointment.service.length > 0
          ? appointment.service[0]
          : (appointment.service && typeof appointment.service === 'object')
          ? appointment.service
          : null;
        const serviceName = service?.name || 'Servicio desconocido';

        console.log('🔍 ACTIVITY DEBUG: Extracted data', {
          patientName,
          doctorName,
          serviceName
        });

        // Determine activity type based on status and timing
        let activityType = 'appointment_created';
        let description = '';
        let timestamp = appointment.created_at;

        if (appointment.status === 'cancelled') {
          activityType = 'appointment_cancelled';
          description = `Cita cancelada: ${patientName} con ${doctorName} (${serviceName})`;
          timestamp = appointment.updated_at;
        } else if (appointment.status === 'completed') {
          activityType = 'appointment_completed';
          description = `Cita completada: ${patientName} con ${doctorName} (${serviceName})`;
          timestamp = appointment.updated_at;
        } else {
          description = `Nueva cita agendada: ${patientName} con ${doctorName} (${serviceName})`;
        }

        activities.push({
          id: `appointment_${appointment.id}`,
          type: activityType,
          description,
          timestamp,
          user: patientName
        });
      }
    }

    // Add user registration activities
    if (recentUsers) {
      for (const newUser of recentUsers) {
        const userName = `${newUser.first_name} ${newUser.last_name}`;
        let roleLabel = newUser.role;

        switch (newUser.role) {
          case 'patient':
            roleLabel = 'paciente';
            break;
          case 'doctor':
            roleLabel = 'doctor';
            break;
          case 'staff':
            roleLabel = 'personal';
            break;
          case 'admin':
            roleLabel = 'administrador';
            break;
        }

        activities.push({
          id: `user_${newUser.id}`,
          type: 'user_registered',
          description: `Nuevo ${roleLabel} registrado: ${userName}`,
          timestamp: newUser.created_at,
          user: userName
        });
      }
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to requested number
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedActivities
    });

  } catch (error) {
    console.error('Error in admin activity API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
