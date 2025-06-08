/**
 * WhatsApp Instances Management API
 * 
 * Endpoints for CRUD operations on WhatsApp instances with Evolution API v2 integration.
 * Supports multi-tenant architecture with role-based access control.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createWhatsAppInstanceSchema, 
  whatsAppInstanceQuerySchema,
  type CreateWhatsAppInstanceInput,
  type WhatsAppInstanceQuery 
} from '@/lib/validations/whatsapp';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import type { WhatsAppInstance } from '@/types/whatsapp';

// =====================================================
// GET /api/whatsapp/instances
// =====================================================

/**
 * Get WhatsApp instances for organization
 * 
 * @description Retrieves WhatsApp instances with filtering and pagination.
 * Only Admin and SuperAdmin roles can access this endpoint.
 * 
 * @param request - Next.js request object with query parameters
 * @returns JSON response with instances list or error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile with role and organization
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

    // Validate role permissions (only Admin and SuperAdmin can manage WhatsApp instances)
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: 'Only administrators can manage WhatsApp instances',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const validationResult = whatsAppInstanceQuerySchema.safeParse(queryParams);
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

    // Build query with organization filtering
    let query = supabase
      .from('whatsapp_instances')
      .select(`
        id,
        instance_name,
        phone_number,
        business_id,
        status,
        webhook_url,
        qr_code,
        last_connected_at,
        error_message,
        created_at,
        updated_at,
        evolution_api_config
      `)
      .order('created_at', { ascending: false });

    // Apply organization filter
    const organizationId = params.organization_id || profile.organization_id;
    if (profile.role === 'admin') {
      // Admin can only see instances from their organization
      query = query.eq('organization_id', organizationId);
    } else if (profile.role === 'superadmin' && params.organization_id) {
      // SuperAdmin can filter by specific organization
      query = query.eq('organization_id', params.organization_id);
    }
    // SuperAdmin without organization filter sees all instances

    // Apply additional filters
    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.search) {
      query = query.or(`instance_name.ilike.%${params.search}%,phone_number.ilike.%${params.search}%`);
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data: instances, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching WhatsApp instances:', queryError);
      return NextResponse.json({ 
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Failed to fetch WhatsApp instances' }
      }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('whatsapp_instances')
      .select('id', { count: 'exact', head: true });

    if (profile.role === 'admin') {
      countQuery = countQuery.eq('organization_id', organizationId);
    } else if (profile.role === 'superadmin' && params.organization_id) {
      countQuery = countQuery.eq('organization_id', params.organization_id);
    }

    if (params.status) {
      countQuery = countQuery.eq('status', params.status);
    }

    if (params.search) {
      countQuery = countQuery.or(`instance_name.ilike.%${params.search}%,phone_number.ilike.%${params.search}%`);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      data: {
        instances: instances || [],
        pagination: {
          total: count || 0,
          limit: params.limit,
          offset: params.offset,
          hasMore: (count || 0) > params.offset + params.limit
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: organizationId
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/whatsapp/instances:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}

// =====================================================
// POST /api/whatsapp/instances
// =====================================================

/**
 * Create new WhatsApp instance
 * 
 * @description Creates a new WhatsApp instance with Evolution API integration.
 * Only Admin and SuperAdmin roles can create instances.
 * 
 * @param request - Next.js request object with instance data
 * @returns JSON response with created instance or error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile with role and organization
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

    // Validate role permissions
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'INSUFFICIENT_PERMISSIONS', 
          message: 'Only administrators can create WhatsApp instances',
          requiredRoles: ['admin', 'superadmin'],
          userRole: profile.role
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createWhatsAppInstanceSchema.safeParse(body);
    
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

    const instanceData = validationResult.data;

    // Set organization_id from user profile if not provided
    const organizationId = instanceData.organization_id || profile.organization_id;

    // Validate organization access for admin users
    if (profile.role === 'admin' && instanceData.organization_id && instanceData.organization_id !== profile.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'ORGANIZATION_ACCESS_DENIED', 
          message: 'Admin users can only create instances for their own organization'
        }
      }, { status: 403 });
    }

    // Check for duplicate instance name within organization
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('instance_name', instanceData.instance_name)
      .single();

    if (existingInstance) {
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'DUPLICATE_INSTANCE_NAME', 
          message: 'Instance name already exists in this organization'
        }
      }, { status: 409 });
    }

    // Create instance in Evolution API first
    try {
      const evolutionAPI = createEvolutionAPIService();
      // HYBRID WORKFLOW: Support both immediate QR and two-step workflow
      // - If skipConnection is true: Create in disconnected state (two-step workflow)
      // - If skipConnection is false/undefined: Use immediate QR generation (optimized workflow)
      const useImmediateQR = !instanceData.skipConnection; // Default to immediate QR for better performance

      console.log(`🎯 Workflow selection: ${useImmediateQR ? 'Immediate QR (optimized)' : 'Two-step (legacy)'}`);

      const evolutionResponse = await evolutionAPI.createInstance({
        instanceName: instanceData.instance_name,
        integration: instanceData.evolution_api_config?.integration ?? 'WHATSAPP-BAILEYS',
        qrcode: useImmediateQR, // Respect skipConnection parameter
        number: instanceData.phone_number || undefined
      });

      // Store instance in database with correct status for two-step workflow
      const { data: newInstance, error: insertError } = await supabase
        .from('whatsapp_instances')
        .insert({
          organization_id: organizationId,
          instance_name: instanceData.instance_name,
          phone_number: instanceData.phone_number,
          business_id: instanceData.business_id,
          webhook_url: instanceData.webhook_url,
          status: useImmediateQR ?
            (evolutionResponse.instance?.status || 'connecting') :
            'disconnected', // Two-step workflow starts disconnected
          evolution_api_config: {
            ...instanceData.evolution_api_config,
            apikey: typeof evolutionResponse.hash === 'string' ? evolutionResponse.hash : evolutionResponse.hash?.apikey,
            instance_id: evolutionResponse.instance?.instanceId,
            integration: evolutionResponse.instance?.integration
          },
          qr_code: useImmediateQR ?
            (evolutionResponse.qrcode?.base64 || null) :
            null, // No QR code in two-step workflow initially
          session_data: {
            evolutionInstanceName: instanceData.instance_name,
            evolutionInstanceId: evolutionResponse.instance?.instanceId,
            createdAt: new Date().toISOString(),
            workflow: useImmediateQR ? 'immediate_qr' : 'two_step',
            qrCodeGenerated: useImmediateQR ? !!evolutionResponse.qrcode?.base64 : false,
            evolutionStatus: evolutionResponse.instance?.status,
            skipConnection: instanceData.skipConnection || false
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating WhatsApp instance in database:', insertError);
        
        // Cleanup: Delete instance from Evolution API if database insert failed
        try {
          await evolutionAPI.deleteInstance(instanceData.instance_name);
        } catch (cleanupError) {
          console.error('Error cleaning up Evolution API instance:', cleanupError);
        }

        return NextResponse.json({ 
          success: false,
          error: { code: 'DATABASE_ERROR', message: 'Failed to create WhatsApp instance' }
        }, { status: 500 });
      }

      // Create audit log entry
      await supabase.rpc('create_whatsapp_audit_log', {
        p_organization_id: organizationId,
        p_action: 'instance_created',
        p_actor_id: user.id,
        p_actor_type: 'admin',
        p_whatsapp_instance_id: newInstance.id,
        p_details: {
          instanceName: instanceData.instance_name,
          phoneNumber: instanceData.phone_number,
          createdBy: `${profile.first_name} ${profile.last_name}`.trim()
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          instance: newInstance,
          qrCode: evolutionResponse.qrcode?.base64 || null, // Include QR code if available
          evolutionResponse: {
            instanceName: evolutionResponse.instance?.instanceName,
            instanceId: evolutionResponse.instance?.instanceId,
            status: evolutionResponse.instance?.status || 'connecting',
            integration: evolutionResponse.instance?.integration,
            hasQRCode: !!evolutionResponse.qrcode?.base64
          },
          workflow: 'immediate_qr', // Updated to reflect actual workflow
          nextStep: evolutionResponse.qrcode?.base64 ? 'scan_qr' : 'wait_for_qr'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          organizationId: organizationId
        }
      }, { status: 201 });

    } catch (evolutionError) {
      console.error('Error creating instance in Evolution API:', evolutionError);
      return NextResponse.json({ 
        success: false,
        error: { 
          code: 'EVOLUTION_API_ERROR', 
          message: 'Failed to create WhatsApp instance in Evolution API',
          details: evolutionError instanceof Error ? evolutionError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in POST /api/whatsapp/instances:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
