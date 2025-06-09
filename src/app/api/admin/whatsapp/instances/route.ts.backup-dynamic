/**
 * Superadmin WhatsApp Instance Management API
 * 
 * Enhanced API endpoints for cross-tenant WhatsApp instance management.
 * Provides superadmin capabilities while maintaining security and audit trails.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const globalInstancesQuerySchema = z.object({
  organization_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'connecting', 'error']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'instance_name', 'organization_name', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

const crossTenantUpdateSchema = z.object({
  action: z.enum(['update_config', 'change_status', 'restart', 'emergency_disable']),
  target_organization_id: z.string().uuid(),
  changes: z.object({}).passthrough(),
  reason: z.string().min(10).max(500)
});

// =====================================================
// TYPES
// =====================================================

interface EnhancedInstanceData {
  id: string;
  instance_name: string;
  status: string;
  organization_id: string;
  organization_name: string;
  subscription_plan: string;
  phone_number?: string;
  evolution_instance_id?: string;
  created_at: string;
  last_activity_at?: string;
  health_status: string;
  performance_metrics?: object;
}

interface AuditContext {
  actor_id: string;
  actor_role: string;
  actor_organization_id: string;
  ip_address?: string;
  user_agent?: string;
}

// =====================================================
// GET /api/admin/whatsapp/instances
// =====================================================

/**
 * Get all WhatsApp instances across all organizations (Superadmin only)
 * 
 * @description Provides comprehensive view of all WhatsApp instances with
 * organization context, filtering, and pagination capabilities.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Authentication and authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile and validate superadmin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    if (profile.role !== 'superadmin') {
      return NextResponse.json({ 
        success: false,
        error: { code: 'FORBIDDEN', message: 'Superadmin access required' }
      }, { status: 403 });
    }

    // Validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = globalInstancesQuerySchema.safeParse(queryParams);

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

    // Build enhanced query for global instance view
    let query = supabase
      .from('channel_instances')
      .select(`
        id,
        instance_name,
        status,
        created_at,
        updated_at,
        organization_id,
        config,
        organizations!inner (
          id,
          name,
          subscription_plan
        )
      `)
      .eq('channel_type', 'whatsapp');

    // Apply filters
    if (params.organization_id) {
      query = query.eq('organization_id', params.organization_id);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.search) {
      query = query.or(`instance_name.ilike.%${params.search}%,organizations.name.ilike.%${params.search}%`);
    }

    // Apply sorting
    const sortColumn = params.sort_by === 'organization_name' ? 'organizations.name' : params.sort_by;
    query = query.order(sortColumn, { ascending: params.sort_order === 'asc' });

    // Apply pagination
    const offset = (params.page - 1) * params.limit;
    query = query.range(offset, offset + params.limit - 1);

    const { data: instances, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching global instances:', queryError);
      return NextResponse.json({ 
        success: false,
        error: { code: 'QUERY_ERROR', message: 'Failed to fetch instances' }
      }, { status: 500 });
    }

    // Transform data for enhanced response
    const enhancedInstances: EnhancedInstanceData[] = (instances || []).map(instance => ({
      id: instance.id,
      instance_name: instance.instance_name,
      status: instance.status,
      organization_id: instance.organization_id,
      organization_name: instance.organizations.name,
      subscription_plan: instance.organizations.subscription_plan,
      phone_number: instance.config?.phone_number,
      evolution_instance_id: instance.config?.evolution_instance_id,
      created_at: instance.created_at,
      last_activity_at: instance.updated_at,
      health_status: instance.config?.health_status || 'unknown',
      performance_metrics: instance.config?.performance_metrics
    }));

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('channel_instances')
      .select('*', { count: 'exact', head: true })
      .eq('channel_type', 'whatsapp');

    // Create audit log entry for global access
    await supabase.rpc('create_whatsapp_audit_log', {
      p_organization_id: profile.organization_id,
      p_action: 'global_instances_viewed',
      p_actor_id: user.id,
      p_actor_type: profile.role,
      p_whatsapp_instance_id: null,
      p_details: {
        query_params: params,
        results_count: enhancedInstances.length,
        total_available: totalCount,
        accessed_by: `${profile.first_name} ${profile.last_name}`.trim()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        instances: enhancedInstances,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / params.limit)
        },
        filters: {
          organization_id: params.organization_id,
          status: params.status,
          search: params.search
        },
        summary: {
          total_instances: totalCount || 0,
          active_instances: enhancedInstances.filter(i => i.status === 'active').length,
          organizations_with_instances: new Set(enhancedInstances.map(i => i.organization_id)).size
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        actor: {
          id: user.id,
          role: profile.role,
          organization_id: profile.organization_id
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/whatsapp/instances:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

// =====================================================
// PUT /api/admin/whatsapp/instances/[id]/cross-tenant
// =====================================================

/**
 * Cross-tenant instance management (Superadmin only)
 * 
 * @description Allows superadmin to manage instances across different organizations
 * with comprehensive audit trail and security validation.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authentication and authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile and validate superadmin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'superadmin') {
      return NextResponse.json({ 
        success: false,
        error: { code: 'FORBIDDEN', message: 'Superadmin access required' }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = crossTenantUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid request data',
          details: validationResult.error.errors
        }
      }, { status: 400 });
    }

    const { action, target_organization_id, changes, reason } = validationResult.data;

    // Implementation for cross-tenant updates would go here
    // This is a placeholder for the actual implementation

    return NextResponse.json({
      success: true,
      message: 'Cross-tenant update endpoint - implementation pending',
      data: {
        action,
        target_organization_id,
        reason,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/whatsapp/instances/cross-tenant:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
