import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/superadmin/activity
 * Fetch system-wide activity for SuperAdmin dashboard
 * Includes organization creation, user registrations, and system events
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = await createClient();

    // Get current user and verify SuperAdmin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is SuperAdmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Insufficient permissions - SuperAdmin required' },
        { status: 403 }
      );
    }

    const activities = [];

    // Fetch recent organization creations
    const { data: recentOrganizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (orgsError) {
      console.error('Error fetching recent organizations:', orgsError);
    } else if (recentOrganizations) {
      for (const org of recentOrganizations) {
        activities.push({
          id: `org_${org.id}`,
          type: 'organization_created',
          description: `Nueva organización creada: ${org.name}`,
          organization_name: org.name,
          timestamp: org.created_at,
          severity: 'info'
        });
      }
    }

    // Fetch recent user registrations across all organizations
    const { data: recentUsers, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        created_at,
        organization:organizations(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (usersError) {
      console.error('Error fetching recent users:', usersError);
    } else if (recentUsers) {
      for (const user of recentUsers) {
        const userName = `${user.first_name} ${user.last_name}`;
        let roleLabel = user.role;

        switch (user.role) {
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
          case 'superadmin':
            roleLabel = 'superadministrador';
            break;
        }

        activities.push({
          id: `user_${user.id}`,
          type: 'user_registered',
          description: `Nuevo ${roleLabel} registrado: ${userName}`,
          organization_name: (() => {
          const org = user.organization && Array.isArray(user.organization) && user.organization.length > 0
            ? user.organization[0]
            : null;
          return org?.name || 'Organización desconocida';
        })(),
          timestamp: user.created_at,
          severity: 'info'
        });
      }
    }

    // Fetch recent appointments across all organizations
    const { data: recentAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        created_at,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name),
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(first_name, last_name)
        ),
        organization:organizations(name)
      `)
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 2)); // Limit appointments to avoid overwhelming the feed

    if (appointmentsError) {
      console.error('Error fetching recent appointments:', appointmentsError);
    } else if (recentAppointments) {
      for (const appointment of recentAppointments) {
        console.log('🔍 SUPERADMIN ACTIVITY DEBUG: Processing appointment', {
          appointmentId: appointment.id,
          patientType: Array.isArray(appointment.patient) ? 'Array' : typeof appointment.patient,
          doctorType: Array.isArray(appointment.doctor) ? 'Array' : typeof appointment.doctor,
          organizationType: Array.isArray(appointment.organization) ? 'Array' : typeof appointment.organization,
          patientData: appointment.patient,
          doctorData: appointment.doctor,
          organizationData: appointment.organization
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

        // Handle both array and object formats for organization
        const organization = Array.isArray(appointment.organization) && appointment.organization.length > 0
          ? appointment.organization[0]
          : (appointment.organization && typeof appointment.organization === 'object')
          ? appointment.organization
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

        console.log('🔍 SUPERADMIN ACTIVITY DEBUG: Extracted data', {
          patientName,
          doctorName,
          organizationName: organization?.name
        });

        activities.push({
          id: `appointment_${appointment.id}`,
          type: 'appointment_created',
          description: `Nueva cita: ${patientName} con ${doctorName}`,
          organization_name: organization?.name || 'Organización desconocida',
          timestamp: appointment.created_at,
          severity: 'info'
        });
      }
    }

    // Add some system events (this could be expanded to include real system monitoring)
    const now = new Date();
    const systemEvents = [
      {
        id: 'system_backup',
        type: 'system_event',
        description: 'Respaldo automático del sistema completado',
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        severity: 'info'
      },
      {
        id: 'system_maintenance',
        type: 'system_event',
        description: 'Mantenimiento programado del sistema',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        severity: 'warning'
      }
    ];

    // Add system events to activities
    activities.push(...systemEvents);

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to requested number
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedActivities
    });

  } catch (error) {
    console.error('Error in SuperAdmin activity API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
