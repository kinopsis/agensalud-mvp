#!/usr/bin/env node

/**
 * Fix Dynamic Server Usage errors by adding route segment config
 * Resolves "couldn't be rendered statically" errors during build
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Dynamic Server Usage errors...');

// Routes that need dynamic configuration based on deployment logs
const problematicRoutes = [
  // Cookies-based routes
  'src/app/api/admin/whatsapp/instances/route.ts',
  'src/app/api/dashboard/superadmin/stats/route.ts',
  'src/app/api/debug/admin-doctor-access/route.ts',
  'src/app/api/debug/doctor-availability-investigation/route.ts',
  'src/app/api/debug/frontend-simulation/route.ts',
  'src/app/api/debug/laura-patients-access/route.ts',
  'src/app/api/debug/patients-api-test/route.ts',
  'src/app/api/debug/test-credentials/route.ts',
  'src/app/api/docs/endpoints/route.ts',
  'src/app/api/doctors/availability/route.ts',
  'src/app/api/superadmin/system/config/route.ts',
  'src/app/api/superadmin/system/health/route.ts',
  
  // Request.url-based routes
  'src/app/api/dashboard/admin/activity/route.ts',
  'src/app/api/dashboard/admin/stats/route.ts',
  'src/app/api/dashboard/admin/upcoming/route.ts',
  'src/app/api/dashboard/doctor/stats/route.ts',
  'src/app/api/dashboard/patient/stats/route.ts',
  'src/app/api/dashboard/staff/stats/route.ts',
  'src/app/api/dashboard/staff/tasks/route.ts',
  'src/app/api/dashboard/superadmin/activity/route.ts',
  'src/app/api/dashboard/superadmin/organizations/route.ts',
  'src/app/api/debug/patient-data-consistency/route.ts',
  'src/app/api/debug/role-data-consistency/route.ts',
  'src/app/api/doctors/route.ts',
  'src/app/api/superadmin/analytics/route.ts',
  'src/app/api/superadmin/reports/metrics/route.ts'
];

function addDynamicConfig(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if dynamic config already exists
    if (content.includes('export const dynamic')) {
      console.log(`✅ Already configured: ${filePath}`);
      return true;
    }

    const lines = content.split('\n');
    let insertIndex = -1;
    let lastImportIndex = -1;

    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    // If we found imports, insert after the last import
    if (lastImportIndex !== -1) {
      insertIndex = lastImportIndex + 1;
    } else {
      // If no imports, find the first non-comment, non-empty line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and comments at the top
        if (line === '' ||
            line.startsWith('//') ||
            line.startsWith('/*') ||
            line.startsWith('*') ||
            line.startsWith('*/') ||
            line.startsWith('/**')) {
          continue;
        }

        // Insert before the first actual code
        insertIndex = i;
        break;
      }
    }

    // Fallback: insert at the beginning if we couldn't find a good spot
    if (insertIndex === -1) {
      insertIndex = 0;
    }

    // Insert the dynamic configuration with proper spacing
    const dynamicConfig = [
      '',
      '// Force dynamic rendering to prevent static generation errors',
      "export const dynamic = 'force-dynamic';",
      'export const revalidate = 0;',
      ''
    ];

    // Insert the lines
    lines.splice(insertIndex, 0, ...dynamicConfig);
    const newContent = lines.join('\n');

    // Create backup
    const backupPath = filePath + '.backup-dynamic-v2';
    fs.writeFileSync(backupPath, content);

    // Write the updated content
    fs.writeFileSync(filePath, newContent);

    console.log(`✅ Fixed: ${filePath} (inserted at line ${insertIndex + 1})`);
    return true;

  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

function createRestoreScript() {
  const restoreScript = `#!/usr/bin/env node

/**
 * Restore original API routes (remove dynamic configs)
 */

const fs = require('fs');

const routes = ${JSON.stringify(problematicRoutes, null, 2)};

console.log('🔄 Restoring original API routes...');

let restoredCount = 0;

for (const route of routes) {
  const backupPath = route + '.backup-dynamic';
  
  if (fs.existsSync(backupPath)) {
    try {
      const originalContent = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(route, originalContent);
      fs.unlinkSync(backupPath);
      console.log(\`✅ Restored: \${route}\`);
      restoredCount++;
    } catch (error) {
      console.log(\`❌ Failed to restore \${route}: \${error.message}\`);
    }
  }
}

console.log(\`\\n📊 Summary: \${restoredCount} routes restored\`);
`;

  fs.writeFileSync('scripts/restore-dynamic-configs.js', restoreScript);
  console.log('📝 Created restore script: scripts/restore-dynamic-configs.js');
}

// Main execution
console.log('📋 Processing problematic routes...');

let processedCount = 0;
let successCount = 0;

for (const route of problematicRoutes) {
  processedCount++;
  if (addDynamicConfig(route)) {
    successCount++;
  }
}

console.log('\n📊 Summary:');
console.log(`- Routes processed: ${processedCount}`);
console.log(`- Successfully fixed: ${successCount}`);

if (successCount > 0) {
  console.log('\n✅ Dynamic server usage errors have been fixed');
  console.log('🔧 Routes now use force-dynamic configuration');
  console.log('📝 Original routes backed up with .backup-dynamic extension');
  
  createRestoreScript();
} else {
  console.log('\n⚠️ No routes were successfully processed');
}

console.log('\n🚀 Build should now succeed without dynamic server usage errors');
