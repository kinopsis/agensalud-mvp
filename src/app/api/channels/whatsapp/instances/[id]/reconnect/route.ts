/**
 * WhatsApp Instance Reconnection API Endpoint
 * 
 * Provides automatic reconnection functionality for WhatsApp instances.
 * Used by the connection monitoring system for recovery attempts.
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

const reconnectRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  reason: z.string().optional().default('Automatic reconnection attempt')
});

// =====================================================
// API ROUTE HANDLERS
// =====================================================

/**
 * POST /api/channels/whatsapp/instances/[id]/reconnect
 * 
 * @description Attempts to reconnect a WhatsApp instance that has lost connection.
 * Performs cleanup and restart operations to restore connectivity.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with reconnection result
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;

    // =====================================================
    // AUTHENTICATION & AUTHORIZATION
    // =====================================================

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

    // =====================================================
    // REQUEST VALIDATION
    // =====================================================

    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (error) {
      // Empty body is acceptable for reconnection
      requestBody = {};
    }

    const validationResult = reconnectRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const { force, reason } = validationResult.data;

    // =====================================================
    // INSTANCE VERIFICATION
    // =====================================================

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

    // =====================================================
    // RECONNECTION LOGIC
    // =====================================================

    try {
      console.log(`🔄 Starting reconnection for instance: ${instanceId}`);

      // Check current status
      let currentStatus = instance.status;
      try {
        currentStatus = await whatsappService.getExternalStatus(instanceId);
      } catch (error) {
        console.warn('Could not get external status during reconnection:', error);
      }

      // Skip reconnection if already connected (unless forced)
      if (currentStatus === 'connected' && !force) {
        return NextResponse.json({
          success: true,
          message: 'Instance is already connected',
          data: {
            instanceId,
            status: 'connected',
            action: 'none',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Update status to connecting
      await supabase
        .from('channel_instances')
        .update({
          status: 'connecting',
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      // Perform reconnection steps
      const reconnectionSteps = [];

      // Step 1: Disconnect if currently connected
      if (currentStatus === 'connected' || force) {
        try {
          await whatsappService.disconnect(instanceId);
          reconnectionSteps.push('disconnected');
          console.log(`✅ Disconnected instance: ${instanceId}`);
        } catch (error) {
          console.warn('Disconnect failed during reconnection:', error);
          reconnectionSteps.push('disconnect_failed');
        }
      }

      // Step 2: Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Restart the instance
      try {
        await whatsappService.restartInstance(instanceId);
        reconnectionSteps.push('restarted');
        console.log(`✅ Restarted instance: ${instanceId}`);
      } catch (error) {
        console.error('Restart failed during reconnection:', error);
        reconnectionSteps.push('restart_failed');
        throw error;
      }

      // Step 4: Initiate connection
      try {
        await whatsappService.connect(instance);
        reconnectionSteps.push('connection_initiated');
        console.log(`✅ Connection initiated for instance: ${instanceId}`);
      } catch (error) {
        console.error('Connection initiation failed:', error);
        reconnectionSteps.push('connection_failed');
        throw error;
      }

      // Log the reconnection attempt
      await supabase.rpc('create_channel_audit_log', {
        p_organization_id: profile.organization_id,
        p_channel_type: 'whatsapp',
        p_instance_id: instanceId,
        p_action: 'reconnection_attempt',
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_details: {
          reason,
          force,
          previousStatus: instance.status,
          currentStatus,
          steps: reconnectionSteps,
          executedBy: user.email,
          executedAt: new Date().toISOString()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Reconnection initiated successfully',
        data: {
          instanceId,
          previousStatus: instance.status,
          currentStatus: 'connecting',
          steps: reconnectionSteps,
          nextAction: 'scan_qr_code',
          timestamp: new Date().toISOString()
        }
      });

    } catch (reconnectionError) {
      console.error('Reconnection failed:', reconnectionError);

      // Update status to error
      await supabase
        .from('channel_instances')
        .update({
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      // Log the failed reconnection
      await supabase.rpc('create_channel_audit_log', {
        p_organization_id: profile.organization_id,
        p_channel_type: 'whatsapp',
        p_instance_id: instanceId,
        p_action: 'reconnection_failed',
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_details: {
          reason,
          force,
          error: reconnectionError instanceof Error ? reconnectionError.message : 'Unknown error',
          executedBy: user.email,
          executedAt: new Date().toISOString()
        }
      });

      return NextResponse.json({
        success: false,
        error: {
          code: 'RECONNECTION_FAILED',
          message: 'Failed to reconnect instance',
          details: reconnectionError instanceof Error ? reconnectionError.message : 'Unknown error'
        },
        data: {
          instanceId,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in reconnection endpoint:', error);
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
// GET RECONNECTION STATUS
// =====================================================

/**
 * GET /api/channels/whatsapp/instances/[id]/reconnect
 * 
 * @description Gets the current reconnection status and history for an instance.
 * Useful for monitoring reconnection attempts and success rates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;

    // =====================================================
    // AUTHENTICATION & AUTHORIZATION
    // =====================================================

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile
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

    // =====================================================
    // GET RECONNECTION HISTORY
    // =====================================================

    // Get recent reconnection attempts from audit log
    const { data: reconnectionHistory } = await supabase
      .from('channel_audit_logs')
      .select('*')
      .eq('instance_id', instanceId)
      .in('action', ['reconnection_attempt', 'reconnection_failed'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate success rate
    const totalAttempts = reconnectionHistory?.length || 0;
    const successfulAttempts = reconnectionHistory?.filter(log => 
      log.action === 'reconnection_attempt'
    ).length || 0;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        instanceId,
        reconnectionHistory: reconnectionHistory || [],
        statistics: {
          totalAttempts,
          successfulAttempts,
          failedAttempts: totalAttempts - successfulAttempts,
          successRate: Math.round(successRate * 100) / 100
        },
        lastAttempt: reconnectionHistory?.[0] || null
      }
    });

  } catch (error) {
    console.error('Error getting reconnection status:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
