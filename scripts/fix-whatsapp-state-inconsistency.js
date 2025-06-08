#!/usr/bin/env node

/**
 * Quick Fix Script for WhatsApp State Inconsistency
 * 
 * Resolves the specific problem where a WhatsApp instance was deleted
 * from Evolution API backend but still persists in the frontend.
 * 
 * Usage:
 *   node scripts/fix-whatsapp-state-inconsistency.js
 *   node scripts/fix-whatsapp-state-inconsistency.js --dry-run
 *   node scripts/fix-whatsapp-state-inconsistency.js --instance-id=<id>
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
  SPECIFIC_INSTANCE: process.argv.find(arg => arg.startsWith('--instance-id='))?.split('=')[1],
  VERBOSE: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'FIX': '🔧'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function initSupabase() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
}

async function checkEvolutionAPI(instanceName) {
  try {
    const response = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { exists: true, status: data };
    } else if (response.status === 404) {
      return { exists: false, error: 'Instance not found in Evolution API' };
    } else {
      throw new Error(`Evolution API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return { exists: false, error: error.message };
    }
    throw error;
  }
}

// =====================================================
// MAIN FUNCTIONS
// =====================================================

async function findProblematicInstances(supabase) {
  log('🔍 Searching for problematic WhatsApp instances...', 'INFO');
  
  const problematicInstances = [];
  
  // Check channel_instances table
  const { data: channelInstances, error: channelError } = await supabase
    .from('channel_instances')
    .select('*')
    .eq('channel_type', 'whatsapp');
  
  if (channelError) {
    throw new Error(`Failed to fetch channel instances: ${channelError.message}`);
  }
  
  // Check whatsapp_instances table
  const { data: whatsappInstances, error: whatsappError } = await supabase
    .from('whatsapp_instances')
    .select('*');
  
  if (whatsappError) {
    log(`Warning: Could not fetch whatsapp_instances: ${whatsappError.message}`, 'WARNING');
  }
  
  // Process channel_instances
  for (const instance of channelInstances || []) {
    if (CONFIG.SPECIFIC_INSTANCE && instance.id !== CONFIG.SPECIFIC_INSTANCE) {
      continue;
    }
    
    const instanceName = instance.config?.whatsapp?.evolution_api?.instance_name || 
                        instance.instance_name;
    
    if (instanceName) {
      log(`Checking instance: ${instanceName} (${instance.id})`, 'INFO');
      
      const evolutionCheck = await checkEvolutionAPI(instanceName);
      
      if (!evolutionCheck.exists) {
        problematicInstances.push({
          table: 'channel_instances',
          id: instance.id,
          instanceName,
          status: instance.status,
          organizationId: instance.organization_id,
          createdAt: instance.created_at,
          evolutionError: evolutionCheck.error,
          data: instance
        });
        
        log(`❌ Found orphaned instance: ${instanceName} (not in Evolution API)`, 'WARNING');
      } else {
        log(`✅ Instance OK: ${instanceName}`, 'SUCCESS');
      }
    }
  }
  
  // Process whatsapp_instances if available
  for (const instance of whatsappInstances || []) {
    if (CONFIG.SPECIFIC_INSTANCE && instance.id !== CONFIG.SPECIFIC_INSTANCE) {
      continue;
    }
    
    const instanceName = instance.instance_name;
    
    if (instanceName) {
      log(`Checking legacy instance: ${instanceName} (${instance.id})`, 'INFO');
      
      const evolutionCheck = await checkEvolutionAPI(instanceName);
      
      if (!evolutionCheck.exists) {
        problematicInstances.push({
          table: 'whatsapp_instances',
          id: instance.id,
          instanceName,
          status: instance.status,
          organizationId: instance.organization_id,
          createdAt: instance.created_at,
          evolutionError: evolutionCheck.error,
          data: instance
        });
        
        log(`❌ Found orphaned legacy instance: ${instanceName}`, 'WARNING');
      } else {
        log(`✅ Legacy instance OK: ${instanceName}`, 'SUCCESS');
      }
    }
  }
  
  return problematicInstances;
}

async function fixProblematicInstances(supabase, problematicInstances) {
  log(`🔧 Starting fix for ${problematicInstances.length} problematic instances...`, 'FIX');
  
  const results = {
    fixed: 0,
    failed: 0,
    errors: []
  };
  
  for (const instance of problematicInstances) {
    try {
      log(`Fixing: ${instance.instanceName} (${instance.table})`, 'FIX');
      
      if (CONFIG.DRY_RUN) {
        log(`[DRY RUN] Would delete ${instance.table} record: ${instance.id}`, 'INFO');
        results.fixed++;
        continue;
      }
      
      // Delete the orphaned instance
      const { error } = await supabase
        .from(instance.table)
        .delete()
        .eq('id', instance.id);
      
      if (error) {
        throw new Error(`Database deletion failed: ${error.message}`);
      }
      
      // Create audit log
      try {
        await supabase.rpc('create_channel_audit_log', {
          p_organization_id: instance.organizationId,
          p_channel_type: 'whatsapp',
          p_instance_id: instance.id,
          p_action: 'orphaned_instance_fixed',
          p_actor_id: null,
          p_actor_type: 'system_script',
          p_details: {
            instanceName: instance.instanceName,
            table: instance.table,
            reason: 'Instance not found in Evolution API',
            evolutionError: instance.evolutionError,
            fixedAt: new Date().toISOString(),
            scriptVersion: '1.0'
          }
        });
      } catch (auditError) {
        log(`Warning: Could not create audit log: ${auditError.message}`, 'WARNING');
      }
      
      results.fixed++;
      log(`✅ Fixed: ${instance.instanceName}`, 'SUCCESS');
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        instanceName: instance.instanceName,
        error: error.message
      });
      log(`❌ Failed to fix ${instance.instanceName}: ${error.message}`, 'ERROR');
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 WhatsApp State Inconsistency Fix Script');
  console.log('==========================================');
  
  if (CONFIG.DRY_RUN) {
    log('Running in DRY RUN mode - no changes will be made', 'WARNING');
  }
  
  if (CONFIG.SPECIFIC_INSTANCE) {
    log(`Targeting specific instance: ${CONFIG.SPECIFIC_INSTANCE}`, 'INFO');
  }
  
  try {
    // Initialize Supabase
    const supabase = initSupabase();
    log('Connected to Supabase', 'SUCCESS');
    
    // Find problematic instances
    const problematicInstances = await findProblematicInstances(supabase);
    
    if (problematicInstances.length === 0) {
      log('🎉 No problematic instances found! All instances are in sync.', 'SUCCESS');
      return;
    }
    
    // Display findings
    console.log('\n📊 FINDINGS:');
    console.log(`Found ${problematicInstances.length} problematic instance(s):`);
    
    problematicInstances.forEach((instance, index) => {
      console.log(`\n${index + 1}. ${instance.instanceName}`);
      console.log(`   Table: ${instance.table}`);
      console.log(`   ID: ${instance.id}`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Organization: ${instance.organizationId}`);
      console.log(`   Evolution Error: ${instance.evolutionError}`);
    });
    
    // Fix the instances
    const results = await fixProblematicInstances(supabase, problematicInstances);
    
    // Display results
    console.log('\n🎯 RESULTS:');
    console.log(`Fixed: ${results.fixed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => {
        console.log(`- ${error.instanceName}: ${error.error}`);
      });
    }
    
    if (results.fixed > 0 && !CONFIG.DRY_RUN) {
      console.log('\n✅ SUCCESS! The problematic instances have been cleaned up.');
      console.log('💡 Please refresh your browser to see the updated state in the frontend.');
    } else if (CONFIG.DRY_RUN) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply the fixes.');
    }
    
  } catch (error) {
    log(`Script failed: ${error.message}`, 'ERROR');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// =====================================================
// SCRIPT EXECUTION
// =====================================================

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  main,
  findProblematicInstances,
  fixProblematicInstances
};
