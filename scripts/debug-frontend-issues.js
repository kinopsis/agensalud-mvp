/**
 * @fileoverview Frontend Issues Debugging Tool
 * Investigates specific frontend display problems in management pages
 * despite successful API validation tests
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

// Test credentials
const TEST_CREDENTIALS = {
  email: 'laura.gomez.new@visualcare.com',
  password: 'password123'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

/**
 * Frontend Debug Results Tracker
 */
class FrontendDebugger {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.issues = [];
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
      this.issues.push({ category: name, description: error.message });
      throw error;
    }
  }

  addIssue(category, description, severity = 'medium') {
    this.issues.push({ category, description, severity });
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 FRONTEND DEBUGGING SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.issues.length > 0) {
      console.log('🔍 ISSUES IDENTIFIED:');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category}] ${issue.description}`);
      });
      console.log('');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Test authentication and context setup
 */
async function testAuthenticationContext() {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  const { data: authData, error: authError } = await client.auth.signInWithPassword(TEST_CREDENTIALS);

  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }

  // Test profile access
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, email, first_name, last_name, role, organization_id, is_active')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    throw new Error(`Profile access failed: ${profileError.message}`);
  }

  // Test organization access
  const { data: organization, error: orgError } = await client
    .from('organizations')
    .select('id, name, slug')
    .eq('id', profile.organization_id)
    .single();

  if (orgError) {
    throw new Error(`Organization access failed: ${orgError.message}`);
  }

  return {
    details: `✓ Auth context: ${profile.email} (${profile.role}) @ ${organization.name}`,
    user: authData.user,
    profile,
    organization,
    client
  };
}

/**
 * Test patients API exactly as frontend calls it
 */
async function testPatientsAPICall(client, organization) {
  console.log('   🔍 Testing patients API call as frontend would...');

  const params = new URLSearchParams();
  params.append('organizationId', organization.id);

  const url = `${BASE_URL}/api/patients?${params.toString()}`;
  console.log(`   📡 URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log(`   📊 Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
  }

  const result = await response.json();
  const actualCount = result.data?.length || 0;

  console.log(`   📋 Response structure:`, Object.keys(result));
  console.log(`   📊 Data count: ${actualCount}`);

  if (result.data && result.data.length > 0) {
    console.log(`   📋 Sample patient:`, {
      id: result.data[0].id,
      name: `${result.data[0].first_name} ${result.data[0].last_name}`,
      email: result.data[0].email
    });
  }

  return {
    details: `✓ Patients API: ${actualCount} patients returned`,
    count: actualCount,
    data: result.data || []
  };
}

/**
 * Test doctors API exactly as frontend calls it
 */
async function testDoctorsAPICall(client, organization) {
  console.log('   🔍 Testing doctors API call as frontend would...');

  const params = new URLSearchParams();
  params.append('organizationId', organization.id);

  const url = `${BASE_URL}/api/doctors?${params.toString()}`;
  console.log(`   📡 URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log(`   📊 Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
  }

  const result = await response.json();
  const actualCount = result.data?.length || 0;

  console.log(`   📋 Response structure:`, Object.keys(result));
  console.log(`   📊 Data count: ${actualCount}`);

  if (result.data && result.data.length > 0) {
    console.log(`   📋 Sample doctor:`, {
      id: result.data[0].id,
      name: result.data[0].name,
      specialization: result.data[0].specialization,
      is_available: result.data[0].is_available
    });
  }

  return {
    details: `✓ Doctors API: ${actualCount} doctors returned`,
    count: actualCount,
    data: result.data || []
  };
}

/**
 * Test direct Supabase queries as frontend components would
 */
async function testDirectSupabaseQueries(client, organization) {
  console.log('   🔍 Testing direct Supabase queries...');

  // Test patients query
  const { data: patientsData, error: patientsError } = await client
    .from('patients')
    .select(`
      id,
      profile_id,
      organization_id,
      created_at,
      profiles!inner(
        first_name,
        last_name,
        email,
        phone,
        is_active
      )
    `)
    .eq('organization_id', organization.id);

  if (patientsError) {
    throw new Error(`Direct patients query failed: ${patientsError.message}`);
  }

  // Test doctors query
  const { data: doctorsData, error: doctorsError } = await client
    .from('doctors')
    .select(`
      id,
      specialization,
      is_available,
      profiles!inner(
        first_name,
        last_name,
        email
      )
    `)
    .eq('organization_id', organization.id);

  if (doctorsError) {
    throw new Error(`Direct doctors query failed: ${doctorsError.message}`);
  }

  return {
    details: `✓ Direct queries: ${patientsData?.length || 0} patients, ${doctorsData?.length || 0} doctors`,
    patients: patientsData?.length || 0,
    doctors: doctorsData?.length || 0
  };
}

/**
 * Main debugging function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - FRONTEND ISSUES DEBUGGING');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('🌐 Base URL: ' + BASE_URL);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const frontendDebugger = new FrontendDebugger();
  let client = null;
  let authContext = null;

  try {
    // Test authentication context
    authContext = await frontendDebugger.runTest('Authentication Context', testAuthenticationContext);
    client = authContext.client;

    // Test direct Supabase queries
    await frontendDebugger.runTest('Direct Supabase Queries', () => testDirectSupabaseQueries(client, authContext.organization));

    // Test API calls as frontend would make them
    await frontendDebugger.runTest('Patients API Call', () => testPatientsAPICall(client, authContext.organization));
    await frontendDebugger.runTest('Doctors API Call', () => testDoctorsAPICall(client, authContext.organization));

    // Print summary
    frontendDebugger.printSummary();

    if (frontendDebugger.failed === 0) {
      console.log('🎯 ALL TESTS PASSED!');
      console.log('   The issue may be in frontend component state management or rendering logic.');
      console.log('   Recommended next steps:');
      console.log('   1. Check browser console for JavaScript errors');
      console.log('   2. Verify authentication context in browser');
      console.log('   3. Test pages with browser dev tools network tab');
    } else {
      console.log('🔍 ISSUES FOUND! Check the failed tests above.');
    }

    // Sign out
    if (client) {
      await client.auth.signOut();
    }

    // Exit with appropriate code
    process.exit(frontendDebugger.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during debugging:', error);
    
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

module.exports = { FrontendDebugger };
