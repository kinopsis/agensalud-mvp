#!/usr/bin/env node

/**
 * Comprehensive validation script for deployment fixes
 * Validates all fixes applied based on deployment log analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Validating deployment fixes...');

// Validation results
const results = {
  dynamicRoutes: { passed: 0, failed: 0, details: [] },
  supabaseConfig: { passed: 0, failed: 0, details: [] },
  buildConfig: { passed: 0, failed: 0, details: [] },
  environmentVars: { passed: 0, failed: 0, details: [] }
};

// Routes that should have dynamic configuration
const dynamicRoutes = [
  'src/app/api/admin/whatsapp/instances/route.ts',
  'src/app/api/dashboard/superadmin/stats/route.ts',
  'src/app/api/debug/admin-doctor-access/route.ts',
  'src/app/api/doctors/availability/route.ts',
  'src/app/api/dashboard/admin/activity/route.ts',
  'src/app/api/superadmin/analytics/route.ts'
];

function validateDynamicRoutes() {
  console.log('\n📋 Validating dynamic route configurations...');
  
  for (const route of dynamicRoutes) {
    try {
      if (!fs.existsSync(route)) {
        results.dynamicRoutes.failed++;
        results.dynamicRoutes.details.push(`❌ Route not found: ${route}`);
        continue;
      }

      const content = fs.readFileSync(route, 'utf8');
      
      if (content.includes("export const dynamic = 'force-dynamic'")) {
        results.dynamicRoutes.passed++;
        results.dynamicRoutes.details.push(`✅ Dynamic config found: ${route}`);
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

function validateSupabaseConfig() {
  console.log('\n🗃️ Validating Supabase configuration...');
  
  const supabaseFiles = [
    'src/lib/supabase/client.ts',
    'src/lib/supabase/server.ts',
    'src/app/api/health/route.ts'
  ];

  for (const file of supabaseFiles) {
    try {
      if (!fs.existsSync(file)) {
        results.supabaseConfig.failed++;
        results.supabaseConfig.details.push(`❌ File not found: ${file}`);
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      
      // Check for build-time safe configuration
      if (content.includes('placeholder.supabase.co') || content.includes('isBuildTime')) {
        results.supabaseConfig.passed++;
        results.supabaseConfig.details.push(`✅ Build-safe config found: ${file}`);
      } else {
        results.supabaseConfig.failed++;
        results.supabaseConfig.details.push(`❌ Missing build-safe config: ${file}`);
      }
    } catch (error) {
      results.supabaseConfig.failed++;
      results.supabaseConfig.details.push(`❌ Error reading ${file}: ${error.message}`);
    }
  }
}

function validateBuildConfig() {
  console.log('\n⚙️ Validating build configuration...');
  
  const configFiles = [
    { file: 'next.config.deploy.js', checks: ['ignoreBuildErrors', 'force-dynamic'] },
    { file: 'Dockerfile', checks: ['NEXT_PUBLIC_SUPABASE_URL', 'placeholder.supabase.co'] },
    { file: 'tsconfig.build.json', checks: ['skipLibCheck', 'strict'] }
  ];

  for (const { file, checks } of configFiles) {
    try {
      if (!fs.existsSync(file)) {
        results.buildConfig.failed++;
        results.buildConfig.details.push(`❌ Config file not found: ${file}`);
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      let passed = 0;
      
      for (const check of checks) {
        if (content.includes(check)) {
          passed++;
        }
      }
      
      if (passed === checks.length) {
        results.buildConfig.passed++;
        results.buildConfig.details.push(`✅ All checks passed: ${file}`);
      } else {
        results.buildConfig.failed++;
        results.buildConfig.details.push(`❌ Missing config in ${file}: ${checks.length - passed}/${checks.length} checks failed`);
      }
    } catch (error) {
      results.buildConfig.failed++;
      results.buildConfig.details.push(`❌ Error reading ${file}: ${error.message}`);
    }
  }
}

function validateEnvironmentVars() {
  console.log('\n🔐 Validating environment variable configuration...');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET'
  ];

  // Check if .env.coolify.example exists and has required vars
  const envFile = '.env.coolify.example';
  
  try {
    if (!fs.existsSync(envFile)) {
      results.environmentVars.failed++;
      results.environmentVars.details.push(`❌ Environment template not found: ${envFile}`);
      return;
    }

    const content = fs.readFileSync(envFile, 'utf8');
    let foundVars = 0;
    
    for (const varName of requiredVars) {
      if (content.includes(varName)) {
        foundVars++;
      }
    }
    
    if (foundVars === requiredVars.length) {
      results.environmentVars.passed++;
      results.environmentVars.details.push(`✅ All required variables found in ${envFile}`);
    } else {
      results.environmentVars.failed++;
      results.environmentVars.details.push(`❌ Missing variables in ${envFile}: ${requiredVars.length - foundVars}/${requiredVars.length}`);
    }
  } catch (error) {
    results.environmentVars.failed++;
    results.environmentVars.details.push(`❌ Error reading ${envFile}: ${error.message}`);
  }
}

function testBuildProcess() {
  console.log('\n🔨 Testing build process (dry run)...');
  
  try {
    // Set build-time environment variables
    const buildEnv = {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder-signature-for-build-time-only',
      NEXTAUTH_SECRET: 'build-time-secret-placeholder-32-characters-long'
    };

    // Test TypeScript compilation
    console.log('   📝 Testing TypeScript compilation...');
    execSync('npx tsc --noEmit --skipLibCheck', { 
      stdio: 'pipe',
      env: buildEnv,
      timeout: 30000
    });
    
    results.buildConfig.details.push('✅ TypeScript compilation successful');
    
  } catch (error) {
    results.buildConfig.details.push(`❌ Build test failed: ${error.message}`);
  }
}

function generateReport() {
  console.log('\n📊 DEPLOYMENT VALIDATION REPORT');
  console.log('=====================================');
  
  const categories = [
    { name: 'Dynamic Routes', data: results.dynamicRoutes },
    { name: 'Supabase Config', data: results.supabaseConfig },
    { name: 'Build Config', data: results.buildConfig },
    { name: 'Environment Vars', data: results.environmentVars }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const { name, data } of categories) {
    console.log(`\n${name}:`);
    console.log(`  ✅ Passed: ${data.passed}`);
    console.log(`  ❌ Failed: ${data.failed}`);
    
    totalPassed += data.passed;
    totalFailed += data.failed;
    
    // Show details for failed items
    const failedDetails = data.details.filter(detail => detail.startsWith('❌'));
    if (failedDetails.length > 0) {
      console.log('  Details:');
      failedDetails.forEach(detail => console.log(`    ${detail}`));
    }
  }

  console.log('\n=====================================');
  console.log(`📈 OVERALL SCORE: ${totalPassed}/${totalPassed + totalFailed} (${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%)`);
  
  if (totalFailed === 0) {
    console.log('🎉 ALL VALIDATIONS PASSED! Ready for Coolify deployment.');
  } else if (totalFailed <= 2) {
    console.log('⚠️ Minor issues found. Deployment should succeed but may have warnings.');
  } else {
    console.log('🚨 Critical issues found. Fix these before deployment.');
  }

  return totalFailed === 0;
}

// Main execution
async function main() {
  validateDynamicRoutes();
  validateSupabaseConfig();
  validateBuildConfig();
  validateEnvironmentVars();
  testBuildProcess();
  
  const allPassed = generateReport();
  
  if (allPassed) {
    console.log('\n🚀 Deployment validation completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Commit and push changes');
    console.log('   2. Configure environment variables in Coolify');
    console.log('   3. Deploy to Coolify');
    process.exit(0);
  } else {
    console.log('\n🔧 Fix the issues above and run validation again.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Validation script failed:', error.message);
  process.exit(1);
});
