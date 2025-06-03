/**
 * WhatsApp Instance QR Code API
 * 
 * Endpoint for retrieving QR codes for WhatsApp instance connection.
 * Integrates with Evolution API v2 for real-time QR code generation.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';

// =====================================================
// GET /api/whatsapp/instances/[id]/qrcode
// =====================================================

/**
 * Get QR code for WhatsApp instance connection
 * 
 * @description Retrieves the current QR code for connecting a WhatsApp account
 * to the specified instance. Only Admin and SuperAdmin roles can access this endpoint.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with QR code data or error
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
          message: 'Only administrators can access WhatsApp QR codes',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Get instance with organization filtering
    let query = supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status, organization_id, qr_code')
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

    // Check if instance is in a state that can generate QR codes
    if (instance.status === 'active') {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSTANCE_ALREADY_CONNECTED', 
          message: 'WhatsApp instance is already connected. QR code is not needed.'
        }
      }, { status: 409 });
    }

    if (instance.status === 'error' || instance.status === 'suspended') {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSTANCE_ERROR_STATE', 
          message: `Cannot generate QR code. Instance is in ${instance.status} state.`
        }
      }, { status: 409 });
    }

    try {
      // Get fresh QR code from Evolution API
      const evolutionAPI = createEvolutionAPIService();
      const qrResponse = await evolutionAPI.getQRCode(instance.instance_name);

      // Update QR code in database
      await supabase
        .from('whatsapp_instances')
        .update({ 
          qr_code: qrResponse.base64,
          status: 'connecting',
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      // Create audit log entry
      await supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: instance.organization_id,
        p_action: 'qr_code_requested',
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_whatsapp_instance_id: instanceId,
        p_details: {
          instanceName: instance.instance_name,
          requestedAt: new Date().toISOString()
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          qrCode: qrResponse.base64,
          qrCodeText: qrResponse.qrcode,
          instanceId: instanceId,
          instanceName: instance.instance_name,
          status: 'connecting',
          expiresIn: 60, // QR codes typically expire in 60 seconds
          instructions: 'Scan this QR code with WhatsApp on your phone to connect the instance.'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          organizationId: instance.organization_id
        }
      });

    } catch (evolutionError) {
      console.error('Error getting QR code from Evolution API:', evolutionError);
      
      // If Evolution API fails, try to return cached QR code if available
      if (instance.qr_code) {
        return NextResponse.json({
          success: true,
          data: {
            qrCode: instance.qr_code,
            instanceId: instanceId,
            instanceName: instance.instance_name,
            status: instance.status,
            cached: true,
            warning: 'Using cached QR code. It may have expired.'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            organizationId: instance.organization_id
          }
        });
      }

      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'QR_CODE_GENERATION_FAILED', 
          message: 'Failed to generate QR code from Evolution API',
          details: evolutionError instanceof Error ? evolutionError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in GET /api/whatsapp/instances/[id]/qrcode:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// POST /api/whatsapp/instances/[id]/qrcode
// =====================================================

/**
 * Refresh QR code for WhatsApp instance
 * 
 * @description Forces generation of a new QR code for the instance.
 * Useful when the current QR code has expired.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with new QR code data or error
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
          message: 'Only administrators can refresh WhatsApp QR codes',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Get instance with organization filtering
    let query = supabase
      .from('whatsapp_instances')
      .select('id, instance_name, status, organization_id')
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

    // Check if instance can be refreshed
    if (instance.status === 'active') {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSTANCE_ALREADY_CONNECTED', 
          message: 'WhatsApp instance is already connected. No need to refresh QR code.'
        }
      }, { status: 409 });
    }

    try {
      // Restart instance to generate new QR code
      const evolutionAPI = createEvolutionAPIService();
      await evolutionAPI.restartInstance(instance.instance_name);

      // Wait a moment for the instance to restart
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get new QR code
      const qrResponse = await evolutionAPI.getQRCode(instance.instance_name);

      // Update instance with new QR code
      const { data: updatedInstance, error: updateError } = await supabase
        .from('whatsapp_instances')
        .update({ 
          qr_code: qrResponse.base64,
          status: 'connecting',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating instance with new QR code:', updateError);
      }

      // Create audit log entry
      await supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: instance.organization_id,
        p_action: 'qr_code_refreshed',
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_whatsapp_instance_id: instanceId,
        p_details: {
          instanceName: instance.instance_name,
          refreshedBy: `${profile.first_name} ${profile.last_name}`.trim(),
          refreshedAt: new Date().toISOString()
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          qrCode: qrResponse.base64,
          qrCodeText: qrResponse.qrcode,
          instanceId: instanceId,
          instanceName: instance.instance_name,
          status: 'connecting',
          refreshed: true,
          expiresIn: 60,
          instructions: 'Scan this new QR code with WhatsApp on your phone to connect the instance.'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          organizationId: instance.organization_id
        }
      });

    } catch (evolutionError) {
      console.error('Error refreshing QR code:', evolutionError);
      
      // Update instance status to error
      await supabase
        .from('whatsapp_instances')
        .update({ 
          status: 'error',
          error_message: `QR refresh failed: ${evolutionError instanceof Error ? evolutionError.message : 'Unknown error'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'QR_REFRESH_FAILED', 
          message: 'Failed to refresh QR code',
          details: evolutionError instanceof Error ? evolutionError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/whatsapp/instances/[id]/qrcode:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
