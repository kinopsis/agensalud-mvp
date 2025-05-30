import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/calendar/appointments
 * Fetch appointments for calendar display
 * Supports filtering by date range, doctor, status, and service
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const doctorId = searchParams.get('doctorId');
    const status = searchParams.get('status');
    const serviceId = searchParams.get('serviceId');

    if (!organizationId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Organization ID, start date, and end date are required' },
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

    // Verify user has access to this organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Build query with filters
    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        notes,
        patient:profiles!appointments_patient_id_fkey(
          id,
          first_name,
          last_name
        ),
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(
            id,
            first_name,
            last_name
          )
        ),
        service:services(
          id,
          name,
          duration_minutes,
          price
        ),
        location:locations!appointments_location_id_fkey(
          id,
          name,
          address
        )
      `)
      .eq('organization_id', organizationId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .order('appointment_date')
      .order('start_time');

    // Apply filters
    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    // Role-based filtering
    if (profile.role === 'doctor') {
      // Doctors can only see their own appointments
      query = query.eq('doctor_id', user.id);
    } else if (profile.role === 'patient') {
      // Patients can only see their own appointments
      query = query.eq('patient_id', user.id);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    // Transform data for calendar display
    const calendarAppointments = appointments?.map(appointment => {
      const patient = appointment.patient && Array.isArray(appointment.patient) && appointment.patient.length > 0
        ? appointment.patient[0]
        : null;
      const doctor = appointment.doctor && Array.isArray(appointment.doctor) && appointment.doctor.length > 0
        ? appointment.doctor[0]
        : null;
      const service = appointment.service && Array.isArray(appointment.service) && appointment.service.length > 0
        ? appointment.service[0]
        : null;

      return {
        id: appointment.id,
        patient_name: patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'Paciente desconocido',
        doctor_name: doctor
          ? `${doctor.first_name} ${doctor.last_name}`
          : 'Doctor desconocido',
        service_name: service?.name || 'Servicio desconocido',
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        notes: appointment.notes,
        patient_id: patient?.id || null,
        doctor_id: doctor?.id || null,
        service_id: service?.id || null
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: calendarAppointments,
      count: calendarAppointments.length
    });

  } catch (error) {
    console.error('Error in calendar appointments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/appointments
 * Create a new appointment from calendar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      patientId,
      doctorId,
      serviceId,
      appointmentDate,
      startTime,
      endTime,
      notes
    } = body;

    if (!organizationId || !patientId || !doctorId || !serviceId ||
        !appointmentDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Verify user has permission to create appointments
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create appointments' },
        { status: 403 }
      );
    }

    // Check for appointment conflicts
    const { data: conflicts, error: conflictError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', appointmentDate)
      .or(`start_time.lte.${startTime},end_time.gte.${endTime}`)
      .neq('status', 'cancelled');

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      return NextResponse.json(
        { error: 'Failed to validate appointment time' },
        { status: 500 }
      );
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Time slot is already booked' },
        { status: 409 }
      );
    }

    // Get default location for the organization
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'No active location found for organization' },
        { status: 400 }
      );
    }

    // Create the appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        organization_id: organizationId,
        patient_id: patientId,
        doctor_id: doctorId,
        service_id: serviceId,
        location_id: location.id,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        notes: notes || 'Cita creada desde calendario',
        created_by: user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating appointment:', createError);
      return NextResponse.json(
        { error: 'Failed to create appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: appointment
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create appointment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
