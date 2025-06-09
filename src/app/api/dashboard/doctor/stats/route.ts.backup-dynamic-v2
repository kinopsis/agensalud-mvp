import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/dashboard/doctor/stats
 * Fetch statistics for doctor dashboard
 * Includes personal appointment counts, patient metrics, and availability
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const organizationId = searchParams.get('organizationId');

    if (!doctorId || !organizationId) {
      return NextResponse.json(
        { error: 'Doctor ID and Organization ID are required' },
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

    // Verify user is the doctor or has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        (user.id !== doctorId && !['admin', 'superadmin'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get date ranges
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().split(' ')[0];
    const currentTime = timeString ? timeString.substring(0, 5) : '00:00';

    // Start of this week (Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const weekStart = startOfWeek.toISOString().split('T')[0];

    // End of this week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const weekEnd = endOfWeek.toISOString().split('T')[0];

    // Start of this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Fetch today's appointments
    const { data: todayAppointments, error: todayError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', today);

    if (todayError) {
      console.error('Error fetching today appointments:', todayError);
      return NextResponse.json(
        { error: 'Failed to fetch today appointments' },
        { status: 500 }
      );
    }

    // Fetch this week's appointments
    const { data: weekAppointments, error: weekError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', weekStart)
      .lte('appointment_date', weekEnd);

    if (weekError) {
      console.error('Error fetching week appointments:', weekError);
    }

    // Fetch this month's appointments
    const { data: monthAppointments, error: monthError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', monthStart);

    if (monthError) {
      console.error('Error fetching month appointments:', monthError);
    }

    // Fetch unique patients this month
    const { data: monthPatients, error: patientsError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', monthStart)
      .eq('status', 'completed');

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
    }

    // Get unique patient count
    const uniquePatients = monthPatients
      ? [...new Set(monthPatients.map(apt => apt.patient_id))].length
      : 0;

    // Fetch next appointment
    const { data: nextAppointment, error: nextError } = await supabase
      .from('appointments')
      .select(`
        start_time,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name),
        service:services(name)
      `)
      .eq('doctor_id', doctorId)
      .in('status', ['confirmed', 'pending'])
      .or(`appointment_date.gt.${today},and(appointment_date.eq.${today},start_time.gt.${currentTime})`)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (nextError && nextError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching next appointment:', nextError);
    }

    // Fetch doctor's availability hours for this week
    const { data: availability, error: availabilityError } = await supabase
      .from('doctor_availability')
      .select('start_time, end_time')
      .eq('doctor_id', doctorId)
      .eq('is_available', true);

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
    }

    // Calculate total available hours per week (simplified)
    const availableHours = availability?.reduce((total, slot) => {
      const start = new Date(`2000-01-01T${slot.start_time}`);
      const end = new Date(`2000-01-01T${slot.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0) || 0;

    const stats = {
      todayAppointments: todayAppointments?.length || 0,
      weekAppointments: weekAppointments?.length || 0,
      monthAppointments: monthAppointments?.length || 0,
      totalPatients: uniquePatients,
      nextAppointment: nextAppointment ? (() => {
        console.log('🔍 DOCTOR STATS DEBUG: Processing next appointment', {
          patientType: Array.isArray(nextAppointment.patient) ? 'Array' : typeof nextAppointment.patient,
          serviceType: Array.isArray(nextAppointment.service) ? 'Array' : typeof nextAppointment.service,
          patientData: nextAppointment.patient,
          serviceData: nextAppointment.service
        });

        // Handle both array and object formats for patient
        const patient = Array.isArray(nextAppointment.patient) && nextAppointment.patient.length > 0
          ? nextAppointment.patient[0]
          : (nextAppointment.patient && typeof nextAppointment.patient === 'object')
          ? nextAppointment.patient
          : null;

        // Handle both array and object formats for service
        const service = Array.isArray(nextAppointment.service) && nextAppointment.service.length > 0
          ? nextAppointment.service[0]
          : (nextAppointment.service && typeof nextAppointment.service === 'object')
          ? nextAppointment.service
          : null;

        const patientName = patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'Paciente desconocido';
        const serviceName = service?.name || 'Servicio desconocido';

        console.log('🔍 DOCTOR STATS DEBUG: Extracted data', {
          patientName,
          serviceName
        });

        return {
          patient_name: patientName,
          start_time: nextAppointment.start_time,
          service_name: serviceName
        };
      })() : null,
      availableHours: Math.round(availableHours * 7) // Weekly hours
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error in doctor stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
