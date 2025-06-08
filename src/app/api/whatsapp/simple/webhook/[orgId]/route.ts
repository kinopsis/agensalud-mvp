/**
 * Simple WhatsApp Webhook Handler
 * 
 * Handles Evolution API webhook events for simple WhatsApp instances.
 * Processes connection updates, QR code updates, and status changes.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSimpleWhatsAppService } from '@/lib/services/SimpleWhatsAppService';
import { z } from 'zod';

// =====================================================
// TYPES AND VALIDATION
// =====================================================

const EvolutionWebhookEventSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.any(),
  date_time: z.string().optional(),
  sender: z.string().optional(),
  server_url: z.string().optional(),
  apikey: z.string().optional()
});

type EvolutionWebhookEvent = z.infer<typeof EvolutionWebhookEventSchema>;

// =====================================================
// WEBHOOK HANDLER
// =====================================================

/**
 * Handle Evolution API webhook events for simple WhatsApp instances
 * 
 * @param request - Next.js request object with webhook payload
 * @param params - Route parameters including organization ID
 * @returns JSON response confirming event processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const startTime = Date.now();
  let eventType = 'unknown';
  let instanceName = 'unknown';

  try {
    console.log('📥 Simple WhatsApp webhook received for org:', params.orgId);

    // Parse webhook payload
    let webhookData: EvolutionWebhookEvent;
    try {
      const body = await request.json();
      webhookData = EvolutionWebhookEventSchema.parse(body);
      eventType = webhookData.event;
      instanceName = webhookData.instance;
      
      console.log('📋 Webhook event details:', {
        event: eventType,
        instance: instanceName,
        orgId: params.orgId,
        timestamp: webhookData.date_time
      });
    } catch (parseError) {
      console.error('❌ Invalid webhook payload:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook payload'
      }, { status: 400 });
    }

    // Initialize service
    const whatsappService = await createSimpleWhatsAppService();

    // Process different event types
    switch (eventType) {
      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(whatsappService, webhookData);
        break;

      case 'STATUS_INSTANCE':
        await handleStatusInstance(whatsappService, webhookData);
        break;

      case 'QRCODE_UPDATED':
        await handleQRCodeUpdate(whatsappService, webhookData);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook event: ${eventType}`);
        break;
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processed successfully in ${processingTime}ms:`, {
      event: eventType,
      instance: instanceName,
      orgId: params.orgId
    });

    return NextResponse.json({
      success: true,
      message: `Event ${eventType} processed successfully`,
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Webhook processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      event: eventType,
      instance: instanceName,
      orgId: params.orgId,
      processingTime
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// =====================================================
// EVENT HANDLERS
// =====================================================

/**
 * Handle CONNECTION_UPDATE events
 */
async function handleConnectionUpdate(
  whatsappService: any,
  webhookData: EvolutionWebhookEvent
): Promise<void> {
  try {
    console.log('🔄 Processing CONNECTION_UPDATE:', webhookData.data);

    const connectionState = webhookData.data?.state || webhookData.data?.connection;
    
    if (!connectionState) {
      console.warn('⚠️ No connection state in webhook data');
      return;
    }

    // Extract WhatsApp profile data if available
    const whatsappData: any = {};
    if (webhookData.data?.instance?.profilePictureUrl) {
      whatsappData.profilePicUrl = webhookData.data.instance.profilePictureUrl;
    }
    if (webhookData.data?.instance?.profileName) {
      whatsappData.name = webhookData.data.instance.profileName;
    }
    if (webhookData.data?.instance?.wuid) {
      // Extract phone number from wuid (format: "5511999999999@s.whatsapp.net")
      const match = webhookData.data.instance.wuid.match(/^(\d+)@/);
      if (match) {
        whatsappData.number = match[1];
      }
    }

    await whatsappService.updateInstanceStatus(
      webhookData.instance,
      connectionState,
      whatsappData
    );

    console.log('✅ CONNECTION_UPDATE processed successfully');
  } catch (error) {
    console.error('❌ Error processing CONNECTION_UPDATE:', error);
    throw error;
  }
}

/**
 * Handle STATUS_INSTANCE events
 */
async function handleStatusInstance(
  whatsappService: any,
  webhookData: EvolutionWebhookEvent
): Promise<void> {
  try {
    console.log('📊 Processing STATUS_INSTANCE:', webhookData.data);

    const status = webhookData.data?.status;
    
    if (!status) {
      console.warn('⚠️ No status in webhook data');
      return;
    }

    // Map Evolution API status to our connection state
    let connectionState: string;
    switch (status) {
      case 'open':
        connectionState = 'open';
        break;
      case 'connecting':
        connectionState = 'connecting';
        break;
      case 'close':
        connectionState = 'close';
        break;
      default:
        connectionState = status;
    }

    await whatsappService.updateInstanceStatus(
      webhookData.instance,
      connectionState
    );

    console.log('✅ STATUS_INSTANCE processed successfully');
  } catch (error) {
    console.error('❌ Error processing STATUS_INSTANCE:', error);
    throw error;
  }
}

/**
 * Handle QRCODE_UPDATED events
 */
async function handleQRCodeUpdate(
  whatsappService: any,
  webhookData: EvolutionWebhookEvent
): Promise<void> {
  try {
    console.log('📱 Processing QRCODE_UPDATED');

    // QR code updates are handled by the QR endpoint polling
    // This is just for logging purposes
    console.log('ℹ️ QR code updated for instance:', webhookData.instance);
  } catch (error) {
    console.error('❌ Error processing QRCODE_UPDATED:', error);
    throw error;
  }
}

// =====================================================
// GET HANDLER (for webhook verification)
// =====================================================

/**
 * Handle GET requests for webhook verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');

  console.log('🔍 Webhook verification request:', { mode, challenge, verifyToken, orgId: params.orgId });

  // Verify token if provided
  const expectedToken = process.env.EVOLUTION_WEBHOOK_VERIFY_TOKEN;
  if (expectedToken && verifyToken !== expectedToken) {
    console.warn('🚨 Invalid webhook verification token');
    return NextResponse.json({ 
      success: false,
      error: 'Invalid verification token'
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

  return NextResponse.json({
    success: true,
    message: 'Simple WhatsApp webhook endpoint active',
    orgId: params.orgId
  });
}
