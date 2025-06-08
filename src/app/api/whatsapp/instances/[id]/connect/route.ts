/**
 * WhatsApp Instance Connection Endpoint
 * 
 * Implements Step 2 of the two-step workflow:
 * - Connects a disconnected WhatsApp instance
 * - Initiates QR code generation via Evolution API
 * - Configures webhooks for real-time updates
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import { fastAuth } from '@/lib/utils/fastAuth';

/**
 * POST /api/whatsapp/instances/[id]/connect
 * 
 * Connects a WhatsApp instance and starts QR code generation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;

    // Fast authentication
    const authResult = await fastAuth(2000); // 2 second timeout
    if (!authResult.user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', authResult.user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    // Get instance from unified channel_instances table
    const { data: channelInstance, error: instanceError } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('organization_id', profile.organization_id)
      .eq('channel_type', 'whatsapp')
      .single();

    if (instanceError || !channelInstance) {
      console.error('❌ Instance not found in channel_instances:', { instanceId, error: instanceError });
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'WhatsApp instance not found' }
      }, { status: 404 });
    }

    // Convert channel instance to legacy format for compatibility
    const instance = {
      id: channelInstance.id,
      instance_name: channelInstance.instance_name,
      status: channelInstance.status,
      qr_code: channelInstance.config.whatsapp?.qr_code_data || null,
      session_data: channelInstance.config.metadata || {},
      organization_id: channelInstance.organization_id
    };

    // Check if instance is already connected
    if (instance.status === 'active' || instance.status === 'connected') {
      return NextResponse.json({
        success: true,
        data: {
          instanceId: instance.id,
          instanceName: instance.instance_name,
          status: instance.status,
          message: 'Instance is already connected',
          qrCode: instance.qr_code
        }
      });
    }

    // Check if instance is already connecting
    if (instance.status === 'connecting') {
      return NextResponse.json({
        success: true,
        data: {
          instanceId: instance.id,
          instanceName: instance.instance_name,
          status: 'connecting',
          message: 'Instance is already connecting - check QR code stream',
          streamUrl: `/api/channels/whatsapp/instances/${instanceId}/qrcode/stream`
        }
      });
    }

    // HYBRID WORKFLOW: Handle both disconnected instances and instances with immediate QR
    if (instance.status === 'connecting' && instance.qr_code) {
      // Instance already has QR code from immediate workflow - return existing QR
      return NextResponse.json({
        success: true,
        data: {
          instanceId: instance.id,
          instanceName: instance.instance_name,
          status: 'connecting',
          message: 'Instance already connecting with QR code available',
          qrCode: instance.qr_code,
          workflow: 'immediate_qr_existing'
        }
      });
    }

    // Only enforce disconnected state for true two-step workflow
    if (instance.status !== 'disconnected' && instance.status !== 'connecting') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STATE_FOR_CONNECTION',
          message: `Cannot connect instance in '${instance.status}' state. Instance must be disconnected or connecting.`,
          userFriendlyMessage: 'La instancia debe estar desconectada o conectando para iniciar la conexión',
          currentStatus: instance.status,
          allowedStatuses: ['disconnected', 'connecting']
        }
      }, { status: 400 });
    }

    try {
      // Step 1: Configure webhook before connecting
      const evolutionAPI = createEvolutionAPIService();
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/evolution/${profile.organization_id}`;
      
      console.log(`🔗 Configuring webhook for instance: ${instance.instance_name}`);
      await evolutionAPI.configureWebhook(instance.instance_name, {
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: true,
        events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'STATUS_INSTANCE']
      });

      // Step 2: Connect the instance to start QR generation
      console.log(`🚀 Connecting instance: ${instance.instance_name}`);
      const connectResult = await evolutionAPI.connectInstance(instance.instance_name);

      // Step 3: Update channel instance status to connecting
      const { error: updateError } = await supabase
        .from('channel_instances')
        .update({
          status: 'connecting',
          updated_at: new Date().toISOString(),
          config: {
            ...channelInstance.config,
            metadata: {
              ...channelInstance.config.metadata,
              connectionStarted: new Date().toISOString(),
              webhookConfigured: true
            }
          }
        })
        .eq('id', instanceId);

      if (updateError) {
        console.error('Error updating instance status:', updateError);
      }

      // Step 4: Create audit log
      await supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: profile.organization_id,
        p_action: 'instance_connection_started',
        p_actor_id: authResult.user.id,
        p_actor_type: 'admin',
        p_whatsapp_instance_id: instanceId,
        p_details: {
          instanceName: instance.instance_name,
          webhookUrl,
          connectResult: {
            status: connectResult.instance?.status || 'unknown'
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          instanceId: instance.id,
          instanceName: instance.instance_name,
          status: 'connecting',
          message: 'Connection initiated - QR code will be available via stream',
          webhookConfigured: true,
          streamUrl: `/api/channels/whatsapp/instances/${instanceId}/qrcode/stream`
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      });

    } catch (evolutionError) {
      console.error('Error connecting instance:', evolutionError);
      
      // Update channel instance with error status
      await supabase
        .from('channel_instances')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
          config: {
            ...channelInstance.config,
            metadata: {
              ...channelInstance.config.metadata,
              error_message: evolutionError instanceof Error ? evolutionError.message : 'Connection failed',
              lastError: new Date().toISOString()
            }
          }
        })
        .eq('id', instanceId);

      return NextResponse.json({
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Failed to connect instance',
          details: evolutionError instanceof Error ? evolutionError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in connect endpoint:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
