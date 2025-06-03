/**
 * Unified WhatsApp Webhook Handler API
 * 
 * Unified webhook endpoint for receiving WhatsApp events from Evolution API
 * using the new multi-channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { IncomingMessage } from '@/types/channels';
import { getChannelManager } from '@/lib/channels/ChannelManager';
import { registerWhatsAppChannel } from '@/lib/channels/whatsapp';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const webhookEventSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.object({
    key: z.object({
      id: z.string(),
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
      participant: z.string().optional()
    }).optional(),
    message: z.any().optional(),
    messageType: z.string().optional(),
    messageTimestamp: z.number().optional(),
    pushName: z.string().optional(),
    status: z.string().optional(),
    qrcode: z.object({
      base64: z.string(),
      pairingCode: z.string().optional()
    }).optional()
  })
});

// =====================================================
// POST /api/channels/whatsapp/webhook
// =====================================================

/**
 * Handle WhatsApp webhook events using unified architecture
 * 
 * @description Processes incoming webhook events from Evolution API
 * using the unified channel message processor and appointment service.
 * 
 * @param request - Next.js request object with webhook payload
 * @returns JSON response confirming event processing
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    console.log('📥 Received WhatsApp webhook event:', JSON.stringify(body, null, 2));

    // Validate webhook payload
    const validationResult = webhookEventSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ Invalid webhook payload:', validationResult.error.errors);
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid webhook payload',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const webhookData = validationResult.data;
    const { event, instance: instanceName, data } = webhookData;

    // Find instance by Evolution API instance name
    const { data: channelInstance } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('channel_type', 'whatsapp')
      .like('config->whatsapp->evolution_api->instance_name', instanceName)
      .single();

    if (!channelInstance) {
      console.warn(`⚠️ Instance not found for Evolution API instance: ${instanceName}`);
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSTANCE_NOT_FOUND', message: 'Instance not found' }
      }, { status: 404 });
    }

    // Initialize channel manager
    const manager = registerWhatsAppChannel(supabase, channelInstance.organization_id);

    // Process different event types
    switch (event) {
      case 'messages.upsert':
        await handleMessageEvent(manager, channelInstance, data, supabase);
        break;

      case 'connection.update':
        await handleConnectionEvent(manager, channelInstance, data, supabase);
        break;

      case 'qrcode.updated':
        await handleQRCodeEvent(manager, channelInstance, data, supabase);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
        break;
    }

    // Log webhook event
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: channelInstance.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: channelInstance.id,
      p_action: 'webhook_received',
      p_actor_type: 'system',
      p_details: {
        event,
        instanceName,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        event,
        instanceId: channelInstance.id
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in WhatsApp webhook:', error);
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
// EVENT HANDLERS
// =====================================================

/**
 * Handle incoming message events
 */
async function handleMessageEvent(
  manager: any,
  channelInstance: any,
  data: any,
  supabase: any
) {
  try {
    // Skip messages sent by us
    if (data.key?.fromMe) {
      console.log('⏭️ Skipping outgoing message');
      return;
    }

    // Create message processor
    const messageProcessor = manager.createMessageProcessor('whatsapp', channelInstance);

    // Parse incoming message to unified format
    const incomingMessage: IncomingMessage = messageProcessor.parseIncomingMessage(data);

    // Validate message
    const validation = messageProcessor.validateMessage(incomingMessage);
    if (!validation.valid) {
      console.error('❌ Invalid message:', validation.errors);
      return;
    }

    // Process message using unified processor
    const result = await messageProcessor.processMessage(incomingMessage);

    console.log('✅ Message processed:', {
      messageId: incomingMessage.id,
      intent: result.intent,
      confidence: result.confidence,
      success: result.success
    });

    // Send response if AI generated one
    if (result.success && result.response) {
      const responseMessage = messageProcessor.formatResponse(result.response, {
        conversationId: incomingMessage.conversation_id,
        intent: result.intent,
        entities: result.entities
      });

      await messageProcessor.sendMessage(responseMessage);
    }

  } catch (error) {
    console.error('❌ Error handling message event:', error);
  }
}

/**
 * Handle connection status updates
 */
async function handleConnectionEvent(
  manager: any,
  channelInstance: any,
  data: any,
  supabase: any
) {
  try {
    const connectionStatus = data.status;
    let unifiedStatus = 'disconnected';

    // Map Evolution API status to unified status
    switch (connectionStatus) {
      case 'open':
        unifiedStatus = 'connected';
        break;
      case 'connecting':
        unifiedStatus = 'connecting';
        break;
      case 'close':
        unifiedStatus = 'disconnected';
        break;
      default:
        unifiedStatus = 'error';
        break;
    }

    // Update instance status in database
    await supabase
      .from('channel_instances')
      .update({
        status: unifiedStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', channelInstance.id);

    console.log(`🔄 Instance ${channelInstance.instance_name} status updated: ${unifiedStatus}`);

  } catch (error) {
    console.error('❌ Error handling connection event:', error);
  }
}

/**
 * Handle QR code updates
 */
async function handleQRCodeEvent(
  manager: any,
  channelInstance: any,
  data: any,
  supabase: any
) {
  try {
    const qrData = data.qrcode;
    
    if (qrData?.base64) {
      // Store QR code temporarily (could be cached or stored in database)
      console.log(`📱 QR code updated for instance ${channelInstance.instance_name}`);
      
      // Update instance status to connecting if not already
      if (channelInstance.status !== 'connecting') {
        await supabase
          .from('channel_instances')
          .update({
            status: 'connecting',
            updated_at: new Date().toISOString()
          })
          .eq('id', channelInstance.id);
      }
    }

  } catch (error) {
    console.error('❌ Error handling QR code event:', error);
  }
}

// =====================================================
// GET /api/channels/whatsapp/webhook (Health Check)
// =====================================================

/**
 * Webhook health check endpoint
 * 
 * @description Simple health check for the webhook endpoint
 * to verify it's accessible from Evolution API.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WhatsApp webhook endpoint is healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-unified'
  });
}
