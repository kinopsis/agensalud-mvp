/**
 * @fileoverview Debug API Calls Tool
 * Tests the exact API calls that are failing in the debug tool
 * to identify the specific issue with doctors and appointments APIs
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test credentials
const TEST_CREDENTIALS = {
  email: 'laura.gomez.new@visualcare.com',
  password: 'password123'
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

/**
 * Debug API Calls Results Tracker
 */
class APIDebugger {
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
    console.log('📊 API DEBUG SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.failed > 0) {
      console.log('❌ FAILED TESTS:');
      this.tests.filter(t => t.status === 'FAILED').forEach((test, index) => {
        console.log(`   ${index + 1}. ${test.name}: ${test.error}`);
      });
      console.log('');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test authentication
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
 * Test doctors API with exact Supabase query syntax
 */
async function testDoctorsAPIQuery(client) {
  console.log('   🔍 Testing doctors API query syntax...');

  // Test the exact query from the API
  const { data, error } = await client
    .from('doctors')
    .select(`
      id,
      specialization,
      consultation_fee,
      is_available,
      profiles(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('organization_id', ORGANIZATION_ID)
    .eq('is_available', true);

  if (error) {
    throw new Error(`Doctors API query failed: ${error.message}`);
  }

  const expectedCount = 5;
  const actualCount = data?.length || 0;

  console.log(`   📊 Raw data count: ${actualCount}`);
  console.log(`   📊 Data with profiles: ${data?.filter(d => d.profiles).length || 0}`);

  if (data && data.length > 0) {
    console.log(`   📋 Sample doctor:`, JSON.stringify(data[0], null, 2));
  }

  return {
    details: `✓ Doctors API query: ${actualCount} doctors found (expected ${expectedCount})`,
    count: actualCount,
    expectedCount,
    data: data?.slice(0, 2) || []
  };
}

/**
 * Test appointments API with exact Supabase query syntax
 */
async function testAppointmentsAPIQuery(client) {
  console.log('   🔍 Testing appointments API query syntax...');

  // Test the exact query from the API
  const { data, error } = await client
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      doctor:doctors!appointments_doctor_id_fkey(
        id,
        specialization,
        profiles(
          id,
          first_name,
          last_name,
          email
        )
      ),
      service:services(
        id,
        name,
        duration_minutes,
        price
      ),
      location:locations(
        id,
        name,
        address
      )
    `)
    .eq('organization_id', ORGANIZATION_ID)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Appointments API query failed: ${error.message}`);
  }

  const expectedCount = 10;
  const actualCount = data?.length || 0;

  console.log(`   📊 Raw data count: ${actualCount}`);
  console.log(`   📊 Data with patient: ${data?.filter(a => a.patient).length || 0}`);
  console.log(`   📊 Data with doctor: ${data?.filter(a => a.doctor).length || 0}`);

  if (data && data.length > 0) {
    console.log(`   📋 Sample appointment:`, JSON.stringify(data[0], null, 2));
  }

  return {
    details: `✓ Appointments API query: ${actualCount} appointments found (expected ${expectedCount})`,
    count: actualCount,
    expectedCount,
    data: data?.slice(0, 2) || []
  };
}

/**
 * Test simplified queries to isolate the issue
 */
async function testSimplifiedQueries(client) {
  console.log('   🔍 Testing simplified queries...');

  // Test doctors without JOIN
  const { data: doctorsSimple, error: doctorsError } = await client
    .from('doctors')
    .select('id, specialization, is_available, organization_id')
    .eq('organization_id', ORGANIZATION_ID);

  if (doctorsError) {
    throw new Error(`Simple doctors query failed: ${doctorsError.message}`);
  }

  // Test appointments without JOINs
  const { data: appointmentsSimple, error: appointmentsError } = await client
    .from('appointments')
    .select('id, status, appointment_date, organization_id')
    .eq('organization_id', ORGANIZATION_ID);

  if (appointmentsError) {
    throw new Error(`Simple appointments query failed: ${appointmentsError.message}`);
  }

  return {
    details: `✓ Simplified queries: ${doctorsSimple?.length || 0} doctors, ${appointmentsSimple?.length || 0} appointments`,
    doctors: doctorsSimple?.length || 0,
    appointments: appointmentsSimple?.length || 0
  };
}

/**
 * Test profiles access for JOIN validation
 */
async function testProfilesForJoin(client) {
  console.log('   🔍 Testing profiles access for JOINs...');

  // Get doctor profile IDs
  const { data: doctors } = await client
    .from('doctors')
    .select('profile_id')
    .eq('organization_id', ORGANIZATION_ID);

  const doctorProfileIds = doctors?.map(d => d.profile_id) || [];

  // Test if we can access these profiles
  const { data: doctorProfiles, error: profilesError } = await client
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', doctorProfileIds);

  if (profilesError) {
    throw new Error(`Doctor profiles query failed: ${profilesError.message}`);
  }

  return {
    details: `✓ Profiles for JOINs: ${doctorProfiles?.length || 0}/${doctorProfileIds.length} doctor profiles accessible`,
    doctorProfiles: doctorProfiles?.length || 0,
    expectedProfiles: doctorProfileIds.length
  };
}

/**
 * Main debug function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - API CALLS DEBUG');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('👤 Test User: Laura Gómez (Admin)');
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const apiDebugger = new APIDebugger();
  let client = null;

  try {
    // Test authentication
    const authResult = await apiDebugger.runTest('Authentication', testAuthentication);
    client = authResult.client;

    // Test simplified queries first
    await apiDebugger.runTest('Simplified Queries', () => testSimplifiedQueries(client));

    // Test profiles access for JOINs
    await apiDebugger.runTest('Profiles for JOINs', () => testProfilesForJoin(client));

    // Test exact API queries
    await apiDebugger.runTest('Doctors API Query', () => testDoctorsAPIQuery(client));
    await apiDebugger.runTest('Appointments API Query', () => testAppointmentsAPIQuery(client));

    // Print summary
    apiDebugger.printSummary();

    if (apiDebugger.failed === 0) {
      console.log('🎯 ALL QUERIES WORK! The issue may be in the API route handlers.');
      console.log('   Check the API route files for additional filtering or processing.');
    } else {
      console.log('🔍 ISSUES FOUND! Check the failed tests above for specific problems.');
    }

    // Sign out
    if (client) {
      await client.auth.signOut();
    }

    // Exit with appropriate code
    process.exit(apiDebugger.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during debug:', error);
    
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

module.exports = { APIDebugger };
