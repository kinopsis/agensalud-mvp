import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/admin/upcoming
 * Fetch upcoming appointments for admin dashboard
 * Shows next appointments across all doctors in the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '5');

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

    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().split(' ')[0];
    const currentTime = timeString ? timeString.substring(0, 5) : '00:00'; // HH:MM format

    // Fetch upcoming appointments
    const { data: upcomingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        notes,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name, phone),
        doctor:doctors!appointments_doctor_id_fkey(
          profile_id,
          profiles(first_name, last_name)
        ),
        service:services(name),
        location:locations(name)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'pending'])
      .or(`appointment_date.gt.${currentDate},and(appointment_date.eq.${currentDate},start_time.gte.${currentTime})`)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit);

    if (appointmentsError) {
      console.error('Error fetching upcoming appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch upcoming appointments' },
        { status: 500 }
      );
    }

    // Format the appointments data
    const formattedAppointments = upcomingAppointments?.map(appointment => {
      console.log('🔍 UPCOMING DEBUG: Processing appointment', {
        appointmentId: appointment.id,
        patientType: Array.isArray(appointment.patient) ? 'Array' : typeof appointment.patient,
        doctorType: Array.isArray(appointment.doctor) ? 'Array' : typeof appointment.doctor,
        serviceType: Array.isArray(appointment.service) ? 'Array' : typeof appointment.service,
        locationType: Array.isArray(appointment.location) ? 'Array' : typeof appointment.location,
        patientData: appointment.patient,
        doctorData: appointment.doctor,
        serviceData: appointment.service,
        locationData: appointment.location
      });

      // Handle both array and object formats for patient
      const patient = Array.isArray(appointment.patient) && appointment.patient.length > 0
        ? appointment.patient[0]
        : (appointment.patient && typeof appointment.patient === 'object')
        ? appointment.patient
        : null;

      // Handle both array and object formats for doctor with nested profiles
      const doctorRecord = Array.isArray(appointment.doctor) && appointment.doctor.length > 0
        ? appointment.doctor[0]
        : (appointment.doctor && typeof appointment.doctor === 'object')
        ? appointment.doctor
        : null;

      const doctorProfile = doctorRecord?.profiles
        ? (Array.isArray(doctorRecord.profiles) && doctorRecord.profiles.length > 0
          ? doctorRecord.profiles[0]
          : (typeof doctorRecord.profiles === 'object' ? doctorRecord.profiles : null))
        : null;

      // Handle both array and object formats for service
      const service = Array.isArray(appointment.service) && appointment.service.length > 0
        ? appointment.service[0]
        : (appointment.service && typeof appointment.service === 'object')
        ? appointment.service
        : null;

      // Handle both array and object formats for location
      const location = Array.isArray(appointment.location) && appointment.location.length > 0
        ? appointment.location[0]
        : (appointment.location && typeof appointment.location === 'object')
        ? appointment.location
        : null;

      const patientName = patient
        ? `${patient.first_name} ${patient.last_name}`
        : 'Paciente desconocido';
      const doctorName = doctorProfile
        ? `${doctorProfile.first_name} ${doctorProfile.last_name}`
        : 'Doctor desconocido';
      const serviceName = service?.name || 'Servicio desconocido';

      console.log('🔍 UPCOMING DEBUG: Extracted data', {
        patientName,
        doctorName,
        serviceName,
        locationName: location?.name
      });

      return {
        id: appointment.id,
        patient_name: patientName,
        patient_phone: patient?.phone || null,
        doctor_name: doctorName,
        service_name: serviceName,
        location_name: location?.name || null,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        notes: appointment.notes
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: formattedAppointments
    });

  } catch (error) {
    console.error('Error in admin upcoming appointments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
