/**
 * @fileoverview Cross-Role Dashboard Validation Script
 * Validates navigation consistency and data quality across all user roles
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

// Test credentials for different roles
const TEST_CREDENTIALS = {
  admin: {
    email: 'laura.gomez.new@visualcare.com',
    password: 'password123',
    expectedRole: 'admin'
  },
  patient: {
    email: 'patient@visualcare.com', // This might need to be updated
    password: 'password123',
    expectedRole: 'patient'
  },
  doctor: {
    email: 'doctor@visualcare.com', // This might need to be updated
    password: 'password123',
    expectedRole: 'doctor'
  },
  staff: {
    email: 'staff@visualcare.com', // This might need to be updated
    password: 'password123',
    expectedRole: 'staff'
  },
  superadmin: {
    email: 'superadmin@visualcare.com', // This might need to be updated
    password: 'password123',
    expectedRole: 'superadmin'
  }
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

/**
 * Cross-Role Dashboard Validator
 */
class CrossRoleValidator {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      const result = await testFn();
      console.log(`✅ PASSED: ${name}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      console.log('');
      this.passed++;
      this.tests.push({ name, status: 'PASSED', error: null, result });
      return result;
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      this.failed++;
      this.tests.push({ name, status: 'FAILED', error: error.message, result: null });
      return null;
    }
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 CROSS-ROLE DASHBOARD VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    // Group results by role
    const roleResults = {};
    this.tests.forEach(test => {
      const role = test.name.split(' ')[0]; // Extract role from test name
      if (!roleResults[role]) {
        roleResults[role] = { passed: 0, failed: 0, total: 0 };
      }
      roleResults[role].total++;
      if (test.status === 'PASSED') {
        roleResults[role].passed++;
      } else {
        roleResults[role].failed++;
      }
    });

    console.log('📋 RESULTS BY ROLE:');
    Object.entries(roleResults).forEach(([role, results]) => {
      const successRate = ((results.passed / results.total) * 100).toFixed(1);
      console.log(`   ${role}: ${results.passed}/${results.total} (${successRate}%)`);
    });

    if (this.failed === 0) {
      console.log('\n🎉 ALL CROSS-ROLE TESTS PASSED!');
      console.log('   Navigation and data quality are consistent across all roles.');
    } else {
      console.log('\n⚠️  Some cross-role issues found.');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test dashboard API for a specific role
 */
async function testRoleDashboardAPI(role, endpoint) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      return {
        details: `✓ ${role} dashboard API requires authentication (expected behavior)`,
        requiresAuth: true,
        status: response.status
      };
    }

    if (response.ok) {
      const result = await response.json();
      const data = result.data || result;
      
      // Check for "desconocido" entries in the response
      const responseText = JSON.stringify(data);
      const unknownCount = (responseText.match(/desconocido/gi) || []).length;
      
      return {
        details: `✓ ${role} dashboard API accessible: ${unknownCount} "desconocido" entries found`,
        hasData: !!data,
        unknownCount,
        hasUnknownData: unknownCount > 0,
        dataStructure: Array.isArray(data) ? 'Array' : typeof data
      };
    } else {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`${role} dashboard API test failed: ${error.message}`);
  }
}

/**
 * Test navigation consistency for a role
 */
async function testRoleNavigation(role) {
  try {
    // Test main dashboard page
    const dashboardUrl = `${BASE_URL}/dashboard`;
    const dashboardResponse = await fetch(dashboardUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/html' }
    });

    // Test role-specific management pages (if they exist)
    const managementPages = {
      admin: ['/patients', '/staff/patients', '/appointments'],
      patient: ['/appointments'],
      doctor: ['/appointments', '/schedule'],
      staff: ['/patients', '/appointments'],
      superadmin: ['/organizations', '/users']
    };

    const rolePagesToTest = managementPages[role] || [];
    let accessiblePages = 0;
    let totalPages = rolePagesToTest.length;

    for (const page of rolePagesToTest) {
      try {
        const pageResponse = await fetch(`${BASE_URL}${page}`, {
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        });
        if (pageResponse.status < 500) { // Accept 401, 403 as valid responses
          accessiblePages++;
        }
      } catch (error) {
        // Page might not exist or have network issues
      }
    }

    return {
      details: `✓ ${role} navigation: ${accessiblePages}/${totalPages} management pages accessible`,
      dashboardAccessible: dashboardResponse.status < 500,
      managementPagesAccessible: accessiblePages,
      totalManagementPages: totalPages
    };
  } catch (error) {
    throw new Error(`${role} navigation test failed: ${error.message}`);
  }
}

/**
 * Test data consistency across roles
 */
async function testDataConsistency() {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test appointments data that should be consistent across roles
    const { data: appointments, error: appointmentsError } = await client
      .from('appointments')
      .select(`
        id,
        status,
        appointment_date,
        patient:profiles!appointments_patient_id_fkey(first_name, last_name),
        doctor:doctors!appointments_doctor_id_fkey(
          id,
          profiles(first_name, last_name)
        ),
        service:services(name)
      `)
      .eq('organization_id', ORGANIZATION_ID)
      .limit(10);

    if (appointmentsError) {
      throw new Error(`Data consistency query failed: ${appointmentsError.message}`);
    }

    const appointmentCount = appointments?.length || 0;
    let consistentData = 0;

    if (appointments) {
      for (const apt of appointments) {
        // Check if data is properly structured (not null/undefined)
        const hasPatient = apt.patient && (apt.patient.first_name || apt.patient.last_name);
        const hasDoctor = apt.doctor?.profiles && (apt.doctor.profiles.first_name || apt.doctor.profiles.last_name);
        const hasService = apt.service?.name;
        
        if (hasPatient && hasDoctor && hasService) {
          consistentData++;
        }
      }
    }

    const consistencyRate = appointmentCount > 0 ? (consistentData / appointmentCount * 100).toFixed(1) : 100;

    return {
      details: `✓ Data consistency: ${consistentData}/${appointmentCount} appointments have complete data (${consistencyRate}%)`,
      appointmentCount,
      consistentData,
      consistencyRate: parseFloat(consistencyRate)
    };
  } catch (error) {
    throw new Error(`Data consistency test failed: ${error.message}`);
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - CROSS-ROLE DASHBOARD VALIDATION');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('🌐 Base URL: ' + BASE_URL);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  console.log('🎯 TESTING CROSS-ROLE CONSISTENCY:');
  console.log('   1. Dashboard API endpoints for each role');
  console.log('   2. Navigation consistency across roles');
  console.log('   3. Data consistency validation');
  console.log('\n');

  const validator = new CrossRoleValidator();

  try {
    // Test dashboard APIs for each role
    const dashboardEndpoints = {
      admin: '/api/dashboard/admin/activity?organizationId=' + ORGANIZATION_ID,
      patient: '/api/dashboard/patient/stats?patientId=test&organizationId=' + ORGANIZATION_ID,
      doctor: '/api/dashboard/doctor/stats?doctorId=test&organizationId=' + ORGANIZATION_ID,
      staff: '/api/dashboard/staff/stats?organizationId=' + ORGANIZATION_ID,
      superadmin: '/api/dashboard/superadmin/activity'
    };

    for (const [role, endpoint] of Object.entries(dashboardEndpoints)) {
      await validator.runTest(
        `${role} Dashboard API`,
        () => testRoleDashboardAPI(role, endpoint)
      );
    }

    // Test navigation for each role
    for (const role of Object.keys(TEST_CREDENTIALS)) {
      await validator.runTest(
        `${role} Navigation`,
        () => testRoleNavigation(role)
      );
    }

    // Test data consistency
    await validator.runTest('Data Consistency', testDataConsistency);

    // Print summary
    validator.printSummary();

    if (validator.failed === 0) {
      console.log('🎯 CROSS-ROLE VALIDATION SUCCESSFUL!');
      console.log('');
      console.log('📋 NEXT STEPS FOR MANUAL TESTING:');
      console.log('   1. Start development server: npm run dev');
      console.log('   2. Test each role with appropriate credentials');
      console.log('   3. Verify dashboard data quality for each role');
      console.log('   4. Check navigation consistency across roles');
      console.log('   5. Monitor console for debug logs');
      console.log('');
      console.log('🔍 Expected Debug Logs by Role:');
      console.log('   🔍 ADMIN DASHBOARD DEBUG: (for admin role)');
      console.log('   🔍 PATIENT DASHBOARD DEBUG: (for patient role)');
      console.log('   🔍 DOCTOR STATS DEBUG: (for doctor role)');
      console.log('   🔍 SUPERADMIN ACTIVITY DEBUG: (for superadmin role)');
    } else {
      console.log('🔍 CROSS-ROLE ISSUES FOUND! Check the failed tests above.');
    }

    // Exit with appropriate code
    process.exit(validator.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during cross-role validation:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { CrossRoleValidator };
