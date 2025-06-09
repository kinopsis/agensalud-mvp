#!/usr/bin/env node

/**
 * Restore original API routes (remove dynamic configs)
 */

const fs = require('fs');

const routes = [
  "src/app/api/admin/whatsapp/instances/route.ts",
  "src/app/api/dashboard/superadmin/stats/route.ts",
  "src/app/api/debug/admin-doctor-access/route.ts",
  "src/app/api/debug/doctor-availability-investigation/route.ts",
  "src/app/api/debug/frontend-simulation/route.ts",
  "src/app/api/debug/laura-patients-access/route.ts",
  "src/app/api/debug/patients-api-test/route.ts",
  "src/app/api/debug/test-credentials/route.ts",
  "src/app/api/docs/endpoints/route.ts",
  "src/app/api/doctors/availability/route.ts",
  "src/app/api/superadmin/system/config/route.ts",
  "src/app/api/superadmin/system/health/route.ts",
  "src/app/api/dashboard/admin/activity/route.ts",
  "src/app/api/dashboard/admin/stats/route.ts",
  "src/app/api/dashboard/admin/upcoming/route.ts",
  "src/app/api/dashboard/doctor/stats/route.ts",
  "src/app/api/dashboard/patient/stats/route.ts",
  "src/app/api/dashboard/staff/stats/route.ts",
  "src/app/api/dashboard/staff/tasks/route.ts",
  "src/app/api/dashboard/superadmin/activity/route.ts",
  "src/app/api/dashboard/superadmin/organizations/route.ts",
  "src/app/api/debug/patient-data-consistency/route.ts",
  "src/app/api/debug/role-data-consistency/route.ts",
  "src/app/api/doctors/route.ts",
  "src/app/api/superadmin/analytics/route.ts",
  "src/app/api/superadmin/reports/metrics/route.ts"
];

console.log('🔄 Restoring original API routes...');

let restoredCount = 0;

for (const route of routes) {
  const backupPath = route + '.backup-dynamic';
  
  if (fs.existsSync(backupPath)) {
    try {
      const originalContent = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(route, originalContent);
      fs.unlinkSync(backupPath);
      console.log(`✅ Restored: ${route}`);
      restoredCount++;
    } catch (error) {
      console.log(`❌ Failed to restore ${route}: ${error.message}`);
    }
  }
}

console.log(`\n📊 Summary: ${restoredCount} routes restored`);
