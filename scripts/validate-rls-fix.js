/**
 * @fileoverview RLS Fix Validation Tool
 * Validates that the RLS policies fix allows management pages to show correct data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test credentials
const TEST_CREDENTIALS = {
  email: 'laura.gomez.new@visualcare.com',
  password: 'password123'
};

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

/**
 * Validation Results Tracker
 */
class RLSValidator {
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
      throw error;
    }
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 RLS FIX VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! RLS policies are working correctly.');
      console.log('   Management pages should now show complete data.');
    } else {
      console.log('⚠️  Some tests failed. RLS policies may need further adjustment.');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test authentication with corrected credentials
 */
async function testAuthentication() {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  const { data: authData, error: authError } = await client.auth.signInWithPassword(TEST_CREDENTIALS);

  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('No user data returned from authentication');
  }

  return {
    details: `✓ Authenticated as ${authData.user.email}`,
    user: authData.user,
    client
  };
}

/**
 * Test profiles access with RLS
 */
async function testProfilesAccess(client) {
  const { data, error } = await client
    .from('profiles')
    .select('id, email, first_name, last_name, role, organization_id')
    .eq('organization_id', ORGANIZATION_ID);

  if (error) {
    throw new Error(`Profiles query failed: ${error.message}`);
  }

  const expectedCount = 13;
  const actualCount = data?.length || 0;

  if (actualCount !== expectedCount) {
    throw new Error(`Count mismatch: expected ${expectedCount}, got ${actualCount}`);
  }

  return {
    details: `✓ Retrieved ${actualCount} profiles (expected ${expectedCount})`,
    count: actualCount,
    data: data.slice(0, 2) // First 2 for preview
  };
}

/**
 * Test patients access with RLS
 */
async function testPatientsAccess(client) {
  const { data, error } = await client
    .from('patients')
    .select(`
      id,
      profile_id,
      organization_id,
      profiles!inner(first_name, last_name, email, role)
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (error) {
    throw new Error(`Patients query failed: ${error.message}`);
  }

  const expectedCount = 3;
  const actualCount = data?.length || 0;

  if (actualCount !== expectedCount) {
    throw new Error(`Count mismatch: expected ${expectedCount}, got ${actualCount}`);
  }

  return {
    details: `✓ Retrieved ${actualCount} patients (expected ${expectedCount})`,
    count: actualCount,
    data: data.slice(0, 2) // First 2 for preview
  };
}

/**
 * Test doctors access with RLS
 */
async function testDoctorsAccess(client) {
  const { data, error } = await client
    .from('doctors')
    .select(`
      id,
      profile_id,
      organization_id,
      specialization,
      profiles!inner(first_name, last_name, email, role)
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (error) {
    throw new Error(`Doctors query failed: ${error.message}`);
  }

  const expectedCount = 5;
  const actualCount = data?.length || 0;

  if (actualCount !== expectedCount) {
    throw new Error(`Count mismatch: expected ${expectedCount}, got ${actualCount}`);
  }

  return {
    details: `✓ Retrieved ${actualCount} doctors (expected ${expectedCount})`,
    count: actualCount,
    data: data.slice(0, 2) // First 2 for preview
  };
}

/**
 * Test appointments access with RLS
 */
async function testAppointmentsAccess(client) {
  const { data, error } = await client
    .from('appointments')
    .select('id, status, appointment_date, organization_id')
    .eq('organization_id', ORGANIZATION_ID);

  if (error) {
    throw new Error(`Appointments query failed: ${error.message}`);
  }

  const expectedCount = 10;
  const actualCount = data?.length || 0;

  if (actualCount !== expectedCount) {
    throw new Error(`Count mismatch: expected ${expectedCount}, got ${actualCount}`);
  }

  return {
    details: `✓ Retrieved ${actualCount} appointments (expected ${expectedCount})`,
    count: actualCount,
    data: data.slice(0, 2) // First 2 for preview
  };
}

/**
 * Test helper functions
 */
async function testHelperFunctions(client) {
  // Test get_user_organization_id
  const { data: orgId, error: orgError } = await client
    .rpc('get_user_organization_id');

  if (orgError) {
    throw new Error(`get_user_organization_id failed: ${orgError.message}`);
  }

  if (orgId !== ORGANIZATION_ID) {
    throw new Error(`Organization ID mismatch: expected ${ORGANIZATION_ID}, got ${orgId}`);
  }

  // Test get_user_role
  const { data: role, error: roleError } = await client
    .rpc('get_user_role');

  if (roleError) {
    throw new Error(`get_user_role failed: ${roleError.message}`);
  }

  if (role !== 'admin') {
    throw new Error(`Role mismatch: expected 'admin', got '${role}'`);
  }

  return {
    details: `✓ Helper functions working: org_id=${orgId}, role=${role}`,
    organization_id: orgId,
    role: role
  };
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - RLS FIX VALIDATION');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('👤 Test User: Laura Gómez (Admin)');
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const validator = new RLSValidator();
  let client = null;

  try {
    // Test authentication
    const authResult = await validator.runTest('Authentication', testAuthentication);
    client = authResult.client;

    // Test helper functions
    await validator.runTest('Helper Functions', () => testHelperFunctions(client));

    // Test data access with RLS
    await validator.runTest('Profiles Access (RLS)', () => testProfilesAccess(client));
    await validator.runTest('Patients Access (RLS)', () => testPatientsAccess(client));
    await validator.runTest('Doctors Access (RLS)', () => testDoctorsAccess(client));
    await validator.runTest('Appointments Access (RLS)', () => testAppointmentsAccess(client));

    // Print summary
    validator.printSummary();

    if (validator.failed === 0) {
      console.log('🎯 NEXT STEPS:');
      console.log('   1. Test management pages in browser: http://localhost:3000/users');
      console.log('   2. Test debug tool: http://localhost:3000/debug/management-pages');
      console.log('   3. Verify all management pages show complete data');
      console.log('');
    }

    // Sign out
    if (client) {
      await client.auth.signOut();
    }

    // Exit with appropriate code
    process.exit(validator.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during validation:', error);
    
    // Sign out on error
    if (client) {
      await client.auth.signOut();
    }
    
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { RLSValidator };
