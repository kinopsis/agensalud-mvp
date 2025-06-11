/**
 * WhatsApp Instance Connection API
 * 
 * Handles the connection process for WhatsApp instances, including:
 * - Status updates to "connecting"
 * - QR code generation triggering
 * - Connection state monitoring
 * 
 * @fileoverview Enhanced connection endpoint for two-step WhatsApp flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const connectRequestSchema = z.object({
  action: z.literal('connect').optional(),
  force: z.boolean().optional().default(false)
});

// =====================================================
// API HANDLERS
// =====================================================

/**
 * Handle WhatsApp instance connection
 * 
 * This endpoint specifically handles the "connect" action for WhatsApp instances
 * in the two-step flow: create instance → connect (show QR)
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with connection result
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;
    const body = await request.json().catch(() => ({})); // Support empty body for radical solution

    console.log(`🔗 Processing connection request for instance: ${instanceId}`);

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
    const validationResult = connectRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid connection request',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

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
        error: { code: 'NOT_FOUND', message: 'WhatsApp instance not found' }
      }, { status: 404 });
    }

    // Check access
    if (instance.organization_id !== profile.organization_id && profile.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to this instance' }
      }, { status: 403 });
    }

    // Check if instance is already connected (unless force is true)
    if (instance.status === 'connected' && !validationResult.data.force) {
      return NextResponse.json({
        success: true,
        message: 'Instance is already connected',
        data: {
          instance_id: instanceId,
          instance_name: instance.instance_name,
          status: instance.status,
          already_connected: true
        }
      });
    }

    // Update instance status to "connecting"
    const { data: updatedInstance, error: updateError } = await supabase
      .from('channel_instances')
      .update({
        status: 'connecting',
        error_message: null, // Clear any previous errors
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating instance status:', updateError);
      return NextResponse.json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update instance status' }
      }, { status: 500 });
    }

    console.log(`✅ Instance ${instance.instance_name} status updated to connecting`);

    // Log connection attempt
    try {
      await supabase.rpc('create_channel_audit_log', {
        p_organization_id: instance.organization_id,
        p_channel_type: 'whatsapp',
        p_instance_id: instanceId,
        p_action: 'connection_initiated',
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_details: {
          previousStatus: instance.status,
          newStatus: 'connecting',
          connectionMethod: 'qr_code',
          initiatedBy: user.email,
          initiatedAt: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Connection process initiated successfully',
      data: {
        instance_id: instanceId,
        instance_name: updatedInstance.instance_name,
        previous_status: instance.status,
        current_status: updatedInstance.status,
        qr_code_ready: true,
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
    console.error('❌ Unexpected error in POST /api/channels/whatsapp/instances/[id]/connect:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
