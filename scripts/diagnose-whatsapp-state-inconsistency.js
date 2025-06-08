#!/usr/bin/env node

/**
 * WhatsApp State Inconsistency Diagnostic & Resolution Script
 * 
 * Diagnoses and resolves cases where WhatsApp instances exist in the local
 * database but have been deleted from Evolution API backend.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const { createClient } = require('@supabase/supabase-js');

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  EVOLUTION_API_URL: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  DRY_RUN: process.argv.includes('--dry-run'),
  VERBOSE: process.argv.includes('--verbose'),
  FORCE_CLEANUP: process.argv.includes('--force-cleanup')
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Log with timestamp and level
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'DIAGNOSE': '🔍',
    'FIX': '🔧'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Initialize Supabase client
 */
function initSupabase() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
}

/**
 * Make request to Evolution API
 */
async function makeEvolutionAPIRequest(endpoint, options = {}) {
  const url = `${CONFIG.EVOLUTION_API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.EVOLUTION_API_KEY,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Evolution API request failed: ${error.message}`);
  }
}

// =====================================================
// DIAGNOSTIC FUNCTIONS
// =====================================================

/**
 * Get all WhatsApp instances from local database
 */
async function getDatabaseInstances(supabase) {
  log('Fetching WhatsApp instances from local database...', 'DIAGNOSE');
  
  try {
    // Check both channel_instances and whatsapp_instances tables
    const [channelInstances, whatsappInstances] = await Promise.all([
      supabase
        .from('channel_instances')
        .select('*')
        .eq('channel_type', 'whatsapp'),
      
      supabase
        .from('whatsapp_instances')
        .select('*')
    ]);
    
    const instances = {
      channel_instances: channelInstances.data || [],
      whatsapp_instances: whatsappInstances.data || [],
      total: (channelInstances.data?.length || 0) + (whatsappInstances.data?.length || 0)
    };
    
    log(`Found ${instances.total} WhatsApp instances in database`, 'INFO');
    log(`  - channel_instances: ${instances.channel_instances.length}`, 'INFO');
    log(`  - whatsapp_instances: ${instances.whatsapp_instances.length}`, 'INFO');
    
    return instances;
  } catch (error) {
    log(`Failed to fetch database instances: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Get all instances from Evolution API
 */
async function getEvolutionAPIInstances() {
  log('Fetching instances from Evolution API...', 'DIAGNOSE');
  
  try {
    const instances = await makeEvolutionAPIRequest('/instance/fetchInstances');
    
    log(`Found ${instances.length || 0} instances in Evolution API`, 'INFO');
    
    if (CONFIG.VERBOSE && instances.length > 0) {
      instances.forEach(instance => {
        log(`  - ${instance.instance.instanceName} (${instance.instance.status})`, 'INFO');
      });
    }
    
    return instances;
  } catch (error) {
    log(`Failed to fetch Evolution API instances: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * Check if an instance exists in Evolution API
 */
async function checkInstanceInEvolutionAPI(instanceName) {
  try {
    const status = await makeEvolutionAPIRequest(`/instance/connectionState/${instanceName}`);
    return { exists: true, status };
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return { exists: false, error: error.message };
    }
    throw error;
  }
}

/**
 * Analyze state inconsistencies
 */
async function analyzeStateInconsistencies(databaseInstances, evolutionInstances) {
  log('Analyzing state inconsistencies...', 'DIAGNOSE');
  
  const evolutionInstanceNames = new Set(
    evolutionInstances.map(inst => inst.instance?.instanceName).filter(Boolean)
  );
  
  const inconsistencies = {
    orphanedInDatabase: [],
    missingInEvolution: [],
    statusMismatches: []
  };
  
  // Check channel_instances
  for (const dbInstance of databaseInstances.channel_instances) {
    const instanceName = dbInstance.config?.whatsapp?.evolution_api?.instance_name || 
                        dbInstance.instance_name;
    
    if (instanceName) {
      if (!evolutionInstanceNames.has(instanceName)) {
        // Verify by direct API call
        const evolutionCheck = await checkInstanceInEvolutionAPI(instanceName);
        
        if (!evolutionCheck.exists) {
          inconsistencies.orphanedInDatabase.push({
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
  }
  
  // Check whatsapp_instances
  for (const dbInstance of databaseInstances.whatsapp_instances) {
    const instanceName = dbInstance.instance_name;
    
    if (instanceName && !evolutionInstanceNames.has(instanceName)) {
      const evolutionCheck = await checkInstanceInEvolutionAPI(instanceName);
      
      if (!evolutionCheck.exists) {
        inconsistencies.orphanedInDatabase.push({
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
  
  log(`Found ${inconsistencies.orphanedInDatabase.length} orphaned instances in database`, 'WARNING');
  
  return inconsistencies;
}

// =====================================================
// RESOLUTION FUNCTIONS
// =====================================================

/**
 * Clean up orphaned database instances
 */
async function cleanupOrphanedInstances(supabase, orphanedInstances) {
  log('Starting cleanup of orphaned instances...', 'FIX');
  
  const results = {
    cleaned: 0,
    failed: 0,
    errors: []
  };
  
  for (const orphan of orphanedInstances) {
    try {
      log(`Cleaning up orphaned instance: ${orphan.instanceName} (${orphan.type})`, 'FIX');
      
      if (CONFIG.DRY_RUN) {
        log(`[DRY RUN] Would delete ${orphan.type} record: ${orphan.id}`, 'INFO');
        results.cleaned++;
        continue;
      }
      
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
          p_actor_id: null,
          p_actor_type: 'system',
          p_details: {
            instanceName: orphan.instanceName,
            reason: 'Instance not found in Evolution API',
            evolutionError: orphan.evolutionError,
            cleanupTimestamp: new Date().toISOString()
          }
        });
      } catch (auditError) {
        log(`Failed to create audit log: ${auditError.message}`, 'WARNING');
      }
      
      results.cleaned++;
      log(`Successfully cleaned up: ${orphan.instanceName}`, 'SUCCESS');
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        instanceName: orphan.instanceName,
        error: error.message
      });
      log(`Failed to clean up ${orphan.instanceName}: ${error.message}`, 'ERROR');
    }
  }
  
  return results;
}

/**
 * Force sync using WhatsAppStateSyncService
 */
async function forceSyncAllInstances(supabase) {
  log('Triggering force sync for all instances...', 'FIX');
  
  try {
    // Get all organizations with WhatsApp instances
    const { data: orgs } = await supabase
      .from('channel_instances')
      .select('organization_id')
      .eq('channel_type', 'whatsapp')
      .not('organization_id', 'is', null);
    
    const uniqueOrgs = [...new Set(orgs?.map(o => o.organization_id) || [])];
    
    log(`Found ${uniqueOrgs.length} organizations with WhatsApp instances`, 'INFO');
    
    // Trigger sync for each organization
    for (const orgId of uniqueOrgs) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/instances/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organizationId: orgId,
            force: true
          })
        });
        
        if (response.ok) {
          log(`Sync triggered for organization: ${orgId}`, 'SUCCESS');
        } else {
          log(`Sync failed for organization: ${orgId}`, 'WARNING');
        }
      } catch (syncError) {
        log(`Sync error for organization ${orgId}: ${syncError.message}`, 'ERROR');
      }
    }
    
  } catch (error) {
    log(`Force sync failed: ${error.message}`, 'ERROR');
  }
}

// =====================================================
// MAIN DIAGNOSTIC FUNCTION
// =====================================================

async function runDiagnostic() {
  log('🚀 Starting WhatsApp State Inconsistency Diagnostic', 'INFO');
  
  if (CONFIG.DRY_RUN) {
    log('Running in DRY RUN mode - no changes will be made', 'WARNING');
  }
  
  try {
    // Initialize services
    const supabase = initSupabase();
    
    // Step 1: Gather data
    const [databaseInstances, evolutionInstances] = await Promise.all([
      getDatabaseInstances(supabase),
      getEvolutionAPIInstances()
    ]);
    
    // Step 2: Analyze inconsistencies
    const inconsistencies = await analyzeStateInconsistencies(databaseInstances, evolutionInstances);
    
    // Step 3: Report findings
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC RESULTS');
    console.log('='.repeat(60));
    console.log(`Database Instances: ${databaseInstances.total}`);
    console.log(`Evolution API Instances: ${evolutionInstances.length}`);
    console.log(`Orphaned in Database: ${inconsistencies.orphanedInDatabase.length}`);
    
    if (inconsistencies.orphanedInDatabase.length > 0) {
      console.log('\n🚨 ORPHANED INSTANCES FOUND:');
      inconsistencies.orphanedInDatabase.forEach((orphan, index) => {
        console.log(`${index + 1}. ${orphan.instanceName} (${orphan.type})`);
        console.log(`   ID: ${orphan.id}`);
        console.log(`   Status: ${orphan.status}`);
        console.log(`   Organization: ${orphan.organizationId}`);
        console.log(`   Evolution Error: ${orphan.evolutionError}`);
        console.log('');
      });
    }
    
    // Step 4: Offer resolution
    if (inconsistencies.orphanedInDatabase.length > 0) {
      if (CONFIG.FORCE_CLEANUP || CONFIG.DRY_RUN) {
        const cleanupResults = await cleanupOrphanedInstances(supabase, inconsistencies.orphanedInDatabase);
        
        console.log('\n🔧 CLEANUP RESULTS:');
        console.log(`Cleaned: ${cleanupResults.cleaned}`);
        console.log(`Failed: ${cleanupResults.failed}`);
        
        if (cleanupResults.errors.length > 0) {
          console.log('\nErrors:');
          cleanupResults.errors.forEach(error => {
            console.log(`- ${error.instanceName}: ${error.error}`);
          });
        }
      } else {
        console.log('\n💡 RECOMMENDED ACTIONS:');
        console.log('1. Run with --force-cleanup to automatically clean orphaned instances');
        console.log('2. Or manually delete the orphaned instances from the database');
        console.log('3. Run with --dry-run first to see what would be changed');
      }
      
      // Trigger sync
      await forceSyncAllInstances(supabase);
    } else {
      log('✅ No state inconsistencies found!', 'SUCCESS');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    log(`Diagnostic failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// =====================================================
// SCRIPT EXECUTION
// =====================================================

if (require.main === module) {
  runDiagnostic().catch(error => {
    log(`Script failed: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  runDiagnostic,
  getDatabaseInstances,
  getEvolutionAPIInstances,
  analyzeStateInconsistencies,
  cleanupOrphanedInstances
};
