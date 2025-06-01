/**
 * CRITICAL DATABASE VERIFICATION: Availability Data Consistency
 * 
 * This script performs comprehensive database-level verification to identify
 * any underlying data inconsistencies that might cause frontend availability
 * discrepancies between flows.
 * 
 * @author AgentSalud MVP Team - Critical Database Investigation
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');

// Database configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Verify doctor availability table consistency
 */
async function verifyDoctorAvailabilityTable() {
  console.log('🔍 Phase 1: Doctor Availability Table Verification\n');
  
  try {
    // Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('doctor_availability')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('❌ FAILED - Cannot access doctor_availability table');
      console.log(`   Error: ${tableError.message}`);
      return false;
    }

    console.log('✅ PASSED - doctor_availability table is accessible');

    // Check for active availability records
    const { data: activeRecords, error: activeError } = await supabase
      .from('doctor_availability')
      .select('id, doctor_id, day_of_week, start_time, end_time, is_active')
      .eq('is_active', true);

    if (activeError) {
      console.log('❌ FAILED - Cannot query active availability records');
      console.log(`   Error: ${activeError.message}`);
      return false;
    }

    console.log(`✅ PASSED - Found ${activeRecords?.length || 0} active availability records`);

    // Check for data consistency issues
    const inconsistencies = [];
    
    if (activeRecords) {
      for (const record of activeRecords) {
        // Check time format consistency
        if (!record.start_time || !record.end_time) {
          inconsistencies.push(`Record ${record.id}: Missing start_time or end_time`);
          continue;
        }

        // Check time range validity
        const startTime = record.start_time;
        const endTime = record.end_time;
        
        if (startTime >= endTime) {
          inconsistencies.push(`Record ${record.id}: Invalid time range ${startTime} - ${endTime}`);
        }

        // Check day_of_week validity
        if (record.day_of_week < 0 || record.day_of_week > 6) {
          inconsistencies.push(`Record ${record.id}: Invalid day_of_week ${record.day_of_week}`);
        }
      }
    }

    if (inconsistencies.length > 0) {
      console.log('❌ DATA INCONSISTENCIES DETECTED:');
      inconsistencies.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }

    console.log('✅ PASSED - No data inconsistencies detected in doctor_availability table');
    return true;

  } catch (error) {
    console.error('❌ CRITICAL ERROR during table verification:', error.message);
    return false;
  }
}

/**
 * Test API slot generation consistency
 */
async function testAPISlotGeneration() {
  console.log('\n🔍 Phase 2: API Slot Generation Consistency\n');
  
  const testParams = {
    organizationId: 'test-org-123',
    startDate: '2025-06-01',
    endDate: '2025-06-07',
    userRole: 'patient',
    useStandardRules: 'false'
  };

  try {
    // Test multiple API calls with identical parameters
    const apiCalls = [];
    for (let i = 0; i < 3; i++) {
      const queryString = new URLSearchParams(testParams).toString();
      const apiUrl = `http://localhost:3000/api/appointments/availability?${queryString}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.log(`❌ FAILED - API call ${i + 1} returned status ${response.status}`);
        return false;
      }

      const data = await response.json();
      if (!data.success) {
        console.log(`❌ FAILED - API call ${i + 1} returned success: false`);
        console.log(`   Error: ${data.error}`);
        return false;
      }

      apiCalls.push(data.data);
    }

    console.log('✅ PASSED - All API calls successful');

    // Compare results for consistency
    const firstCall = apiCalls[0];
    const dates = Object.keys(firstCall);
    
    let allConsistent = true;
    
    for (const date of dates) {
      const firstCallData = firstCall[date];
      
      for (let i = 1; i < apiCalls.length; i++) {
        const otherCallData = apiCalls[i][date];
        
        if (!otherCallData) {
          console.log(`❌ INCONSISTENCY - Call ${i + 1} missing data for ${date}`);
          allConsistent = false;
          continue;
        }

        // Check critical fields
        if (firstCallData.availableSlots !== otherCallData.availableSlots) {
          console.log(`❌ INCONSISTENCY - ${date}: availableSlots differs between calls`);
          console.log(`   Call 1: ${firstCallData.availableSlots}, Call ${i + 1}: ${otherCallData.availableSlots}`);
          allConsistent = false;
        }

        if (firstCallData.totalSlots !== otherCallData.totalSlots) {
          console.log(`❌ INCONSISTENCY - ${date}: totalSlots differs between calls`);
          console.log(`   Call 1: ${firstCallData.totalSlots}, Call ${i + 1}: ${otherCallData.totalSlots}`);
          allConsistent = false;
        }

        if (firstCallData.slots?.length !== otherCallData.slots?.length) {
          console.log(`❌ INCONSISTENCY - ${date}: slots array length differs between calls`);
          console.log(`   Call 1: ${firstCallData.slots?.length}, Call ${i + 1}: ${otherCallData.slots?.length}`);
          allConsistent = false;
        }
      }
    }

    if (allConsistent) {
      console.log('✅ PASSED - API responses are consistent across multiple calls');
      
      // Verify availableSlots calculation
      for (const date of dates.slice(0, 3)) {
        const dayData = firstCall[date];
        const actualAvailable = dayData.slots?.filter(slot => slot.available).length || 0;
        
        if (dayData.availableSlots !== actualAvailable) {
          console.log(`❌ CALCULATION ERROR - ${date}: availableSlots mismatch`);
          console.log(`   API availableSlots: ${dayData.availableSlots}`);
          console.log(`   Actual available slots: ${actualAvailable}`);
          console.log(`   Total slots: ${dayData.totalSlots}`);
          allConsistent = false;
        }
      }
      
      if (allConsistent) {
        console.log('✅ PASSED - availableSlots calculation is correct');
      }
    }

    return allConsistent;

  } catch (error) {
    console.error('❌ CRITICAL ERROR during API testing:', error.message);
    return false;
  }
}

/**
 * Test role-based availability differences
 */
async function testRoleBasedAvailability() {
  console.log('\n🔍 Phase 3: Role-based Availability Testing\n');
  
  const baseParams = {
    organizationId: 'test-org-123',
    startDate: '2025-06-01',
    endDate: '2025-06-03'
  };

  const roleTestCases = [
    { userRole: 'patient', useStandardRules: 'false', description: 'Patient (standard rules)' },
    { userRole: 'admin', useStandardRules: 'false', description: 'Admin (privileged rules)' },
    { userRole: 'admin', useStandardRules: 'true', description: 'Admin (forced standard rules)' }
  ];

  try {
    const roleResults = [];
    
    for (const testCase of roleTestCases) {
      const params = { ...baseParams, ...testCase };
      const queryString = new URLSearchParams(params).toString();
      const apiUrl = `http://localhost:3000/api/appointments/availability?${queryString}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.log(`❌ FAILED - ${testCase.description}: HTTP ${response.status}`);
        return false;
      }

      const data = await response.json();
      if (!data.success) {
        console.log(`❌ FAILED - ${testCase.description}: ${data.error}`);
        return false;
      }

      roleResults.push({
        ...testCase,
        data: data.data
      });

      console.log(`✅ PASSED - ${testCase.description}: API call successful`);
    }

    // Analyze role-based differences
    const today = new Date().toISOString().split('T')[0];
    const patientResult = roleResults.find(r => r.userRole === 'patient');
    const adminResult = roleResults.find(r => r.userRole === 'admin' && r.useStandardRules === 'false');
    const adminStandardResult = roleResults.find(r => r.userRole === 'admin' && r.useStandardRules === 'true');

    if (patientResult && adminStandardResult) {
      // Patient and admin with standard rules should have identical results
      const patientToday = patientResult.data[today];
      const adminStandardToday = adminStandardResult.data[today];
      
      if (patientToday?.availableSlots !== adminStandardToday?.availableSlots) {
        console.log('❌ ROLE INCONSISTENCY - Patient vs Admin (standard rules) should be identical');
        console.log(`   Patient: ${patientToday?.availableSlots} slots`);
        console.log(`   Admin (standard): ${adminStandardToday?.availableSlots} slots`);
        return false;
      }
      
      console.log('✅ PASSED - Patient and Admin (standard rules) have identical availability');
    }

    if (adminResult && adminStandardResult) {
      // Admin privileged vs standard should show differences for today
      const adminPrivilegedToday = adminResult.data[today];
      const adminStandardToday = adminStandardResult.data[today];
      
      if (adminPrivilegedToday?.availableSlots <= adminStandardToday?.availableSlots) {
        console.log('✅ EXPECTED - Admin privileged rules show more availability than standard rules');
      } else {
        console.log('⚠️  UNEXPECTED - Admin privileged rules show less availability than standard rules');
      }
    }

    return true;

  } catch (error) {
    console.error('❌ CRITICAL ERROR during role testing:', error.message);
    return false;
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log('🚀 CRITICAL DATABASE VERIFICATION: Availability Data Consistency\n');
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  
  const results = {
    databaseVerification: await verifyDoctorAvailabilityTable(),
    apiConsistency: await testAPISlotGeneration(),
    roleBasedTesting: await testRoleBasedAvailability()
  };
  
  const duration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY:');
  console.log(`   Database Verification: ${results.databaseVerification ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   API Consistency: ${results.apiConsistency ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Role-based Testing: ${results.roleBasedTesting ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ALL VERIFICATIONS PASSED - Database and API are consistent');
    console.log('✅ No underlying data issues detected');
    console.log('✅ Frontend inconsistencies are likely due to component logic differences');
  } else {
    console.log('\n❌ VERIFICATION FAILED - Issues detected in database or API layer');
    console.log('🔧 Fix underlying issues before addressing frontend inconsistencies');
  }
  
  console.log(`⏱️  Verification completed in ${duration}ms`);
  console.log('='.repeat(70));
  
  process.exit(allPassed ? 0 : 1);
}

// Run verification
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
