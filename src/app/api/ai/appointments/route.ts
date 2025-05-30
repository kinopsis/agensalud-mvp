import { NextRequest, NextResponse } from 'next/server';
import { AppointmentProcessor, AppointmentIntentSchema, type AppointmentIntent } from '@/lib/ai/appointment-processor';
import {
  parseRelativeDate,
  parseTimeExpression,
  extractOpticalSpecialty,
  extractUrgency,
  extractPatientConcerns,
  validateDate,
  validateTime
} from '@/lib/ai/entity-extraction';
import { createClient } from '@/lib/supabase/server';



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('AI Appointments POST - Received body:', JSON.stringify(body, null, 2));

    const { message, organizationId, userId, action } = body;

    console.log('AI Appointments POST - Extracted values:', {
      message: !!message,
      organizationId,
      userId,
      action
    });

    if (!organizationId) {
      console.log('AI Appointments POST - Missing organizationId');
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Initialize the appointment processor
    const processor = new AppointmentProcessor();

    // Handle different actions
    if (action === 'book_appointment') {
      console.log('AI Appointments POST - Handling book_appointment action');
      return await handleBookAppointment(body, processor);
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Process the message using the enhanced AI processor
    const result = await processor.processMessage(message, {
      organizationId,
      userId,
      includeAvailability: true
    });

    // Enhanced entity extraction
    const extractedDate = parseRelativeDate(message);
    const extractedTime = parseTimeExpression(message);
    const extractedSpecialty = extractOpticalSpecialty(message);
    const urgency = extractUrgency(message);
    const concerns = extractPatientConcerns(message);

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

    // Add extracted information to response
    const extractedInfo: any = {
      date: extractedDate,
      time: extractedTime,
      specialty: extractedSpecialty,
      urgency,
      concerns
    };

    return NextResponse.json({
      success: true,
      intent: result.intent,
      response: enhancedResponse,
      nextActions: result.nextActions,
      canProceed: result.canProceed,
      availability: result.availability,
      extractedInfo,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AI Appointments Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process appointment request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle actual appointment booking
async function handleBookAppointment(body: any, processor: AppointmentProcessor) {
  try {
    console.log('AI Appointments - Received body:', JSON.stringify(body, null, 2));

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

    console.log('AI Appointments - Extracted fields:', {
      organizationId,
      patientId,
      doctorId,
      serviceId,
      appointmentDate,
      startTime,
      endTime,
      notes
    });

    // Validate required fields
    if (!patientId || !doctorId || !serviceId || !appointmentDate || !startTime || !endTime) {
      console.log('AI Appointments - Missing required fields:', {
        patientId: !!patientId,
        doctorId: !!doctorId,
        serviceId: !!serviceId,
        appointmentDate: !!appointmentDate,
        startTime: !!startTime,
        endTime: !!endTime
      });
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

    // Create the appointment
    const result = await processor.createAppointment({
      organizationId,
      patientId,
      doctorId,
      serviceId,
      appointmentDate,
      startTime,
      endTime,
      notes
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
    console.error('Error booking appointment:', error);
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    );
  }
}


