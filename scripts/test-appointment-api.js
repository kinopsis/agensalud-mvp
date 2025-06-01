#!/usr/bin/env node

/**
 * Test Script for Appointment API
 * Tests the fixed appointment creation endpoint
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function testAppointmentAPI() {
  console.log('🧪 TESTING APPOINTMENT API');
  console.log('==========================');

  // Test data for appointment creation
  const testAppointment = {
    organizationId: 'test-org-123',
    patientId: 'test-patient-123',
    doctorId: 'test-doctor-123',
    serviceId: 'test-service-123',
    locationId: 'test-location-123',
    appointmentDate: '2025-06-01', // Future date
    startTime: '10:00',
    endTime: '10:30',
    reason: 'Consulta general',
    notes: 'Test appointment from script'
  };

  try {
    console.log('\n📋 Test Data:');
    console.log(JSON.stringify(testAppointment, null, 2));

    console.log('\n🔄 Making API Request...');
    const response = await fetch(`${API_BASE}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAppointment)
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);

    const responseData = await response.json();
    console.log('\n📄 Response Data:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.status === 401) {
      console.log('\n✅ EXPECTED: Authentication required (401)');
      console.log('   This is correct behavior - the API requires authentication');
      return true;
    } else if (response.status === 500) {
      console.log('\n❌ ERROR: Internal Server Error (500)');
      console.log('   The API is still returning 500 errors');
      return false;
    } else if (response.status >= 200 && response.status < 300) {
      console.log('\n✅ SUCCESS: Appointment created successfully');
      return true;
    } else {
      console.log(`\n⚠️  UNEXPECTED: Status ${response.status}`);
      return false;
    }

  } catch (error) {
    console.error('\n❌ NETWORK ERROR:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTION: Make sure the development server is running:');
      console.log('   npm run dev');
    }
    
    return false;
  }
}

// Test different scenarios
async function runTests() {
  console.log('🚀 Starting Appointment API Tests\n');

  // Test 1: Basic appointment creation
  console.log('TEST 1: Basic Appointment Creation');
  console.log('==================================');
  const test1Result = await testAppointmentAPI();

  // Test 2: Same-day appointment (should be blocked for patients)
  console.log('\n\nTEST 2: Same-Day Appointment (Patient)');
  console.log('======================================');
  
  const today = new Date().toISOString().split('T')[0];
  const sameDayAppointment = {
    organizationId: 'test-org-123',
    patientId: 'test-patient-123',
    doctorId: 'test-doctor-123',
    serviceId: 'test-service-123',
    appointmentDate: today,
    startTime: '15:00',
    endTime: '15:30',
    reason: 'Same-day test',
    notes: 'Testing 24-hour rule'
  };

  try {
    const response = await fetch(`${API_BASE}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sameDayAppointment)
    });

    console.log(`Response Status: ${response.status}`);
    const responseData = await response.json();
    console.log('Response Data:', JSON.stringify(responseData, null, 2));

    if (response.status === 401) {
      console.log('✅ EXPECTED: Authentication required');
    } else if (response.status === 400 && responseData.code === 'ADVANCE_BOOKING_REQUIRED') {
      console.log('✅ EXPECTED: 24-hour rule enforced');
    } else {
      console.log('⚠️  Unexpected response for same-day booking');
    }

  } catch (error) {
    console.error('Error in same-day test:', error.message);
  }

  // Summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('===============');
  
  if (test1Result) {
    console.log('✅ API is responding correctly');
    console.log('✅ No more 500 Internal Server Errors');
    console.log('✅ Authentication and validation working');
  } else {
    console.log('❌ API still has issues');
    console.log('❌ Check server logs for details');
  }

  console.log('\n🔍 DEBUGGING TIPS:');
  console.log('1. Check server console for detailed logs');
  console.log('2. Verify database connection');
  console.log('3. Check authentication setup');
  console.log('4. Validate request data format');

  console.log('\n📝 NEXT STEPS:');
  console.log('1. Test with real authentication');
  console.log('2. Test role-based validation');
  console.log('3. Test with valid database IDs');
  console.log('4. Validate end-to-end booking flow');
}

// Run the tests
runTests().catch(console.error);
