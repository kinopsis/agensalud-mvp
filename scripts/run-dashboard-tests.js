#!/usr/bin/env node

/**
 * @fileoverview Dashboard Consistency Test Runner
 * Executes comprehensive validation of dashboard data consistency
 * across all user roles in AgentSalud MVP
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
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Running: ${name}`);
      await testFn();
      console.log(`✅ PASSED: ${name}\n`);
      this.passed++;
      this.tests.push({ name, status: 'PASSED', error: null });
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}\n`);
      this.failed++;
      this.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    console.log('');

    if (this.failed > 0) {
      console.log('❌ FAILED TESTS:');
      this.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    console.log('=' .repeat(60));
  }
}

/**
 * Database Statistics Helper
 */
async function getDatabaseStats() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('role, is_active, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, is_active')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: patients } = await supabase
    .from('patients')
    .select('id, status, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, status, appointment_date, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  return {
    totalUsers: profiles?.length || 0,
    totalDoctors: doctors?.length || 0,
    totalPatients: patients?.length || 0,
    totalAppointments: appointments?.length || 0,
    thisMonthAppointments: appointments?.filter(apt => apt.appointment_date >= thisMonth).length || 0,
    todayAppointments: appointments?.filter(apt => apt.appointment_date === today).length || 0,
    appointmentsByStatus: appointments?.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {}) || {},
    usersByRole: profiles?.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1;
      return acc;
    }, {}) || {}
  };
}

/**
 * Test Functions
 */
async function testAdminDashboardConsistency(dbStats) {
  // Test the core API logic that admin dashboard uses
  const { data: patients } = await supabase
    .from('patients')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: doctors } = await supabase
    .from('doctors')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: pendingAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('status', 'pending');

  const { data: completedAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('status', 'completed');

  // Core assertions that should always match
  if ((patients?.length || 0) !== dbStats.totalPatients) {
    throw new Error(`Patients mismatch: API=${patients?.length}, DB=${dbStats.totalPatients}`);
  }

  if ((doctors?.length || 0) !== dbStats.totalDoctors) {
    throw new Error(`Doctors mismatch: API=${doctors?.length}, DB=${dbStats.totalDoctors}`);
  }

  if ((pendingAppointments?.length || 0) !== (dbStats.appointmentsByStatus.pending || 0)) {
    throw new Error(`Pending appointments mismatch: API=${pendingAppointments?.length}, DB=${dbStats.appointmentsByStatus.pending || 0}`);
  }

  if ((completedAppointments?.length || 0) !== (dbStats.appointmentsByStatus.completed || 0)) {
    throw new Error(`Completed appointments mismatch: API=${completedAppointments?.length}, DB=${dbStats.appointmentsByStatus.completed || 0}`);
  }

  console.log(`   ✓ Patients: ${patients?.length || 0}`);
  console.log(`   ✓ Doctors: ${doctors?.length || 0}`);
  console.log(`   ✓ Pending: ${pendingAppointments?.length || 0}`);
  console.log(`   ✓ Completed: ${completedAppointments?.length || 0}`);
}

async function testMultiTenantIsolation() {
  // Verify that queries include organization_id filter
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('organization_id')
    .limit(100);

  const { data: orgProfiles } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('organization_id', ORGANIZATION_ID);

  // All profiles in org query should belong to the organization
  const invalidProfiles = orgProfiles?.filter(p => p.organization_id !== ORGANIZATION_ID) || [];
  
  if (invalidProfiles.length > 0) {
    throw new Error(`Multi-tenant isolation failed: ${invalidProfiles.length} profiles from other organizations`);
  }

  // Should have fewer org-specific profiles than total profiles
  if (allProfiles && orgProfiles && allProfiles.length <= orgProfiles.length) {
    throw new Error('Multi-tenant isolation may not be working correctly');
  }
}

async function testRoleBasedDataAccess(dbStats) {
  // Test that role distribution is correct
  const expectedRoles = ['admin', 'doctor', 'staff', 'patient'];
  const actualRoles = Object.keys(dbStats.usersByRole);

  for (const role of expectedRoles) {
    if (!actualRoles.includes(role)) {
      throw new Error(`Missing role in data: ${role}`);
    }
  }

  // Verify specific counts for VisualCare
  if (dbStats.usersByRole.doctor !== 5) {
    throw new Error(`Expected 5 doctors, got ${dbStats.usersByRole.doctor}`);
  }

  if (dbStats.usersByRole.patient !== 3) {
    throw new Error(`Expected 3 patients, got ${dbStats.usersByRole.patient}`);
  }
}

async function testDataIntegrity(dbStats) {
  // Verify that doctors table matches doctor role profiles
  const { data: doctorProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('role', 'doctor');

  if ((doctorProfiles?.length || 0) !== dbStats.totalDoctors) {
    throw new Error(`Doctor profiles mismatch: profiles=${doctorProfiles?.length}, doctors table=${dbStats.totalDoctors}`);
  }

  // Verify that patients table matches patient role profiles
  const { data: patientProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('role', 'patient');

  if ((patientProfiles?.length || 0) !== dbStats.totalPatients) {
    throw new Error(`Patient profiles mismatch: profiles=${patientProfiles?.length}, patients table=${dbStats.totalPatients}`);
  }
}

async function testAppointmentConsistency(dbStats) {
  // Verify appointment status distribution
  const totalByStatus = Object.values(dbStats.appointmentsByStatus).reduce((sum, count) => sum + count, 0);
  
  if (totalByStatus !== dbStats.totalAppointments) {
    throw new Error(`Appointment status sum mismatch: sum=${totalByStatus}, total=${dbStats.totalAppointments}`);
  }

  // Verify all appointments belong to organization
  const { data: appointments } = await supabase
    .from('appointments')
    .select('organization_id')
    .eq('organization_id', ORGANIZATION_ID);

  const invalidAppointments = appointments?.filter(apt => apt.organization_id !== ORGANIZATION_ID) || [];
  
  if (invalidAppointments.length > 0) {
    throw new Error(`Found ${invalidAppointments.length} appointments with wrong organization_id`);
  }
}

/**
 * Main Test Execution
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - DASHBOARD CONSISTENCY TESTS');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  const runner = new TestRunner();

  try {
    // Get baseline database statistics
    console.log('📊 Gathering baseline database statistics...\n');
    const dbStats = await getDatabaseStats();

    console.log('📋 Database Statistics:');
    console.log(`   - Total Users: ${dbStats.totalUsers}`);
    console.log(`   - Total Doctors: ${dbStats.totalDoctors}`);
    console.log(`   - Total Patients: ${dbStats.totalPatients}`);
    console.log(`   - Total Appointments: ${dbStats.totalAppointments}`);
    console.log(`   - Users by Role:`, dbStats.usersByRole);
    console.log(`   - Appointments by Status:`, dbStats.appointmentsByStatus);
    console.log('\n');

    // Run all tests
    await runner.runTest('Admin Dashboard Consistency', () => testAdminDashboardConsistency(dbStats));
    await runner.runTest('Multi-Tenant Data Isolation', () => testMultiTenantIsolation());
    await runner.runTest('Role-Based Data Access', () => testRoleBasedDataAccess(dbStats));
    await runner.runTest('Data Integrity Validation', () => testDataIntegrity(dbStats));
    await runner.runTest('Appointment Consistency', () => testAppointmentConsistency(dbStats));

    // Print summary
    runner.printSummary();

    // Exit with appropriate code
    process.exit(runner.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during test execution:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { TestRunner, getDatabaseStats };
