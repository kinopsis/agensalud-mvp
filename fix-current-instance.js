#!/usr/bin/env node

/**
 * Fix Current WhatsApp Instance
 * Intenta recuperar o recrear la instancia actual
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  EVOLUTION_API_URL: (process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com').replace(/\/$/, ''),
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY
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

async function checkEvolutionInstance(instanceName) {
  try {
    const url = `${CONFIG.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { exists: true, status: data };
    } else {
      return { exists: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function recreateEvolutionInstance(instanceName) {
  try {
    log(`Attempting to recreate Evolution instance: ${instanceName}`, 'FIX');
    
    const response = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      log(`Evolution instance recreated successfully`, 'SUCCESS');
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      return { success: false, error: `${response.status}: ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function configureWebhook(instanceName, organizationId) {
  try {
    log(`Configuring webhook for instance: ${instanceName}`, 'FIX');
    
    const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${organizationId}`;
    
    const response = await fetch(`${CONFIG.EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: false,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'STATUS_INSTANCE'
        ]
      })
    });
    
    if (response.ok) {
      log(`Webhook configured successfully: ${webhookUrl}`, 'SUCCESS');
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: `${response.status}: ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔧 Fix Current WhatsApp Instance');
  console.log('=================================');
  
  try {
    // Initialize Supabase
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
    log('Connected to Supabase', 'SUCCESS');
    
    // Get current instance
    const { data: instances, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !instances || instances.length === 0) {
      log('No instances found to fix', 'WARNING');
      return;
    }
    
    const instance = instances[0];
    log(`Found instance: ${instance.evolution_instance_name}`, 'INFO');
    log(`Current status: ${instance.status}`, 'INFO');
    
    // Check if instance exists in Evolution API
    const evolutionCheck = await checkEvolutionInstance(instance.evolution_instance_name);
    
    if (evolutionCheck.exists) {
      log('Instance exists in Evolution API', 'SUCCESS');
      console.log('Evolution Status:', evolutionCheck.status);
      
      // Update database status to match Evolution API
      const evolutionState = evolutionCheck.status.state;
      if (instance.status !== evolutionState) {
        log(`Updating database status from ${instance.status} to ${evolutionState}`, 'FIX');
        
        const { error: updateError } = await supabase
          .from('whatsapp_instances_simple')
          .update({
            status: evolutionState,
            updated_at: new Date().toISOString()
          })
          .eq('id', instance.id);
        
        if (updateError) {
          log(`Failed to update database: ${updateError.message}`, 'ERROR');
        } else {
          log('Database status updated successfully', 'SUCCESS');
        }
      }
    } else {
      log(`Instance does not exist in Evolution API: ${evolutionCheck.error}`, 'ERROR');
      
      // Try to recreate the instance
      const recreateResult = await recreateEvolutionInstance(instance.evolution_instance_name);
      
      if (recreateResult.success) {
        log('Instance recreated successfully', 'SUCCESS');
        
        // Configure webhook
        const webhookResult = await configureWebhook(instance.evolution_instance_name, instance.organization_id);
        
        if (webhookResult.success) {
          log('Webhook configured successfully', 'SUCCESS');
        } else {
          log(`Webhook configuration failed: ${webhookResult.error}`, 'WARNING');
        }
        
        // Update database status
        const { error: updateError } = await supabase
          .from('whatsapp_instances_simple')
          .update({
            status: 'connecting',
            updated_at: new Date().toISOString()
          })
          .eq('id', instance.id);
        
        if (updateError) {
          log(`Failed to update database: ${updateError.message}`, 'ERROR');
        } else {
          log('Database status updated to connecting', 'SUCCESS');
        }
      } else {
        log(`Failed to recreate instance: ${recreateResult.error}`, 'ERROR');
      }
    }
    
    // Final status check
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL STATUS');
    console.log('='.repeat(50));
    
    const finalEvolutionCheck = await checkEvolutionInstance(instance.evolution_instance_name);
    if (finalEvolutionCheck.exists) {
      log('✅ Instance is now available in Evolution API', 'SUCCESS');
      console.log('Evolution Status:', finalEvolutionCheck.status);
    } else {
      log('❌ Instance still not available in Evolution API', 'ERROR');
    }
    
    // Get updated database status
    const { data: updatedInstance } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .eq('id', instance.id)
      .single();
    
    if (updatedInstance) {
      log(`Database status: ${updatedInstance.status}`, 'INFO');
    }
    
    log('Fix process completed', 'SUCCESS');
    log('Please refresh the frontend to see updated status', 'INFO');
    
  } catch (error) {
    log(`Fix failed: ${error.message}`, 'ERROR');
    console.error('Full error:', error);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}
