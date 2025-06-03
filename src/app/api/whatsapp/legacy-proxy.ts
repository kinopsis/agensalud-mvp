/**
 * WhatsApp Legacy API Proxy
 * 
 * Proxy functions to maintain compatibility with existing WhatsApp APIs
 * by redirecting requests to the new unified channel architecture.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// PROXY CONFIGURATION
// =====================================================

const UNIFIED_API_BASE = '/api/channels/whatsapp';

/**
 * Proxy request to unified API
 */
export async function proxyToUnifiedAPI(
  request: NextRequest,
  endpoint: string,
  method: string = request.method
): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const unifiedUrl = new URL(`${UNIFIED_API_BASE}${endpoint}`, url.origin);
    
    // Copy search parameters
    url.searchParams.forEach((value, key) => {
      unifiedUrl.searchParams.set(key, value);
    });

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      }
    };

    // Add body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.json();
        requestOptions.body = JSON.stringify(body);
      } catch (error) {
        // No body or invalid JSON
      }
    }

    // Make request to unified API
    const response = await fetch(unifiedUrl.toString(), requestOptions);
    const data = await response.json();

    // Convert unified response to legacy format if needed
    const legacyData = convertToLegacyFormat(data, endpoint);

    return NextResponse.json(legacyData, { 
      status: response.status,
      headers: {
        'X-Proxied-From': 'legacy-whatsapp-api',
        'X-Unified-Endpoint': unifiedUrl.pathname,
        'X-Migration-Notice': 'This endpoint is deprecated. Use /api/channels/whatsapp/* instead.'
      }
    });

  } catch (error) {
    console.error('Error proxying to unified API:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'PROXY_ERROR', 
        message: 'Failed to proxy request to unified API'
      }
    }, { status: 500 });
  }
}

/**
 * Convert unified API response to legacy format
 */
export function convertToLegacyFormat(unifiedData: any, endpoint: string): any {
  if (!unifiedData.success) {
    return unifiedData; // Error responses remain the same
  }

  // Convert based on endpoint
  switch (endpoint) {
    case '/instances':
      if (unifiedData.data?.instances) {
        return {
          success: true,
          instances: unifiedData.data.instances.map(convertInstanceToLegacy),
          pagination: unifiedData.data.pagination
        };
      }
      if (unifiedData.data?.instance) {
        return {
          success: true,
          instance: convertInstanceToLegacy(unifiedData.data.instance)
        };
      }
      break;

    case '/webhook':
      return {
        success: unifiedData.success,
        message: unifiedData.message || 'Webhook processed successfully'
      };

    case '/appointments':
      return {
        success: unifiedData.success,
        data: unifiedData.data,
        message: unifiedData.data?.message
      };

    default:
      // For other endpoints, return as-is with legacy wrapper
      return {
        success: unifiedData.success,
        data: unifiedData.data,
        message: unifiedData.message
      };
  }

  return unifiedData;
}

/**
 * Convert unified instance format to legacy format
 */
export function convertInstanceToLegacy(instance: any): any {
  return {
    id: instance.id,
    organization_id: instance.organization_id,
    instance_name: instance.instance_name,
    phone_number: instance.config?.whatsapp?.phone_number || '',
    status: mapStatusToLegacy(instance.status),
    evolution_api_config: instance.config?.whatsapp?.evolution_api,
    webhook_url: instance.config?.webhook?.url || '',
    auto_reply: instance.config?.auto_reply || false,
    business_hours: instance.config?.business_hours,
    created_at: instance.created_at,
    updated_at: instance.updated_at,
    // Legacy fields for compatibility
    qr_code_enabled: instance.config?.whatsapp?.qr_code?.enabled || true,
    metrics: instance.metrics,
    current_status: instance.current_status || instance.status,
    qr_code: instance.qr_code
  };
}

/**
 * Map unified status to legacy status
 */
export function mapStatusToLegacy(status: string): string {
  const statusMap: Record<string, string> = {
    'connected': 'active',
    'disconnected': 'inactive',
    'connecting': 'connecting',
    'error': 'error',
    'suspended': 'suspended',
    'maintenance': 'inactive'
  };
  
  return statusMap[status] || 'inactive';
}

/**
 * Convert legacy create request to unified format
 */
export function convertLegacyCreateRequest(legacyBody: any): any {
  return {
    instance_name: legacyBody.instanceName || legacyBody.instance_name,
    phone_number: legacyBody.phoneNumber || legacyBody.phone_number,
    business_id: legacyBody.businessId || legacyBody.business_id,
    webhook_url: legacyBody.webhookUrl || legacyBody.webhook_url,
    webhook_secret: legacyBody.webhookSecret || legacyBody.webhook_secret,
    webhook_events: legacyBody.webhookEvents || legacyBody.webhook_events || ['MESSAGE_RECEIVED'],
    auto_reply: legacyBody.autoReply !== undefined ? legacyBody.autoReply : legacyBody.auto_reply,
    business_hours: legacyBody.businessHours || legacyBody.business_hours,
    evolution_api: {
      base_url: legacyBody.evolutionApiUrl || legacyBody.evolution_api_url || process.env.EVOLUTION_API_BASE_URL,
      api_key: legacyBody.evolutionApiKey || legacyBody.evolution_api_key || process.env.EVOLUTION_API_KEY,
      instance_name: legacyBody.evolutionInstanceName || legacyBody.evolution_instance_name || legacyBody.instanceName
    }
  };
}

/**
 * Convert legacy update request to unified format
 */
export function convertLegacyUpdateRequest(legacyBody: any): any {
  const unifiedBody: any = {};

  if (legacyBody.instanceName || legacyBody.instance_name) {
    unifiedBody.instance_name = legacyBody.instanceName || legacyBody.instance_name;
  }

  if (legacyBody.autoReply !== undefined || legacyBody.auto_reply !== undefined) {
    unifiedBody.auto_reply = legacyBody.autoReply !== undefined ? legacyBody.autoReply : legacyBody.auto_reply;
  }

  if (legacyBody.businessHours || legacyBody.business_hours) {
    unifiedBody.business_hours = legacyBody.businessHours || legacyBody.business_hours;
  }

  if (legacyBody.webhookUrl || legacyBody.webhook_url) {
    unifiedBody.webhook = {
      url: legacyBody.webhookUrl || legacyBody.webhook_url,
      secret: legacyBody.webhookSecret || legacyBody.webhook_secret || '',
      events: legacyBody.webhookEvents || legacyBody.webhook_events || ['MESSAGE_RECEIVED']
    };
  }

  return unifiedBody;
}

/**
 * Log deprecation warning
 */
export function logDeprecationWarning(endpoint: string, method: string): void {
  console.warn(`⚠️ DEPRECATION WARNING: ${method} ${endpoint} is deprecated. Please migrate to the unified channel API at /api/channels/whatsapp/*`);
}
