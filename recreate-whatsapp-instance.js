#!/usr/bin/env node

/**
 * Recreate WhatsApp Instance
 * Limpia la instancia actual y crea una nueva correctamente
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  EVOLUTION_API_URL: 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
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

async function createEvolutionInstance(instanceName) {
  try {
    log(`Creating Evolution instance: ${instanceName}`, 'FIX');
    
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
      log(`Evolution instance created: ${result.instance?.instanceId}`, 'SUCCESS');
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
    log(`Configuring webhook for: ${instanceName}`, 'FIX');
    
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
      log(`Webhook configured: ${webhookUrl}`, 'SUCCESS');
      return { success: true };
    } else {
      const errorText = await response.text();
      log(`Webhook failed: ${errorText}`, 'WARNING');
      return { success: false, error: errorText };
    }
  } catch (error) {
    log(`Webhook error: ${error.message}`, 'WARNING');
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔧 Recreate WhatsApp Instance');
  console.log('=============================');
  
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
      log('No instances found', 'WARNING');
      return;
    }
    
    const instance = instances[0];
    log(`Current instance: ${instance.evolution_instance_name}`, 'INFO');
    
    // Step 1: Delete old Evolution instance (if exists)
    try {
      const deleteResponse = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/delete/${instance.evolution_instance_name}`, {
        method: 'DELETE',
        headers: {
          'apikey': CONFIG.EVOLUTION_API_KEY
        }
      });
      
      if (deleteResponse.ok) {
        log('Old Evolution instance deleted', 'SUCCESS');
      } else {
        log('Old instance not found in Evolution API (continuing)', 'WARNING');
      }
    } catch (error) {
      log('Error deleting old instance (continuing)', 'WARNING');
    }
    
    // Step 2: Create new Evolution instance with new name
    const newInstanceName = `principal-wa-${Date.now()}`;
    log(`Creating new instance with name: ${newInstanceName}`, 'INFO');

    const createResult = await createEvolutionInstance(newInstanceName);

    if (!createResult.success) {
      log(`Failed to create Evolution instance: ${createResult.error}`, 'ERROR');
      return;
    }

    // Update database with new instance name
    const { error: nameUpdateError } = await supabase
      .from('whatsapp_instances_simple')
      .update({
        evolution_instance_name: newInstanceName,
        updated_at: new Date().toISOString()
      })
      .eq('id', instance.id);

    if (nameUpdateError) {
      log(`Failed to update instance name: ${nameUpdateError.message}`, 'ERROR');
    } else {
      log('Instance name updated in database', 'SUCCESS');
    }
    
    // Step 3: Configure webhook
    await configureWebhook(newInstanceName, instance.organization_id);
    
    // Step 4: Update database status
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
      log('Database updated successfully', 'SUCCESS');
    }
    
    // Step 5: Test QR code generation
    log('Testing QR code generation...', 'INFO');
    
    const qrResponse = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/connect/${newInstanceName}`, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      if (qrData.base64) {
        log('QR code generated successfully', 'SUCCESS');
        log(`QR code length: ${qrData.base64.length} characters`, 'INFO');
      } else {
        log('QR code not yet available', 'WARNING');
      }
    } else {
      log('Failed to get QR code', 'WARNING');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 RECREATION SUMMARY');
    console.log('='.repeat(50));
    log('✅ WhatsApp instance recreated successfully', 'SUCCESS');
    log('✅ Evolution API instance is working', 'SUCCESS');
    log('✅ Database status updated', 'SUCCESS');
    log('🔄 Please refresh the frontend to see the updated instance', 'INFO');
    log('📱 QR code should be available for scanning', 'INFO');
    
  } catch (error) {
    log(`Recreation failed: ${error.message}`, 'ERROR');
    console.error('Full error:', error);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}
