#!/usr/bin/env node

/**
 * PRODUCTION WEBHOOK EVENTS MONITOR
 * 
 * Monitors webhook events in real-time to diagnose why the WhatsApp flow
 * stops after QR code synchronization. Checks database changes and logs.
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
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  evolutionApiUrl: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
  productionUrl: 'https://agendia.torrecentral.com',
  monitoringInterval: 5000 // 5 seconds
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
    'WEBHOOK': '🔗',
    'DATABASE': '🗄️',
    'MONITOR': '👁️',
    'EVENT': '⚡'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// MONITORING STATE
// =====================================================
let monitoringState = {
  lastCheckedTimestamp: new Date(),
  instanceStates: new Map(),
  webhookEvents: [],
  isMonitoring: false
};

// =====================================================
// SUPABASE CLIENT
// =====================================================
async function createSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
}

// =====================================================
// MONITORING FUNCTIONS
// =====================================================

/**
 * Get current instance states
 */
async function getCurrentInstanceStates() {
  try {
    const supabase = await createSupabaseClient();
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return instances;
  } catch (error) {
    log(`Failed to get instance states: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * Check for database changes
 */
async function checkDatabaseChanges() {
  try {
    const currentInstances = await getCurrentInstanceStates();
    const changes = [];

    for (const instance of currentInstances) {
      const instanceId = instance.id;
      const lastKnownState = monitoringState.instanceStates.get(instanceId);
      
      if (!lastKnownState) {
        // New instance discovered
        changes.push({
          type: 'NEW_INSTANCE',
          instanceId,
          instance,
          timestamp: new Date()
        });
      } else if (
        lastKnownState.status !== instance.status ||
        lastKnownState.updated_at !== instance.updated_at
      ) {
        // Instance state changed
        changes.push({
          type: 'STATE_CHANGE',
          instanceId,
          oldState: lastKnownState,
          newState: instance,
          timestamp: new Date()
        });
      }
      
      // Update monitoring state
      monitoringState.instanceStates.set(instanceId, {
        status: instance.status,
        updated_at: instance.updated_at,
        display_name: instance.display_name,
        evolution_instance_name: instance.evolution_instance_name
      });
    }

    return changes;
  } catch (error) {
    log(`Failed to check database changes: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * Test webhook endpoint with a sample event
 */
async function testWebhookEndpoint(organizationId, eventType = 'CONNECTION_UPDATE') {
  try {
    const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${organizationId}`;
    
    const testPayload = {
      event: eventType,
      instance: 'test-instance',
      data: {
        state: 'open',
        status: 'connected'
      },
      date_time: new Date().toISOString()
    };

    log(`Testing webhook endpoint: ${webhookUrl}`, 'WEBHOOK');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentSalud-Webhook-Monitor/1.0'
      },
      body: JSON.stringify(testPayload),
      timeout: 10000
    });

    const result = {
      url: webhookUrl,
      status: response.status,
      statusText: response.statusText,
      success: response.ok
    };

    if (result.success) {
      log(`✅ Webhook test successful: ${result.status}`, 'SUCCESS');
    } else {
      log(`❌ Webhook test failed: ${result.status} ${result.statusText}`, 'ERROR');
    }

    return result;
  } catch (error) {
    log(`Webhook test error: ${error.message}`, 'ERROR');
    return {
      url: `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${organizationId}`,
      error: error.message,
      success: false
    };
  }
}

/**
 * Check Evolution API instance status
 */
async function checkEvolutionStatus(instanceName) {
  try {
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
    
    return instance ? instance.instance : null;
  } catch (error) {
    log(`Failed to check Evolution status for ${instanceName}: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Analyze state change
 */
async function analyzeStateChange(change) {
  log(`\n🔍 ANALYZING STATE CHANGE`, 'EVENT');
  console.log('='.repeat(50));
  
  if (change.type === 'NEW_INSTANCE') {
    log(`New instance discovered: ${change.instance.display_name}`, 'INFO');
    log(`Status: ${change.instance.status}`, 'INFO');
    log(`Evolution Instance: ${change.instance.evolution_instance_name || 'N/A'}`, 'INFO');
  } else if (change.type === 'STATE_CHANGE') {
    log(`Instance: ${change.newState.display_name}`, 'INFO');
    log(`Status change: ${change.oldState.status} → ${change.newState.status}`, 'EVENT');
    log(`Updated: ${change.oldState.updated_at} → ${change.newState.updated_at}`, 'INFO');
    
    // Check if this is the expected flow progression
    const expectedTransitions = {
      'disconnected': ['connecting'],
      'connecting': ['connected', 'open'],
      'connected': ['disconnected'],
      'open': ['disconnected']
    };
    
    const isExpectedTransition = expectedTransitions[change.oldState.status]?.includes(change.newState.status);
    
    if (isExpectedTransition) {
      log(`✅ Expected state transition`, 'SUCCESS');
    } else {
      log(`⚠️ Unexpected state transition`, 'WARNING');
    }
    
    // If instance has Evolution name, check Evolution API status
    if (change.newState.evolution_instance_name) {
      const evolutionStatus = await checkEvolutionStatus(change.newState.evolution_instance_name);
      
      if (evolutionStatus) {
        log(`Evolution API state: ${evolutionStatus.state}`, 'INFO');
        
        if (evolutionStatus.state !== change.newState.status) {
          log(`⚠️ Status mismatch between DB and Evolution API`, 'WARNING');
          log(`DB: ${change.newState.status}, Evolution: ${evolutionStatus.state}`, 'WARNING');
        }
      }
    }
  }
}

/**
 * Main monitoring loop
 */
async function monitoringLoop() {
  if (!monitoringState.isMonitoring) {
    return;
  }

  try {
    log('Checking for changes...', 'MONITOR');
    
    // Check for database changes
    const changes = await checkDatabaseChanges();
    
    if (changes.length > 0) {
      log(`Found ${changes.length} changes`, 'EVENT');
      
      for (const change of changes) {
        await analyzeStateChange(change);
      }
    } else {
      log('No changes detected', 'MONITOR');
    }
    
    // Schedule next check
    setTimeout(monitoringLoop, CONFIG.monitoringInterval);
    
  } catch (error) {
    log(`Monitoring loop error: ${error.message}`, 'ERROR');
    
    // Continue monitoring despite errors
    setTimeout(monitoringLoop, CONFIG.monitoringInterval);
  }
}

/**
 * Start monitoring
 */
async function startMonitoring() {
  try {
    log('🚀 STARTING WEBHOOK EVENTS MONITORING', 'MONITOR');
    log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');
    log(`Monitoring interval: ${CONFIG.monitoringInterval}ms`, 'INFO');

    // Initialize monitoring state
    monitoringState.isMonitoring = true;
    monitoringState.lastCheckedTimestamp = new Date();
    
    // Get initial state
    const initialInstances = await getCurrentInstanceStates();
    log(`Found ${initialInstances.length} instances to monitor`, 'INFO');
    
    for (const instance of initialInstances) {
      monitoringState.instanceStates.set(instance.id, {
        status: instance.status,
        updated_at: instance.updated_at,
        display_name: instance.display_name,
        evolution_instance_name: instance.evolution_instance_name
      });
      
      log(`Monitoring: ${instance.display_name} (${instance.status})`, 'INFO');
    }

    // Test webhook endpoints
    log('\nTesting webhook endpoints...', 'WEBHOOK');
    const uniqueOrgs = [...new Set(initialInstances.map(i => i.organization_id))];
    
    for (const orgId of uniqueOrgs) {
      await testWebhookEndpoint(orgId);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log('\n👁️ MONITORING ACTIVE - Press Ctrl+C to stop', 'MONITOR');
    
    // Start monitoring loop
    monitoringLoop();
    
  } catch (error) {
    log(`Failed to start monitoring: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

/**
 * Stop monitoring
 */
function stopMonitoring() {
  log('🛑 STOPPING MONITORING', 'MONITOR');
  monitoringState.isMonitoring = false;
  
  // Generate final report
  log('\n📊 MONITORING SUMMARY', 'INFO');
  console.log('='.repeat(50));
  log(`Monitored instances: ${monitoringState.instanceStates.size}`, 'INFO');
  log(`Webhook events captured: ${monitoringState.webhookEvents.length}`, 'INFO');
  
  process.exit(0);
}

// =====================================================
// MAIN EXECUTION
// =====================================================

// Handle graceful shutdown
process.on('SIGINT', stopMonitoring);
process.on('SIGTERM', stopMonitoring);

async function main() {
  try {
    await startMonitoring();
  } catch (error) {
    log(`MONITORING FAILED: ${error.message}`, 'ERROR');
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

module.exports = { main, startMonitoring, stopMonitoring };
