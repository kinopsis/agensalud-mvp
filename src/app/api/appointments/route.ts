import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AppointmentProcessor } from '@/lib/ai/appointment-processor';
import { validateDate, validateTime } from '@/lib/ai/entity-extraction';
import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';

/**
 * GET /api/appointments
 * Fetch appointments with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user and verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(
            id,
            first_name,
            last_name,
            email
          )
        ),
        service:services(
          id,
          name,
          duration_minutes,
          price
        ),
        location:locations(
          id,
          name,
          address
        )
      `)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (date) {
      query = query.eq('appointment_date', date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    // Role-based filtering
    if (profile.role === 'doctor') {
      query = query.eq('doctor_id', user.id);
    } else if (profile.role === 'patient') {
      query = query.eq('patient_id', user.id);
    } else if (profile.role === 'staff' || profile.role === 'admin') {
      // Staff and admin can see all appointments in their organization
      query = query.eq('organization_id', profile.organization_id);
    }
    // SuperAdmin can see all appointments (no additional filter)

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: appointments });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments
 * Unified endpoint for creating appointments (manual and AI booking)
 * Supports both traditional form data and AI-processed requests
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user and verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with role and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();

    // MVP SIMPLIFIED: Apply role-based booking validation
    const userRole = profile.role as 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);

    console.log(`🔐 APPOINTMENT CREATION - User: ${userRole}, Privileged: ${isPrivilegedUser}`);

    // Check if this is an AI processing request (has message field)
    if (body.message && typeof body.message === 'string') {
      return await handleAIAppointmentRequest(body, profile);
    }

    // Check if this is an AI booking action
    if (body.action === 'book_appointment') {
      return await handleAIBookingRequest(body, profile);
    }

    // Handle traditional manual booking
    return await handleManualBookingRequest(body, profile);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle AI appointment processing (natural language)
 */
async function handleAIAppointmentRequest(body: any, profile: any) {
  try {
    const { message, organizationId, userId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Initialize the appointment processor
    const processor = new AppointmentProcessor();

    // Process the message using the AI processor
    const result = await processor.processMessage(message, {
      organizationId,
      userId,
      includeAvailability: true
    });

    // Build enhanced response
    let enhancedResponse = result.intent.suggestedResponse;

    // Add availability information if found
    if (result.availability && result.availability.length > 0) {
      enhancedResponse += "\n\n📅 **Horarios disponibles:**\n";
      result.availability.slice(0, 3).forEach((slot, index) => {
        enhancedResponse += `${index + 1}. ${slot.doctor_name} - ${slot.start_time} (${slot.specialization})\n`;
      });
      enhancedResponse += "\n¿Cuál de estas opciones prefieres?";
    }

    return NextResponse.json({
      success: true,
      intent: result.intent,
      response: enhancedResponse,
      nextActions: result.nextActions,
      canProceed: result.canProceed,
      availability: result.availability,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AI processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

/**
 * Handle AI booking request (structured data from AI flow)
 */
async function handleAIBookingRequest(body: any, profile: any) {
  try {
    const {
      organizationId,
      patientId,
      doctorId,
      serviceId,
      locationId,
      appointmentDate,
      startTime,
      endTime,
      notes,
      reason
    } = body;

    // Validate required fields
    if (!patientId || !doctorId || !serviceId || !appointmentDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required appointment information' },
        { status: 400 }
      );
    }

    // Validate date and time
    if (!validateDate(appointmentDate)) {
      return NextResponse.json(
        { error: 'Invalid appointment date' },
        { status: 400 }
      );
    }

    if (!validateTime(startTime) || !validateTime(endTime)) {
      return NextResponse.json(
        { error: 'Invalid appointment time' },
        { status: 400 }
      );
    }

    // Convert empty strings to null for UUID fields
    const sanitizeUUID = (value: any) => {
      if (value === '' || value === undefined) return null;
      return value;
    };

    // Create the appointment using AI processor
    const processor = new AppointmentProcessor();
    const result = await processor.createAppointment({
      organizationId,
      patientId: sanitizeUUID(patientId),
      doctorId: sanitizeUUID(doctorId),
      serviceId: sanitizeUUID(serviceId),
      locationId: sanitizeUUID(locationId),
      appointmentDate,
      startTime,
      endTime,
      notes,
      reason
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        appointmentId: result.appointmentId,
        message: '¡Perfecto! Tu cita ha sido agendada exitosamente. Recibirás una confirmación por email.',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to create appointment' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error booking AI appointment:', error);
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    );
  }
}

/**
 * Handle manual booking request (traditional form data)
 * Creates appointments with 'confirmed' status for immediate availability blocking
 * and consistent UX across all booking flows (manual, AI, express)
 */
async function handleManualBookingRequest(body: any, profile: any) {
  try {
    const supabase = await createClient();

    const {
      organizationId,
      patientId,
      doctorId,
      serviceId,
      locationId,
      appointmentDate,
      startTime,
      endTime,
      duration_minutes,
      reason,
      notes
    } = body;

    // Validate required fields
    if (!patientId || !doctorId || !appointmentDate || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, doctorId, appointmentDate, startTime' },
        { status: 400 }
      );
    }

    // MVP SIMPLIFIED: Apply role-based booking validation
    const userRole = profile.role as 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);

    console.log(`🔐 MANUAL BOOKING VALIDATION - User: ${userRole}, Privileged: ${isPrivilegedUser}, Date: ${appointmentDate}, Time: ${startTime}`);

    // Validate booking rules based on user role using ImmutableDateSystem
    if (!isPrivilegedUser) {
      // Standard users (patients): 24-hour advance booking rule
      // Use ImmutableDateSystem for consistent timezone-safe validation
      const isToday = ImmutableDateSystem.isToday(appointmentDate);

      console.log(`🔒 PATIENT VALIDATION - Date: ${appointmentDate}, IsToday: ${isToday}, UserRole: ${userRole}`);

      if (isToday) {
        return NextResponse.json({
          error: 'Los pacientes deben reservar citas con al menos 24 horas de anticipación',
          code: 'ADVANCE_BOOKING_REQUIRED',
          requiredAdvanceHours: 24,
          userRole,
          appointmentDate,
          isToday: true
        }, { status: 400 });
      }
    }
    // Privileged users can book same-day appointments without restrictions

    // Calculate end_time if not provided
    let calculatedEndTime = endTime;
    if (!calculatedEndTime && startTime) {
      const endTimeDate = new Date(`1970-01-01T${startTime}`);
      endTimeDate.setMinutes(endTimeDate.getMinutes() + (duration_minutes || 30));
      calculatedEndTime = endTimeDate.toTimeString().slice(0, 8);
    }

    // Use organization from profile if not provided
    const finalOrganizationId = organizationId || profile.organization_id;

    // Convert empty strings to null for UUID fields to prevent database errors
    const sanitizeUUID = (value: any) => {
      if (value === '' || value === undefined) return null;
      return value;
    };



    // Create appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        organization_id: finalOrganizationId,
        patient_id: sanitizeUUID(patientId),
        doctor_id: sanitizeUUID(doctorId),
        service_id: sanitizeUUID(serviceId),
        location_id: sanitizeUUID(locationId),
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: calculatedEndTime,
        duration_minutes: duration_minutes || 30,
        reason: reason || null,
        notes: notes || null,
        status: 'confirmed', // Auto-confirmación inmediata para mejor UX
        created_by: profile.id
      })
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name, email, phone),
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          specialization,
          profiles(first_name, last_name, email)
        ),
        service:services(name, duration_minutes, price),
        location:locations(name, address)
      `)
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      return NextResponse.json(
        { error: 'Failed to create appointment', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment,
      appointmentId: appointment.id
    }, { status: 201 });

  } catch (error) {
    console.error('Error in manual booking:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}
