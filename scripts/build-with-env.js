#!/usr/bin/env node

/**
 * Build script with proper environment variables for Coolify deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Building AgentSalud MVP with build-time environment variables...');

// Set build-time environment variables
process.env.NODE_ENV = 'production';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder-signature-for-build-time-only';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder-signature-for-build-time-only';
process.env.NEXTAUTH_SECRET = 'build-time-secret-placeholder-32-characters-long';
process.env.NEXTAUTH_URL = 'https://placeholder.com';

console.log('📦 Environment variables set for build:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('- NEXTAUTH_SECRET: [SET]');

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (fs.existsSync('.next')) {
    try {
      execSync('Remove-Item -Path .next -Recurse -Force', { stdio: 'inherit', shell: 'powershell' });
    } catch (error) {
      // Fallback to manual deletion
      fs.rmSync('.next', { recursive: true, force: true });
    }
  }

  // Use deployment config
  console.log('⚙️ Using deployment configuration...');
  if (fs.existsSync('next.config.deploy.js')) {
    if (fs.existsSync('next.config.js')) {
      fs.renameSync('next.config.js', 'next.config.js.backup');
    }
    fs.copyFileSync('next.config.deploy.js', 'next.config.js');
  }

  // Build with Next.js
  console.log('🔨 Building with Next.js...');
  execSync('npx next build', { 
    stdio: 'inherit',
    env: process.env
  });

  console.log('✅ Build completed successfully!');

  // Restore original config if it exists
  if (fs.existsSync('next.config.js.backup')) {
    fs.unlinkSync('next.config.js');
    fs.renameSync('next.config.js.backup', 'next.config.js');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // Restore original config if it exists
  if (fs.existsSync('next.config.js.backup')) {
    fs.unlinkSync('next.config.js');
    fs.renameSync('next.config.js.backup', 'next.config.js');
  }
  
  console.log('\n🔍 Troubleshooting suggestions:');
  console.log('1. Check for syntax errors in API routes');
  console.log('2. Verify all imports are correct');
  console.log('3. Clear node_modules and reinstall: rm -rf node_modules && npm install');
  console.log('4. Check for circular dependencies');
  
  process.exit(1);
}

console.log('\n🎯 Build Summary:');
console.log('- Next.js application built successfully');
console.log('- Build-time environment variables used');
console.log('- Ready for Coolify deployment');
console.log('- Runtime will use real Supabase credentials');
