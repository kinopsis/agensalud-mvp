/**
 * Unified WhatsApp Instance QR Code API
 * 
 * Unified endpoint for retrieving and refreshing QR codes for WhatsApp instance connection
 * using the new multi-channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChannelManager } from '@/lib/channels/ChannelManager';
import { registerWhatsAppChannel } from '@/lib/channels/whatsapp';

// =====================================================
// GET /api/channels/whatsapp/instances/[id]/qrcode
// =====================================================

/**
 * Get QR code for WhatsApp instance using unified architecture
 * 
 * @description Retrieves current QR code for WhatsApp instance connection
 * using the unified channel service and Evolution API integration.
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

    // Check if instance is in a state that supports QR code
    if (instance.status === 'connected') {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'ALREADY_CONNECTED', 
          message: 'Instance is already connected. QR code not needed.' 
        }
      }, { status: 400 });
    }

    // Get QR code using unified service
    const qrResult = await whatsappService.getQRCode(instanceId);

    if (!qrResult.qrCode) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'QR_NOT_AVAILABLE', 
          message: 'QR code not available. Try restarting the instance.' 
        }
      }, { status: 404 });
    }

    // Log QR code request
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: instanceId,
      p_action: 'qr_code_requested',
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_details: {
        instanceName: instance.instance_name,
        requestedBy: user.email,
        requestedAt: new Date().toISOString(),
        qrStatus: qrResult.status
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        instance_id: instanceId,
        instance_name: instance.instance_name,
        qr_code: qrResult.qrCode,
        status: qrResult.status,
        expires_in: 45, // QR codes typically expire in 45 seconds
        instructions: 'Open WhatsApp on your phone, go to Settings > Linked Devices > Link a Device, and scan this QR code.'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/channels/whatsapp/instances/[id]/qrcode:', error);
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
// POST /api/channels/whatsapp/instances/[id]/qrcode
// =====================================================

/**
 * Refresh QR code for WhatsApp instance using unified architecture
 * 
 * @description Generates a new QR code by restarting the instance
 * using the unified channel service.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response with new QR code or error
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

    // Check if instance is already connected
    if (instance.status === 'connected') {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'ALREADY_CONNECTED', 
          message: 'Instance is already connected. Disconnect first to generate new QR code.' 
        }
      }, { status: 400 });
    }

    // Restart instance to generate new QR code
    await whatsappService.restartInstance(instanceId);

    // Wait a moment for the instance to restart
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get new QR code
    const qrResult = await whatsappService.getQRCode(instanceId);

    if (!qrResult.qrCode) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'QR_GENERATION_FAILED', 
          message: 'Failed to generate new QR code. Please try again in a few moments.' 
        }
      }, { status: 500 });
    }

    // Log QR code refresh
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: instanceId,
      p_action: 'qr_code_refreshed',
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_details: {
        instanceName: instance.instance_name,
        refreshedBy: user.email,
        refreshedAt: new Date().toISOString(),
        previousStatus: instance.status,
        newStatus: 'connecting'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        instance_id: instanceId,
        instance_name: instance.instance_name,
        qr_code: qrResult.qrCode,
        status: qrResult.status,
        expires_in: 45,
        message: 'New QR code generated successfully',
        instructions: 'Open WhatsApp on your phone, go to Settings > Linked Devices > Link a Device, and scan this QR code.'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/channels/whatsapp/instances/[id]/qrcode:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
