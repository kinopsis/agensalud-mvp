/**
 * Unified WhatsApp Instances API
 * 
 * Unified endpoint for WhatsApp instance management using the new multi-channel architecture.
 * Provides CRUD operations for WhatsApp instances with Evolution API v2 integration.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  createAutoChannelConfig,
  validateInstanceName,
  validatePhoneNumber,
  generateWebhookURL,
  generateWebhookSecret
} from '@/lib/utils/whatsapp-defaults';
import { getWhatsAppInstancesLightweight } from '@/lib/utils/whatsapp-instance-helpers';
import { WhatsAppChannelService } from '@/lib/channels/whatsapp/WhatsAppChannelService';
import type { ChannelInstanceConfig } from '@/types/channels';
import {
  authenticateWhatsAppUser,
  validateTenantAdminMinimalAccess,
  validateSuperadminAdvancedAccess,
  createPermissionErrorResponse
} from '@/lib/middleware/whatsapp-rbac-middleware';
import {
  getWhatsAppPermissions,
  getErrorMessage,
  type WhatsAppUserRole
} from '@/lib/rbac/whatsapp-permissions';

// Simple cache to avoid heavy channel registration on every request
const channelManagerCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =====================================================
// VALIDATION SCHEMAS (Unified)
// =====================================================

const listInstancesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['connected', 'disconnected', 'connecting', 'error', 'suspended']).optional(),
  search: z.string().optional()
});

// Full configuration schema (for advanced users)
const createInstanceSchema = z.object({
  instance_name: z.string().min(3).max(50),
  auto_reply: z.boolean().default(true),
  business_hours: z.object({
    enabled: z.boolean().default(false),
    timezone: z.string().default('UTC'),
    schedule: z.record(z.object({
      start: z.string(),
      end: z.string(),
      enabled: z.boolean()
    })).default({})
  }).optional(),
  ai_config: z.object({
    enabled: z.boolean().default(true),
    model: z.enum(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']).default('gpt-3.5-turbo'),
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().min(100).max(2000).default(1000),
    timeout_seconds: z.number().min(10).max(60).default(30),
    custom_prompt: z.string().optional()
  }).optional(),
  webhook: z.object({
    url: z.string().url(),
    secret: z.string().optional(),
    events: z.array(z.string()).default(['MESSAGE_RECEIVED', 'CONNECTION_UPDATE', 'APPOINTMENT_CREATED'])
  }).optional(),
  limits: z.object({
    max_concurrent_chats: z.number().min(1).max(1000).default(50),
    message_rate_limit: z.number().min(1).max(1000).default(60),
    session_timeout_minutes: z.number().min(1).max(1440).default(30)
  }).optional(),
  whatsapp: z.object({
    phone_number: z.string().regex(/^\+\d{10,15}$/),
    business_id: z.string().optional(),
    evolution_api: z.object({
      base_url: z.string().url(),
      api_key: z.string().min(1).optional().or(z.literal('')),
      instance_name: z.string().min(3)
    }),
    qr_code: z.object({
      enabled: z.boolean().default(true),
      auto_refresh: z.boolean().default(true),
      refresh_interval_minutes: z.number().default(5)
    }).optional(),
    features: z.object({
      read_receipts: z.boolean().default(true),
      typing_indicator: z.boolean().default(true),
      presence_update: z.boolean().default(true)
    }).optional()
  })
});

// Simplified schema for auto-configuration (tenant admin users)
const createSimplifiedInstanceSchema = z.object({
  instance_name: z.string().min(3).max(50),
  phone_number: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format. Use international format like +57300123456')
});

// Two-step schema for disconnected instance creation (tenant admin users)
const createTwoStepInstanceSchema = z.object({
  instance_name: z.string().min(3).max(50),
  phone_number: z.string().optional().default(''), // Can be empty for two-step flow
  skipConnection: z.boolean().optional().default(false) // Flag to indicate two-step flow
});

// Union schema to support all approaches
const createInstanceUnionSchema = z.union([
  createInstanceSchema,
  createSimplifiedInstanceSchema,
  createTwoStepInstanceSchema
]);

// =====================================================
// GET /api/channels/whatsapp/instances
// =====================================================

/**
 * List WhatsApp instances with unified filtering
 * 
 * @description Retrieves WhatsApp instances using the unified channel architecture.
 * Supports pagination, filtering, and search functionality.
 * 
 * @param request - Next.js request object with query parameters
 * @returns JSON response with instances list or error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Enhanced RBAC authentication for viewing instances
    const authResult = await authenticateWhatsAppUser(request);
    if (!authResult.success || !authResult.user) {
      return createPermissionErrorResponse(authResult);
    }

    const user = authResult.user;

    // Validate permission to view instances
    const permissions = getWhatsAppPermissions(user.role);
    if (!permissions.canViewInstances) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: getErrorMessage(
            user.role,
            'Permission denied: canViewInstances',
            'No tienes permisos para ver las instancias de WhatsApp'
          )
        }
      }, { status: 403 });
    }

    // Validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = listInstancesSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const params = validationResult.data;

    // Determine organization scope based on RBAC permissions
    let organizationId: string | null = null;

    if (user.role === 'superadmin' && permissions.canViewCrossTenantInstances) {
      // Superadmin can see all instances or filter by organization
      const orgFilter = searchParams.get('organization_id');
      organizationId = orgFilter || null; // null means all organizations
    } else {
      // Tenant admin can only see their organization's instances
      organizationId = user.organization_id;
    }

    // Use lightweight instance fetcher to avoid heavy channel registration
    const instances = await getWhatsAppInstancesLightweight(supabase, organizationId);

    // Apply filtering
    let filteredInstances = instances;

    if (params.status) {
      filteredInstances = filteredInstances.filter(instance => instance.status === params.status);
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredInstances = filteredInstances.filter(instance => 
        instance.instance_name.toLowerCase().includes(searchLower) ||
        (instance.config.whatsapp?.phone_number || '').includes(searchLower)
      );
    }

    // Apply pagination
    const offset = (params.page - 1) * params.limit;
    const paginatedInstances = filteredInstances.slice(offset, offset + params.limit);

    // Add lightweight metrics (avoiding heavy calculations for now)
    const instancesWithMetrics = paginatedInstances.map((instance) => ({
      ...instance,
      channel_type: 'whatsapp', // Ensure channel_type is set
      metrics: {
        conversations_24h: Math.floor(Math.random() * 50), // Mock data for performance
        messages_24h: Math.floor(Math.random() * 200),
        appointments_24h: Math.floor(Math.random() * 10)
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        instances: instancesWithMetrics,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: filteredInstances.length,
          pages: Math.ceil(filteredInstances.length / params.limit)
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: user.organization_id,
        channel: 'whatsapp'
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/channels/whatsapp/instances:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// POST /api/channels/whatsapp/instances
// =====================================================

/**
 * Create new WhatsApp instance using unified architecture
 * 
 * @description Creates a new WhatsApp instance using the unified channel service.
 * Integrates with Evolution API v2 and stores in unified channel_instances table.
 * 
 * @param request - Next.js request object with instance data
 * @returns JSON response with created instance or error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body with better error handling
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error:', jsonError);
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON parsing error'
        }
      }, { status: 400 });
    }

    // Determine request type: simplified, two-step, or advanced
    const isSimplifiedRequest = createSimplifiedInstanceSchema.safeParse(body).success;
    const isTwoStepRequest = createTwoStepInstanceSchema.safeParse(body).success;
    const isTenantAdminRequest = isSimplifiedRequest || isTwoStepRequest;

    console.log('🔍 Request type analysis:', {
      isSimplifiedRequest,
      isTwoStepRequest,
      isTenantAdminRequest,
      body: { ...body, phone_number: body.phone_number ? '[REDACTED]' : 'empty' }
    });

    // Enhanced RBAC authentication based on request type
    let authResult;
    if (isTenantAdminRequest) {
      // For simplified and two-step requests, tenant admin minimal access is sufficient
      authResult = await validateTenantAdminMinimalAccess(request, ['canCreateInstance']);
    } else {
      // For advanced configuration, require superadmin access
      authResult = await validateSuperadminAdvancedAccess(request, [
        'canCreateInstance',
        'canViewAdvancedConfig',
        'canEditAdvancedConfig'
      ]);
    }

    if (!authResult.success || !authResult.user) {
      return createPermissionErrorResponse(authResult, authResult.user?.role);
    }

    const user = authResult.user;

    // Check for one instance per tenant limit (only for tenant admin)
    const existingInstances = await getWhatsAppInstancesLightweight(supabase, user.organization_id);
    if (existingInstances.length > 0 && user.role !== 'superadmin') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSTANCE_LIMIT_EXCEEDED',
          message: getErrorMessage(
            user.role,
            'Instance limit exceeded: Only one WhatsApp instance per organization',
            'Solo se permite una instancia de WhatsApp por organización. Elimina la instancia existente para crear una nueva.'
          )
        }
      }, { status: 409 });
    }

    // Try simplified schema first, then two-step, then full schema
    let instanceData: any;
    let isSimplified = false;
    let isTwoStep = false;

    const simplifiedResult = createSimplifiedInstanceSchema.safeParse(body);
    const twoStepResult = createTwoStepInstanceSchema.safeParse(body);

    if (simplifiedResult.success) {
      // Use simplified auto-configuration
      isSimplified = true;
      const { instance_name, phone_number } = simplifiedResult.data;

      // Validate using our utility functions
      if (!validateInstanceName(instance_name)) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'El nombre debe tener entre 3 y 50 caracteres (solo letras, números y espacios)'
          }
        }, { status: 400 });
      }

      if (!validatePhoneNumber(phone_number)) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ingresa un número válido en formato internacional (ej: +57300123456)'
          }
        }, { status: 400 });
      }

      // Create auto-configured instance data
      instanceData = {
        instance_name,
        phone_number,
        auto_config: createAutoChannelConfig(phone_number, instance_name, user.organization_id)
      };
    } else if (twoStepResult.success) {
      // Use two-step auto-configuration (create disconnected, connect later)
      isTwoStep = true;
      const { instance_name, skipConnection } = twoStepResult.data;

      // Validate instance name
      if (!validateInstanceName(instance_name)) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'El nombre debe tener entre 3 y 50 caracteres (solo letras, números y espacios)'
          }
        }, { status: 400 });
      }

      // Create auto-configured instance data without phone number (two-step flow)
      instanceData = {
        instance_name,
        phone_number: '', // Empty for two-step flow
        auto_config: createAutoChannelConfig('', instance_name, user.organization_id, skipConnection || true)
      };
    } else {
      // Try full schema
      const fullResult = createInstanceSchema.safeParse(body);
      if (!fullResult.success) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid instance data',
            details: fullResult.error.errors
          }
        }, { status: 400 });
      }
      instanceData = fullResult.data;
    }

    // Convert to unified configuration format
    let unifiedConfig: ChannelInstanceConfig;

    if (isSimplified || isTwoStep) {
      // Use auto-configuration for simplified and two-step creation
      unifiedConfig = instanceData.auto_config;
    } else {
      // Use provided configuration for full creation
      unifiedConfig = {
        auto_reply: instanceData.auto_reply,
        business_hours: instanceData.business_hours || {
          enabled: false,
          timezone: 'UTC',
          schedule: {}
        },
        ai_config: instanceData.ai_config || {
          enabled: true,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 1000,
          timeout_seconds: 30
        },
        webhook: instanceData.webhook ? {
          url: instanceData.webhook.url,
          secret: instanceData.webhook.secret || '',
          events: instanceData.webhook.events || ['MESSAGE_RECEIVED', 'CONNECTION_UPDATE', 'APPOINTMENT_CREATED']
        } : {
          url: generateWebhookURL(user.organization_id),
          secret: generateWebhookSecret(),
          events: ['MESSAGE_RECEIVED', 'CONNECTION_UPDATE', 'APPOINTMENT_CREATED']
        },
        limits: {
          max_concurrent_chats: 100,
          message_rate_limit: 60,
          session_timeout_minutes: 30
        },
        whatsapp: {
          phone_number: instanceData.whatsapp.phone_number,
          business_id: instanceData.whatsapp.business_id,
          evolution_api: {
            base_url: instanceData.whatsapp.evolution_api.base_url,
            api_key: instanceData.whatsapp.evolution_api.api_key || process.env.EVOLUTION_API_KEY || 'default-api-key',
            instance_name: instanceData.whatsapp.evolution_api.instance_name
          },
          qr_code: instanceData.whatsapp.qr_code || {
            enabled: true,
            auto_refresh: true,
            refresh_interval_minutes: 0.5 // 30 seconds for better UX
          },
          features: instanceData.whatsapp.features || {
            read_receipts: true,
            typing_indicator: true,
            presence_update: true
          }
        }
      };
    }

    // Initialize WhatsApp service
    const whatsappService = new WhatsAppChannelService(supabase, user.organization_id);

    // Create instance using unified service
    const instance = await whatsappService.createInstance(user.organization_id, unifiedConfig);

    // Log creation with error handling
    try {
      console.log('📝 Creating audit log for WhatsApp instance creation...');
      const auditResult = await supabase.rpc('create_channel_audit_log', {
        p_organization_id: user.organization_id,
        p_channel_type: 'whatsapp',
        p_instance_id: instance.id,
        p_action: 'instance_created',
        p_actor_id: user.id,
        p_actor_type: user.role,
        p_details: {
          instanceName: instance.instance_name,
          phoneNumber: isSimplified ? instanceData.phone_number : isTwoStep ? '' : instanceData.whatsapp.phone_number,
          createdBy: `${user.first_name} ${user.last_name}`.trim(),
          creationType: isSimplified ? 'simplified_auto_config' : isTwoStep ? 'two_step_auto_config' : 'full_config',
          autoConfigured: isSimplified || isTwoStep,
          skipConnection: isTwoStep,
          webhookUrl: unifiedConfig.webhook?.url,
          aiEnabled: unifiedConfig.ai_config?.enabled,
          rbacValidated: true,
          userRole: user.role
        }
      });

      if (auditResult.error) {
        console.error('❌ Audit log creation failed:', auditResult.error);
      } else {
        console.log('✅ Audit log created successfully');
      }
    } catch (auditError) {
      console.error('❌ Failed to create audit log:', auditError);
      // Don't fail the main operation for audit log errors
    }

    return NextResponse.json({
      success: true,
      data: { instance },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: user.organization_id,
        channel: 'whatsapp',
        rbacValidated: true,
        userRole: user.role,
        creationType: isSimplified ? 'simplified' : isTwoStep ? 'two_step' : 'advanced'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST /api/channels/whatsapp/instances:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    }, { status: 500 });
  }
}
