/**
 * Unified WhatsApp Appointments API
 * 
 * Unified endpoint for WhatsApp appointment operations using the new multi-channel architecture.
 * Provides booking, querying, and management of appointments through WhatsApp channel.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { ChannelBookingRequest, ChannelAppointmentQuery } from '@/types/channels';
import { getChannelManager } from '@/lib/channels/ChannelManager';
import { registerWhatsAppChannel } from '@/lib/channels/whatsapp';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const bookingRequestSchema = z.object({
  conversation_id: z.string().min(1),
  patient_id: z.string().optional(),
  specialty: z.string().min(1),
  preferred_date: z.string().min(1),
  preferred_time: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']).default('medium'),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional()
});

const appointmentQuerySchema = z.object({
  patient_id: z.string().min(1),
  status: z.array(z.enum(['scheduled', 'confirmed', 'pending', 'cancelled', 'completed'])).optional(),
  limit: z.coerce.number().min(1).max(20).default(5)
});

const slotConfirmationSchema = z.object({
  conversation_id: z.string().min(1),
  slot_index: z.coerce.number().min(0),
  available_slots: z.array(z.any()),
  patient_id: z.string().optional()
});

// =====================================================
// POST /api/channels/whatsapp/appointments
// =====================================================

/**
 * Process appointment booking request through WhatsApp using unified architecture
 * 
 * @description Handles appointment booking requests from WhatsApp conversations
 * using the unified appointment service and AI processing.
 * 
 * @param request - Next.js request object with booking data
 * @returns JSON response with booking result or error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Authenticate user (system or admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // Validate request body
    const validationResult = bookingRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid booking request',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const bookingData = validationResult.data;

    // Find WhatsApp instance for the conversation
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('whatsapp_instance_id')
      .eq('id', bookingData.conversation_id)
      .single();

    if (!conversation) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' }
      }, { status: 404 });
    }

    // Get channel instance
    const { data: channelInstance } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('id', conversation.whatsapp_instance_id)
      .eq('channel_type', 'whatsapp')
      .single();

    if (!channelInstance || channelInstance.organization_id !== profile.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSTANCE_NOT_FOUND', message: 'WhatsApp instance not found' }
      }, { status: 404 });
    }

    // Initialize channel manager and get appointment service
    const manager = registerWhatsAppChannel(supabase, profile.organization_id);
    const appointmentService = manager.createAppointmentService('whatsapp', channelInstance);

    // Convert to unified booking request format
    const unifiedRequest: ChannelBookingRequest = {
      channel_type: 'whatsapp',
      conversation_id: bookingData.conversation_id,
      patient_id: bookingData.patient_id,
      specialty: bookingData.specialty,
      preferred_date: bookingData.preferred_date,
      preferred_time: bookingData.preferred_time,
      urgency: bookingData.urgency,
      symptoms: bookingData.symptoms,
      notes: bookingData.notes
    };

    // Process booking request using unified service
    const result = await appointmentService.processBookingRequest(unifiedRequest);

    // Log booking attempt
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: channelInstance.id,
      p_conversation_id: bookingData.conversation_id,
      p_action: 'appointment_booking_requested',
      p_actor_type: 'patient',
      p_details: {
        specialty: bookingData.specialty,
        preferredDate: bookingData.preferred_date,
        urgency: bookingData.urgency,
        success: result.success,
        availableSlots: result.available_slots?.length || 0
      }
    });

    return NextResponse.json({
      success: result.success,
      data: {
        message: result.message,
        available_slots: result.available_slots,
        next_step: result.next_step,
        appointment_id: result.appointment_id
      },
      error: result.error,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp',
        conversationId: bookingData.conversation_id
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/channels/whatsapp/appointments:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}

// =====================================================
// GET /api/channels/whatsapp/appointments
// =====================================================

/**
 * Query patient appointments through WhatsApp using unified architecture
 * 
 * @description Retrieves patient appointments for WhatsApp conversations
 * using the unified appointment service.
 * 
 * @param request - Next.js request object with query parameters
 * @returns JSON response with appointments list or error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // Validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = appointmentQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid query parameters',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const queryData = validationResult.data;

    // Initialize channel manager and get appointment service
    const manager = registerWhatsAppChannel(supabase, profile.organization_id);
    
    // For query operations, we need a dummy channel instance
    // In practice, this would be determined by the conversation context
    const { data: anyWhatsAppInstance } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('channel_type', 'whatsapp')
      .eq('organization_id', profile.organization_id)
      .limit(1)
      .single();

    if (!anyWhatsAppInstance) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'NO_WHATSAPP_INSTANCE', message: 'No WhatsApp instance found' }
      }, { status: 404 });
    }

    const appointmentService = manager.createAppointmentService('whatsapp', anyWhatsAppInstance);

    // Convert to unified query format
    const unifiedQuery: ChannelAppointmentQuery = {
      patient_id: queryData.patient_id,
      status: queryData.status,
      limit: queryData.limit
    };

    // Query appointments using unified service
    const appointmentsMessage = await appointmentService.queryAppointments(unifiedQuery);

    // Log query attempt
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: anyWhatsAppInstance.id,
      p_action: 'appointments_queried',
      p_actor_type: 'patient',
      p_details: {
        patientId: queryData.patient_id,
        statusFilter: queryData.status,
        limit: queryData.limit
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        message: appointmentsMessage,
        patient_id: queryData.patient_id
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/channels/whatsapp/appointments:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
