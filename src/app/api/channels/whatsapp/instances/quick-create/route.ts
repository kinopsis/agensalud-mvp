/**
 * WhatsApp Quick Create API Endpoint
 * 
 * Single-click WhatsApp instance creation with auto-naming and immediate
 * response for the radical solution implementation.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChannelManager } from '@/lib/channels/ChannelManager';
import { registerWhatsAppChannel } from '@/lib/channels/whatsapp';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const quickCreateSchema = z.object({
  instanceName: z.string().min(3).max(50).optional(),
  organizationId: z.string().uuid().optional()
});

// =====================================================
// TYPES
// =====================================================

interface QuickCreateResponse {
  instanceId: string;
  instanceName: string;
  connectUrl: string;
  status: 'disconnected';
}

// =====================================================
// POST /api/channels/whatsapp/instances/quick-create
// =====================================================

/**
 * Quick create WhatsApp instance with auto-naming
 * 
 * @description Creates a WhatsApp instance with minimal user input,
 * auto-generated naming, and immediate response for navigation.
 * Part of the radical solution implementation.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // =====================================================
    // AUTHENTICATION
    // =====================================================
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // =====================================================
    // USER PROFILE AND ORGANIZATION
    // =====================================================

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, organization_id, organizations(id, name)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // =====================================================
    // RBAC VALIDATION
    // =====================================================

    const hasPermission = profile.role === 'admin' || profile.role === 'superadmin';
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Insufficient permissions to create instances' }
      }, { status: 403 });
    }

    // =====================================================
    // REQUEST VALIDATION
    // =====================================================

    const body = await request.json().catch(() => ({}));
    const validation = quickCreateSchema.safeParse(body);

    // Use organization from profile if not provided
    const organizationId = validation.data?.organizationId || profile.organization_id;
    
    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: { code: 'ORGANIZATION_REQUIRED', message: 'Organization ID is required' }
      }, { status: 400 });
    }

    // =====================================================
    // AUTO-NAMING GENERATION
    // =====================================================

    const timestamp = Date.now();
    const orgName = (profile.organizations as any)?.name || 'org';
    
    // Clean organization name for instance naming
    const cleanOrgName = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    const autoInstanceName = validation.data?.instanceName || `${cleanOrgName}-whatsapp-${timestamp}`;

    console.log(`🚀 Quick creating WhatsApp instance: ${autoInstanceName} for org: ${organizationId}`);

    // =====================================================
    // INSTANCE CREATION
    // =====================================================

    // Register WhatsApp channel if not already registered
    registerWhatsAppChannel();
    
    // Get channel manager
    const channelManager = getChannelManager();
    const whatsappService = channelManager.getService('whatsapp');

    if (!whatsappService) {
      return NextResponse.json({
        success: false,
        error: { code: 'SERVICE_NOT_AVAILABLE', message: 'WhatsApp service not available' }
      }, { status: 503 });
    }

    // Create instance configuration with minimal defaults
    const instanceConfig = {
      instance_name: autoInstanceName,
      organization_id: organizationId,
      channel_type: 'whatsapp' as const,
      status: 'disconnected' as const,
      config: {
        whatsapp: {
          evolution_api: {
            instance_name: autoInstanceName,
            webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/evolution/${organizationId}`,
            webhook_by_events: true,
            webhook_base64: false,
            events: [
              'APPLICATION_STARTUP',
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'STATUS_INSTANCE',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'SEND_MESSAGE'
            ]
          },
          features: {
            read_receipts: true,
            typing_indicator: true,
            presence_update: true
          }
        }
      },
      created_by: user.id,
      updated_by: user.id
    };

    // Create the instance
    const instance = await whatsappService.createInstance(instanceConfig);

    console.log(`✅ Instance created successfully: ${instance.id}`);

    // =====================================================
    // AUDIT LOGGING
    // =====================================================

    try {
      await supabase.rpc('create_channel_audit_log', {
        p_organization_id: organizationId,
        p_action: 'instance_quick_created',
        p_actor_id: user.id,
        p_actor_type: profile.role,
        p_channel_instance_id: instance.id,
        p_details: {
          instanceName: autoInstanceName,
          autoGenerated: true,
          createdAt: new Date().toISOString(),
          method: 'quick_create'
        }
      });
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError);
      // Don't fail the request for audit logging issues
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    const connectUrl = `/admin/channels/whatsapp/${instance.id}/connect`;
    
    const response: QuickCreateResponse = {
      instanceId: instance.id,
      instanceName: autoInstanceName,
      connectUrl,
      status: 'disconnected'
    };

    console.log(`🔄 Quick create completed, connect URL: ${connectUrl}`);

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('❌ Quick create failed:', error);

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      }, { status: 400 });
    }

    // Handle duplicate instance names
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSTANCE_EXISTS',
          message: 'An instance with this name already exists'
        }
      }, { status: 409 });
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create WhatsApp instance',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}
