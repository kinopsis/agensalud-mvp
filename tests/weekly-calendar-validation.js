/**
 * Weekly Calendar Availability Validation Test
 * 
 * This test validates that the WeeklyAvailabilitySelector component
 * is now properly displaying availability slots after the fix.
 * 
 * @author AgentSalud MVP Team - Critical Bug Fix
 * @version 1.0.0
 */

const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
const BASE_URL = 'http://localhost:3000';

/**
 * Test the /api/doctors/availability endpoint for a week of dates
 */
async function testWeeklyAvailabilityAPI() {
  console.log('🔍 TESTING: Weekly Calendar API Calls');
  console.log('=====================================');

  // Generate a week of dates starting from today
  const today = new Date();
  const weekDates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]);
  }

  console.log('Testing dates:', weekDates);

  const results = [];

  for (const date of weekDates) {
    try {
      const url = `${BASE_URL}/api/doctors/availability?organizationId=${ORGANIZATION_ID}&date=${date}&duration=30`;
      console.log(`\n🔄 Testing: ${date}`);
      console.log(`URL: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      const result = {
        date,
        success: data.success,
        slotsCount: data.count || 0,
        hasData: Array.isArray(data.data) && data.data.length > 0,
        availabilityLevel: getAvailabilityLevel(data.count || 0)
      };

      results.push(result);

      console.log(`✅ ${date}: ${result.slotsCount} slots available (${result.availabilityLevel})`);

    } catch (error) {
      console.error(`❌ ${date}: Error - ${error.message}`);
      results.push({
        date,
        success: false,
        slotsCount: 0,
        hasData: false,
        availabilityLevel: 'none',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Helper function to determine availability level
 */
function getAvailabilityLevel(slotsCount) {
  if (slotsCount === 0) return 'none';
  if (slotsCount <= 2) return 'low';
  if (slotsCount <= 5) return 'medium';
  return 'high';
}

/**
 * Test the weekly calendar component behavior
 */
async function testWeeklyCalendarComponent() {
  console.log('\n🔍 TESTING: Weekly Calendar Component Behavior');
  console.log('==============================================');

  // This would be run in a browser environment
  console.log('📝 Manual Test Steps:');
  console.log('1. Open http://localhost:3000/appointments/new');
  console.log('2. Navigate to the date selection step');
  console.log('3. Verify that the weekly calendar shows availability indicators');
  console.log('4. Check that dates with availability show proper slot counts');
  console.log('5. Verify that "Sin disponibilidad" message is gone');
  console.log('6. Test navigation between weeks');
  console.log('7. Test role-based blocking (24-hour rule for patients)');
}

/**
 * Validate the fix implementation
 */
async function validateWeeklyCalendarFix() {
  console.log('🚀 WEEKLY CALENDAR FIX VALIDATION');
  console.log('==================================');
  console.log('Testing the fix for weekly calendar availability display issue');
  console.log('');

  // Test API endpoints
  const apiResults = await testWeeklyAvailabilityAPI();
  
  // Analyze results
  const totalDays = apiResults.length;
  const successfulDays = apiResults.filter(r => r.success).length;
  const daysWithSlots = apiResults.filter(r => r.slotsCount > 0).length;
  const totalSlots = apiResults.reduce((sum, r) => sum + r.slotsCount, 0);

  console.log('\n📊 RESULTS SUMMARY');
  console.log('==================');
  console.log(`Total days tested: ${totalDays}`);
  console.log(`Successful API calls: ${successfulDays}/${totalDays}`);
  console.log(`Days with availability: ${daysWithSlots}/${totalDays}`);
  console.log(`Total slots found: ${totalSlots}`);

  // Determine if fix is working
  const isFixWorking = successfulDays === totalDays && totalSlots > 0;
  
  console.log('\n🎯 FIX STATUS');
  console.log('=============');
  if (isFixWorking) {
    console.log('✅ WEEKLY CALENDAR FIX: SUCCESS');
    console.log('   - API endpoints are responding correctly');
    console.log('   - Availability data is being returned');
    console.log('   - Weekly calendar should now display slots');
  } else {
    console.log('❌ WEEKLY CALENDAR FIX: NEEDS ATTENTION');
    console.log('   - Some API calls failed or no availability found');
    console.log('   - Check server logs and database connectivity');
  }

  // Component testing instructions
  await testWeeklyCalendarComponent();

  return {
    isFixWorking,
    apiResults,
    summary: {
      totalDays,
      successfulDays,
      daysWithSlots,
      totalSlots
    }
  };
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateWeeklyCalendarFix,
    testWeeklyAvailabilityAPI,
    testWeeklyCalendarComponent
  };
}

// Run validation if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  validateWeeklyCalendarFix()
    .then(results => {
      console.log('\n🏁 VALIDATION COMPLETE');
      process.exit(results.isFixWorking ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 VALIDATION FAILED:', error);
      process.exit(1);
    });
}
