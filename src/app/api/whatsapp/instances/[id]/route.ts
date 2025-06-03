/**
 * WhatsApp Instance Management API - Individual Instance Operations
 * 
 * Endpoints for GET, PUT, and DELETE operations on specific WhatsApp instances.
 * Supports Evolution API v2 integration with multi-tenant security.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  updateWhatsAppInstanceSchema,
  type UpdateWhatsAppInstanceInput 
} from '@/lib/validations/whatsapp';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';

// =====================================================
// GET /api/whatsapp/instances/[id]
// =====================================================

/**
 * Get specific WhatsApp instance by ID
 * 
 * @description Retrieves a specific WhatsApp instance with current status.
 * Only Admin and SuperAdmin roles can access this endpoint.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with instance data or error
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
          message: 'Only administrators can access WhatsApp instances',
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

    // Apply organization filter for admin users
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

    // Get current status from Evolution API
    try {
      const evolutionAPI = createEvolutionAPIService();
      const statusResponse = await evolutionAPI.getInstanceStatus(instance.instance_name);
      
      // Update status in database if different
      if (statusResponse.state !== instance.status) {
        const newStatus = statusResponse.state === 'open' ? 'active' : 
                         statusResponse.state === 'connecting' ? 'connecting' : 'inactive';
        
        await supabase
          .from('whatsapp_instances')
          .update({ 
            status: newStatus,
            last_connected_at: statusResponse.state === 'open' ? new Date().toISOString() : instance.last_connected_at
          })
          .eq('id', instanceId);

        instance.status = newStatus;
        if (statusResponse.state === 'open') {
          instance.last_connected_at = new Date().toISOString();
        }
      }

      // Get QR code if instance is connecting
      if (statusResponse.state === 'connecting' && statusResponse.qr) {
        instance.qr_code = statusResponse.qr;
      }

    } catch (evolutionError) {
      console.warn('Could not get Evolution API status:', evolutionError);
      // Continue with database status
    }

    return NextResponse.json({
      success: true,
      data: { instance },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: instance.organization_id
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/whatsapp/instances/[id]:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// PUT /api/whatsapp/instances/[id]
// =====================================================

/**
 * Update WhatsApp instance
 * 
 * @description Updates a WhatsApp instance configuration.
 * Only Admin and SuperAdmin roles can update instances.
 * 
 * @param request - Next.js request object with update data
 * @param params - Route parameters containing instance ID
 * @returns JSON response with updated instance or error
 */
export async function PUT(
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
          message: 'Only administrators can update WhatsApp instances',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateWhatsAppInstanceSchema.safeParse(body);
    
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

    const updateData = validationResult.data;

    // Get existing instance with organization filtering
    let query = supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId);

    if (profile.role === 'admin') {
      query = query.eq('organization_id', profile.organization_id);
    }

    const { data: existingInstance, error: queryError } = await query.single();

    if (queryError || !existingInstance) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSTANCE_NOT_FOUND', message: 'WhatsApp instance not found' }
      }, { status: 404 });
    }

    // Check for duplicate instance name if being updated
    if (updateData.instance_name && updateData.instance_name !== existingInstance.instance_name) {
      const { data: duplicateInstance } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('organization_id', existingInstance.organization_id)
        .eq('instance_name', updateData.instance_name)
        .neq('id', instanceId)
        .single();

      if (duplicateInstance) {
        return NextResponse.json({ 
          success: false,
          error: { 
            code: 'DUPLICATE_INSTANCE_NAME', 
            message: 'Instance name already exists in this organization'
          }
        }, { status: 409 });
      }
    }

    // Prepare update object
    const updateObject: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields that can be updated
    if (updateData.instance_name) updateObject.instance_name = updateData.instance_name;
    if (updateData.phone_number) updateObject.phone_number = updateData.phone_number;
    if (updateData.business_id !== undefined) updateObject.business_id = updateData.business_id;
    if (updateData.webhook_url !== undefined) updateObject.webhook_url = updateData.webhook_url;
    if (updateData.status) updateObject.status = updateData.status;
    if (updateData.error_message !== undefined) updateObject.error_message = updateData.error_message;
    
    if (updateData.evolution_api_config) {
      updateObject.evolution_api_config = {
        ...existingInstance.evolution_api_config,
        ...updateData.evolution_api_config
      };
    }

    // Update instance in database
    const { data: updatedInstance, error: updateError } = await supabase
      .from('whatsapp_instances')
      .update(updateObject)
      .eq('id', instanceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating WhatsApp instance:', updateError);
      return NextResponse.json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to update WhatsApp instance' }
      }, { status: 500 });
    }

    // Create audit log entry
    await supabase.rpc('create_whatsapp_audit_log', {
      p_organization_id: existingInstance.organization_id,
      p_action: 'instance_updated',
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_whatsapp_instance_id: instanceId,
      p_details: {
        updatedFields: Object.keys(updateData),
        updatedBy: `${profile.first_name} ${profile.last_name}`.trim(),
        previousValues: {
          instance_name: existingInstance.instance_name,
          phone_number: existingInstance.phone_number,
          status: existingInstance.status
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: { instance: updatedInstance },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: existingInstance.organization_id
      }
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/whatsapp/instances/[id]:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// DELETE /api/whatsapp/instances/[id]
// =====================================================

/**
 * Delete WhatsApp instance
 * 
 * @description Deletes a WhatsApp instance from both database and Evolution API.
 * Only Admin and SuperAdmin roles can delete instances.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with success confirmation or error
 */
export async function DELETE(
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
          message: 'Only administrators can delete WhatsApp instances',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Get existing instance with organization filtering
    let query = supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId);

    if (profile.role === 'admin') {
      query = query.eq('organization_id', profile.organization_id);
    }

    const { data: existingInstance, error: queryError } = await query.single();

    if (queryError || !existingInstance) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSTANCE_NOT_FOUND', message: 'WhatsApp instance not found' }
      }, { status: 404 });
    }

    // Check if instance has active conversations
    const { data: activeConversations, error: conversationsError } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('whatsapp_instance_id', instanceId)
      .eq('conversation_state', 'active')
      .limit(1);

    if (conversationsError) {
      console.error('Error checking active conversations:', conversationsError);
    } else if (activeConversations && activeConversations.length > 0) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'ACTIVE_CONVERSATIONS_EXIST', 
          message: 'Cannot delete instance with active conversations. Please close all conversations first.'
        }
      }, { status: 409 });
    }

    // Delete from Evolution API first
    try {
      const evolutionAPI = createEvolutionAPIService();
      await evolutionAPI.deleteInstance(existingInstance.instance_name);
    } catch (evolutionError) {
      console.warn('Could not delete from Evolution API (continuing with database deletion):', evolutionError);
      // Continue with database deletion even if Evolution API fails
    }

    // Create audit log entry before deletion
    await supabase.rpc('create_whatsapp_audit_log', {
      p_organization_id: existingInstance.organization_id,
      p_action: 'instance_deleted',
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_whatsapp_instance_id: instanceId,
      p_details: {
        instanceName: existingInstance.instance_name,
        phoneNumber: existingInstance.phone_number,
        deletedBy: `${profile.first_name} ${profile.last_name}`.trim(),
        deletedAt: new Date().toISOString()
      }
    });

    // Delete instance from database (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', instanceId);

    if (deleteError) {
      console.error('Error deleting WhatsApp instance:', deleteError);
      return NextResponse.json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to delete WhatsApp instance' }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { 
        message: 'WhatsApp instance deleted successfully',
        deletedInstanceId: instanceId
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: existingInstance.organization_id
      }
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/whatsapp/instances/[id]:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
