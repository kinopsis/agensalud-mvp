#!/usr/bin/env node

/**
 * SIMPLE WEBHOOK FIX FOR PRODUCTION
 * 
 * Updates webhook configurations to point to production URLs
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 */

require('dotenv').config();
const https = require('https');

// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
  productionUrl: 'https://agendia.torrecentral.com',
  evolutionApiUrl: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// =====================================================
// LOGGING
// =====================================================
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'FIX': '🔧'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// HTTP REQUEST HELPER
// =====================================================
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.evolutionApiKey,
        ...options.headers
      },
      timeout: 30000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// =====================================================
// WEBHOOK CONFIGURATION FUNCTIONS
// =====================================================

async function getEvolutionInstances() {
  try {
    log('Fetching instances from Evolution API...', 'INFO');
    
    const response = await makeRequest(`${CONFIG.evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const instances = JSON.parse(response.data);
    log(`Found ${instances.length} instances in Evolution API`, 'INFO');
    
    return instances;
  } catch (error) {
    log(`Failed to fetch Evolution instances: ${error.message}`, 'ERROR');
    return [];
  }
}

async function configureWebhookForInstance(instanceName, organizationId) {
  try {
    log(`Configuring webhook for: ${instanceName}`, 'FIX');
    
    const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${organizationId}`;
    
    log(`Setting webhook URL: ${webhookUrl}`, 'INFO');
    
    const payload = {
      url: webhookUrl,
      webhook_by_events: true,
      webhook_base64: false,
      events: [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'STATUS_INSTANCE'
      ]
    };

    const response = await makeRequest(`${CONFIG.evolutionApiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(response.data);
      } catch {
        errorData = { message: response.statusText };
      }
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }

    log(`✅ Webhook configured successfully for ${instanceName}`, 'SUCCESS');
    return true;

  } catch (error) {
    log(`❌ Failed to configure webhook for ${instanceName}: ${error.message}`, 'ERROR');
    return false;
  }
}

async function checkWebhookConfiguration(instanceName) {
  try {
    const response = await makeRequest(`${CONFIG.evolutionApiUrl}/webhook/find/${instanceName}`, {
      method: 'GET'
    });

    if (!response.ok) {
      return null;
    }

    const webhookConfig = JSON.parse(response.data);
    return webhookConfig;
  } catch (error) {
    log(`Failed to check webhook for ${instanceName}: ${error.message}`, 'ERROR');
    return null;
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  try {
    log('🚨 STARTING PRODUCTION WEBHOOK FIX', 'FIX');
    log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');
    log(`Evolution API: ${CONFIG.evolutionApiUrl}`, 'INFO');

    // Validate configuration
    if (!CONFIG.evolutionApiKey) {
      throw new Error('EVOLUTION_API_KEY not configured');
    }

    // Get all instances from Evolution API
    const instances = await getEvolutionInstances();
    
    if (instances.length === 0) {
      log('No instances found in Evolution API', 'WARNING');
      return;
    }

    // Process each instance
    let successCount = 0;
    let errorCount = 0;
    const organizationId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // From logs

    for (const instanceData of instances) {
      const instanceName = instanceData.instance?.instanceName;
      
      if (!instanceName) {
        log('Instance without name found, skipping...', 'WARNING');
        continue;
      }

      try {
        log(`\nProcessing instance: ${instanceName}`, 'INFO');
        
        // Check current webhook configuration
        const currentWebhook = await checkWebhookConfiguration(instanceName);
        
        if (currentWebhook) {
          const currentUrl = currentWebhook.url || currentWebhook.webhook?.url;
          log(`Current webhook URL: ${currentUrl || 'Not set'}`, 'INFO');
          
          if (currentUrl && currentUrl.includes(CONFIG.productionUrl)) {
            log(`✅ Webhook already points to production URL`, 'SUCCESS');
            successCount++;
            continue;
          }
        }

        // Configure webhook
        const success = await configureWebhookForInstance(instanceName, organizationId);
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        log(`Failed to process instance ${instanceName}: ${error.message}`, 'ERROR');
        errorCount++;
      }
    }

    // Summary
    log('\n🏁 WEBHOOK FIX COMPLETED', 'SUCCESS');
    log(`✅ Successfully processed: ${successCount} instances`, 'SUCCESS');
    log(`❌ Failed to process: ${errorCount} instances`, errorCount > 0 ? 'ERROR' : 'INFO');
    
    if (errorCount > 0) {
      log('⚠️ Some instances failed to update. Check logs above for details.', 'WARNING');
      process.exit(1);
    } else {
      log('🎉 All webhooks updated successfully!', 'SUCCESS');
    }

  } catch (error) {
    log(`CRITICAL ERROR: ${error.message}`, 'ERROR');
    console.error(error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { main };
