/**
 * WhatsApp QR Code API Endpoint
 * 
 * Provides QR code data for WhatsApp instance connection with auto-refresh support.
 * Integrates with Evolution API v2 and webhook-based QR code delivery.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WhatsAppChannelService } from '@/lib/channels/whatsapp/WhatsAppChannelService';
import { fastAuth } from '@/lib/utils/fastAuth';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const QRCodeRequestSchema = z.object({
  id: z.string().min(1, 'Instance ID is required')
    .refine(
      (val) => {
        // Accept either UUID format or instance name format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const instanceNameRegex = /^[a-zA-Z0-9_-]+$/;
        return uuidRegex.test(val) || instanceNameRegex.test(val);
      },
      {
        message: 'Invalid instance ID format. Must be a UUID or valid instance name'
      }
    )
});

// =====================================================
// API ROUTE HANDLERS
// =====================================================

/**
 * GET /api/channels/whatsapp/instances/[id]/qr
 * 
 * @description Retrieves QR code for WhatsApp instance connection.
 * Supports auto-refresh with webhook-based updates.
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
    // =====================================================
    // FAST AUTHENTICATION WITH PERFORMANCE MONITORING
    // =====================================================

    const authStartTime = Date.now();
    console.log(`⚡ Starting fast auth for QR request: ${params.id}`);

    const authResult = await fastAuth(1500); // 1.5 second timeout for QR requests
    const authTime = Date.now() - authStartTime;

    console.log(`⚡ Auth completed in ${authTime}ms - Method: ${authResult.method}, Fallback: ${authResult.isFallback}`);

    // Handle authentication failure with intelligent fallback
    if (!authResult.user) {
      console.warn(`❌ Authentication failed in ${authTime}ms:`, authResult.error?.message);

      // Fast fallback for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Providing instant mock QR code');

        const mockQRCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

        return NextResponse.json({
          success: true,
          status: 'available',
          message: `Development QR code (auth failed in ${authTime}ms)`,
          data: {
            instanceId: params.id,
            instanceName: 'dev-instance',
            status: 'available',
            qrCode: mockQRCode,
            expiresAt: new Date(Date.now() + 45000).toISOString(),
            lastUpdated: new Date().toISOString(),
            developmentNote: `Fast fallback - auth failed in ${authTime}ms`,
            performance: {
              authTime,
              method: authResult.method,
              isFallback: authResult.isFallback
            }
          }
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        details: authResult.error?.message || 'User not authenticated',
        performance: {
          authTime,
          method: authResult.method
        }
      }, { status: 401 });
    }

    const user = authResult.user;
    const supabase = await createClient();

    // Handle development users (from fastAuth fallback)
    let profile = null;
    if (authResult.isFallback && process.env.NODE_ENV === 'development') {
      // Create mock profile for development user
      profile = {
        id: user.id,
        role: 'admin',
        organization_id: 'dev-org-123',
        first_name: 'Dev',
        last_name: 'User',
        email: user.email || 'dev@agentsalud.com'
      };
      console.log('🔧 Using development profile for fallback user');
    } else {
      // Get user profile for RBAC (production)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        return NextResponse.json({
          success: false,
          error: 'User profile not found'
        }, { status: 403 });
      }
      profile = profileData;
    }

    // =====================================================
    // INPUT VALIDATION
    // =====================================================

    const validation = QRCodeRequestSchema.safeParse({ id: params.id });
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: validation.error.errors
      }, { status: 400 });
    }

    const { id: instanceId } = validation.data;

    // =====================================================
    // INSTANCE VERIFICATION
    // =====================================================

    // Handle development mode instance verification
    let instance = null;
    if (authResult.isFallback && process.env.NODE_ENV === 'development') {
      // Create mock instance for development
      instance = {
        id: instanceId,
        instance_name: `dev-instance-${instanceId}`,
        organization_id: 'dev-org-123',
        status: 'disconnected',
        channel_type: 'whatsapp',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('🔧 Using development instance for fallback user');
    } else {
      // Get instance and verify ownership/access (production)
      // Support both UUID and instance name lookup
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(instanceId);

      let query = supabase
        .from('channel_instances')
        .select('*')
        .eq('channel_type', 'whatsapp');

      if (isUUID) {
        query = query.eq('id', instanceId);
      } else {
        // Look up by instance name in config
        query = query.or(`instance_name.eq.${instanceId},config->>instance_name.eq.${instanceId}`);
      }

      const { data: instanceData, error: instanceError } = await query.single();

      if (instanceError || !instanceData) {
        return NextResponse.json({
          success: false,
          error: 'WhatsApp instance not found'
        }, { status: 404 });
      }
      instance = instanceData;

      // RBAC: Check if user has access to this instance
      const hasAccess =
        profile.role === 'superadmin' || // Superadmin has access to all
        instance.organization_id === profile.organization_id; // Same organization

      if (!hasAccess) {
        return NextResponse.json({
          success: false,
          error: 'Access denied to this instance'
        }, { status: 403 });
      }
    }

    // =====================================================
    // STATUS CHECKS
    // =====================================================

    // Check if instance is already connected
    if (instance.status === 'connected') {
      return NextResponse.json({
        success: true,
        status: 'connected',
        message: 'Instance is already connected',
        data: {
          instanceId: instance.id,
          instanceName: instance.instance_name,
          status: 'connected',
          connectedAt: instance.updated_at
        }
      });
    }

    // Check if instance is in error state
    if (instance.status === 'error') {
      return NextResponse.json({
        success: false,
        error: 'Instance is in error state',
        details: {
          status: instance.status,
          lastError: instance.config?.last_error || 'Unknown error'
        }
      }, { status: 409 });
    }

    // =====================================================
    // QR CODE RETRIEVAL
    // =====================================================

    try {
      // Initialize WhatsApp service
      const whatsappService = new WhatsAppChannelService(supabase, instance.organization_id);

      // Get QR code from service
      const qrResult = await whatsappService.getQRCode(instanceId);

      if (!qrResult.qrCode) {
        // No QR code available yet, but instance is connecting
        return NextResponse.json({
          success: true,
          status: 'loading',
          message: 'QR code is being generated',
          data: {
            instanceId: instance.id,
            instanceName: instance.instance_name,
            status: 'loading',
            qrCode: null,
            expiresAt: null,
            lastUpdated: new Date().toISOString()
          }
        });
      }

      // QR code is available
      const expiresAt = new Date(Date.now() + 45000).toISOString(); // 45 seconds from now

      return NextResponse.json({
        success: true,
        status: 'available',
        message: 'QR code retrieved successfully',
        data: {
          instanceId: instance.id,
          instanceName: instance.instance_name,
          status: 'available',
          qrCode: qrResult.qrCode,
          expiresAt,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (qrError) {
      console.error('Error retrieving QR code:', qrError);

      // Handle specific Evolution API errors
      if (qrError instanceof Error) {
        if (qrError.message.includes('not found')) {
          return NextResponse.json({
            success: false,
            error: 'Evolution API instance not found',
            details: {
              message: 'The WhatsApp instance was not found in Evolution API. It may need to be recreated.',
              suggestion: 'Try disconnecting and reconnecting the instance.'
            }
          }, { status: 404 });
        }

        if (qrError.message.includes('already connected')) {
          return NextResponse.json({
            success: true,
            status: 'connected',
            message: 'Instance is already connected',
            data: {
              instanceId: instance.id,
              instanceName: instance.instance_name,
              status: 'connected',
              connectedAt: new Date().toISOString()
            }
          });
        }
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve QR code',
        details: {
          message: qrError instanceof Error ? qrError.message : 'Unknown error',
          instanceId: instance.id,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in QR code endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// =====================================================
// WEBHOOK INTEGRATION SUPPORT
// =====================================================

/**
 * POST /api/channels/whatsapp/instances/[id]/qr
 * 
 * @description Manually trigger QR code refresh for testing purposes.
 * Only available in development mode.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'Manual QR refresh only available in development mode'
    }, { status: 403 });
  }

  try {
    const supabase = await createClient();

    // Basic auth check with rate limit handling
    let user = null;
    let authError = null;

    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user;
      authError = authResult.error;
    } catch (error) {
      console.warn('⚠️ Supabase auth error in POST (possibly rate limited):', error);
      // In development, allow QR refresh even with auth issues
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Bypassing auth for QR refresh');
        user = { id: 'dev-user' }; // Mock user for development
      }
    }

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        details: authError?.message || 'User not authenticated'
      }, { status: 401 });
    }

    // Validate instance ID
    const validation = QRCodeRequestSchema.safeParse({ id: params.id });
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid instance ID'
      }, { status: 400 });
    }

    // Force refresh by calling GET endpoint
    const getResponse = await GET(request, { params });
    return getResponse;

  } catch (error) {
    console.error('Error in manual QR refresh:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh QR code'
    }, { status: 500 });
  }
}
