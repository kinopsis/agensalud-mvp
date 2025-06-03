/**
 * Unified WhatsApp Instance Management API - Individual Operations
 * 
 * Unified endpoints for GET, PUT, and DELETE operations on specific WhatsApp instances
 * using the new multi-channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { ChannelInstanceConfig } from '@/types/channels';
import { getChannelManager } from '@/lib/channels/ChannelManager';
import { registerWhatsAppChannel } from '@/lib/channels/whatsapp';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const updateInstanceSchema = z.object({
  instance_name: z.string().min(3).max(50).optional(),
  auto_reply: z.boolean().optional(),
  business_hours: z.object({
    enabled: z.boolean(),
    timezone: z.string(),
    schedule: z.record(z.object({
      start: z.string(),
      end: z.string(),
      enabled: z.boolean()
    }))
  }).optional(),
  webhook: z.object({
    url: z.string().url(),
    secret: z.string().optional(),
    events: z.array(z.string())
  }).optional(),
  ai_config: z.object({
    enabled: z.boolean(),
    model: z.string(),
    temperature: z.number().min(0).max(2),
    max_tokens: z.number().min(1).max(4000),
    timeout_seconds: z.number().min(1).max(300)
  }).optional()
});

// =====================================================
// GET /api/channels/whatsapp/instances/[id]
// =====================================================

/**
 * Get specific WhatsApp instance by ID using unified architecture
 * 
 * @description Retrieves a specific WhatsApp instance with current status
 * using the unified channel service.
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

    // Get instance using unified service
    const instance = await whatsappService.getInstance(instanceId);

    if (!instance) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'NOT_FOUND', message: 'Instance not found' }
      }, { status: 404 });
    }

    // Verify organization access
    if (instance.organization_id !== profile.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      }, { status: 403 });
    }

    // Get real-time status from Evolution API
    let currentStatus = instance.status;
    let qrCode = null;

    try {
      const externalStatus = await whatsappService.getExternalStatus(instanceId);
      currentStatus = externalStatus;

      // Get QR code if instance is connecting
      if (externalStatus === 'connecting') {
        const qrResult = await whatsappService.getQRCode(instanceId);
        qrCode = qrResult.qrCode;
      }
    } catch (error) {
      console.warn('Could not get external status:', error);
    }

    // Get recent metrics
    const metrics = await whatsappService.getMetrics(instanceId, {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    });

    // Prepare response with unified format
    const response = {
      ...instance,
      current_status: currentStatus,
      qr_code: qrCode,
      metrics: {
        conversations_24h: metrics.conversations.total,
        messages_24h: metrics.messages.total,
        appointments_24h: metrics.appointments.created,
        success_rate: metrics.ai_performance.intent_accuracy
      }
    };

    return NextResponse.json({
      success: true,
      data: { instance: response },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/channels/whatsapp/instances/[id]:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// PUT /api/channels/whatsapp/instances/[id]
// =====================================================

/**
 * Update WhatsApp instance using unified architecture
 * 
 * @description Updates a WhatsApp instance configuration using the unified channel service.
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
    const validationResult = updateInstanceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid update data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const updateData = validationResult.data;

    // Initialize channel manager and get WhatsApp service
    const manager = registerWhatsAppChannel(supabase, profile.organization_id);
    const whatsappService = manager.getChannelService('whatsapp');

    // Get current instance
    const currentInstance = await whatsappService.getInstance(instanceId);
    if (!currentInstance || currentInstance.organization_id !== profile.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'NOT_FOUND', message: 'Instance not found' }
      }, { status: 404 });
    }

    // Prepare unified config updates
    const configUpdates: Partial<ChannelInstanceConfig> = {};

    if (updateData.auto_reply !== undefined) {
      configUpdates.auto_reply = updateData.auto_reply;
    }

    if (updateData.business_hours) {
      configUpdates.business_hours = updateData.business_hours;
    }

    if (updateData.webhook) {
      configUpdates.webhook = updateData.webhook;
    }

    if (updateData.ai_config) {
      configUpdates.ai_config = updateData.ai_config;
    }

    // Update instance using unified service
    const updatedInstance = await whatsappService.updateInstance(instanceId, configUpdates);

    // Log update
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: instanceId,
      p_action: 'instance_updated',
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_details: {
        updatedFields: Object.keys(updateData),
        updatedBy: user.email,
        updatedAt: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      data: { instance: updatedInstance },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/channels/whatsapp/instances/[id]:', error);
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
// DELETE /api/channels/whatsapp/instances/[id]
// =====================================================

/**
 * Delete WhatsApp instance using unified architecture
 * 
 * @description Deletes a WhatsApp instance using the unified channel service.
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing instance ID
 * @returns JSON response confirming deletion or error
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

    // Get instance to verify ownership
    const instance = await whatsappService.getInstance(instanceId);
    if (!instance || instance.organization_id !== profile.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'NOT_FOUND', message: 'Instance not found' }
      }, { status: 404 });
    }

    // Delete instance using unified service
    await whatsappService.deleteInstance(instanceId);

    // Log deletion
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: instanceId,
      p_action: 'instance_deleted',
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_details: {
        instanceName: instance.instance_name,
        deletedBy: user.email,
        deletedAt: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Instance deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/channels/whatsapp/instances/[id]:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
