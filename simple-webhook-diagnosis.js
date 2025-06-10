#!/usr/bin/env node

/**
 * SIMPLE WEBHOOK DIAGNOSIS FOR PRODUCTION
 * 
 * Simplified version to diagnose webhook issues in production
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 */

require('dotenv').config();

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
    'ANALYSIS': '🔍'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// MAIN ANALYSIS
// =====================================================

async function analyzeEnvironmentVariables() {
  log('🚨 STARTING PRODUCTION WEBHOOK DIAGNOSIS', 'ANALYSIS');
  log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');
  log(`Evolution API: ${CONFIG.evolutionApiUrl}`, 'INFO');

  console.log('\n📊 ENVIRONMENT VARIABLES ANALYSIS:');
  console.log('='.repeat(60));
  
  // Check NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    log('❌ NEXT_PUBLIC_APP_URL is NOT SET', 'ERROR');
  } else if (appUrl === 'http://localhost:3000') {
    log(`❌ NEXT_PUBLIC_APP_URL is set to LOCALHOST: ${appUrl}`, 'ERROR');
    log('🔧 This is the ROOT CAUSE of webhook issues!', 'ERROR');
  } else if (appUrl === CONFIG.productionUrl) {
    log(`✅ NEXT_PUBLIC_APP_URL correctly set to: ${appUrl}`, 'SUCCESS');
  } else {
    log(`⚠️ NEXT_PUBLIC_APP_URL unexpected value: ${appUrl}`, 'WARNING');
  }
  
  // Check NEXTAUTH_URL
  const authUrl = process.env.NEXTAUTH_URL;
  if (!authUrl) {
    log('❌ NEXTAUTH_URL is NOT SET', 'ERROR');
  } else if (authUrl === 'http://localhost:3000') {
    log(`❌ NEXTAUTH_URL is set to LOCALHOST: ${authUrl}`, 'ERROR');
  } else if (authUrl === CONFIG.productionUrl) {
    log(`✅ NEXTAUTH_URL correctly set to: ${authUrl}`, 'SUCCESS');
  } else {
    log(`⚠️ NEXTAUTH_URL unexpected value: ${authUrl}`, 'WARNING');
  }
  
  // Check Evolution API config
  if (!CONFIG.evolutionApiKey) {
    log('❌ EVOLUTION_API_KEY is NOT SET', 'ERROR');
  } else {
    log('✅ EVOLUTION_API_KEY is configured', 'SUCCESS');
  }
  
  if (!CONFIG.evolutionApiUrl) {
    log('❌ EVOLUTION_API_BASE_URL is NOT SET', 'ERROR');
  } else {
    log(`✅ EVOLUTION_API_BASE_URL: ${CONFIG.evolutionApiUrl}`, 'SUCCESS');
  }
  
  // Check Supabase config
  if (!CONFIG.supabaseUrl) {
    log('❌ NEXT_PUBLIC_SUPABASE_URL is NOT SET', 'ERROR');
  } else {
    log('✅ NEXT_PUBLIC_SUPABASE_URL is configured', 'SUCCESS');
  }
  
  if (!CONFIG.supabaseKey) {
    log('❌ SUPABASE_SERVICE_ROLE_KEY is NOT SET', 'ERROR');
  } else {
    log('✅ SUPABASE_SERVICE_ROLE_KEY is configured', 'SUCCESS');
  }
  
  return {
    appUrl,
    authUrl,
    hasEvolutionKey: !!CONFIG.evolutionApiKey,
    hasSupabaseConfig: !!(CONFIG.supabaseUrl && CONFIG.supabaseKey)
  };
}

async function analyzeWebhookUrls() {
  console.log('\n🔗 WEBHOOK URL ANALYSIS:');
  console.log('='.repeat(60));
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orgId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // From the logs
  
  // Analyze different webhook patterns used in the codebase
  const webhookPatterns = [
    {
      name: 'Simple WhatsApp Webhook',
      pattern: `${appUrl}/api/whatsapp/simple/webhook/${orgId}`,
      file: 'recreate-whatsapp-instance.js, fix-webhook-for-existing-instance.js'
    },
    {
      name: 'Evolution Webhook',
      pattern: `${appUrl}/api/webhooks/evolution/${orgId}`,
      file: 'src/app/api/whatsapp/instances/[id]/connect/route.ts'
    },
    {
      name: 'Channels WhatsApp Webhook',
      pattern: `${appUrl}/api/channels/whatsapp/webhook`,
      file: 'src/lib/utils/whatsapp-defaults.ts'
    }
  ];
  
  webhookPatterns.forEach(webhook => {
    console.log(`\n📍 ${webhook.name}:`);
    console.log(`   URL: ${webhook.pattern}`);
    console.log(`   Used in: ${webhook.file}`);
    
    if (webhook.pattern.includes('localhost')) {
      log(`❌ This webhook points to LOCALHOST - will not work in production!`, 'ERROR');
    } else {
      log(`✅ This webhook points to production URL`, 'SUCCESS');
    }
  });
}

async function analyzeCodebaseWebhookUsage() {
  console.log('\n📝 CODEBASE WEBHOOK CONFIGURATION ANALYSIS:');
  console.log('='.repeat(60));
  
  const problematicFiles = [
    {
      file: 'recreate-whatsapp-instance.js',
      line: 65,
      code: 'const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || \'http://localhost:3000\'}/api/whatsapp/simple/webhook/${organizationId}`;',
      issue: 'Falls back to localhost if NEXT_PUBLIC_APP_URL not set'
    },
    {
      file: 'fix-webhook-for-existing-instance.js',
      line: 35,
      code: 'const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || \'http://localhost:3000\'}/api/whatsapp/simple/webhook/${INSTANCE_DETAILS.organizationId}`;',
      issue: 'Falls back to localhost if NEXT_PUBLIC_APP_URL not set'
    },
    {
      file: 'fix-current-instance.js',
      line: 86,
      code: 'const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${organizationId}`;',
      issue: 'Hardcoded localhost URL'
    },
    {
      file: 'diagnose-webhook-issue.js',
      line: 52,
      code: 'const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${organizationId}`;',
      issue: 'Hardcoded localhost URL'
    }
  ];
  
  problematicFiles.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.file} (Line ${item.line}):`);
    console.log(`   Code: ${item.code}`);
    console.log(`   Issue: ${item.issue}`);
    
    if (item.code.includes('localhost:3000')) {
      log(`❌ CRITICAL: This file will always use localhost!`, 'ERROR');
    } else {
      log(`⚠️ WARNING: This file may fall back to localhost`, 'WARNING');
    }
  });
}

async function generateRecommendations() {
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('='.repeat(60));
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (!appUrl || appUrl === 'http://localhost:3000') {
    console.log('\n🚨 CRITICAL ISSUE IDENTIFIED:');
    console.log('The NEXT_PUBLIC_APP_URL environment variable is not set correctly in production.');
    console.log('This causes all webhooks to point to localhost instead of the production URL.');
    
    console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
    console.log('1. Set NEXT_PUBLIC_APP_URL=https://agendia.torrecentral.com in production environment');
    console.log('2. Set NEXTAUTH_URL=https://agendia.torrecentral.com in production environment');
    console.log('3. Restart the application to apply new environment variables');
    console.log('4. Run the fix-production-webhook-emergency.js script to update existing webhooks');
    
    console.log('\n📋 DEPLOYMENT PLATFORM SPECIFIC INSTRUCTIONS:');
    console.log('• Coolify: Update environment variables in the application settings');
    console.log('• Vercel: Update environment variables in project settings');
    console.log('• Docker: Update docker-compose.yml or Dockerfile ENV variables');
    
  } else {
    console.log('\n✅ Environment variables appear to be set correctly.');
    console.log('The issue may be in webhook processing or Evolution API connectivity.');
    console.log('Proceed with the webhook processing tests.');
  }
}

async function main() {
  try {
    // 1. Analyze environment variables
    const envAnalysis = await analyzeEnvironmentVariables();
    
    // 2. Analyze webhook URLs that would be generated
    await analyzeWebhookUrls();
    
    // 3. Analyze codebase webhook usage
    await analyzeCodebaseWebhookUsage();
    
    // 4. Generate recommendations
    await generateRecommendations();
    
    console.log('\n🏁 DIAGNOSIS COMPLETE');
    console.log('='.repeat(60));
    
    // Determine if this is the root cause
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || appUrl === 'http://localhost:3000') {
      log('🎯 ROOT CAUSE IDENTIFIED: Environment variables not set for production', 'ERROR');
      process.exit(1);
    } else {
      log('✅ Environment variables appear correct - investigate webhook processing', 'SUCCESS');
    }
    
  } catch (error) {
    log(`DIAGNOSIS FAILED: ${error.message}`, 'ERROR');
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
