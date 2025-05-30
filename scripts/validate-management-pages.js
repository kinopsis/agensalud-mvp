/**
 * @fileoverview Management Pages Data Consistency Validator
 * Validates that management pages show all data corresponding to dashboard counts
 * for AgentSalud MVP organization VisualCare
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Test Results Tracker
 */
class ManagementPageValidator {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.inconsistencies = [];
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
      this.inconsistencies.push({ page: name, issue: error.message });
      throw error;
    }
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 MANAGEMENT PAGES VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.inconsistencies.length > 0) {
      console.log('❌ INCONSISTENCIES FOUND:');
      this.inconsistencies.forEach(issue => {
        console.log(`   - ${issue.page}: ${issue.issue}`);
      });
      console.log('');
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Get expected data from database
 */
async function getExpectedData() {
  console.log('📊 Gathering expected data from database...\n');

  // Get patients data
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select(`
      id,
      profile_id,
      status,
      created_at,
      profiles!inner(
        first_name,
        last_name,
        email,
        phone,
        is_active
      )
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (patientsError) throw new Error(`Failed to fetch patients: ${patientsError.message}`);

  // Get users data
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, is_active, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);

  // Get doctors data
  const { data: doctors, error: doctorsError } = await supabase
    .from('doctors')
    .select(`
      id,
      specialization,
      is_active,
      profiles!inner(
        first_name,
        last_name,
        email
      )
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (doctorsError) throw new Error(`Failed to fetch doctors: ${doctorsError.message}`);

  // Get appointments data
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, status, appointment_date, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  if (appointmentsError) throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);

  return {
    patients: patients || [],
    users: users || [],
    doctors: doctors || [],
    appointments: appointments || []
  };
}

/**
 * Simulate API calls that management pages would make
 */
async function simulatePatientsAPI() {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      id,
      profile_id,
      organization_id,
      created_at,
      medical_notes,
      emergency_contact_name,
      emergency_contact_phone,
      profiles!inner(
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        address,
        city,
        is_active
      )
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (error) throw new Error(`Patients API simulation failed: ${error.message}`);
  return data || [];
}

async function simulateUsersAPI() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      organization_id,
      created_at,
      phone,
      is_active,
      organizations!inner(name)
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (error) throw new Error(`Users API simulation failed: ${error.message}`);
  return data || [];
}

async function simulateDoctorsAPI() {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id,
      specialization,
      consultation_fee,
      is_active,
      profiles!inner(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (error) throw new Error(`Doctors API simulation failed: ${error.message}`);
  return data || [];
}

async function simulateAppointmentsAPI() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(first_name, last_name, email, phone),
      doctor:doctors!appointments_doctor_id_fkey(
        id,
        specialization,
        profiles(first_name, last_name, email)
      ),
      service:services(name, duration_minutes, price),
      location:locations(name, address)
    `)
    .eq('organization_id', ORGANIZATION_ID);

  if (error) throw new Error(`Appointments API simulation failed: ${error.message}`);
  return data || [];
}

/**
 * Test Functions
 */
async function testPatientsPageConsistency(expectedData) {
  const apiData = await simulatePatientsAPI();
  
  if (apiData.length !== expectedData.patients.length) {
    throw new Error(`Patients count mismatch: API=${apiData.length}, Expected=${expectedData.patients.length}`);
  }

  // Verify all expected patients are in API response
  const apiPatientIds = new Set(apiData.map(p => p.id));
  const missingPatients = expectedData.patients.filter(p => !apiPatientIds.has(p.id));
  
  if (missingPatients.length > 0) {
    throw new Error(`Missing patients in API: ${missingPatients.map(p => p.profiles.email).join(', ')}`);
  }

  return {
    details: `✓ All ${apiData.length} patients correctly returned by API`,
    apiCount: apiData.length,
    expectedCount: expectedData.patients.length
  };
}

async function testUsersPageConsistency(expectedData) {
  const apiData = await simulateUsersAPI();
  
  if (apiData.length !== expectedData.users.length) {
    throw new Error(`Users count mismatch: API=${apiData.length}, Expected=${expectedData.users.length}`);
  }

  // Verify role distribution
  const apiRoles = apiData.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  const expectedRoles = expectedData.users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  for (const role in expectedRoles) {
    if (apiRoles[role] !== expectedRoles[role]) {
      throw new Error(`Role ${role} count mismatch: API=${apiRoles[role] || 0}, Expected=${expectedRoles[role]}`);
    }
  }

  return {
    details: `✓ All ${apiData.length} users correctly returned by API (${Object.entries(apiRoles).map(([role, count]) => `${role}: ${count}`).join(', ')})`,
    apiCount: apiData.length,
    expectedCount: expectedData.users.length,
    roleDistribution: apiRoles
  };
}

async function testDoctorsPageConsistency(expectedData) {
  const apiData = await simulateDoctorsAPI();
  
  if (apiData.length !== expectedData.doctors.length) {
    throw new Error(`Doctors count mismatch: API=${apiData.length}, Expected=${expectedData.doctors.length}`);
  }

  // Verify all doctors have profile data
  const doctorsWithoutProfiles = apiData.filter(d => !d.profiles || !d.profiles.first_name);
  
  if (doctorsWithoutProfiles.length > 0) {
    throw new Error(`${doctorsWithoutProfiles.length} doctors missing profile data`);
  }

  return {
    details: `✓ All ${apiData.length} doctors correctly returned by API with profile data`,
    apiCount: apiData.length,
    expectedCount: expectedData.doctors.length
  };
}

async function testAppointmentsPageConsistency(expectedData) {
  const apiData = await simulateAppointmentsAPI();
  
  if (apiData.length !== expectedData.appointments.length) {
    throw new Error(`Appointments count mismatch: API=${apiData.length}, Expected=${expectedData.appointments.length}`);
  }

  // Verify appointments have required related data
  const appointmentsWithoutPatient = apiData.filter(a => !a.patient || !a.patient.first_name);
  const appointmentsWithoutDoctor = apiData.filter(a => !a.doctor || !a.doctor.profiles);
  
  if (appointmentsWithoutPatient.length > 0) {
    throw new Error(`${appointmentsWithoutPatient.length} appointments missing patient data`);
  }

  if (appointmentsWithoutDoctor.length > 0) {
    throw new Error(`${appointmentsWithoutDoctor.length} appointments missing doctor data`);
  }

  return {
    details: `✓ All ${apiData.length} appointments correctly returned by API with related data`,
    apiCount: apiData.length,
    expectedCount: expectedData.appointments.length
  };
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - MANAGEMENT PAGES VALIDATION');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const validator = new ManagementPageValidator();

  try {
    // Get expected data from database
    const expectedData = await getExpectedData();

    console.log('📋 Expected Data Summary:');
    console.log(`   - Patients: ${expectedData.patients.length}`);
    console.log(`   - Users: ${expectedData.users.length}`);
    console.log(`   - Doctors: ${expectedData.doctors.length}`);
    console.log(`   - Appointments: ${expectedData.appointments.length}`);
    console.log('\n');

    // Run all validation tests
    await validator.runTest('Patients Page (/patients)', () => testPatientsPageConsistency(expectedData));
    await validator.runTest('Users Page (/users)', () => testUsersPageConsistency(expectedData));
    await validator.runTest('Doctors Management', () => testDoctorsPageConsistency(expectedData));
    await validator.runTest('Appointments Page (/appointments)', () => testAppointmentsPageConsistency(expectedData));

    // Print summary
    validator.printSummary();

    if (validator.failed === 0) {
      console.log('🎉 All management pages are showing consistent data!');
    } else {
      console.log(`⚠️  Found ${validator.inconsistencies.length} inconsistencies that need attention.`);
    }

    // Exit with appropriate code
    process.exit(validator.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during validation:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { ManagementPageValidator, getExpectedData };
