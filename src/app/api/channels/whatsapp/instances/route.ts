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
import type { ChannelInstanceConfig } from '@/types/channels';
import { getChannelManager } from '@/lib/channels/ChannelManager';
import { registerWhatsAppChannel } from '@/lib/channels/whatsapp';

// =====================================================
// VALIDATION SCHEMAS (Unified)
// =====================================================

const listInstancesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['connected', 'disconnected', 'connecting', 'error', 'suspended']).optional(),
  search: z.string().optional()
});

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
    timeout_seconds: z.number().min(10).max(60).default(30)
  }).optional(),
  webhook: z.object({
    url: z.string().url(),
    secret: z.string().optional(),
    events: z.array(z.string()).default(['MESSAGE_RECEIVED', 'CONNECTION_UPDATE', 'APPOINTMENT_CREATED'])
  }).optional(),
  whatsapp: z.object({
    phone_number: z.string().regex(/^\+\d{10,15}$/),
    business_id: z.string().optional(),
    evolution_api: z.object({
      base_url: z.string().url(),
      api_key: z.string().min(10).optional(),
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

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
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

    // Initialize channel manager and get WhatsApp service
    const manager = registerWhatsAppChannel(supabase, profile.organization_id);
    const whatsappService = manager.getChannelService('whatsapp');

    // Get instances using unified service
    const instances = await whatsappService.getInstances(profile.organization_id);

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

    // Get metrics for each instance
    const instancesWithMetrics = await Promise.all(
      paginatedInstances.map(async (instance) => {
        try {
          const metrics = await whatsappService.getMetrics(instance.id, {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          });

          return {
            ...instance,
            metrics: {
              conversations_24h: metrics.conversations.total,
              messages_24h: metrics.messages.total,
              appointments_24h: metrics.appointments.created
            }
          };
        } catch (error) {
          console.warn(`Could not get metrics for instance ${instance.id}:`, error);
          return {
            ...instance,
            metrics: {
              conversations_24h: 0,
              messages_24h: 0,
              appointments_24h: 0
            }
          };
        }
      })
    );

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
        organizationId: profile.organization_id,
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
    const body = await request.json();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, { status: 403 });
    }

    // Validate request body
    const validationResult = createInstanceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid instance data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const instanceData = validationResult.data;

    // Convert to unified configuration format
    const unifiedConfig: ChannelInstanceConfig = {
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
      } : undefined,
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
          refresh_interval_minutes: 5
        },
        features: instanceData.whatsapp.features || {
          read_receipts: true,
          typing_indicator: true,
          presence_update: true
        }
      }
    };

    // Initialize channel manager and get WhatsApp service
    const manager = registerWhatsAppChannel(supabase, profile.organization_id);
    const whatsappService = manager.getChannelService('whatsapp');

    // Create instance using unified service
    const instance = await whatsappService.createInstance(profile.organization_id, unifiedConfig);

    // Log creation
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: instance.id,
      p_action: 'instance_created',
      p_actor_id: user.id,
      p_actor_type: 'admin',
      p_details: {
        instanceName: instance.instance_name,
        phoneNumber: instanceData.whatsapp.phone_number,
        createdBy: user.email
      }
    });

    return NextResponse.json({
      success: true,
      data: { instance },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: profile.organization_id,
        channel: 'whatsapp'
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
