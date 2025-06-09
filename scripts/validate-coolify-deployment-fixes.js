#!/usr/bin/env node

/**
 * COOLIFY DEPLOYMENT VALIDATION SCRIPT
 * Validates that all critical deployment issues have been resolved
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 COOLIFY DEPLOYMENT VALIDATION');
console.log('=================================\n');

const results = {
  publicDirectory: { passed: 0, failed: 0, details: [] },
  dynamicRoutes: { passed: 0, failed: 0, details: [] },
  dockerFile: { passed: 0, failed: 0, details: [] },
  buildConfig: { passed: 0, failed: 0, details: [] }
};

// 1. Validate Public Directory
function validatePublicDirectory() {
  console.log('📁 Validating public directory...');
  
  const publicDir = 'public';
  const requiredFiles = ['favicon.ico', 'robots.txt', '.gitkeep'];
  
  if (!fs.existsSync(publicDir)) {
    results.publicDirectory.failed++;
    results.publicDirectory.details.push('❌ Public directory does not exist');
    return;
  }
  
  results.publicDirectory.passed++;
  results.publicDirectory.details.push('✅ Public directory exists');
  
  for (const file of requiredFiles) {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      results.publicDirectory.passed++;
      results.publicDirectory.details.push(`✅ ${file} exists`);
    } else {
      results.publicDirectory.failed++;
      results.publicDirectory.details.push(`❌ ${file} missing`);
    }
  }
}

// 2. Validate Dynamic Routes Configuration
function validateDynamicRoutes() {
  console.log('🔧 Validating dynamic route configurations...');
  
  const criticalRoutes = [
    'src/app/api/availability/route.ts',
    'src/app/api/admin/whatsapp/instances/route.ts',
    'src/app/api/dashboard/superadmin/stats/route.ts',
    'src/app/api/doctors/availability/route.ts'
  ];
  
  for (const route of criticalRoutes) {
    try {
      if (!fs.existsSync(route)) {
        results.dynamicRoutes.failed++;
        results.dynamicRoutes.details.push(`❌ Route not found: ${route}`);
        continue;
      }

      const content = fs.readFileSync(route, 'utf8');
      
      if (content.includes("export const dynamic = 'force-dynamic'")) {
        results.dynamicRoutes.passed++;
        results.dynamicRoutes.details.push(`✅ Dynamic config: ${route}`);
      } else {
        results.dynamicRoutes.failed++;
        results.dynamicRoutes.details.push(`❌ Missing dynamic config: ${route}`);
      }
    } catch (error) {
      results.dynamicRoutes.failed++;
      results.dynamicRoutes.details.push(`❌ Error reading ${route}: ${error.message}`);
    }
  }
}

// 3. Validate Dockerfile Security
function validateDockerfile() {
  console.log('🐳 Validating Dockerfile configuration...');
  
  try {
    const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
    
    // Check for ARG usage instead of ENV for sensitive data
    if (dockerfileContent.includes('ARG SUPABASE_SERVICE_ROLE_KEY')) {
      results.dockerFile.passed++;
      results.dockerFile.details.push('✅ Using ARG for sensitive build variables');
    } else {
      results.dockerFile.failed++;
      results.dockerFile.details.push('❌ Not using ARG for sensitive variables');
    }
    
    // Check for public directory copy
    if (dockerfileContent.includes('COPY --from=builder /app/public ./public')) {
      results.dockerFile.passed++;
      results.dockerFile.details.push('✅ Public directory copy configured');
    } else {
      results.dockerFile.failed++;
      results.dockerFile.details.push('❌ Public directory copy missing');
    }
    
    // Check for standalone output
    if (dockerfileContent.includes('COPY --from=builder /app/.next/standalone ./')) {
      results.dockerFile.passed++;
      results.dockerFile.details.push('✅ Standalone output configured');
    } else {
      results.dockerFile.failed++;
      results.dockerFile.details.push('❌ Standalone output missing');
    }
    
  } catch (error) {
    results.dockerFile.failed++;
    results.dockerFile.details.push(`❌ Error reading Dockerfile: ${error.message}`);
  }
}

// 4. Validate Build Configuration
function validateBuildConfig() {
  console.log('⚙️ Validating build configuration...');
  
  try {
    // Check next.config.deploy.js
    if (fs.existsSync('next.config.deploy.js')) {
      const deployConfig = fs.readFileSync('next.config.deploy.js', 'utf8');
      
      if (deployConfig.includes("output: 'standalone'")) {
        results.buildConfig.passed++;
        results.buildConfig.details.push('✅ Standalone output configured in deploy config');
      } else {
        results.buildConfig.failed++;
        results.buildConfig.details.push('❌ Standalone output missing in deploy config');
      }
      
      if (deployConfig.includes('ignoreBuildErrors: true')) {
        results.buildConfig.passed++;
        results.buildConfig.details.push('✅ Build error tolerance configured');
      } else {
        results.buildConfig.failed++;
        results.buildConfig.details.push('❌ Build error tolerance missing');
      }
    } else {
      results.buildConfig.failed++;
      results.buildConfig.details.push('❌ next.config.deploy.js not found');
    }
    
  } catch (error) {
    results.buildConfig.failed++;
    results.buildConfig.details.push(`❌ Error validating build config: ${error.message}`);
  }
}

// Main execution
validatePublicDirectory();
validateDynamicRoutes();
validateDockerfile();
validateBuildConfig();

// Print results
console.log('\n📊 VALIDATION RESULTS');
console.log('====================\n');

const categories = [
  { name: 'Public Directory', key: 'publicDirectory' },
  { name: 'Dynamic Routes', key: 'dynamicRoutes' },
  { name: 'Dockerfile', key: 'dockerFile' },
  { name: 'Build Config', key: 'buildConfig' }
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
  console.log('\n🎉 ALL VALIDATIONS PASSED!');
  console.log('🚀 Ready for Coolify deployment');
  process.exit(0);
} else {
  console.log('\n⚠️ Some validations failed');
  console.log('🔧 Please fix the issues before deployment');
  process.exit(1);
}
