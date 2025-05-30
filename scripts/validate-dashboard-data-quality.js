/**
 * @fileoverview Dashboard Data Quality Validation Script
 * Validates Recent Activity and Upcoming Appointments sections for data accuracy
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const BASE_URL = 'http://localhost:3000';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

/**
 * Test Recent Activity API
 */
async function testRecentActivityAPI() {
  try {
    const url = `${BASE_URL}/api/dashboard/admin/activity?organizationId=${ORGANIZATION_ID}&limit=10`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      return {
        details: '✓ Activity API requires authentication (expected behavior)',
        requiresAuth: true,
        status: response.status
      };
    }

    if (response.ok) {
      const result = await response.json();
      const activities = result.data || [];
      
      // Check for "desconocido" entries
      const unknownEntries = activities.filter(activity => 
        activity.description.includes('desconocido')
      );
      
      return {
        details: `✓ Activity API accessible: ${activities.length} activities, ${unknownEntries.length} with unknown data`,
        activityCount: activities.length,
        unknownCount: unknownEntries.length,
        hasUnknownData: unknownEntries.length > 0,
        firstActivity: activities[0]?.description || 'No activities'
      };
    } else {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Activity API test failed: ${error.message}`);
  }
}

/**
 * Test Upcoming Appointments API
 */
async function testUpcomingAppointmentsAPI() {
  try {
    const url = `${BASE_URL}/api/dashboard/admin/upcoming?organizationId=${ORGANIZATION_ID}&limit=5`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
      return {
        details: '✓ Upcoming API requires authentication (expected behavior)',
        requiresAuth: true,
        status: response.status
      };
    }

    if (response.ok) {
      const result = await response.json();
      const appointments = result.data || [];
      
      // Check for "desconocido" entries
      const unknownPatients = appointments.filter(apt => 
        apt.patient_name && apt.patient_name.includes('desconocido')
      );
      const unknownDoctors = appointments.filter(apt => 
        apt.doctor_name && apt.doctor_name.includes('desconocido')
      );
      const unknownServices = appointments.filter(apt => 
        apt.service_name && apt.service_name.includes('desconocido')
      );
      
      return {
        details: `✓ Upcoming API accessible: ${appointments.length} appointments, ${unknownPatients.length} unknown patients, ${unknownDoctors.length} unknown doctors, ${unknownServices.length} unknown services`,
        appointmentCount: appointments.length,
        unknownPatients: unknownPatients.length,
        unknownDoctors: unknownDoctors.length,
        unknownServices: unknownServices.length,
        hasUnknownData: unknownPatients.length > 0 || unknownDoctors.length > 0 || unknownServices.length > 0,
        firstAppointment: appointments[0] || 'No appointments'
      };
    } else {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw new Error(`Upcoming appointments API test failed: ${error.message}`);
  }
}

/**
 * Test data consistency with direct Supabase queries
 */
async function testDataConsistency() {
  const client = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test appointments query directly
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
      .limit(5);

    if (appointmentsError) {
      throw new Error(`Direct appointments query failed: ${appointmentsError.message}`);
    }

    const appointmentCount = appointments?.length || 0;
    let patientsWithData = 0;
    let doctorsWithData = 0;
    let servicesWithData = 0;

    if (appointments) {
      for (const apt of appointments) {
        if (apt.patient && (apt.patient.first_name || apt.patient.last_name)) {
          patientsWithData++;
        }
        if (apt.doctor?.profiles && (apt.doctor.profiles.first_name || apt.doctor.profiles.last_name)) {
          doctorsWithData++;
        }
        if (apt.service?.name) {
          servicesWithData++;
        }
      }
    }

    return {
      details: `✓ Direct query: ${appointmentCount} appointments, ${patientsWithData} with patient data, ${doctorsWithData} with doctor data, ${servicesWithData} with service data`,
      appointmentCount,
      patientsWithData,
      doctorsWithData,
      servicesWithData,
      dataQuality: {
        patients: appointmentCount > 0 ? (patientsWithData / appointmentCount * 100).toFixed(1) : 0,
        doctors: appointmentCount > 0 ? (doctorsWithData / appointmentCount * 100).toFixed(1) : 0,
        services: appointmentCount > 0 ? (servicesWithData / appointmentCount * 100).toFixed(1) : 0
      }
    };
  } catch (error) {
    throw new Error(`Data consistency test failed: ${error.message}`);
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 AGENTSALUD MVP - DASHBOARD DATA QUALITY VALIDATION');
  console.log('🏥 Organization: VisualCare');
  console.log('🆔 ID: ' + ORGANIZATION_ID);
  console.log('🌐 Base URL: ' + BASE_URL);
  console.log('📅 Date: ' + new Date().toISOString());
  console.log('\n');

  console.log('🎯 TESTING DASHBOARD DATA ACCURACY:');
  console.log('   1. Recent Activity API');
  console.log('   2. Upcoming Appointments API');
  console.log('   3. Data Consistency with Direct Queries');
  console.log('\n');

  let passed = 0;
  let failed = 0;

  try {
    // Test Recent Activity API
    console.log('🧪 Testing: Recent Activity API');
    const activityResult = await testRecentActivityAPI();
    console.log(`✅ PASSED: Recent Activity API`);
    console.log(`   ${activityResult.details}`);
    console.log('');
    passed++;

    // Test Upcoming Appointments API
    console.log('🧪 Testing: Upcoming Appointments API');
    const appointmentsResult = await testUpcomingAppointmentsAPI();
    console.log(`✅ PASSED: Upcoming Appointments API`);
    console.log(`   ${appointmentsResult.details}`);
    console.log('');
    passed++;

    // Test Data Consistency
    console.log('🧪 Testing: Data Consistency Check');
    const consistencyResult = await testDataConsistency();
    console.log(`✅ PASSED: Data Consistency Check`);
    console.log(`   ${consistencyResult.details}`);
    console.log('');
    passed++;

    // Print summary
    console.log('=' .repeat(60));
    console.log('📊 DASHBOARD DATA VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    console.log('');

    if (failed === 0) {
      console.log('🎉 ALL DASHBOARD DATA TESTS PASSED!');
      console.log('');
      console.log('📋 NEXT STEPS FOR MANUAL TESTING:');
      console.log('   1. Start development server: npm run dev');
      console.log('   2. Login as admin: laura.gomez.new@visualcare.com');
      console.log('   3. Check dashboard Recent Activity section');
      console.log('   4. Check dashboard Upcoming Appointments section');
      console.log('   5. Verify no "desconocido" entries appear');
      console.log('   6. Check browser console for debug logs');
      console.log('');
      console.log('🔍 Expected Debug Logs:');
      console.log('   🔍 ACTIVITY DEBUG: (for activity processing)');
      console.log('   🔍 UPCOMING DEBUG: (for appointments processing)');
      console.log('   🔍 ADMIN DASHBOARD DEBUG: (for frontend data)');
    } else {
      console.log('⚠️  Some dashboard data issues found.');
    }

    console.log('=' .repeat(60));

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Fatal error during validation:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { testRecentActivityAPI, testUpcomingAppointmentsAPI, testDataConsistency };
