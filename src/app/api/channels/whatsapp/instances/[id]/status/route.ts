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
import { fastAuth } from '@/lib/utils/fastAuth';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const statusActionSchema = z.object({
  action: z.enum(['restart', 'logout', 'connect', 'disconnect']),
  reason: z.string().optional()
});

const statusUpdateSchema = z.object({
  status: z.enum(['disconnected', 'connecting', 'connected', 'error']),
  error_message: z.string().optional()
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

    // ENHANCED CIRCUIT BREAKER: Block all problematic instances causing infinite loops
    const problematicInstances = [
      '927cecbe-hhghg',
      '927cecbe-polopolo',
      '927cecbe-pticavisualcarwhatsa' // Added the main problematic instance
    ];

    const isProblematic = problematicInstances.some(problematic => instanceId.includes(problematic));

    if (isProblematic) {
      console.log(`🛑 API CIRCUIT BREAKER: Blocking status request for problematic instance: ${instanceId}`);

      return NextResponse.json({
        success: false,
        error: {
          code: 'INSTANCE_BLOCKED',
          message: 'Instance monitoring disabled due to infinite loop protection'
        },
        data: {
          instance_id: instanceId,
          database_status: 'error',
          external_status: 'error',
          status_match: true,
          details: {
            error: 'Instance has been disabled due to infinite monitoring loop protection',
            last_sync: null
          },
          activity: {
            messages_last_hour: 0,
            conversations_active: 0,
            last_message_at: null
          }
        }
      }, { status: 503 }); // Service Unavailable
    }

    // Authenticate user with fastAuth fallback
    const authResult = await fastAuth(1500);
    let user = authResult.user;

    if (!user) {
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Using mock user for status endpoint');
        user = {
          id: 'dev-user',
          email: 'dev@agentsalud.com',
          user_metadata: {},
          app_metadata: {}
        };
      } else {
        return NextResponse.json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
      }
    }

    // Get user profile and organization with development fallback
    let profile = null;

    if (process.env.NODE_ENV === 'development' && user.id === 'dev-user') {
      // Use mock profile for development
      profile = {
        organization_id: 'dev-org-123',
        role: 'admin'
      };
      console.log('🔧 Using development profile for status endpoint');
    } else {
      // Get real profile from database
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      profile = profileData;
    }

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

    // Authenticate user with fastAuth fallback
    const authResult = await fastAuth(1500);
    let user = authResult.user;

    if (!user) {
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Using mock user for status POST endpoint');
        user = {
          id: 'dev-user',
          email: 'dev@agentsalud.com',
          user_metadata: {},
          app_metadata: {}
        };
      } else {
        return NextResponse.json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
      }
    }

    // Get user profile and organization with development fallback
    let profile = null;

    if (process.env.NODE_ENV === 'development' && user.id === 'dev-user') {
      // Use mock profile for development
      profile = {
        organization_id: 'dev-org-123',
        role: 'admin'
      };
      console.log('🔧 Using development profile for status POST endpoint');
    } else {
      // Get real profile from database
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      profile = profileData;
    }

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

// =====================================================
// PATCH /api/channels/whatsapp/instances/[id]/status
// =====================================================

/**
 * Update WhatsApp instance status for two-step connection flow
 *
 * @description Simple status update for transitioning instances to 'connecting'
 * state before QR code generation. Used in the two-step connection flow.
 *
 * @param request - Next.js request object with status data
 * @param params - Route parameters containing instance ID
 * @returns JSON response with updated status or error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;
    const body = await request.json();

    // Authenticate user with fastAuth fallback
    const authResult = await fastAuth(1500);
    let user = authResult.user;

    if (!user) {
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Using mock user for status PATCH endpoint');
        user = {
          id: 'dev-user',
          email: 'dev@agentsalud.com',
          user_metadata: {},
          app_metadata: {}
        };
      } else {
        return NextResponse.json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
      }
    }

    // Get user profile and organization with development fallback
    let profile = null;

    if (process.env.NODE_ENV === 'development' && user.id === 'dev-user') {
      // Use mock profile for development
      profile = {
        organization_id: 'dev-org-123',
        role: 'admin'
      };
      console.log('🔧 Using development profile for status PATCH endpoint');
    } else {
      // Get real profile from database
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

      profile = profileData;
    }

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    // Validate request body
    const validationResult = statusUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const { status, error_message } = validationResult.data;

    // Get instance
    const { data: instance, error: instanceError } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('channel_type', 'whatsapp')
      .single();

    if (instanceError || !instance) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Instance not found' }
      }, { status: 404 });
    }

    // Check access
    if (instance.organization_id !== profile.organization_id && profile.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to this instance' }
      }, { status: 403 });
    }

    // Update status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (error_message) {
      updateData.error_message = error_message;
    } else if (status !== 'error') {
      updateData.error_message = null;
    }

    const { data: updatedInstance, error: updateError } = await supabase
      .from('channel_instances')
      .update(updateData)
      .eq('id', instanceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating instance status:', updateError);
      return NextResponse.json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update instance status' }
      }, { status: 500 });
    }

    // Log status change
    try {
      await supabase.rpc('create_channel_audit_log', {
        p_organization_id: instance.organization_id,
        p_channel_type: 'whatsapp',
        p_instance_id: instanceId,
        p_action: 'status_updated',
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_details: {
          previousStatus: instance.status,
          newStatus: status,
          errorMessage: error_message || null,
          updatedBy: user.email,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: {
        instance_id: instanceId,
        instance_name: updatedInstance.instance_name,
        previous_status: instance.status,
        new_status: updatedInstance.status,
        error_message: updatedInstance.error_message,
        updated_at: updatedInstance.updated_at
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: instance.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/channels/whatsapp/instances/[id]/status:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
