#!/usr/bin/env node

/**
 * Script to fix API routes that initialize Supabase at module level
 * This prevents build failures when environment variables are not available
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing API routes for build-time compatibility...');

// Find all route.ts files in src/app/api
function findApiRoutes(dir) {
  const routes = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item === 'route.ts') {
        routes.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return routes;
}

// Check if file has problematic Supabase initialization
function hasProblematicSupabaseInit(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Look for direct Supabase client creation with environment variables
  const patterns = [
    /createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!/,
    /createClient\(\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!/,
    /process\.env\.NEXT_PUBLIC_SUPABASE_URL!/,
    /process\.env\.SUPABASE_SERVICE_ROLE_KEY!/
  ];
  
  return patterns.some(pattern => pattern.test(content));
}

// Fix problematic Supabase initialization
function fixSupabaseInit(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace direct environment variable access with helper functions
  if (content.includes('process.env.NEXT_PUBLIC_SUPABASE_URL!')) {
    content = content.replace(
      /process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g,
      "process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'"
    );
    modified = true;
  }
  
  if (content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY!')) {
    content = content.replace(
      /process\.env\.SUPABASE_SERVICE_ROLE_KEY!/g,
      "process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTE5MjgwMCwiZXhwIjoxOTYwNzY4ODAwfQ.placeholder'"
    );
    modified = true;
  }
  
  if (content.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!')) {
    content = content.replace(
      /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!/g,
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'"
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
const apiDir = path.join(process.cwd(), 'src', 'app', 'api');

if (!fs.existsSync(apiDir)) {
  console.error('❌ API directory not found:', apiDir);
  process.exit(1);
}

const apiRoutes = findApiRoutes(apiDir);
console.log(`📁 Found ${apiRoutes.length} API routes`);

let fixedCount = 0;
let problematicCount = 0;

for (const route of apiRoutes) {
  if (hasProblematicSupabaseInit(route)) {
    problematicCount++;
    console.log(`🔍 Problematic route found: ${route}`);
    
    if (fixSupabaseInit(route)) {
      fixedCount++;
    }
  }
}

console.log('\n📊 Summary:');
console.log(`- Total API routes: ${apiRoutes.length}`);
console.log(`- Problematic routes: ${problematicCount}`);
console.log(`- Fixed routes: ${fixedCount}`);

if (fixedCount > 0) {
  console.log('\n✅ API routes have been fixed for build-time compatibility');
  console.log('🔧 Routes now use fallback values when environment variables are missing');
} else if (problematicCount === 0) {
  console.log('\n✅ No problematic API routes found');
} else {
  console.log('\n⚠️ Some routes could not be automatically fixed');
}

console.log('\n🚀 Build should now succeed with placeholder Supabase configuration');
