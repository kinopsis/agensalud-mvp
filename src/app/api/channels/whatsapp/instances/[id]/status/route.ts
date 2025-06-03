/**
 * Unified WhatsApp Instance Status Management API
 * 
 * Unified endpoint for checking and managing WhatsApp instance connection status
 * using the new multi-channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { getChannelManager } from '@/lib/channels/ChannelManager';
import { registerWhatsAppChannel } from '@/lib/channels/whatsapp';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const statusActionSchema = z.object({
  action: z.enum(['restart', 'logout', 'connect', 'disconnect']),
  reason: z.string().optional()
});

// =====================================================
// GET /api/channels/whatsapp/instances/[id]/status
// =====================================================

/**
 * Get WhatsApp instance status using unified architecture
 * 
 * @description Retrieves current status of WhatsApp instance from both
 * database and Evolution API using the unified channel service.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with status information or error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;

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

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    // Initialize channel manager and get WhatsApp service
    const manager = registerWhatsAppChannel(supabase, profile.organization_id);
    const whatsappService = manager.getChannelService('whatsapp');

    // Get instance
    const instance = await whatsappService.getInstance(instanceId);
    if (!instance || instance.organization_id !== profile.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'NOT_FOUND', message: 'Instance not found' }
      }, { status: 404 });
    }

    // Get status from unified service
    const databaseStatus = instance.status;
    let externalStatus = databaseStatus;
    let statusDetails = {};

    try {
      // Get real-time status from Evolution API
      externalStatus = await whatsappService.getExternalStatus(instanceId);
      
      // Get additional status details if available
      if (instance.config.whatsapp?.evolution_api) {
        statusDetails = {
          evolution_instance: instance.config.whatsapp.evolution_api.instance_name,
          last_sync: new Date().toISOString(),
          phone_number: instance.config.whatsapp.phone_number
        };
      }
    } catch (error) {
      console.warn('Could not get external status:', error);
      statusDetails = {
        error: 'Could not connect to Evolution API',
        last_sync: null
      };
    }

    // Get recent activity metrics
    const metrics = await whatsappService.getMetrics(instanceId, {
      start: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
      end: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        instance_id: instanceId,
        database_status: databaseStatus,
        external_status: externalStatus,
        status_match: databaseStatus === externalStatus,
        details: statusDetails,
        activity: {
          messages_last_hour: metrics.messages.total,
          conversations_active: metrics.conversations.active,
          last_message_at: metrics.messages.last_received_at
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/channels/whatsapp/instances/[id]/status:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// POST /api/channels/whatsapp/instances/[id]/status
// =====================================================

/**
 * Perform status action on WhatsApp instance using unified architecture
 * 
 * @description Executes actions like restart, logout, connect, or disconnect
 * on the WhatsApp instance using the unified channel service.
 * 
 * @param request - Next.js request object with action data
 * @param params - Route parameters containing instance ID
 * @returns JSON response with action result or error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;
    const body = await request.json();

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

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    // Validate request body
    const validationResult = statusActionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid action data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const { action, reason } = validationResult.data;

    // Initialize channel manager and get WhatsApp service
    const manager = registerWhatsAppChannel(supabase, profile.organization_id);
    const whatsappService = manager.getChannelService('whatsapp');

    // Get instance
    const instance = await whatsappService.getInstance(instanceId);
    if (!instance || instance.organization_id !== profile.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'NOT_FOUND', message: 'Instance not found' }
      }, { status: 404 });
    }

    let actionResult = '';
    let newStatus = instance.status;

    // Execute action using unified service
    switch (action) {
      case 'restart':
        await whatsappService.restartInstance(instanceId);
        newStatus = 'connecting';
        actionResult = 'Instance restarted successfully';
        break;

      case 'logout':
      case 'disconnect':
        await whatsappService.disconnect(instanceId);
        newStatus = 'disconnected';
        actionResult = 'Instance disconnected successfully';
        break;

      case 'connect':
        await whatsappService.connect(instance);
        newStatus = 'connecting';
        actionResult = 'Instance connection initiated. Scan QR code to complete.';
        break;

      default:
        return NextResponse.json({ 
          success: false,
          error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` }
        }, { status: 400 });
    }

    // Log action
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: instanceId,
      p_action: `status_${action}`,
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_details: {
        action,
        reason: reason || `${action} requested by admin`,
        previousStatus: instance.status,
        newStatus,
        executedBy: user.email,
        executedAt: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        instance_id: instanceId,
        action_executed: action,
        previous_status: instance.status,
        new_status: newStatus,
        message: actionResult
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/channels/whatsapp/instances/[id]/status:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
