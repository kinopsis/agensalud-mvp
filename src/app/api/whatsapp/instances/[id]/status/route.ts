/**
 * WhatsApp Instance Status Management API
 * 
 * Endpoint for checking and managing WhatsApp instance connection status.
 * Integrates with Evolution API v2 for real-time status monitoring.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const statusActionSchema = z.object({
  action: z.enum(['restart', 'logout', 'connect', 'disconnect']),
  reason: z.string().optional()
});

// =====================================================
// GET /api/whatsapp/instances/[id]/status
// =====================================================

/**
 * Get current status of WhatsApp instance
 * 
 * @description Retrieves the current connection status from Evolution API
 * and updates the database accordingly. Only Admin and SuperAdmin roles can access.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with current status or error
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

    // Get user profile with role and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // Validate role permissions
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: 'Only administrators can check WhatsApp instance status',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Get instance with organization filtering
    let query = supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId);

    if (profile.role === 'admin') {
      query = query.eq('organization_id', profile.organization_id);
    }

    const { data: instance, error: queryError } = await query.single();

    if (queryError || !instance) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSTANCE_NOT_FOUND', message: 'WhatsApp instance not found' }
      }, { status: 404 });
    }

    try {
      // Get current status from Evolution API
      const evolutionAPI = createEvolutionAPIService();
      const statusResponse = await evolutionAPI.getInstanceStatus(instance.instance_name);
      
      // Map Evolution API status to our status
      const mappedStatus = statusResponse.state === 'open' ? 'active' : 
                          statusResponse.state === 'connecting' ? 'connecting' : 
                          statusResponse.state === 'close' ? 'inactive' : 'error';

      // Get additional instance info
      let instanceInfo = null;
      try {
        instanceInfo = await evolutionAPI.getInstanceInfo(instance.instance_name);
      } catch (infoError) {
        console.warn('Could not get instance info:', infoError);
      }

      // Update status in database if different
      let updatedInstance = instance;
      if (mappedStatus !== instance.status) {
        const updateData: any = { 
          status: mappedStatus,
          updated_at: new Date().toISOString()
        };

        if (mappedStatus === 'active') {
          updateData.last_connected_at = new Date().toISOString();
          updateData.error_message = null;
        }

        const { data: updated, error: updateError } = await supabase
          .from('whatsapp_instances')
          .update(updateData)
          .eq('id', instanceId)
          .select()
          .single();

        if (!updateError) {
          updatedInstance = updated;
        }

        // Create audit log for status change
        await supabase.rpc('create_whatsapp_audit_log', {
          p_organization_id: instance.organization_id,
          p_action: 'status_changed',
          p_actor_type: 'system',
          p_whatsapp_instance_id: instanceId,
          p_details: {
            previousStatus: instance.status,
            newStatus: mappedStatus,
            evolutionState: statusResponse.state,
            checkedAt: new Date().toISOString()
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          instance: updatedInstance,
          evolutionStatus: {
            state: statusResponse.state,
            qr: statusResponse.qr
          },
          instanceInfo: instanceInfo,
          lastChecked: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          organizationId: instance.organization_id
        }
      });

    } catch (evolutionError) {
      console.error('Error getting status from Evolution API:', evolutionError);
      
      // Update instance status to error if Evolution API is unreachable
      await supabase
        .from('whatsapp_instances')
        .update({ 
          status: 'error',
          error_message: `Evolution API unreachable: ${evolutionError instanceof Error ? evolutionError.message : 'Unknown error'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      return NextResponse.json({
        success: true,
        data: {
          instance: {
            ...instance,
            status: 'error',
            error_message: `Evolution API unreachable: ${evolutionError instanceof Error ? evolutionError.message : 'Unknown error'}`
          },
          evolutionStatus: null,
          error: 'Could not connect to Evolution API',
          lastChecked: new Date().toISOString()
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          organizationId: instance.organization_id
        }
      });
    }

  } catch (error) {
    console.error('Unexpected error in GET /api/whatsapp/instances/[id]/status:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// POST /api/whatsapp/instances/[id]/status
// =====================================================

/**
 * Perform status action on WhatsApp instance
 * 
 * @description Executes actions like restart, logout, connect, or disconnect
 * on the WhatsApp instance through Evolution API.
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

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile with role and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // Validate role permissions
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: 'Only administrators can control WhatsApp instance status',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = statusActionSchema.safeParse(body);
    
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

    const { action, reason } = validationResult.data;

    // Get instance with organization filtering
    let query = supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId);

    if (profile.role === 'admin') {
      query = query.eq('organization_id', profile.organization_id);
    }

    const { data: instance, error: queryError } = await query.single();

    if (queryError || !instance) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSTANCE_NOT_FOUND', message: 'WhatsApp instance not found' }
      }, { status: 404 });
    }

    try {
      const evolutionAPI = createEvolutionAPIService();
      let actionResult = null;
      let newStatus = instance.status;

      switch (action) {
        case 'restart':
          await evolutionAPI.restartInstance(instance.instance_name);
          newStatus = 'connecting';
          actionResult = 'Instance restarted successfully';
          break;

        case 'logout':
          await evolutionAPI.logoutInstance(instance.instance_name);
          newStatus = 'inactive';
          actionResult = 'Instance logged out successfully';
          break;

        case 'connect':
          // For connect, we just restart the instance to generate new QR
          await evolutionAPI.restartInstance(instance.instance_name);
          newStatus = 'connecting';
          actionResult = 'Instance connection initiated. Scan QR code to complete.';
          break;

        case 'disconnect':
          await evolutionAPI.logoutInstance(instance.instance_name);
          newStatus = 'inactive';
          actionResult = 'Instance disconnected successfully';
          break;

        default:
          return NextResponse.json({ 
            success: false,
            error: { code: 'INVALID_ACTION', message: 'Invalid action specified' }
          }, { status: 400 });
      }

      // Update instance status in database
      const { data: updatedInstance, error: updateError } = await supabase
        .from('whatsapp_instances')
        .update({ 
          status: newStatus,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating instance status:', updateError);
      }

      // Create audit log entry
      await supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: instance.organization_id,
        p_action: `instance_${action}`,
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_whatsapp_instance_id: instanceId,
        p_details: {
          action: action,
          reason: reason,
          performedBy: `${profile.first_name} ${profile.last_name}`.trim(),
          previousStatus: instance.status,
          newStatus: newStatus,
          performedAt: new Date().toISOString()
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          action: action,
          result: actionResult,
          instance: updatedInstance || { ...instance, status: newStatus },
          previousStatus: instance.status,
          newStatus: newStatus
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          organizationId: instance.organization_id
        }
      });

    } catch (evolutionError) {
      console.error(`Error performing ${action} on Evolution API:`, evolutionError);
      
      // Update instance status to error
      await supabase
        .from('whatsapp_instances')
        .update({ 
          status: 'error',
          error_message: `${action} failed: ${evolutionError instanceof Error ? evolutionError.message : 'Unknown error'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'ACTION_FAILED', 
          message: `Failed to ${action} instance`,
          details: evolutionError instanceof Error ? evolutionError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/whatsapp/instances/[id]/status:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
