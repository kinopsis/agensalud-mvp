/**
 * WhatsApp Instance Synchronization API
 * 
 * Endpoint for synchronizing WhatsApp instances between Evolution API v2 
 * and the application database. Handles state reconciliation and cleanup.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncWhatsAppInstances } from '@/lib/utils/whatsapp-sync-utility';
import { z } from 'zod';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const syncRequestSchema = z.object({
  organization_id: z.string().uuid().optional(),
  force: z.boolean().default(false)
});

// =====================================================
// POST /api/whatsapp/instances/sync
// =====================================================

/**
 * Synchronize WhatsApp instances between Evolution API and database
 * 
 * @description Analyzes and reconciles differences between Evolution API instances
 * and database records. Creates, updates, or removes instances as needed.
 * 
 * @param request - Next.js request object with sync parameters
 * @returns JSON response with synchronization results
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
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

    // Validate user permissions
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin or superadmin role required' }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = syncRequestSchema.safeParse(body);

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

    const { organization_id, force } = validationResult.data;

    // Determine target organization
    let targetOrganizationId: string;
    
    if (profile.role === 'superadmin' && organization_id) {
      targetOrganizationId = organization_id;
    } else {
      targetOrganizationId = profile.organization_id;
    }

    if (!targetOrganizationId) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'ORGANIZATION_REQUIRED', message: 'Organization ID is required' }
      }, { status: 400 });
    }

    console.log(`🔄 Starting WhatsApp instance synchronization for organization: ${targetOrganizationId}`);

    // Perform synchronization
    const syncResult = await syncWhatsAppInstances(targetOrganizationId);

    // Create audit log entry
    await supabase.rpc('create_whatsapp_audit_log', {
      p_organization_id: targetOrganizationId,
      p_action: 'instances_synchronized',
      p_actor_id: user.id,
      p_actor_type: profile.role,
      p_whatsapp_instance_id: null,
      p_details: {
        syncResult,
        force,
        performedBy: `${profile.first_name} ${profile.last_name}`.trim(),
        timestamp: new Date().toISOString()
      }
    });

    // Log results
    if (syncResult.success) {
      console.log(`✅ Synchronization completed successfully:`, {
        synchronized: syncResult.synchronized,
        created: syncResult.created,
        updated: syncResult.updated,
        errors: syncResult.errors.length
      });
    } else {
      console.error(`❌ Synchronization completed with errors:`, syncResult.errors);
    }

    return NextResponse.json({
      success: true,
      data: {
        syncResult,
        summary: {
          totalProcessed: syncResult.synchronized,
          created: syncResult.created,
          updated: syncResult.updated,
          errors: syncResult.errors.length,
          evolutionInstances: syncResult.details.evolutionInstances,
          databaseInstances: syncResult.details.databaseInstances
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        organizationId: targetOrganizationId,
        performedBy: user.id
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST /api/whatsapp/instances/sync:', error);
    return NextResponse.json({ 
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Internal server error during synchronization',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

// =====================================================
// GET /api/whatsapp/instances/sync
// =====================================================

/**
 * Get synchronization status without performing sync
 * 
 * @description Analyzes differences between Evolution API and database
 * without making any changes. Useful for preview before sync.
 * 
 * @param request - Next.js request object
 * @returns JSON response with sync analysis
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }

    // Validate permissions
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin or superadmin role required' }
      }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id') || profile.organization_id;

    if (!organizationId) {
      return NextResponse.json({ 
        success: false,
        error: { code: 'ORGANIZATION_REQUIRED', message: 'Organization ID is required' }
      }, { status: 400 });
    }

    // This would require extending the sync utility to provide analysis without changes
    // For now, return a simple status
    return NextResponse.json({
      success: true,
      data: {
        message: 'Sync analysis endpoint - implementation pending',
        organizationId,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in GET /api/whatsapp/instances/sync:', error);
    return NextResponse.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
}
