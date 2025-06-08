/**
 * WhatsApp State Inconsistency Resolution API
 * 
 * Resolves cases where WhatsApp instances exist in the local database
 * but have been deleted from Evolution API backend.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEvolutionAPIService } from '@/lib/services/EvolutionAPIService';
import { getStateSyncService } from '@/lib/services/WhatsAppStateSyncService';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface OrphanedInstance {
  type: 'channel_instances' | 'whatsapp_instances';
  id: string;
  instanceName: string;
  status: string;
  organizationId: string;
  createdAt: string;
  evolutionError?: string;
}

interface ResolutionResult {
  success: boolean;
  diagnosed: number;
  orphanedInstances: OrphanedInstance[];
  cleanedUp: number;
  errors: string[];
  message: string;
}

// =====================================================
// DIAGNOSTIC FUNCTIONS
// =====================================================

/**
 * Get all WhatsApp instances from database
 */
async function getDatabaseInstances(supabase: any) {
  const [channelInstances, whatsappInstances] = await Promise.all([
    supabase
      .from('channel_instances')
      .select('*')
      .eq('channel_type', 'whatsapp'),
    
    supabase
      .from('whatsapp_instances')
      .select('*')
  ]);

  return {
    channel_instances: channelInstances.data || [],
    whatsapp_instances: whatsappInstances.data || []
  };
}

/**
 * Check if instance exists in Evolution API
 */
async function checkInstanceInEvolutionAPI(instanceName: string): Promise<{ exists: boolean; error?: string }> {
  try {
    const evolutionAPI = createEvolutionAPIService();
    await evolutionAPI.getInstanceStatus(instanceName);
    return { exists: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Instance not found')) {
      return { exists: false, error: errorMessage };
    }
    throw error;
  }
}

/**
 * Find orphaned instances in database
 */
async function findOrphanedInstances(databaseInstances: any): Promise<OrphanedInstance[]> {
  const orphanedInstances: OrphanedInstance[] = [];

  // Check channel_instances
  for (const dbInstance of databaseInstances.channel_instances) {
    const instanceName = dbInstance.config?.whatsapp?.evolution_api?.instance_name || 
                        dbInstance.instance_name;

    if (instanceName) {
      const evolutionCheck = await checkInstanceInEvolutionAPI(instanceName);
      
      if (!evolutionCheck.exists) {
        orphanedInstances.push({
          type: 'channel_instances',
          id: dbInstance.id,
          instanceName,
          status: dbInstance.status,
          organizationId: dbInstance.organization_id,
          createdAt: dbInstance.created_at,
          evolutionError: evolutionCheck.error
        });
      }
    }
  }

  // Check whatsapp_instances
  for (const dbInstance of databaseInstances.whatsapp_instances) {
    const instanceName = dbInstance.instance_name;

    if (instanceName) {
      const evolutionCheck = await checkInstanceInEvolutionAPI(instanceName);
      
      if (!evolutionCheck.exists) {
        orphanedInstances.push({
          type: 'whatsapp_instances',
          id: dbInstance.id,
          instanceName,
          status: dbInstance.status,
          organizationId: dbInstance.organization_id,
          createdAt: dbInstance.created_at,
          evolutionError: evolutionCheck.error
        });
      }
    }
  }

  return orphanedInstances;
}

/**
 * Clean up orphaned instances from database
 */
async function cleanupOrphanedInstances(supabase: any, orphanedInstances: OrphanedInstance[], userId: string): Promise<{ cleaned: number; errors: string[] }> {
  const results = { cleaned: 0, errors: [] };

  for (const orphan of orphanedInstances) {
    try {
      console.log(`🔧 Cleaning up orphaned instance: ${orphan.instanceName} (${orphan.type})`);

      // Delete from appropriate table
      const { error } = await supabase
        .from(orphan.type)
        .delete()
        .eq('id', orphan.id);

      if (error) {
        throw new Error(`Database deletion failed: ${error.message}`);
      }

      // Create audit log
      try {
        await supabase.rpc('create_channel_audit_log', {
          p_organization_id: orphan.organizationId,
          p_channel_type: 'whatsapp',
          p_instance_id: orphan.id,
          p_action: 'orphaned_instance_cleaned',
          p_actor_id: userId,
          p_actor_type: 'admin',
          p_details: {
            instanceName: orphan.instanceName,
            reason: 'Instance not found in Evolution API',
            evolutionError: orphan.evolutionError,
            cleanupTimestamp: new Date().toISOString(),
            tableType: orphan.type
          }
        });
      } catch (auditError) {
        console.warn(`Failed to create audit log: ${auditError.message}`);
      }

      results.cleaned++;
      console.log(`✅ Successfully cleaned up: ${orphan.instanceName}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`${orphan.instanceName}: ${errorMessage}`);
      console.error(`❌ Failed to clean up ${orphan.instanceName}: ${errorMessage}`);
    }
  }

  return results;
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * POST /api/admin/whatsapp/resolve-state-inconsistency
 * 
 * Diagnose and resolve WhatsApp state inconsistencies
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user profile and verify admin access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 404 });
    }

    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action = 'diagnose', forceCleanup = false } = body;

    console.log(`🔍 Starting WhatsApp state inconsistency resolution - Action: ${action}`);

    // Step 1: Get all database instances
    const databaseInstances = await getDatabaseInstances(supabase);
    const totalInstances = databaseInstances.channel_instances.length + databaseInstances.whatsapp_instances.length;

    console.log(`📊 Found ${totalInstances} WhatsApp instances in database`);

    // Step 2: Find orphaned instances
    const orphanedInstances = await findOrphanedInstances(databaseInstances);

    console.log(`🚨 Found ${orphanedInstances.length} orphaned instances`);

    const result: ResolutionResult = {
      success: true,
      diagnosed: totalInstances,
      orphanedInstances,
      cleanedUp: 0,
      errors: [],
      message: `Diagnosed ${totalInstances} instances, found ${orphanedInstances.length} orphaned`
    };

    // Step 3: Clean up if requested
    if ((action === 'cleanup' || forceCleanup) && orphanedInstances.length > 0) {
      console.log(`🔧 Starting cleanup of ${orphanedInstances.length} orphaned instances`);
      
      const cleanupResults = await cleanupOrphanedInstances(supabase, orphanedInstances, user.id);
      
      result.cleanedUp = cleanupResults.cleaned;
      result.errors = cleanupResults.errors;
      result.message = `Cleaned up ${cleanupResults.cleaned} orphaned instances`;

      if (cleanupResults.errors.length > 0) {
        result.message += `, ${cleanupResults.errors.length} errors occurred`;
      }

      // Step 4: Trigger state sync for affected organizations
      const affectedOrgs = [...new Set(orphanedInstances.map(o => o.organizationId))];
      
      for (const orgId of affectedOrgs) {
        try {
          const stateSyncService = getStateSyncService();
          await stateSyncService.syncAllInstances();
          console.log(`✅ Triggered state sync for organization: ${orgId}`);
        } catch (syncError) {
          console.warn(`⚠️ Failed to trigger sync for organization ${orgId}:`, syncError);
        }
      }
    }

    // Create audit log for the resolution action
    await supabase.rpc('create_channel_audit_log', {
      p_organization_id: profile.organization_id,
      p_channel_type: 'whatsapp',
      p_instance_id: null,
      p_action: 'state_inconsistency_resolution',
      p_actor_id: user.id,
      p_actor_type: profile.role,
      p_details: {
        action,
        totalInstances,
        orphanedFound: orphanedInstances.length,
        cleanedUp: result.cleanedUp,
        errors: result.errors,
        performedBy: `${profile.first_name} ${profile.last_name}`.trim(),
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ State inconsistency resolution failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      diagnosed: 0,
      orphanedInstances: [],
      cleanedUp: 0,
      errors: [],
      message: 'Resolution failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/whatsapp/resolve-state-inconsistency
 * 
 * Get current state inconsistency status (diagnosis only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user profile and verify admin access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Perform diagnosis only
    const databaseInstances = await getDatabaseInstances(supabase);
    const totalInstances = databaseInstances.channel_instances.length + databaseInstances.whatsapp_instances.length;
    const orphanedInstances = await findOrphanedInstances(databaseInstances);

    return NextResponse.json({
      success: true,
      diagnosed: totalInstances,
      orphanedInstances,
      cleanedUp: 0,
      errors: [],
      message: `Found ${orphanedInstances.length} orphaned instances out of ${totalInstances} total`
    });

  } catch (error) {
    console.error('❌ State inconsistency diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
