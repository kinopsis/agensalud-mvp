#!/usr/bin/env node

/**
 * PRODUCTION WEBHOOK CONFIGURATION VALIDATOR
 * 
 * Validates that all webhook configurations are pointing to the correct
 * production URLs and that the webhook endpoints are reachable.
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 */

const fetch = require('node-fetch');
require('dotenv').config();

// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
  expectedProductionUrl: 'https://agendia.torrecentral.com',
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
    'VALIDATION': '🔍'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate environment variables
 */
function validateEnvironmentVariables() {
  log('Validating environment variables...', 'VALIDATION');
  
  const issues = [];
  
  // Check NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    issues.push('NEXT_PUBLIC_APP_URL is not set');
  } else if (appUrl !== CONFIG.expectedProductionUrl) {
    issues.push(`NEXT_PUBLIC_APP_URL is "${appUrl}", expected "${CONFIG.expectedProductionUrl}"`);
  } else {
    log(`✅ NEXT_PUBLIC_APP_URL correctly set to: ${appUrl}`, 'SUCCESS');
  }
  
  // Check NEXTAUTH_URL
  const authUrl = process.env.NEXTAUTH_URL;
  if (!authUrl) {
    issues.push('NEXTAUTH_URL is not set');
  } else if (authUrl !== CONFIG.expectedProductionUrl) {
    issues.push(`NEXTAUTH_URL is "${authUrl}", expected "${CONFIG.expectedProductionUrl}"`);
  } else {
    log(`✅ NEXTAUTH_URL correctly set to: ${authUrl}`, 'SUCCESS');
  }
  
  // Check Evolution API config
  if (!CONFIG.evolutionApiKey) {
    issues.push('EVOLUTION_API_KEY is not set');
  } else {
    log('✅ EVOLUTION_API_KEY is configured', 'SUCCESS');
  }
  
  if (!CONFIG.evolutionApiUrl) {
    issues.push('EVOLUTION_API_BASE_URL is not set');
  } else {
    log(`✅ EVOLUTION_API_BASE_URL set to: ${CONFIG.evolutionApiUrl}`, 'SUCCESS');
  }
  
  return issues;
}

/**
 * Get webhook configuration for an instance
 */
async function getWebhookConfig(instanceName) {
  try {
    const response = await fetch(`${CONFIG.evolutionApiUrl}/webhook/find/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': CONFIG.evolutionApiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    log(`Failed to get webhook config for ${instanceName}: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Validate webhook configurations for all instances
 */
async function validateWebhookConfigurations() {
  try {
    log('Validating webhook configurations...', 'VALIDATION');
    
    // Get instances from database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .not('instance_name', 'is', null);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    log(`Found ${instances.length} instances to validate`, 'INFO');
    
    const issues = [];
    let validCount = 0;
    
    for (const instance of instances) {
      log(`Checking webhook for instance: ${instance.instance_name}`, 'VALIDATION');
      
      const webhookConfig = await getWebhookConfig(instance.instance_name);
      
      if (!webhookConfig) {
        issues.push(`No webhook configuration found for instance: ${instance.instance_name}`);
        continue;
      }
      
      const webhookUrl = webhookConfig.url || webhookConfig.webhook?.url;
      
      if (!webhookUrl) {
        issues.push(`No webhook URL configured for instance: ${instance.instance_name}`);
        continue;
      }
      
      // Check if URL contains localhost
      if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
        issues.push(`Instance ${instance.instance_name} has localhost webhook: ${webhookUrl}`);
        continue;
      }
      
      // Check if URL matches expected production URL
      const expectedWebhookUrl = `${CONFIG.expectedProductionUrl}/api/whatsapp/simple/webhook/${instance.organization_id}`;
      
      if (webhookUrl !== expectedWebhookUrl) {
        issues.push(`Instance ${instance.instance_name} webhook mismatch:\n  Current: ${webhookUrl}\n  Expected: ${expectedWebhookUrl}`);
        continue;
      }
      
      log(`✅ Instance ${instance.instance_name} webhook correctly configured`, 'SUCCESS');
      validCount++;
    }
    
    log(`Webhook validation complete: ${validCount}/${instances.length} instances valid`, 
        validCount === instances.length ? 'SUCCESS' : 'WARNING');
    
    return issues;
    
  } catch (error) {
    log(`Failed to validate webhook configurations: ${error.message}`, 'ERROR');
    return [`Webhook validation failed: ${error.message}`];
  }
}

/**
 * Test webhook endpoint connectivity
 */
async function testWebhookEndpoints() {
  try {
    log('Testing webhook endpoint connectivity...', 'VALIDATION');
    
    const testUrls = [
      `${CONFIG.expectedProductionUrl}/api/whatsapp/simple/webhook/test`,
      `${CONFIG.expectedProductionUrl}/api/webhooks/evolution/test`,
      `${CONFIG.expectedProductionUrl}/api/channels/whatsapp/webhook`
    ];
    
    const results = [];
    
    for (const url of testUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'AgentSalud-Webhook-Validator/1.0'
          },
          timeout: 10000
        });
        
        results.push({
          url,
          status: response.status,
          reachable: true
        });
        
        log(`✅ ${url} - Status: ${response.status}`, 'SUCCESS');
        
      } catch (error) {
        results.push({
          url,
          error: error.message,
          reachable: false
        });
        
        log(`❌ ${url} - Error: ${error.message}`, 'ERROR');
      }
    }
    
    return results;
    
  } catch (error) {
    log(`Failed to test webhook endpoints: ${error.message}`, 'ERROR');
    return [];
  }
}

// =====================================================
// MAIN VALIDATION
// =====================================================

async function main() {
  try {
    log('🔍 STARTING PRODUCTION WEBHOOK CONFIGURATION VALIDATION', 'VALIDATION');
    
    const allIssues = [];
    
    // 1. Validate environment variables
    const envIssues = validateEnvironmentVariables();
    allIssues.push(...envIssues);
    
    // 2. Validate webhook configurations
    const webhookIssues = await validateWebhookConfigurations();
    allIssues.push(...webhookIssues);
    
    // 3. Test webhook endpoint connectivity
    const connectivityResults = await testWebhookEndpoints();
    
    // 4. Generate report
    log('📊 VALIDATION REPORT', 'INFO');
    log('='.repeat(50), 'INFO');
    
    if (allIssues.length === 0) {
      log('🎉 ALL VALIDATIONS PASSED - Configuration is correct!', 'SUCCESS');
    } else {
      log(`⚠️ FOUND ${allIssues.length} CONFIGURATION ISSUES:`, 'WARNING');
      allIssues.forEach((issue, index) => {
        log(`${index + 1}. ${issue}`, 'ERROR');
      });
    }
    
    log('\n📡 WEBHOOK CONNECTIVITY RESULTS:', 'INFO');
    connectivityResults.forEach(result => {
      if (result.reachable) {
        log(`✅ ${result.url} - Reachable (${result.status})`, 'SUCCESS');
      } else {
        log(`❌ ${result.url} - Not reachable: ${result.error}`, 'ERROR');
      }
    });
    
    // Exit with error code if issues found
    if (allIssues.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    log(`VALIDATION FAILED: ${error.message}`, 'ERROR');
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

module.exports = { main, validateEnvironmentVariables, validateWebhookConfigurations };
