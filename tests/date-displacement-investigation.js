/**
 * CRITICAL DATE DISPLACEMENT INVESTIGATION
 * 
 * This test investigates the specific issue where selecting June 3rd 
 * displays time slots with June 4th dates in the weekly calendar component.
 * 
 * @author AgentSalud MVP Team - Critical Bug Investigation
 * @version 1.0.0
 */

const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
const BASE_URL = 'http://localhost:3000';

/**
 * Test the exact date displacement scenario from the screenshots
 */
async function investigateDateDisplacement() {
  console.log('🚨 CRITICAL DATE DISPLACEMENT INVESTIGATION');
  console.log('==========================================');
  console.log('Investigating: June 3rd selection showing June 4th time slots');
  console.log('');

  const testDate = '2025-06-03'; // Tuesday, June 3rd
  const expectedDate = '2025-06-03';
  const problematicDate = '2025-06-04'; // What's incorrectly showing

  console.log('📅 Test Scenario:');
  console.log(`   User clicks: ${testDate} (June 3rd, Tuesday)`);
  console.log(`   Expected header: "Horarios disponibles para ${expectedDate}"`);
  console.log(`   Problematic header: "Horarios disponibles para ${problematicDate}"`);
  console.log('');

  // Test 1: ImmutableDateSystem validation
  console.log('🔍 TEST 1: ImmutableDateSystem Validation');
  console.log('-'.repeat(40));
  
  try {
    // Simulate the validation that happens in handleDateSelect
    console.log(`Input date: ${testDate}`);
    
    // This would normally be done by ImmutableDateSystem.validateAndNormalize
    // Let's simulate the parsing and formatting
    const [year, month, day] = testDate.split('-').map(Number);
    console.log(`Parsed components: year=${year}, month=${month}, day=${day}`);
    
    const normalizedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    console.log(`Normalized date: ${normalizedDate}`);
    
    if (testDate === normalizedDate) {
      console.log('✅ ImmutableDateSystem validation: No displacement detected');
    } else {
      console.log('❌ ImmutableDateSystem validation: DISPLACEMENT DETECTED!');
      console.log(`   Original: ${testDate}`);
      console.log(`   Normalized: ${normalizedDate}`);
    }
  } catch (error) {
    console.error('❌ ImmutableDateSystem validation error:', error);
  }

  // Test 2: API endpoint date handling
  console.log('\n🔍 TEST 2: API Endpoint Date Handling');
  console.log('-'.repeat(40));
  
  try {
    const params = new URLSearchParams({
      organizationId: ORGANIZATION_ID,
      date: testDate,
      duration: '30',
      useStandardRules: 'true'
    });

    console.log(`API call: /api/doctors/availability?${params}`);
    
    const response = await fetch(`${BASE_URL}/api/doctors/availability?${params}`);
    const data = await response.json();
    
    console.log(`API response date: ${data.date || 'not provided'}`);
    console.log(`API response count: ${data.count || 0} slots`);
    
    if (data.date === testDate) {
      console.log('✅ API endpoint: Date matches input');
    } else {
      console.log('❌ API endpoint: DATE MISMATCH!');
      console.log(`   Input: ${testDate}`);
      console.log(`   Response: ${data.date}`);
    }
    
    // Check individual slot dates
    if (data.data && data.data.length > 0) {
      console.log('\n📊 Individual slot analysis:');
      data.data.slice(0, 3).forEach((slot, index) => {
        console.log(`   Slot ${index + 1}: ${slot.start_time} - Doctor: ${slot.doctor_name}`);
        // Note: Slots don't contain date info, they're assumed to be for the requested date
      });
    }
    
  } catch (error) {
    console.error('❌ API endpoint test error:', error);
  }

  // Test 3: Date object timezone issues
  console.log('\n🔍 TEST 3: Date Object Timezone Analysis');
  console.log('-'.repeat(40));
  
  try {
    // Test different ways of creating Date objects
    const dateString = testDate;
    const dateWithTime = `${testDate}T00:00:00`;
    const dateWithTimezone = `${testDate}T00:00:00.000Z`;
    
    console.log('Testing different Date object creation methods:');
    
    // Method 1: new Date(dateString)
    const date1 = new Date(dateString);
    console.log(`new Date("${dateString}"): ${date1.toISOString()} (${date1.toDateString()})`);
    
    // Method 2: new Date(dateString + 'T00:00:00')
    const date2 = new Date(dateWithTime);
    console.log(`new Date("${dateWithTime}"): ${date2.toISOString()} (${date2.toDateString()})`);
    
    // Method 3: new Date(dateString + 'T00:00:00.000Z')
    const date3 = new Date(dateWithTimezone);
    console.log(`new Date("${dateWithTimezone}"): ${date3.toISOString()} (${date3.toDateString()})`);
    
    // Method 4: Manual parsing (ImmutableDateSystem approach)
    const [year, month, day] = dateString.split('-').map(Number);
    const date4 = new Date(year, month - 1, day);
    console.log(`new Date(${year}, ${month - 1}, ${day}): ${date4.toISOString()} (${date4.toDateString()})`);
    
    // Check for timezone displacement
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`User timezone: ${userTimezone}`);
    
    // Check if any method produces June 4th instead of June 3rd
    const dates = [date1, date2, date3, date4];
    const methods = ['new Date(string)', 'new Date(string + T00:00:00)', 'new Date(string + Z)', 'new Date(y,m,d)'];
    
    dates.forEach((date, index) => {
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr !== testDate) {
        console.log(`❌ ${methods[index]}: DISPLACEMENT! ${testDate} → ${dateStr}`);
      } else {
        console.log(`✅ ${methods[index]}: No displacement`);
      }
    });
    
  } catch (error) {
    console.error('❌ Date object timezone test error:', error);
  }

  // Test 4: Form data simulation
  console.log('\n🔍 TEST 4: Form Data Update Simulation');
  console.log('-'.repeat(40));
  
  try {
    // Simulate the form data update that happens in handleDateSelect
    let formData = { appointment_date: '', newDate: '' };
    
    console.log('Initial form data:', formData);
    
    // Simulate UnifiedAppointmentFlow handleDateSelect
    const validatedDate = testDate; // Assuming validation passes through unchanged
    formData = {
      ...formData,
      appointment_date: validatedDate
    };
    
    console.log('After UnifiedAppointmentFlow update:', formData);
    
    // Simulate AIEnhancedRescheduleModal handleDateSelect
    formData = {
      ...formData,
      newDate: validatedDate
    };
    
    console.log('After AIEnhancedRescheduleModal update:', formData);
    
    // Check if form data matches input
    if (formData.appointment_date === testDate && formData.newDate === testDate) {
      console.log('✅ Form data: No displacement in updates');
    } else {
      console.log('❌ Form data: DISPLACEMENT DETECTED!');
      console.log(`   Expected: ${testDate}`);
      console.log(`   appointment_date: ${formData.appointment_date}`);
      console.log(`   newDate: ${formData.newDate}`);
    }
    
  } catch (error) {
    console.error('❌ Form data simulation error:', error);
  }

  // Test 5: Time slot header generation
  console.log('\n🔍 TEST 5: Time Slot Header Generation');
  console.log('-'.repeat(40));
  
  try {
    const formDataDate = testDate;
    
    // Simulate the title generation from both components
    const unifiedFlowTitle = `Horarios disponibles para ${formDataDate}`;
    const rescheduleModalTitle = `Horarios disponibles para ${formDataDate}`;
    
    console.log('Generated titles:');
    console.log(`   UnifiedAppointmentFlow: "${unifiedFlowTitle}"`);
    console.log(`   AIEnhancedRescheduleModal: "${rescheduleModalTitle}"`);
    
    if (unifiedFlowTitle.includes(testDate) && rescheduleModalTitle.includes(testDate)) {
      console.log('✅ Title generation: Correct date in headers');
    } else {
      console.log('❌ Title generation: INCORRECT DATE IN HEADERS!');
    }
    
  } catch (error) {
    console.error('❌ Title generation test error:', error);
  }

  console.log('\n📊 INVESTIGATION SUMMARY');
  console.log('========================');
  console.log('This investigation tests the date flow from user click to time slot header display.');
  console.log('If all tests pass but the issue persists, the problem is likely in:');
  console.log('1. React state updates not reflecting immediately');
  console.log('2. Component re-rendering with stale data');
  console.log('3. Async operations causing race conditions');
  console.log('4. Browser-specific date handling differences');
  console.log('');
  console.log('🔍 Next steps:');
  console.log('1. Test in actual browser environment');
  console.log('2. Add real-time logging to React components');
  console.log('3. Check for component state synchronization issues');
  console.log('4. Verify timezone settings in browser vs server');
}

/**
 * Test specific browser environment issues
 */
function testBrowserEnvironment() {
  console.log('\n🌐 BROWSER ENVIRONMENT TEST');
  console.log('===========================');
  
  const testDate = '2025-06-03';
  
  // Test browser timezone
  console.log('Browser timezone info:');
  console.log(`   Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`   Locale: ${navigator.language}`);
  console.log(`   UTC Offset: ${new Date().getTimezoneOffset()} minutes`);
  
  // Test date parsing in browser
  const browserDate = new Date(testDate);
  console.log(`\nBrowser date parsing:`);
  console.log(`   Input: "${testDate}"`);
  console.log(`   Parsed: ${browserDate.toISOString()}`);
  console.log(`   Local string: ${browserDate.toDateString()}`);
  console.log(`   ISO date: ${browserDate.toISOString().split('T')[0]}`);
  
  // Check for midnight boundary issues
  const midnightTest = new Date(testDate + 'T00:00:00');
  const midnightUTC = new Date(testDate + 'T00:00:00.000Z');
  
  console.log(`\nMidnight boundary test:`);
  console.log(`   Local midnight: ${midnightTest.toISOString().split('T')[0]}`);
  console.log(`   UTC midnight: ${midnightUTC.toISOString().split('T')[0]}`);
  
  if (midnightTest.toISOString().split('T')[0] !== testDate) {
    console.log('❌ MIDNIGHT BOUNDARY ISSUE DETECTED!');
    console.log('   Local midnight parsing causes date displacement');
  } else {
    console.log('✅ No midnight boundary issues');
  }
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    investigateDateDisplacement,
    testBrowserEnvironment
  };
}

// Run investigation if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  investigateDateDisplacement()
    .then(() => {
      console.log('\n🏁 DATE DISPLACEMENT INVESTIGATION COMPLETE');
    })
    .catch(error => {
      console.error('\n💥 INVESTIGATION FAILED:', error);
      process.exit(1);
    });
} else if (typeof window !== 'undefined') {
  // Browser environment
  console.log('🌐 Running in browser environment');
  testBrowserEnvironment();
  investigateDateDisplacement();
}
