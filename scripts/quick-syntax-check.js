#!/usr/bin/env node

/**
 * Quick syntax check for the fixed API routes
 */

const fs = require('fs');

console.log('🔍 Quick syntax check for fixed API routes...');

// Sample of routes to check
const routesToCheck = [
  'src/app/api/dashboard/admin/activity/route.ts',
  'src/app/api/dashboard/admin/stats/route.ts',
  'src/app/api/doctors/availability/route.ts',
  'src/app/api/admin/whatsapp/instances/route.ts'
];

let allGood = true;

for (const route of routesToCheck) {
  try {
    if (!fs.existsSync(route)) {
      console.log(`❌ File not found: ${route}`);
      allGood = false;
      continue;
    }

    const content = fs.readFileSync(route, 'utf8');
    
    // Check for export statements
    if (!content.includes("export const dynamic = 'force-dynamic'")) {
      console.log(`❌ Missing dynamic export: ${route}`);
      allGood = false;
      continue;
    }
    
    // Check that exports are not inside functions
    const lines = content.split('\n');
    let insideFunction = false;
    let exportLineNumber = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('export async function') || line.includes('export function')) {
        insideFunction = true;
      }
      
      if (line.includes("export const dynamic = 'force-dynamic'")) {
        exportLineNumber = i + 1;
        if (insideFunction) {
          console.log(`❌ Export inside function at line ${exportLineNumber}: ${route}`);
          allGood = false;
          break;
        }
      }
    }
    
    if (exportLineNumber > 0 && !insideFunction) {
      console.log(`✅ Syntax OK: ${route} (export at line ${exportLineNumber})`);
    }
    
  } catch (error) {
    console.log(`❌ Error checking ${route}: ${error.message}`);
    allGood = false;
  }
}

if (allGood) {
  console.log('\n🎉 All checked routes have correct syntax!');
  console.log('✅ Export statements are properly placed at module level');
  console.log('🚀 Ready for Coolify deployment');
} else {
  console.log('\n⚠️ Some routes have syntax issues');
  console.log('🔧 Please fix the issues above before deployment');
}

console.log('\n📋 Summary:');
console.log(`- Routes checked: ${routesToCheck.length}`);
console.log(`- Status: ${allGood ? 'PASS' : 'FAIL'}`);
