/**
 * Manual WhatsApp Integration Test Script
 * 
 * Script to manually test and validate WhatsApp integration functionality
 * including Evolution API connectivity and instance synchronization.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIGURATION
// =====================================================

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const config = {
  evolutionApiUrl: process.env.EVOLUTION_API_BASE_URL,
  evolutionApiKey: process.env.EVOLUTION_API_KEY,
  testInstanceName: `test-agentsalud-${Date.now()}`
};

console.log('🔧 WhatsApp Integration Test Configuration:');
console.log(`- Evolution API URL: ${config.evolutionApiUrl}`);
console.log(`- API Key: ${config.evolutionApiKey ? '***' + config.evolutionApiKey.slice(-4) : 'NOT SET'}`);
console.log(`- Test Instance: ${config.testInstanceName}`);
console.log('');

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Make HTTP request to Evolution API
 */
function makeEvolutionRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, config.evolutionApiUrl);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolutionApiKey
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test Evolution API connectivity
 */
async function testEvolutionAPIConnectivity() {
  console.log('🔗 Testing Evolution API Connectivity...');
  
  try {
    const response = await makeEvolutionRequest('GET', '/instance/fetchInstances');
    
    if (response.status === 200) {
      console.log('✅ Evolution API is accessible');
      console.log(`📊 Found ${response.data.length} existing instances`);
      
      if (response.data.length > 0) {
        console.log('📋 Existing instances:');
        response.data.forEach((instance, index) => {
          console.log(`   ${index + 1}. ${instance.name} (${instance.connectionStatus})`);
        });
      }
      
      return { success: true, instances: response.data };
    } else {
      console.log(`❌ Evolution API returned status: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(`❌ Evolution API connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test instance creation
 */
async function testInstanceCreation() {
  console.log('\n🆕 Testing Instance Creation...');
  
  try {
    const instanceData = {
      instanceName: config.testInstanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    };

    console.log(`📝 Creating instance: ${instanceData.instanceName}`);
    
    const response = await makeEvolutionRequest('POST', '/instance/create', instanceData);
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ Instance created successfully');
      console.log(`📱 Instance Name: ${response.data.instance?.instanceName}`);
      console.log(`🔄 Status: ${response.data.instance?.status}`);
      
      if (response.data.qrcode?.base64) {
        console.log('📱 QR Code generated (base64 available)');
      }
      
      return { success: true, instance: response.data };
    } else {
      console.log(`❌ Instance creation failed with status: ${response.status}`);
      console.log(`📄 Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Instance creation error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test instance status check
 */
async function testInstanceStatus(instanceName) {
  console.log(`\n📊 Testing Instance Status for: ${instanceName}...`);
  
  try {
    const response = await makeEvolutionRequest('GET', `/instance/connectionState/${instanceName}`);
    
    if (response.status === 200) {
      console.log('✅ Instance status retrieved');
      console.log(`🔄 Connection State: ${response.data.state}`);
      console.log(`📱 Instance: ${response.data.instance}`);
      
      return { success: true, status: response.data };
    } else {
      console.log(`❌ Status check failed with status: ${response.status}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ Status check error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup test instance
 */
async function cleanupTestInstance(instanceName) {
  console.log(`\n🧹 Cleaning up test instance: ${instanceName}...`);
  
  try {
    const response = await makeEvolutionRequest('DELETE', `/instance/delete/${instanceName}`);
    
    if (response.status === 200 || response.status === 204) {
      console.log('✅ Test instance cleaned up successfully');
      return { success: true };
    } else {
      console.log(`⚠️ Cleanup returned status: ${response.status}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`⚠️ Cleanup error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Generate test report
 */
function generateTestReport(results) {
  console.log('\n📋 TEST REPORT');
  console.log('='.repeat(50));
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    configuration: config,
    results,
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length
    }
  };

  // Log summary
  console.log(`📊 Total Tests: ${report.summary.total}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`📅 Timestamp: ${timestamp}`);

  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'test-reports', `whatsapp-integration-${Date.now()}.json`);
  
  try {
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved: ${reportPath}`);
  } catch (error) {
    console.log(`⚠️ Could not save report: ${error.message}`);
  }

  return report;
}

// =====================================================
// MAIN TEST EXECUTION
// =====================================================

async function runIntegrationTests() {
  console.log('🚀 Starting WhatsApp Integration Tests...\n');
  
  const results = {};
  let createdInstanceName = null;

  try {
    // Test 1: Evolution API Connectivity
    results.connectivity = await testEvolutionAPIConnectivity();
    
    if (!results.connectivity.success) {
      console.log('\n❌ Cannot proceed with further tests - Evolution API not accessible');
      return generateTestReport(results);
    }

    // Test 2: Instance Creation
    results.creation = await testInstanceCreation();
    
    if (results.creation.success) {
      createdInstanceName = config.testInstanceName;
      
      // Test 3: Instance Status Check
      results.status = await testInstanceStatus(createdInstanceName);
    }

    // Test 4: Cleanup (always attempt if instance was created)
    if (createdInstanceName) {
      results.cleanup = await cleanupTestInstance(createdInstanceName);
    }

  } catch (error) {
    console.log(`\n💥 Unexpected error during testing: ${error.message}`);
    results.unexpected_error = { success: false, error: error.message };
  }

  return generateTestReport(results);
}

// =====================================================
// SCRIPT EXECUTION
// =====================================================

if (require.main === module) {
  runIntegrationTests()
    .then((report) => {
      const exitCode = report.summary.failed > 0 ? 1 : 0;
      console.log(`\n🏁 Tests completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error(`\n💥 Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runIntegrationTests,
  testEvolutionAPIConnectivity,
  testInstanceCreation,
  testInstanceStatus,
  cleanupTestInstance
};
