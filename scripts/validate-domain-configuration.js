#!/usr/bin/env node

/**
 * PRODUCTION DOMAIN CONFIGURATION VALIDATOR
 * Validates that all domain references have been updated to production domain
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 PRODUCTION DOMAIN CONFIGURATION VALIDATION');
console.log('==============================================\n');

const PRODUCTION_DOMAIN = 'agendia.torrecentral.com';
const EVOLUTION_DOMAIN = 'evo.torrecentral.com';

const results = {
  configFiles: { passed: 0, failed: 0, details: [] },
  webhookUrls: { passed: 0, failed: 0, details: [] },
  corsSettings: { passed: 0, failed: 0, details: [] },
  documentation: { passed: 0, failed: 0, details: [] }
};

// 1. Validate Configuration Files
function validateConfigFiles() {
  console.log('📁 Validating configuration files...');
  
  const configFiles = [
    { file: 'Dockerfile', checks: [`https://${PRODUCTION_DOMAIN}`] },
    { file: 'next.config.js', checks: [PRODUCTION_DOMAIN] },
    { file: 'next.config.deploy.js', checks: [PRODUCTION_DOMAIN] },
    { file: 'next.config.coolify.js', checks: [PRODUCTION_DOMAIN, EVOLUTION_DOMAIN] },
    { file: '.env.coolify.example', checks: [PRODUCTION_DOMAIN] },
    { file: 'docker-compose.yml', checks: [PRODUCTION_DOMAIN] }
  ];
  
  for (const { file, checks } of configFiles) {
    try {
      if (!fs.existsSync(file)) {
        results.configFiles.failed++;
        results.configFiles.details.push(`❌ File not found: ${file}`);
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      let allChecksPass = true;
      
      for (const check of checks) {
        if (!content.includes(check)) {
          allChecksPass = false;
          results.configFiles.failed++;
          results.configFiles.details.push(`❌ Missing in ${file}: ${check}`);
        }
      }
      
      if (allChecksPass) {
        results.configFiles.passed++;
        results.configFiles.details.push(`✅ ${file}: All domain references updated`);
      }
    } catch (error) {
      results.configFiles.failed++;
      results.configFiles.details.push(`❌ Error reading ${file}: ${error.message}`);
    }
  }
}

// 2. Validate Webhook URLs
function validateWebhookUrls() {
  console.log('🔗 Validating webhook URL configurations...');
  
  const webhookFiles = [
    'src/app/api/whatsapp/instances/[id]/connect/route.ts',
    'src/lib/utils/whatsapp-defaults.ts',
    'fix-webhook-for-existing-instance.js',
    'recreate-whatsapp-instance.js'
  ];
  
  for (const file of webhookFiles) {
    try {
      if (!fs.existsSync(file)) {
        results.webhookUrls.failed++;
        results.webhookUrls.details.push(`❌ File not found: ${file}`);
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      
      // Check for production domain or environment variable usage
      if (content.includes(PRODUCTION_DOMAIN) || content.includes('NEXT_PUBLIC_APP_URL')) {
        results.webhookUrls.passed++;
        results.webhookUrls.details.push(`✅ ${file}: Webhook URL properly configured`);
      } else {
        results.webhookUrls.failed++;
        results.webhookUrls.details.push(`❌ ${file}: Missing production domain configuration`);
      }
    } catch (error) {
      results.webhookUrls.failed++;
      results.webhookUrls.details.push(`❌ Error reading ${file}: ${error.message}`);
    }
  }
}

// 3. Validate CORS Settings
function validateCorsSettings() {
  console.log('🛡️ Validating CORS configurations...');
  
  const corsFiles = [
    { file: '.env.coolify.example', pattern: `CORS_ORIGIN=https://${PRODUCTION_DOMAIN}` },
    { file: '.env.production.example', pattern: `CORS_ORIGIN=https://${PRODUCTION_DOMAIN}` },
    { file: 'docker-compose.yml', pattern: `CORS_ORIGIN=https://${PRODUCTION_DOMAIN}` },
    { file: 'next.config.coolify.js', pattern: EVOLUTION_DOMAIN }
  ];
  
  for (const { file, pattern } of corsFiles) {
    try {
      if (!fs.existsSync(file)) {
        results.corsSettings.failed++;
        results.corsSettings.details.push(`❌ File not found: ${file}`);
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes(pattern)) {
        results.corsSettings.passed++;
        results.corsSettings.details.push(`✅ ${file}: CORS properly configured`);
      } else {
        results.corsSettings.failed++;
        results.corsSettings.details.push(`❌ ${file}: Missing CORS configuration for ${pattern}`);
      }
    } catch (error) {
      results.corsSettings.failed++;
      results.corsSettings.details.push(`❌ Error reading ${file}: ${error.message}`);
    }
  }
}

// 4. Validate Documentation
function validateDocumentation() {
  console.log('📚 Validating documentation updates...');
  
  const docFiles = [
    'docs/deployment/COOLIFY_ENVIRONMENT_VARIABLES.md',
    'docs/deployment/COOLIFY_SUPABASE_HYBRID_GUIDE.md',
    'scripts/validate-production-deployment.js',
    'PRODUCTION_DOMAIN_CONFIGURATION.md'
  ];
  
  for (const file of docFiles) {
    try {
      if (!fs.existsSync(file)) {
        results.documentation.failed++;
        results.documentation.details.push(`❌ File not found: ${file}`);
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes(PRODUCTION_DOMAIN)) {
        results.documentation.passed++;
        results.documentation.details.push(`✅ ${file}: Documentation updated`);
      } else {
        results.documentation.failed++;
        results.documentation.details.push(`❌ ${file}: Missing production domain references`);
      }
    } catch (error) {
      results.documentation.failed++;
      results.documentation.details.push(`❌ Error reading ${file}: ${error.message}`);
    }
  }
}

// Main execution
validateConfigFiles();
validateWebhookUrls();
validateCorsSettings();
validateDocumentation();

// Print results
console.log('\n📊 VALIDATION RESULTS');
console.log('====================\n');

const categories = [
  { name: 'Configuration Files', key: 'configFiles' },
  { name: 'Webhook URLs', key: 'webhookUrls' },
  { name: 'CORS Settings', key: 'corsSettings' },
  { name: 'Documentation', key: 'documentation' }
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
  console.log('\n🎉 ALL DOMAIN CONFIGURATIONS VALIDATED!');
  console.log(`🌐 Production domain: https://${PRODUCTION_DOMAIN}`);
  console.log(`🔗 Evolution API: https://${EVOLUTION_DOMAIN}`);
  console.log('🚀 Ready for production deployment');
  process.exit(0);
} else {
  console.log('\n⚠️ Some domain configurations need attention');
  console.log('🔧 Please fix the issues before deployment');
  process.exit(1);
}
