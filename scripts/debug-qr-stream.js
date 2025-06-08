#!/usr/bin/env node

/**
 * QR Stream Debugging Script
 * 
 * Tests the SSE stream to understand why QR codes are not displaying
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const http = require('http');

// Configuration
const CONFIG = {
  appUrl: 'http://localhost:3001',
  testInstanceId: 'debug-qr-test-' + Date.now(),
  timeout: 30000
};

/**
 * Test SSE stream and log all events
 */
function testSSEStream() {
  return new Promise((resolve, reject) => {
    const streamUrl = `${CONFIG.appUrl}/api/channels/whatsapp/instances/${CONFIG.testInstanceId}/qrcode/stream`;
    
    console.log('🔍 Testing SSE Stream...');
    console.log(`Stream URL: ${streamUrl}`);
    console.log(`Instance ID: ${CONFIG.testInstanceId}`);
    console.log('');
    
    const req = http.request(streamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      timeout: CONFIG.timeout
    }, (res) => {
      console.log(`📥 Response Status: ${res.statusCode}`);
      console.log(`📥 Content-Type: ${res.headers['content-type']}`);
      console.log('');
      
      if (res.statusCode !== 200) {
        console.log('❌ Stream failed with status:', res.statusCode);
        resolve({ success: false, status: res.statusCode });
        return;
      }
      
      let eventCount = 0;
      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete events (separated by \n\n)
        const events = buffer.split('\n\n');
        buffer = events.pop(); // Keep incomplete event in buffer
        
        events.forEach((eventText) => {
          if (eventText.trim()) {
            eventCount++;
            console.log(`📨 Event ${eventCount}:`);
            console.log(`Raw: ${eventText}`);
            
            // Try to parse the event
            if (eventText.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(eventText.replace('data: ', ''));
                console.log(`📋 Parsed Event:`, {
                  type: eventData.type,
                  instanceId: eventData.data?.instanceId,
                  status: eventData.data?.status,
                  message: eventData.data?.message,
                  hasQRCode: !!eventData.data?.qrCode,
                  qrCodeLength: eventData.data?.qrCode?.length || 0,
                  isRealQR: eventData.data?.isRealQR,
                  source: eventData.data?.source,
                  timestamp: eventData.data?.timestamp
                });
                
                // Check for QR code data
                if (eventData.data?.qrCode) {
                  console.log('✅ QR Code Found!');
                  console.log(`   - Length: ${eventData.data.qrCode.length}`);
                  console.log(`   - Is Real: ${eventData.data.isRealQR}`);
                  console.log(`   - Source: ${eventData.data.source}`);
                  console.log(`   - First 50 chars: ${eventData.data.qrCode.substring(0, 50)}...`);
                } else if (eventData.type === 'error') {
                  console.log('❌ Error Event:', eventData.data?.message);
                } else if (eventData.type === 'status_update') {
                  console.log('📊 Status Update:', eventData.data?.status, '-', eventData.data?.message);
                }
                
              } catch (parseError) {
                console.log('⚠️ Could not parse event data:', parseError.message);
              }
            }
            console.log('');
          }
        });
      });
      
      res.on('end', () => {
        console.log(`🏁 Stream ended. Total events received: ${eventCount}`);
        resolve({ success: true, eventCount });
      });
      
      res.on('error', (error) => {
        console.log('❌ Stream error:', error.message);
        reject(error);
      });
      
      // Auto-close after 10 seconds for testing
      setTimeout(() => {
        console.log('⏰ Closing stream after 10 seconds for testing...');
        req.destroy();
        resolve({ success: true, eventCount, timeout: true });
      }, 10000);
    });
    
    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log('⏰ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Test Evolution API service directly
 */
async function testEvolutionAPIService() {
  console.log('\n🔍 Testing Evolution API Service...');
  
  try {
    // Test if we can create an instance
    const https = require('https');
    
    const testInstanceName = `debug-test-${Date.now()}`;
    const payload = {
      integration: 'WHATSAPP-BAILEYS',
      instanceName: testInstanceName
    };
    
    console.log(`Creating test instance: ${testInstanceName}`);
    
    const response = await new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      
      const options = {
        hostname: 'evo.torrecentral.com',
        path: '/instance/create',
        method: 'POST',
        headers: {
          'apikey': 'ixisatbi7f3p9m1ip37hibanq0vjq8nc',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data)
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: data,
              parseError: error.message
            });
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    console.log('📥 Evolution API Response:', response);
    
    if (response.status === 201 && response.data?.instance?.instanceId) {
      console.log('✅ Evolution API is working correctly');
      console.log(`Instance ID: ${response.data.instance.instanceId}`);
      
      // Try to get QR code
      console.log('\n🔍 Testing QR code generation...');
      
      const qrResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'evo.torrecentral.com',
          path: `/instance/qrcode/${testInstanceName}`,
          method: 'GET',
          headers: {
            'apikey': 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data)
              });
            } catch (error) {
              resolve({
                status: res.statusCode,
                data: data,
                parseError: error.message
              });
            }
          });
        });
        
        req.on('error', reject);
        req.end();
      });
      
      console.log('📥 QR Code Response:', qrResponse);
      
      // Cleanup
      console.log('\n🧹 Cleaning up test instance...');
      const deleteResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'evo.torrecentral.com',
          path: `/instance/delete/${testInstanceName}`,
          method: 'DELETE',
          headers: {
            'apikey': 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
          }
        };
        
        const req = https.request(options, (res) => {
          resolve({ status: res.statusCode });
        });
        
        req.on('error', reject);
        req.end();
      });
      
      console.log('🧹 Cleanup result:', deleteResponse);
      
      return true;
    } else {
      console.log('❌ Evolution API not working correctly');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Evolution API test failed:', error.message);
    return false;
  }
}

/**
 * Main debugging function
 */
async function runDebug() {
  console.log('🚀 Starting QR Stream Debugging...');
  console.log(`App URL: ${CONFIG.appUrl}`);
  console.log(`Test Instance ID: ${CONFIG.testInstanceId}`);
  console.log('');
  
  try {
    // Test 1: Evolution API Service
    const evolutionWorking = await testEvolutionAPIService();
    
    // Test 2: SSE Stream
    const streamResult = await testSSEStream();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEBUGGING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Evolution API Working: ${evolutionWorking ? '✅' : '❌'}`);
    console.log(`SSE Stream Working: ${streamResult.success ? '✅' : '❌'}`);
    console.log(`Events Received: ${streamResult.eventCount || 0}`);
    
    if (!evolutionWorking) {
      console.log('\n❌ ISSUE: Evolution API is not accessible or not working correctly');
    }
    
    if (!streamResult.success || streamResult.eventCount === 0) {
      console.log('\n❌ ISSUE: SSE stream is not sending events properly');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run debug if this script is executed directly
if (require.main === module) {
  runDebug().catch(error => {
    console.error('❌ Debug execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runDebug, CONFIG };
