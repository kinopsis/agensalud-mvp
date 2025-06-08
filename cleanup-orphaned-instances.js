#!/usr/bin/env node

/**
 * Cleanup Orphaned WhatsApp Instances
 * Specifically targets whatsapp_instances_simple table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DRY_RUN: process.argv.includes('--dry-run')
};

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

async function main() {
  console.log('🔧 Cleanup Orphaned WhatsApp Instances');
  console.log('=====================================');
  
  if (CONFIG.DRY_RUN) {
    log('Running in DRY RUN mode - no changes will be made', 'WARNING');
  }
  
  try {
    // Initialize Supabase
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
    log('Connected to Supabase', 'SUCCESS');
    
    // Target the specific orphaned instances
    const orphanedInstanceIds = [
      '693b032b-bdd2-4ae4-91eb-83a031aef568', // polo-wa-1749344454996
      'bc3f6952-378a-4dc4-9d1e-1e8f8f426967'  // kinopsis-wa-1749354590178
    ];
    
    log(`Targeting ${orphanedInstanceIds.length} orphaned instances for cleanup`, 'INFO');
    
    let cleanedCount = 0;
    let errors = [];
    
    for (const instanceId of orphanedInstanceIds) {
      try {
        // Get instance details first
        const { data: instance, error: fetchError } = await supabase
          .from('whatsapp_instances_simple')
          .select('*')
          .eq('id', instanceId)
          .single();
        
        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            log(`Instance ${instanceId} already deleted`, 'INFO');
            continue;
          }
          throw new Error(`Failed to fetch instance: ${fetchError.message}`);
        }
        
        log(`Processing: ${instance.evolution_instance_name || instance.instance_name} (${instanceId})`, 'FIX');
        
        if (CONFIG.DRY_RUN) {
          log(`[DRY RUN] Would delete instance: ${instance.evolution_instance_name}`, 'INFO');
          cleanedCount++;
          continue;
        }
        
        // Delete the orphaned instance
        const { error: deleteError } = await supabase
          .from('whatsapp_instances_simple')
          .delete()
          .eq('id', instanceId);
        
        if (deleteError) {
          throw new Error(`Database deletion failed: ${deleteError.message}`);
        }
        
        // Create audit log
        try {
          await supabase.rpc('create_channel_audit_log', {
            p_organization_id: instance.organization_id,
            p_channel_type: 'whatsapp',
            p_instance_id: instanceId,
            p_action: 'orphaned_instance_cleaned',
            p_actor_id: null,
            p_actor_type: 'cleanup_script',
            p_details: {
              instanceName: instance.evolution_instance_name || instance.instance_name,
              table: 'whatsapp_instances_simple',
              reason: 'Instance not found in Evolution API',
              cleanupTimestamp: new Date().toISOString(),
              scriptVersion: '1.0'
            }
          });
        } catch (auditError) {
          log(`Warning: Could not create audit log: ${auditError.message}`, 'WARNING');
        }
        
        cleanedCount++;
        log(`✅ Successfully cleaned: ${instance.evolution_instance_name}`, 'SUCCESS');
        
      } catch (error) {
        errors.push({
          instanceId,
          error: error.message
        });
        log(`❌ Failed to clean ${instanceId}: ${error.message}`, 'ERROR');
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CLEANUP RESULTS');
    console.log('='.repeat(50));
    console.log(`Instances processed: ${orphanedInstanceIds.length}`);
    console.log(`Successfully cleaned: ${cleanedCount}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(error => {
        console.log(`- ${error.instanceId}: ${error.error}`);
      });
    }
    
    if (cleanedCount > 0 && !CONFIG.DRY_RUN) {
      console.log('\n✅ SUCCESS! Orphaned instances have been cleaned up.');
      console.log('💡 Please refresh your browser to see the updated state in the frontend.');
      console.log('🔍 The "kinopsis" instance should no longer appear in the UI.');
    } else if (CONFIG.DRY_RUN) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply the cleanup.');
    }
    
  } catch (error) {
    log(`Cleanup failed: ${error.message}`, 'ERROR');
    console.error('Full error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}
