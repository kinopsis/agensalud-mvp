/**
 * Evolution API QR Code Webhook Handler
 * 
 * Handles QRCODE_UPDATED events from Evolution API v2 and broadcasts
 * QR codes to connected clients in real-time.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface EvolutionQRCodeWebhookEvent {
  event: string;
  instance: string;
  data: {
    qrcode?: {
      code: string;
      base64: string;
    };
    qr?: string;
    base64?: string;
    pairingCode?: string;
  };
  date_time: string;
  sender: string;
  server_url: string;
}

interface QRCodeBroadcastData {
  instanceId: string;
  instanceName: string;
  qrCode: string;
  expiresAt: string;
  timestamp: string;
}

// =====================================================
// WEBHOOK HANDLER
// =====================================================

/**
 * Handle Evolution API QR Code webhook events
 * 
 * @description Processes QRCODE_UPDATED events from Evolution API,
 * stores QR codes in database, and broadcasts to connected clients.
 * 
 * @param request - Next.js request object with webhook payload
 * @returns JSON response confirming webhook processing
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Parse webhook payload
    let webhookData: EvolutionQRCodeWebhookEvent;
    try {
      webhookData = await request.json();
    } catch (jsonError) {
      console.error('❌ Invalid JSON in Evolution webhook:', jsonError);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON payload'
      }, { status: 400 });
    }

    console.log('📨 Evolution QR Code webhook received:', {
      event: webhookData.event,
      instance: webhookData.instance,
      timestamp: webhookData.date_time
    });

    // Validate webhook event type
    if (webhookData.event !== 'QRCODE_UPDATED') {
      console.log('⚠️ Ignoring non-QR code webhook event:', webhookData.event);
      return NextResponse.json({
        success: true,
        message: 'Event ignored - not a QR code update'
      });
    }

    // Validate required fields
    if (!webhookData.instance || !webhookData.data) {
      console.error('❌ Missing required webhook fields:', webhookData);
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: instance or data'
      }, { status: 400 });
    }

    // Extract QR code data from different possible formats
    let qrCodeData: string | undefined;
    let qrCodeText: string | undefined;

    if (webhookData.data.qrcode) {
      // Format 1: { qrcode: { code, base64 } }
      qrCodeData = webhookData.data.qrcode.base64;
      qrCodeText = webhookData.data.qrcode.code;
    } else if (webhookData.data.base64) {
      // Format 2: { base64, qr }
      qrCodeData = webhookData.data.base64;
      qrCodeText = webhookData.data.qr;
    } else if (webhookData.data.qr) {
      // Format 3: { qr }
      qrCodeData = webhookData.data.qr;
      qrCodeText = webhookData.data.qr;
    }

    if (!qrCodeData) {
      console.error('❌ No QR code data found in webhook:', webhookData.data);
      return NextResponse.json({
        success: false,
        error: 'No QR code data found in webhook payload'
      }, { status: 400 });
    }

    // Find the WhatsApp instance by Evolution instance name
    const { data: instance, error: instanceError } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('channel_type', 'whatsapp')
      .like('config->whatsapp->evolution_api->instance_name', webhookData.instance)
      .single();

    if (instanceError || !instance) {
      console.error('❌ WhatsApp instance not found for Evolution instance:', webhookData.instance);

      // In development mode, provide more helpful error information
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: false,
          error: 'WhatsApp instance not found',
          details: {
            evolutionInstance: webhookData.instance,
            message: 'No WhatsApp instance found with this Evolution instance name. Create an instance first through the admin interface.',
            suggestion: 'Go to /admin/channels and create a WhatsApp instance'
          }
        }, { status: 404 });
      }

      return NextResponse.json({
        success: false,
        error: 'WhatsApp instance not found'
      }, { status: 404 });
    }

    // Update instance with QR code data
    const updatedConfig = {
      ...instance.config,
      whatsapp: {
        ...instance.config.whatsapp,
        qr_code: {
          ...instance.config.whatsapp.qr_code,
          current_qr: qrCodeData,
          current_qr_text: qrCodeText,
          last_updated: new Date().toISOString(),
          expires_at: new Date(Date.now() + 45000).toISOString() // 45 seconds
        }
      }
    };

    const { error: updateError } = await supabase
      .from('channel_instances')
      .update({
        config: updatedConfig,
        status: 'connecting',
        updated_at: new Date().toISOString()
      })
      .eq('id', instance.id);

    if (updateError) {
      console.error('❌ Failed to update instance with QR code:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update instance'
      }, { status: 500 });
    }

    // Prepare broadcast data
    const broadcastData: QRCodeBroadcastData = {
      instanceId: instance.id,
      instanceName: instance.instance_name,
      qrCode: qrCodeData,
      expiresAt: new Date(Date.now() + 45000).toISOString(),
      timestamp: new Date().toISOString()
    };

    // TODO: Broadcast to connected clients via WebSocket/SSE
    // For now, we'll store in database and clients can poll
    console.log('📡 QR code ready for broadcast:', {
      instanceId: instance.id,
      instanceName: instance.instance_name,
      qrCodeLength: qrCodeData.length
    });

    // Create audit log
    try {
      await supabase.rpc('create_channel_audit_log', {
        p_organization_id: instance.organization_id,
        p_channel_type: 'whatsapp',
        p_instance_id: instance.id,
        p_action: 'qr_code_received',
        p_actor_id: null, // System action
        p_actor_type: 'system',
        p_details: {
          evolutionInstance: webhookData.instance,
          qrCodeReceived: true,
          qrCodeLength: qrCodeData.length,
          receivedAt: webhookData.date_time,
          processedAt: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.error('⚠️ Failed to create audit log:', auditError);
      // Don't fail the webhook for audit log errors
    }

    return NextResponse.json({
      success: true,
      message: 'QR code webhook processed successfully',
      data: {
        instanceId: instance.id,
        instanceName: instance.instance_name,
        qrCodeReceived: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in Evolution QR code webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// =====================================================
// WEBHOOK VERIFICATION (Optional)
// =====================================================

/**
 * Verify webhook signature (if Evolution API supports it)
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return false;
  }
}
