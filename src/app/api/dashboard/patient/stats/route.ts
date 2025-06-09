import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/dashboard/patient/stats
 * Fetch statistics for patient dashboard
 * Includes appointment counts, history, and upcoming appointments
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const organizationId = searchParams.get('organizationId');

    if (!patientId || !organizationId) {
      return NextResponse.json(
        { error: 'Patient ID and Organization ID are required' },
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

    // Verify user is the patient or has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        (user.id !== patientId && !['admin', 'staff', 'superadmin'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().split(' ')[0];
    const currentTime = timeString ? timeString.substring(0, 5) : '00:00';

    // Fetch upcoming appointments
    const { data: upcomingAppointments, error: upcomingError } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .in('status', ['confirmed', 'pending'])
      .or(`appointment_date.gt.${currentDate},and(appointment_date.eq.${currentDate},start_time.gte.${currentTime})`);

    if (upcomingError) {
      console.error('Error fetching upcoming appointments:', upcomingError);
      return NextResponse.json(
        { error: 'Failed to fetch upcoming appointments' },
        { status: 500 }
      );
    }

    // Fetch total appointments
    const { data: totalAppointments, error: totalError } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId);

    if (totalError) {
      console.error('Error fetching total appointments:', totalError);
    }

    // Fetch last completed appointment
    const { data: lastAppointment, error: lastError } = await supabase
      .from('appointments')
      .select(`
        appointment_date,
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(first_name, last_name)
        ),
        service:services(name)
      `)
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (lastError && lastError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching last appointment:', lastError);
    }

    // Fetch next upcoming appointment
    const { data: nextAppointment, error: nextError } = await supabase
      .from('appointments')
      .select(`
        appointment_date,
        start_time,
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(first_name, last_name)
        ),
        service:services(name)
      `)
      .eq('patient_id', patientId)
      .in('status', ['confirmed', 'pending'])
      .or(`appointment_date.gt.${currentDate},and(appointment_date.eq.${currentDate},start_time.gte.${currentTime})`)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (nextError && nextError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching next appointment:', nextError);
    }

    const stats = {
      upcomingAppointments: upcomingAppointments?.length || 0,
      totalAppointments: totalAppointments?.length || 0,
      lastAppointment: lastAppointment ? (() => {
        console.log('🔍 PATIENT STATS DEBUG: Processing last appointment', {
          doctorType: Array.isArray(lastAppointment.doctor) ? 'Array' : typeof lastAppointment.doctor,
          serviceType: Array.isArray(lastAppointment.service) ? 'Array' : typeof lastAppointment.service,
          doctorData: lastAppointment.doctor,
          serviceData: lastAppointment.service
        });

        // Handle both array and object formats for doctor
        const doctor = Array.isArray(lastAppointment.doctor) && lastAppointment.doctor.length > 0
          ? lastAppointment.doctor[0]
          : (lastAppointment.doctor && typeof lastAppointment.doctor === 'object')
          ? lastAppointment.doctor
          : null;

        // Handle both array and object formats for service
        const service = Array.isArray(lastAppointment.service) && lastAppointment.service.length > 0
          ? lastAppointment.service[0]
          : (lastAppointment.service && typeof lastAppointment.service === 'object')
          ? lastAppointment.service
          : null;

        // Handle nested doctor profile structure with robust handling
        const doctorProfile = doctor?.profiles
          ? (Array.isArray(doctor.profiles) && doctor.profiles.length > 0
            ? doctor.profiles[0]
            : (typeof doctor.profiles === 'object' ? doctor.profiles : null))
          : null;

        return {
          doctor_name: doctorProfile
            ? `${doctorProfile.first_name} ${doctorProfile.last_name}`
            : 'Doctor desconocido',
          service_name: service?.name || 'Servicio desconocido',
          appointment_date: lastAppointment.appointment_date
        };
      })() : null,
      nextAppointment: nextAppointment ? (() => {
        console.log('🔍 PATIENT STATS DEBUG: Processing next appointment', {
          doctorType: Array.isArray(nextAppointment.doctor) ? 'Array' : typeof nextAppointment.doctor,
          serviceType: Array.isArray(nextAppointment.service) ? 'Array' : typeof nextAppointment.service,
          doctorData: nextAppointment.doctor,
          serviceData: nextAppointment.service
        });

        // Handle both array and object formats for doctor
        const doctor = Array.isArray(nextAppointment.doctor) && nextAppointment.doctor.length > 0
          ? nextAppointment.doctor[0]
          : (nextAppointment.doctor && typeof nextAppointment.doctor === 'object')
          ? nextAppointment.doctor
          : null;

        // Handle both array and object formats for service
        const service = Array.isArray(nextAppointment.service) && nextAppointment.service.length > 0
          ? nextAppointment.service[0]
          : (nextAppointment.service && typeof nextAppointment.service === 'object')
          ? nextAppointment.service
          : null;

        // Handle nested doctor profile structure with robust handling
        const doctorProfile = doctor?.profiles
          ? (Array.isArray(doctor.profiles) && doctor.profiles.length > 0
            ? doctor.profiles[0]
            : (typeof doctor.profiles === 'object' ? doctor.profiles : null))
          : null;

        return {
          doctor_name: doctorProfile
            ? `${doctorProfile.first_name} ${doctorProfile.last_name}`
            : 'Doctor desconocido',
          service_name: service?.name || 'Servicio desconocido',
          appointment_date: nextAppointment.appointment_date,
          start_time: nextAppointment.start_time
        };
      })() : null
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error in patient stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
