#!/usr/bin/env node

/**
 * SUPABASE CONFIGURATION VALIDATOR
 * Validates Supabase environment variables and connectivity for production deployment
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const https = require('https');
const { URL } = require('url');

console.log('🔍 SUPABASE CONFIGURATION VALIDATION');
console.log('====================================\n');

const results = {
  envVars: { passed: 0, failed: 0, details: [] },
  connectivity: { passed: 0, failed: 0, details: [] },
  authentication: { passed: 0, failed: 0, details: [] }
};

// 1. Validate Environment Variables
function validateEnvironmentVariables() {
  console.log('📋 Validating environment variables...');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value) {
      results.envVars.failed++;
      results.envVars.details.push(`❌ ${varName}: Not set`);
    } else if (value.includes('placeholder')) {
      results.envVars.failed++;
      results.envVars.details.push(`❌ ${varName}: Using placeholder value`);
    } else if (varName === 'NEXT_PUBLIC_SUPABASE_URL' && !value.includes('.supabase.co')) {
      results.envVars.failed++;
      results.envVars.details.push(`❌ ${varName}: Invalid Supabase URL format`);
    } else if (varName.includes('KEY') && value.length < 100) {
      results.envVars.failed++;
      results.envVars.details.push(`❌ ${varName}: Key appears too short`);
    } else {
      results.envVars.passed++;
      results.envVars.details.push(`✅ ${varName}: Valid`);
    }
  }

  // Additional validation for Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      if (url.protocol !== 'https:') {
        results.envVars.failed++;
        results.envVars.details.push(`❌ NEXT_PUBLIC_SUPABASE_URL: Must use HTTPS protocol`);
      } else {
        results.envVars.passed++;
        results.envVars.details.push(`✅ NEXT_PUBLIC_SUPABASE_URL: Protocol validation passed`);
      }
    } catch (error) {
      results.envVars.failed++;
      results.envVars.details.push(`❌ NEXT_PUBLIC_SUPABASE_URL: Invalid URL format`);
    }
  }
}

// 2. Test Supabase Connectivity
function testSupabaseConnectivity() {
  return new Promise((resolve) => {
    console.log('🌐 Testing Supabase connectivity...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      results.connectivity.failed++;
      results.connectivity.details.push('❌ Cannot test connectivity: Invalid Supabase URL');
      resolve();
      return;
    }

    try {
      const url = new URL('/rest/v1/', supabaseUrl);
      
      const req = https.get({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
          'User-Agent': 'AgentSalud-Config-Validator/1.0'
        },
        timeout: 10000
      }, (res) => {
        if (res.statusCode === 200 || res.statusCode === 401) {
          // 401 is expected without proper auth, but means server is reachable
          results.connectivity.passed++;
          results.connectivity.details.push(`✅ Supabase server reachable (HTTP ${res.statusCode})`);
        } else {
          results.connectivity.failed++;
          results.connectivity.details.push(`❌ Supabase server returned HTTP ${res.statusCode}`);
        }
        resolve();
      });

      req.on('error', (error) => {
        results.connectivity.failed++;
        results.connectivity.details.push(`❌ Connection error: ${error.message}`);
        resolve();
      });

      req.on('timeout', () => {
        results.connectivity.failed++;
        results.connectivity.details.push('❌ Connection timeout (10s)');
        req.destroy();
        resolve();
      });

    } catch (error) {
      results.connectivity.failed++;
      results.connectivity.details.push(`❌ URL parsing error: ${error.message}`);
      resolve();
    }
  });
}

// 3. Test Authentication Endpoint
function testAuthenticationEndpoint() {
  return new Promise((resolve) => {
    console.log('🔐 Testing authentication endpoint...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      results.authentication.failed++;
      results.authentication.details.push('❌ Cannot test auth: Invalid Supabase URL');
      resolve();
      return;
    }

    try {
      const url = new URL('/auth/v1/settings', supabaseUrl);
      
      const req = https.get({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'User-Agent': 'AgentSalud-Config-Validator/1.0'
        },
        timeout: 10000
      }, (res) => {
        if (res.statusCode === 200) {
          results.authentication.passed++;
          results.authentication.details.push('✅ Authentication endpoint accessible');
        } else {
          results.authentication.failed++;
          results.authentication.details.push(`❌ Auth endpoint returned HTTP ${res.statusCode}`);
        }
        resolve();
      });

      req.on('error', (error) => {
        results.authentication.failed++;
        results.authentication.details.push(`❌ Auth endpoint error: ${error.message}`);
        resolve();
      });

      req.on('timeout', () => {
        results.authentication.failed++;
        results.authentication.details.push('❌ Auth endpoint timeout (10s)');
        req.destroy();
        resolve();
      });

    } catch (error) {
      results.authentication.failed++;
      results.authentication.details.push(`❌ Auth URL parsing error: ${error.message}`);
      resolve();
    }
  });
}

// Main execution
async function main() {
  validateEnvironmentVariables();
  await testSupabaseConnectivity();
  await testAuthenticationEndpoint();

  // Print results
  console.log('\n📊 VALIDATION RESULTS');
  console.log('====================\n');

  const categories = [
    { name: 'Environment Variables', key: 'envVars' },
    { name: 'Connectivity', key: 'connectivity' },
    { name: 'Authentication', key: 'authentication' }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const category of categories) {
    const result = results[category.key];
    totalPassed += result.passed;
    totalFailed += result.failed;
    
    console.log(`${category.name}:`);
    console.log(`  ✅ Passed: ${result.passed}`);
    console.log(`  ❌ Failed: ${result.failed}`);
    
    for (const detail of result.details) {
      console.log(`  ${detail}`);
    }
    console.log('');
  }

  console.log('SUMMARY:');
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log('\n🎉 ALL SUPABASE CONFIGURATIONS VALIDATED!');
    console.log('🚀 Ready for production deployment');
    process.exit(0);
  } else {
    console.log('\n⚠️ Supabase configuration issues detected');
    console.log('🔧 Please fix the issues before deployment');
    
    if (results.envVars.failed > 0) {
      console.log('\n📋 ENVIRONMENT VARIABLE SETUP GUIDE:');
      console.log('1. Log into Coolify dashboard');
      console.log('2. Navigate to your AgentSalud application');
      console.log('3. Go to Environment Variables section');
      console.log('4. Set the following variables:');
      console.log('   - NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
      console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
      console.log('   - SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
      console.log('   - NEXTAUTH_SECRET=your-32-character-secret');
      console.log('   - NEXTAUTH_URL=https://agendia.torrecentral.com');
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
