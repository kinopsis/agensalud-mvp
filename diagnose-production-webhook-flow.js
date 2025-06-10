#!/usr/bin/env node

/**
 * PRODUCTION WEBHOOK FLOW DIAGNOSTIC TOOL
 * 
 * Analyzes the current state of WhatsApp webhook flow in production
 * to identify why the flow stops after QR code synchronization.
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 * @priority CRITICAL
 */

require('dotenv').config();

// Import fetch for Node.js
let fetch;
(async () => {
  const { default: nodeFetch } = await import('node-fetch');
  fetch = nodeFetch;
})();

// =====================================================
// PRODUCTION CONFIGURATION
// =====================================================
const CONFIG = {
  productionUrl: 'https://agendia.torrecentral.com',
  evolutionApiUrl: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// =====================================================
// LOGGING UTILITIES
// =====================================================
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'WEBHOOK': '🔗',
    'DATABASE': '🗄️',
    'ANALYSIS': '🔍'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// DIAGNOSTIC FUNCTIONS
// =====================================================

/**
 * Check current environment variables
 */
function checkEnvironmentVariables() {
  log('Checking environment variables...', 'ANALYSIS');
  
  const envVars = {
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
    'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
    'EVOLUTION_API_BASE_URL': process.env.EVOLUTION_API_BASE_URL,
    'EVOLUTION_API_KEY': process.env.EVOLUTION_API_KEY ? '***CONFIGURED***' : 'NOT SET'
  };
  
  console.log('\n📊 ENVIRONMENT VARIABLES:');
  console.log('='.repeat(50));
  
  Object.entries(envVars).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    console.log(`${status} ${key}: ${value || 'NOT SET'}`);
    
    if (key === 'NEXT_PUBLIC_APP_URL' && value !== CONFIG.productionUrl) {
      log(`⚠️ NEXT_PUBLIC_APP_URL mismatch! Expected: ${CONFIG.productionUrl}, Got: ${value}`, 'WARNING');
    }
  });
  
  return envVars;
}

/**
 * Get all WhatsApp instances from database
 */
async function getWhatsAppInstances() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    
    log('Fetching WhatsApp instances from database...', 'DATABASE');
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    log(`Found ${instances.length} WhatsApp instances`, 'DATABASE');
    return instances;

  } catch (error) {
    log(`Failed to fetch instances: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * Check webhook configuration for an instance
 */
async function checkWebhookConfiguration(instanceName) {
  try {
    log(`Checking webhook config for: ${instanceName}`, 'WEBHOOK');
    
    const response = await fetch(`${CONFIG.evolutionApiUrl}/webhook/find/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': CONFIG.evolutionApiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const webhookConfig = await response.json();
    return webhookConfig;

  } catch (error) {
    log(`Failed to get webhook config for ${instanceName}: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Check Evolution API instance status
 */
async function checkEvolutionInstanceStatus(instanceName) {
  try {
    log(`Checking Evolution API status for: ${instanceName}`, 'ANALYSIS');
    
    const response = await fetch(`${CONFIG.evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': CONFIG.evolutionApiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const instances = await response.json();
    const instance = instances.find(inst => inst.instance.instanceName === instanceName);
    
    return instance || null;

  } catch (error) {
    log(`Failed to get Evolution API status for ${instanceName}: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Test webhook endpoint connectivity
 */
async function testWebhookEndpoint(organizationId) {
  try {
    const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${organizationId}`;
    
    log(`Testing webhook endpoint: ${webhookUrl}`, 'WEBHOOK');
    
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'AgentSalud-Webhook-Test/1.0'
      },
      timeout: 10000
    });

    const result = {
      url: webhookUrl,
      status: response.status,
      statusText: response.statusText,
      reachable: response.ok || response.status === 405 // 405 Method Not Allowed is OK for GET on POST endpoint
    };

    if (result.reachable) {
      log(`✅ Webhook endpoint reachable: ${result.status} ${result.statusText}`, 'SUCCESS');
    } else {
      log(`❌ Webhook endpoint not reachable: ${result.status} ${result.statusText}`, 'ERROR');
    }

    return result;

  } catch (error) {
    log(`Webhook endpoint test failed: ${error.message}`, 'ERROR');
    return {
      url: `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${organizationId}`,
      error: error.message,
      reachable: false
    };
  }
}

/**
 * Analyze instance flow status
 */
async function analyzeInstanceFlow(instance) {
  log(`\n🔍 ANALYZING INSTANCE: ${instance.display_name}`, 'ANALYSIS');
  console.log('='.repeat(60));
  
  const analysis = {
    instance: instance,
    webhookConfig: null,
    evolutionStatus: null,
    webhookConnectivity: null,
    issues: []
  };

  // 1. Check webhook configuration
  if (instance.evolution_instance_name) {
    analysis.webhookConfig = await checkWebhookConfiguration(instance.evolution_instance_name);
    
    if (analysis.webhookConfig) {
      const webhookUrl = analysis.webhookConfig.url || analysis.webhookConfig.webhook?.url;
      
      if (!webhookUrl) {
        analysis.issues.push('No webhook URL configured');
      } else if (webhookUrl.includes('localhost')) {
        analysis.issues.push(`Webhook still pointing to localhost: ${webhookUrl}`);
      } else if (!webhookUrl.includes(CONFIG.productionUrl)) {
        analysis.issues.push(`Webhook URL incorrect: ${webhookUrl}`);
      } else {
        log(`✅ Webhook URL correct: ${webhookUrl}`, 'SUCCESS');
      }
    } else {
      analysis.issues.push('Failed to retrieve webhook configuration');
    }
  } else {
    analysis.issues.push('No Evolution instance name found');
  }

  // 2. Check Evolution API status
  if (instance.evolution_instance_name) {
    analysis.evolutionStatus = await checkEvolutionInstanceStatus(instance.evolution_instance_name);
    
    if (analysis.evolutionStatus) {
      const evolutionState = analysis.evolutionStatus.instance?.state;
      log(`Evolution API state: ${evolutionState}`, 'INFO');
      
      if (evolutionState !== instance.status) {
        analysis.issues.push(`Status mismatch - DB: ${instance.status}, Evolution: ${evolutionState}`);
      }
    } else {
      analysis.issues.push('Instance not found in Evolution API');
    }
  }

  // 3. Test webhook connectivity
  analysis.webhookConnectivity = await testWebhookEndpoint(instance.organization_id);
  
  if (!analysis.webhookConnectivity.reachable) {
    analysis.issues.push('Webhook endpoint not reachable from external sources');
  }

  // 4. Database status analysis
  log(`Database status: ${instance.status}`, 'DATABASE');
  log(`Last updated: ${instance.updated_at}`, 'DATABASE');
  
  if (instance.status === 'connecting' && instance.updated_at) {
    const lastUpdate = new Date(instance.updated_at);
    const now = new Date();
    const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
    
    if (minutesSinceUpdate > 5) {
      analysis.issues.push(`Instance stuck in 'connecting' state for ${Math.round(minutesSinceUpdate)} minutes`);
    }
  }

  return analysis;
}

// =====================================================
// MAIN DIAGNOSTIC
// =====================================================

async function main() {
  try {
    log('🚨 STARTING PRODUCTION WEBHOOK FLOW DIAGNOSIS', 'ANALYSIS');
    log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');
    log(`Evolution API: ${CONFIG.evolutionApiUrl}`, 'INFO');

    // 1. Check environment variables
    const envVars = checkEnvironmentVariables();

    // 2. Get all instances
    const instances = await getWhatsAppInstances();
    
    if (instances.length === 0) {
      log('No WhatsApp instances found in database', 'WARNING');
      return;
    }

    // 3. Analyze each instance
    const analyses = [];
    
    for (const instance of instances) {
      const analysis = await analyzeInstanceFlow(instance);
      analyses.push(analysis);
      
      // Small delay between analyses
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 4. Generate comprehensive report
    log('\n📊 COMPREHENSIVE DIAGNOSTIC REPORT', 'ANALYSIS');
    console.log('='.repeat(60));

    let totalIssues = 0;
    
    analyses.forEach((analysis, index) => {
      console.log(`\n${index + 1}. Instance: ${analysis.instance.display_name}`);
      console.log(`   Status: ${analysis.instance.status}`);
      console.log(`   Evolution Instance: ${analysis.instance.evolution_instance_name || 'N/A'}`);
      console.log(`   Organization ID: ${analysis.instance.organization_id}`);
      
      if (analysis.issues.length > 0) {
        console.log(`   ❌ Issues (${analysis.issues.length}):`);
        analysis.issues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
        totalIssues += analysis.issues.length;
      } else {
        console.log(`   ✅ No issues detected`);
      }
    });

    console.log(`\n🏁 DIAGNOSIS COMPLETE`);
    console.log(`Total instances analyzed: ${analyses.length}`);
    console.log(`Total issues found: ${totalIssues}`);
    
    if (totalIssues > 0) {
      log('⚠️ Issues detected that may be preventing webhook flow completion', 'WARNING');
      process.exit(1);
    } else {
      log('✅ No critical issues detected in webhook flow configuration', 'SUCCESS');
    }

  } catch (error) {
    log(`DIAGNOSTIC FAILED: ${error.message}`, 'ERROR');
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

module.exports = { main, analyzeInstanceFlow, checkWebhookConfiguration };
