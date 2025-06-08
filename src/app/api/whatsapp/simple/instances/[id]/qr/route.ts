/**
 * Simple WhatsApp QR Code API
 * 
 * Endpoint simplificado para obtener códigos QR de WhatsApp.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSimpleWhatsAppService } from '@/lib/services/SimpleWhatsAppService';

// =====================================================
// EMERGENCY RATE LIMITING
// =====================================================

// Enhanced rate limiting cache to prevent infinite loops while allowing normal operation
const qrRequestCache = new Map<string, { lastRequest: number; requestCount: number; circuitBreakerTripped: boolean }>();
const RATE_LIMIT_WINDOW = 30000; // 30 seconds
const MAX_REQUESTS_PER_WINDOW = 5; // Increased to 5 requests per 30 seconds for normal operation
const CIRCUIT_BREAKER_THRESHOLD = 10; // Trip circuit breaker after 10 failed requests
const CIRCUIT_BREAKER_RESET_TIME = 60000; // Reset circuit breaker after 1 minute

function checkRateLimit(instanceId: string): { allowed: boolean; reason?: string; isCircuitBreakerTripped?: boolean } {
  const now = Date.now();
  const cacheKey = instanceId;
  const cached = qrRequestCache.get(cacheKey);

  if (!cached) {
    // First request
    qrRequestCache.set(cacheKey, {
      lastRequest: now,
      requestCount: 1,
      circuitBreakerTripped: false
    });
    return { allowed: true };
  }

  // Check if circuit breaker is tripped and should be reset
  if (cached.circuitBreakerTripped) {
    const timeSinceLastRequest = now - cached.lastRequest;
    if (timeSinceLastRequest > CIRCUIT_BREAKER_RESET_TIME) {
      console.log(`🔄 Circuit breaker reset for instance ${instanceId}`);
      qrRequestCache.set(cacheKey, {
        lastRequest: now,
        requestCount: 1,
        circuitBreakerTripped: false
      });
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Emergency circuit breaker: Circuit breaker is tripped due to excessive QR requests`,
      isCircuitBreakerTripped: true
    };
  }

  const timeSinceLastRequest = now - cached.lastRequest;

  if (timeSinceLastRequest < RATE_LIMIT_WINDOW) {
    // Within rate limit window
    if (cached.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      // Check if we should trip the circuit breaker
      if (cached.requestCount >= CIRCUIT_BREAKER_THRESHOLD) {
        console.warn(`🚨 Circuit breaker tripped for instance ${instanceId} after ${cached.requestCount} requests`);
        cached.circuitBreakerTripped = true;
        qrRequestCache.set(cacheKey, cached);

        return {
          allowed: false,
          reason: `Emergency circuit breaker: Circuit breaker is tripped due to excessive QR requests`,
          isCircuitBreakerTripped: true
        };
      }

      console.log(`🛑 RATE LIMIT: Instance ${instanceId} exceeded ${MAX_REQUESTS_PER_WINDOW} requests in ${RATE_LIMIT_WINDOW}ms`);
      return {
        allowed: false,
        reason: `Rate limit exceeded. Max ${MAX_REQUESTS_PER_WINDOW} requests per ${RATE_LIMIT_WINDOW/1000} seconds.`
      };
    } else {
      // Increment request count
      cached.requestCount++;
      cached.lastRequest = now;
      return { allowed: true };
    }
  } else {
    // Outside rate limit window, reset
    qrRequestCache.set(cacheKey, {
      lastRequest: now,
      requestCount: 1,
      circuitBreakerTripped: false
    });
    return { allowed: true };
  }
}

// =====================================================
// API HANDLERS
// =====================================================

/**
 * GET /api/whatsapp/simple/instances/[id]/qr
 * Obtener código QR para conexión WhatsApp
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const instanceId = params.id;

    console.log('📱 QR Code request for instance:', instanceId);

    // EMERGENCY RATE LIMITING - Prevent infinite loops
    const rateLimitCheck = checkRateLimit(instanceId);
    if (!rateLimitCheck.allowed) {
      console.log('🛑 QR request blocked by rate limiting:', rateLimitCheck.reason);
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded',
        message: rateLimitCheck.reason,
        retryAfter: RATE_LIMIT_WINDOW / 1000
      }, {
        status: 429,
        headers: {
          'Retry-After': String(RATE_LIMIT_WINDOW / 1000)
        }
      });
    }

    // Autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 403 });
    }

    // Verificar permisos
    if (!['admin', 'staff', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Obtener instancia y verificar acceso
    const whatsappService = await createSimpleWhatsAppService();
    const instance = await whatsappService.getInstanceStatus(instanceId);

    if (!instance) {
      return NextResponse.json({
        success: false,
        error: 'Instance not found'
      }, { status: 404 });
    }

    // Verificar que la instancia pertenece a la organización del usuario
    if (instance.organization_id !== profile.organization_id && profile.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: 'Access denied to this instance'
      }, { status: 403 });
    }

    // Obtener código QR
    const qrResponse = await whatsappService.getQRCode(instanceId);

    if (!qrResponse.success) {
      return NextResponse.json({
        success: false,
        error: qrResponse.message || 'Failed to get QR code'
      }, { status: 500 });
    }

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      data: {
        instanceId: instance.id,
        instanceName: instance.display_name,
        qrCode: qrResponse.qrCode,
        status: qrResponse.status,
        expiresAt: qrResponse.expiresAt,
        message: qrResponse.message
      },
      meta: {
        timestamp: new Date().toISOString(),
        organizationId: instance.organization_id,
        requestedBy: user.id
      }
    });

  } catch (error) {
    console.error('❌ Error getting QR code:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/simple/instances/[id]/qr
 * Refrescar código QR (para desarrollo/testing)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'QR refresh only available in development mode'
    }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const instanceId = params.id;
    
    console.log('🔄 QR Code refresh request for instance:', instanceId);

    // Autenticación básica
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Obtener código QR (reutilizar lógica GET)
    const getResponse = await GET(request, { params });
    return getResponse;

  } catch (error) {
    console.error('❌ Error refreshing QR code:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh QR code'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/whatsapp/simple/instances/[id]/qr
 * Reset circuit breaker for emergency situations
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instanceId = params.id;
    const cacheKey = instanceId;

    console.log('🔄 Resetting circuit breaker for instance:', instanceId);

    // Reset the circuit breaker
    qrRequestCache.delete(cacheKey);

    return NextResponse.json({
      success: true,
      message: 'Circuit breaker reset successfully',
      instanceId
    });

  } catch (error) {
    console.error('❌ Error resetting circuit breaker:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset circuit breaker'
    }, { status: 500 });
  }
}
