/**
 * WhatsApp Webhook Handler
 * 
 * Main endpoint for receiving and processing Evolution API v2 webhook events.
 * Handles message processing, conversation management, and audit trail.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evolutionWebhookEventSchema } from '@/lib/validations/whatsapp';
import { WhatsAppWebhookProcessor } from '@/lib/services/WhatsAppWebhookProcessor';
import type { EvolutionWebhookEvent } from '@/types/whatsapp';

// =====================================================
// WEBHOOK AUTHENTICATION
// =====================================================

/**
 * Validate webhook authenticity
 * 
 * @description Validates that the webhook request comes from Evolution API
 * using signature verification or API key validation.
 * 
 * @param request - Incoming webhook request
 * @returns boolean indicating if webhook is authentic
 */
async function validateWebhookAuthenticity(request: NextRequest): Promise<boolean> {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('EVOLUTION_WEBHOOK_SECRET not configured - webhook validation disabled');
      return true; // Allow in development
    }

    // Check for API key in headers
    const apiKey = request.headers.get('apikey') || request.headers.get('x-api-key');
    if (apiKey === webhookSecret) {
      return true;
    }

    // Check for signature-based validation (if implemented by Evolution API)
    const signature = request.headers.get('x-evolution-signature');
    if (signature) {
      // Implement signature validation logic here if needed
      // For now, we'll rely on API key validation
      return false;
    }

    return false;
  } catch (error) {
    console.error('Error validating webhook authenticity:', error);
    return false;
  }
}

// =====================================================
// POST /api/whatsapp/webhook
// =====================================================

/**
 * Process Evolution API webhook events
 * 
 * @description Main webhook endpoint that receives and processes all Evolution API events.
 * Handles message events, connection updates, QR code updates, and instance events.
 * 
 * @param request - Next.js request object with webhook payload
 * @returns JSON response confirming event processing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventType = 'unknown';
  let instanceName = 'unknown';

  try {
    // Validate webhook authenticity
    const isAuthentic = await validateWebhookAuthenticity(request);
    if (!isAuthentic) {
      console.warn('🚨 Unauthorized webhook request received');
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid webhook authentication' }
      }, { status: 401 });
    }

    // Parse webhook payload
    const body = await request.json();
    console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

    // Validate webhook event structure
    const validationResult = evolutionWebhookEventSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ Invalid webhook payload:', validationResult.error.errors);
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INVALID_PAYLOAD', 
          message: 'Invalid webhook event structure',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const webhookEvent: EvolutionWebhookEvent = validationResult.data;
    eventType = webhookEvent.event;
    instanceName = webhookEvent.instance;

    console.log(`🔄 Processing webhook event: ${eventType} for instance: ${instanceName}`);

    // Initialize Supabase client
    const supabase = await createClient();

    // Get WhatsApp instance from database
    const { data: whatsappInstance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('instance_name', instanceName)
      .single();

    if (instanceError || !whatsappInstance) {
      console.error(`❌ WhatsApp instance not found: ${instanceName}`, instanceError);
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSTANCE_NOT_FOUND', 
          message: `WhatsApp instance '${instanceName}' not found in database`
        }
      }, { status: 404 });
    }

    // Initialize webhook processor
    const processor = new WhatsAppWebhookProcessor(supabase, whatsappInstance);

    // Process event based on type
    let processingResult;
    
    switch (eventType) {
      case 'messages.upsert':
        console.log('📩 Processing incoming message');
        processingResult = await processor.processMessageEvent(webhookEvent);
        break;

      case 'messages.update':
        console.log('📝 Processing message update');
        processingResult = await processor.processMessageUpdate(webhookEvent);
        break;

      case 'connection.update':
        console.log('🔗 Processing connection update');
        processingResult = await processor.processConnectionUpdate(webhookEvent);
        break;

      case 'qr.updated':
        console.log('📱 Processing QR code update');
        processingResult = await processor.processQRUpdate(webhookEvent);
        break;

      case 'instance.created':
        console.log('🆕 Processing instance creation');
        processingResult = await processor.processInstanceCreated(webhookEvent);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${eventType}`);
        processingResult = {
          success: true,
          message: `Event type '${eventType}' received but not processed`,
          eventType,
          instanceName
        };
    }

    // Create audit log entry
    await supabase.rpc('create_whatsapp_audit_log', {
      p_organization_id: whatsappInstance.organization_id,
      p_action: `webhook_${eventType.replace('.', '_')}`,
      p_actor_type: 'system',
      p_whatsapp_instance_id: whatsappInstance.id,
      p_details: {
        eventType,
        instanceName,
        processingTime: Date.now() - startTime,
        success: processingResult.success,
        webhookData: {
          messageType: webhookEvent.data.messageType,
          timestamp: webhookEvent.data.messageTimestamp
        }
      }
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processed successfully in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        eventType,
        instanceName,
        processingResult,
        processingTime
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: whatsappInstance.organization_id
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Webhook processing error (${processingTime}ms):`, error);

    // Try to log error to audit trail if we have instance info
    try {
      if (instanceName !== 'unknown') {
        const supabase = await createClient();
        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('id, organization_id')
          .eq('instance_name', instanceName)
          .single();

        if (instance) {
          await supabase.rpc('create_whatsapp_audit_log', {
            p_organization_id: instance.organization_id,
            p_action: 'webhook_error',
            p_actor_type: 'system',
            p_whatsapp_instance_id: instance.id,
            p_details: {
              eventType,
              instanceName,
              error: error instanceof Error ? error.message : 'Unknown error',
              processingTime
            }
          });
        }
      }
    } catch (auditError) {
      console.error('Failed to log webhook error to audit trail:', auditError);
    }

    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'WEBHOOK_PROCESSING_ERROR', 
        message: 'Failed to process webhook event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

// =====================================================
// GET /api/whatsapp/webhook
// =====================================================

/**
 * Webhook verification endpoint
 * 
 * @description Handles webhook verification requests from Evolution API.
 * Used during webhook setup to verify endpoint accessibility.
 * 
 * @param request - Next.js request object
 * @returns Verification response
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');
    const mode = searchParams.get('hub.mode');

    // Verify token if provided
    const expectedToken = process.env.EVOLUTION_WEBHOOK_VERIFY_TOKEN;
    if (expectedToken && verifyToken !== expectedToken) {
      console.warn('🚨 Invalid webhook verification token');
      return NextResponse.json({ 
        success: false,
        error: { code: 'INVALID_VERIFY_TOKEN', message: 'Invalid verification token' }
      }, { status: 403 });
    }

    // Handle subscription verification
    if (mode === 'subscribe' && challenge) {
      console.log('✅ Webhook verification successful');
      return new NextResponse(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Default verification response
    return NextResponse.json({
      success: true,
      message: 'WhatsApp webhook endpoint is active',
      timestamp: new Date().toISOString(),
      endpoint: '/api/whatsapp/webhook'
    });

  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'VERIFICATION_ERROR', message: 'Webhook verification failed' }
    }, { status: 500 });
  }
}
