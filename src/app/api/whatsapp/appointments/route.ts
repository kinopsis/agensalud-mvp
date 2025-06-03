/**
 * WhatsApp Appointments API
 * 
 * Specialized endpoint for handling appointment operations through WhatsApp,
 * including booking confirmations, queries, and management.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { WhatsAppAppointmentService } from '@/lib/services/WhatsAppAppointmentService';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const confirmAppointmentSchema = z.object({
  conversationId: z.string().uuid(),
  slotIndex: z.number().min(0).max(10),
  availableSlots: z.array(z.any()),
  patientId: z.string().uuid().optional()
});

const queryAppointmentsSchema = z.object({
  conversationId: z.string().uuid(),
  patientId: z.string().uuid().optional(),
  status: z.array(z.string()).optional()
});

const rescheduleAppointmentSchema = z.object({
  conversationId: z.string().uuid(),
  appointmentId: z.string().uuid(),
  newDate: z.string(),
  newTime: z.string().optional(),
  reason: z.string().optional()
});

// =====================================================
// POST /api/whatsapp/appointments
// =====================================================

/**
 * Handle WhatsApp appointment operations
 * 
 * @description Processes appointment-related requests from WhatsApp including
 * confirmations, queries, rescheduling, and cancellations.
 * 
 * @param request - Next.js request object
 * @returns JSON response with operation result
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action } = body;

    console.log('📱 WhatsApp Appointments API - Action:', action);

    // Validate action
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INVALID_ACTION', message: 'Action is required' }
      }, { status: 400 });
    }

    // Get WhatsApp instance for the conversation
    const conversationId = body.conversationId;
    if (!conversationId) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'MISSING_CONVERSATION_ID', message: 'Conversation ID is required' }
      }, { status: 400 });
    }

    // Get conversation and WhatsApp instance
    const { data: conversation, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select(`
        *,
        whatsapp_instances!inner(*)
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'CONVERSATION_NOT_FOUND', message: 'WhatsApp conversation not found' }
      }, { status: 404 });
    }

    const whatsappInstance = conversation.whatsapp_instances;
    const appointmentService = new WhatsAppAppointmentService(supabase, whatsappInstance);

    // Handle different actions
    switch (action) {
      case 'confirm_appointment':
        return await handleConfirmAppointment(body, appointmentService);

      case 'query_appointments':
        return await handleQueryAppointments(body, appointmentService);

      case 'reschedule_appointment':
        return await handleRescheduleAppointment(body, appointmentService);

      case 'cancel_appointment':
        return await handleCancelAppointment(body, supabase, whatsappInstance);

      default:
        return NextResponse.json({ 
          success: false,
          error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` }
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in WhatsApp appointments API:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// ACTION HANDLERS
// =====================================================

/**
 * Handle appointment confirmation
 */
async function handleConfirmAppointment(
  body: any,
  appointmentService: WhatsAppAppointmentService
): Promise<NextResponse> {
  try {
    const validationResult = confirmAppointmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid confirmation data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const { conversationId, slotIndex, availableSlots, patientId } = validationResult.data;

    const result = await appointmentService.confirmAppointmentSlot(
      conversationId,
      slotIndex,
      availableSlots,
      patientId
    );

    return NextResponse.json({
      success: result.success,
      data: {
        appointmentId: result.appointmentId,
        message: result.message,
        nextStep: result.nextStep
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Error confirming appointment:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'CONFIRMATION_ERROR', message: 'Failed to confirm appointment' }
    }, { status: 500 });
  }
}

/**
 * Handle appointment queries
 */
async function handleQueryAppointments(
  body: any,
  appointmentService: WhatsAppAppointmentService
): Promise<NextResponse> {
  try {
    const validationResult = queryAppointmentsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid query data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const { conversationId, patientId, status } = validationResult.data;

    const result = await appointmentService.queryAppointments({
      conversationId,
      patientId,
      status
    });

    return NextResponse.json({
      success: true,
      data: {
        message: result,
        hasAppointments: !result.includes('No encontré citas')
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Error querying appointments:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'QUERY_ERROR', message: 'Failed to query appointments' }
    }, { status: 500 });
  }
}

/**
 * Handle appointment rescheduling
 */
async function handleRescheduleAppointment(
  body: any,
  appointmentService: WhatsAppAppointmentService
): Promise<NextResponse> {
  try {
    const validationResult = rescheduleAppointmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid reschedule data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    // For now, return a placeholder response
    // Full implementation would involve checking availability and updating the appointment
    return NextResponse.json({
      success: false,
      data: {
        message: "La funcionalidad de reprogramación estará disponible pronto. Por favor contacte a nuestro personal para reprogramar su cita."
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'RESCHEDULE_ERROR', message: 'Failed to reschedule appointment' }
    }, { status: 500 });
  }
}

/**
 * Handle appointment cancellation
 */
async function handleCancelAppointment(
  body: any,
  supabase: any,
  whatsappInstance: any
): Promise<NextResponse> {
  try {
    const { appointmentId, reason } = body;

    if (!appointmentId) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'MISSING_APPOINTMENT_ID', message: 'Appointment ID is required' }
      }, { status: 400 });
    }

    // Update appointment status to cancelled
    const { data: appointment, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        notes: `Cancelada vía WhatsApp${reason ? `: ${reason}` : ''}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('organization_id', whatsappInstance.organization_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'CANCELLATION_FAILED', message: 'Failed to cancel appointment' }
      }, { status: 500 });
    }

    // Create audit log
    await supabase.rpc('create_whatsapp_audit_log', {
      p_organization_id: whatsappInstance.organization_id,
      p_action: 'appointment_cancelled',
      p_actor_type: 'patient',
      p_whatsapp_instance_id: whatsappInstance.id,
      p_details: {
        appointmentId,
        reason: reason || 'Cancelada por el paciente vía WhatsApp',
        cancelledAt: new Date().toISOString()
      }
    });

    const date = new Date(appointment.appointment_date).toLocaleDateString('es-ES');
    const time = appointment.start_time;

    return NextResponse.json({
      success: true,
      data: {
        message: `Su cita del ${date} a las ${time} ha sido cancelada exitosamente. ¿Hay algo más en lo que pueda ayudarle?`,
        appointmentId
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'CANCELLATION_ERROR', message: 'Failed to cancel appointment' }
    }, { status: 500 });
  }
}

// =====================================================
// GET /api/whatsapp/appointments
// =====================================================

/**
 * Get WhatsApp appointment information
 * 
 * @description Retrieves appointment information for WhatsApp conversations
 * 
 * @param request - Next.js request object
 * @returns JSON response with appointment data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const patientId = searchParams.get('patientId');

    if (!conversationId && !patientId) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'MISSING_PARAMETERS', message: 'Conversation ID or Patient ID is required' }
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get conversation and instance if conversationId provided
    if (conversationId) {
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_instances!inner(*)
        `)
        .eq('id', conversationId)
        .single();

      if (conversation) {
        const appointmentService = new WhatsAppAppointmentService(supabase, conversation.whatsapp_instances);
        const result = await appointmentService.queryAppointments({
          conversationId,
          patientId: conversation.patient_id || undefined
        });

        return NextResponse.json({
          success: true,
          data: { message: result },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        });
      }
    }

    return NextResponse.json({ 
      success: false,
      error: { code: 'NOT_FOUND', message: 'Conversation or appointments not found' }
    }, { status: 404 });

  } catch (error) {
    console.error('Error in GET WhatsApp appointments:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
