/**
 * Evolution API Main Webhook Handler
 * 
 * Handles all Evolution API webhook events including messages, status updates,
 * connection changes, and appointment-related events. Routes events to appropriate
 * processors with security validation and rate limiting.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { z } from 'zod';
import { WhatsAppAIBotService } from '@/lib/services/WhatsAppAIBotService';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface EvolutionWebhookEvent {
  event: string;
  instance: string;
  data: any;
  date_time: string;
  sender: string;
  server_url: string;
  apikey?: string;
}

interface WebhookProcessingResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const webhookEventSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.any(),
  date_time: z.string(),
  sender: z.string(),
  server_url: z.string(),
  apikey: z.string().optional()
});

// =====================================================
// RATE LIMITING
// =====================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const current = rateLimitMap.get(identifier);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  current.count++;
  return true;
}

// =====================================================
// WEBHOOK SIGNATURE VERIFICATION
// =====================================================

function verifyWebhookSignature(
  payload: string, 
  signature: string | null, 
  secret: string
): boolean {
  if (!signature || !secret) {
    // In development, allow webhooks without signature
    return process.env.NODE_ENV === 'development';
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const providedSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return false;
  }
}

// =====================================================
// EVENT PROCESSORS
// =====================================================

/**
 * Process message received events
 */
async function processMessageEvent(
  event: EvolutionWebhookEvent,
  supabase: any
): Promise<WebhookProcessingResult> {
  try {
    console.log('📨 Processing message event:', {
      instance: event.instance,
      messageType: event.data?.messageType || 'unknown',
      from: event.data?.key?.remoteJid || 'unknown'
    });

    // Find WhatsApp instance
    const { data: instance } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('channel_type', 'whatsapp')
      .like('config->whatsapp->evolution_api->instance_name', event.instance)
      .single();

    if (!instance) {
      return {
        success: false,
        error: 'WhatsApp instance not found'
      };
    }

    // Extract message data
    const messageData = event.data?.message || event.data;
    const messageText = messageData?.conversation ||
                       messageData?.extendedTextMessage?.text ||
                       messageData?.text || '';

    const senderJid = event.data?.key?.remoteJid || event.data?.remoteJid;
    const isFromMe = event.data?.key?.fromMe || false;

    // Skip messages from the bot itself
    if (isFromMe) {
      return {
        success: true,
        message: 'Message from bot - skipped'
      };
    }

    // Skip if no text content
    if (!messageText || messageText.trim() === '') {
      return {
        success: true,
        message: 'No text content - skipped'
      };
    }

    // Extract phone number from JID
    const phoneNumber = senderJid?.split('@')[0] || '';
    if (!phoneNumber) {
      return {
        success: false,
        error: 'Could not extract phone number from sender'
      };
    }

    console.log('📱 Processing message through AI bot:', {
      instance: event.instance,
      phone: phoneNumber,
      message: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '')
    });

    // Process message through AI bot service
    const aiBotService = new WhatsAppAIBotService();
    const botResult = await aiBotService.processMessage(
      event.instance,
      phoneNumber,
      messageText,
      messageData
    );

    if (botResult.success) {
      console.log('✅ AI bot processed message successfully');

      if (botResult.appointmentCreated) {
        console.log(`🎉 Appointment created: ${botResult.appointmentId}`);
      }

      if (botResult.requiresHumanHandoff) {
        console.log('🚨 Human handoff required');
      }
    } else {
      console.error('❌ AI bot processing failed:', botResult.error);
    }

    return {
      success: true,
      message: 'Message event processed through AI bot',
      data: {
        botProcessed: botResult.success,
        appointmentCreated: botResult.appointmentCreated,
        appointmentId: botResult.appointmentId,
        humanHandoff: botResult.requiresHumanHandoff
      }
    };

  } catch (error) {
    console.error('❌ Error processing message event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process connection status events
 */
async function processConnectionEvent(
  event: EvolutionWebhookEvent,
  supabase: any
): Promise<WebhookProcessingResult> {
  try {
    console.log('🔗 Processing connection event:', {
      instance: event.instance,
      status: event.data?.state || event.data?.status
    });

    // Find WhatsApp instance with better matching
    const { data: instance } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('channel_type', 'whatsapp')
      .or(`config->whatsapp->evolution_api->instance_name.eq.${event.instance},instance_name.eq.${event.instance}`)
      .single();

    if (!instance) {
      console.warn(`⚠️ WhatsApp instance not found for Evolution API instance: ${event.instance}`);
      return {
        success: false,
        error: `WhatsApp instance not found for: ${event.instance}`
      };
    }

    // Update instance status based on connection state
    const connectionState = event.data?.state || event.data?.status;
    let newStatus = instance.status;

    console.log(`🔄 Processing connection state: ${connectionState} for instance: ${instance.instance_name}`);

    switch (connectionState) {
      case 'open':
      case 'connected':
        newStatus = 'connected';
        break;
      case 'close':
      case 'disconnected':
      case 'logout':
        newStatus = 'disconnected';
        break;
      case 'connecting':
      case 'qr':
        newStatus = 'connecting';
        break;
      default:
        console.warn(`⚠️ Unknown connection state: ${connectionState}`);
        break;
    }

    if (newStatus !== instance.status) {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add connection timestamp for connected status
      if (newStatus === 'connected') {
        updateData.last_connected_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('channel_instances')
        .update(updateData)
        .eq('id', instance.id);

      if (updateError) {
        console.error(`❌ Failed to update instance status:`, updateError);
        return {
          success: false,
          error: `Failed to update instance status: ${updateError.message}`
        };
      }

      console.log(`📱 Instance ${instance.instance_name} status updated: ${instance.status} → ${newStatus}`);

      return {
        success: true,
        message: 'Connection event processed successfully',
        data: { instanceId: instance.id, oldStatus: instance.status, newStatus }
      };
    } else {
      console.log(`📱 Instance ${instance.instance_name} status unchanged: ${instance.status}`);
      return {
        success: true,
        message: 'Connection event processed (no status change)',
        data: { instanceId: instance.id, status: instance.status }
      };
    }

    return {
      success: true,
      message: 'Connection event processed successfully',
      data: { previousStatus: instance.status, newStatus }
    };

  } catch (error) {
    console.error('❌ Error processing connection event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process QR code events (delegate to existing handler)
 */
async function processQRCodeEvent(
  event: EvolutionWebhookEvent,
  supabase: any
): Promise<WebhookProcessingResult> {
  // This delegates to the existing QR code webhook handler
  console.log('📱 QR code event - delegating to existing handler');
  return {
    success: true,
    message: 'QR code event delegated to existing handler'
  };
}

// =====================================================
// MAIN WEBHOOK HANDLER
// =====================================================

/**
 * POST /api/webhooks/evolution
 * 
 * @description Main webhook endpoint for Evolution API events.
 * Handles routing, security, rate limiting, and event processing.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // =====================================================
    // RATE LIMITING
    // =====================================================
    
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIP)) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded'
      }, { status: 429 });
    }

    // =====================================================
    // PAYLOAD VALIDATION
    // =====================================================

    let rawPayload: string;
    let webhookData: EvolutionWebhookEvent;

    try {
      rawPayload = await request.text();
      webhookData = JSON.parse(rawPayload);
    } catch (jsonError) {
      console.error('❌ Invalid JSON in Evolution webhook:', jsonError);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON payload'
      }, { status: 400 });
    }

    // Validate webhook structure
    const validation = webhookEventSchema.safeParse(webhookData);
    if (!validation.success) {
      console.error('❌ Invalid webhook structure:', validation.error);
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook structure',
        details: validation.error.errors
      }, { status: 400 });
    }

    // =====================================================
    // SIGNATURE VERIFICATION
    // =====================================================

    const signature = request.headers.get('x-evolution-signature') || 
                     request.headers.get('x-hub-signature-256');
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET || '';

    if (!verifyWebhookSignature(rawPayload, signature, webhookSecret)) {
      console.error('❌ Webhook signature verification failed');
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook signature'
      }, { status: 401 });
    }

    // =====================================================
    // EVENT ROUTING
    // =====================================================

    console.log('📨 Evolution webhook received:', {
      event: webhookData.event,
      instance: webhookData.instance,
      timestamp: webhookData.date_time,
      sender: webhookData.sender
    });

    let result: WebhookProcessingResult;

    switch (webhookData.event) {
      case 'MESSAGES_UPSERT':
      case 'MESSAGE_RECEIVED':
        result = await processMessageEvent(webhookData, supabase);
        break;

      case 'CONNECTION_UPDATE':
      case 'STATUS_INSTANCE':
        result = await processConnectionEvent(webhookData, supabase);
        break;

      case 'QRCODE_UPDATED':
        result = await processQRCodeEvent(webhookData, supabase);
        break;

      default:
        console.log(`⚠️ Unhandled webhook event: ${webhookData.event}`);
        result = {
          success: true,
          message: `Event ${webhookData.event} acknowledged but not processed`
        };
    }

    // =====================================================
    // AUDIT LOGGING
    // =====================================================

    try {
      // Log webhook event for audit trail
      await supabase.rpc('create_channel_audit_log', {
        p_organization_id: null, // Will be determined by instance lookup
        p_channel_type: 'whatsapp',
        p_instance_id: null, // Will be determined by instance lookup
        p_action: 'webhook_received',
        p_actor_id: null,
        p_actor_type: 'system',
        p_details: {
          event: webhookData.event,
          instance: webhookData.instance,
          success: result.success,
          timestamp: webhookData.date_time,
          processedAt: new Date().toISOString(),
          clientIP,
          userAgent: request.headers.get('user-agent')
        }
      });
    } catch (auditError) {
      console.error('⚠️ Failed to create webhook audit log:', auditError);
      // Don't fail the webhook for audit log errors
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    }, { 
      status: result.success ? 200 : 400 
    });

  } catch (error) {
    console.error('❌ Unexpected error in Evolution webhook handler:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
