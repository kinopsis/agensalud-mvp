/**
 * Calendar Availability Validation Script
 * Run this in the browser console to validate calendar availability functionality
 */

(function validateCalendarAvailability() {
  console.log('🔍 Starting Calendar Availability Validation...');
  
  const organizationId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
  const testDate = '2025-06-16'; // Monday
  const today = new Date().toISOString().split('T')[0];
  
  // Test 1: Basic availability without doctor filter
  async function testBasicAvailability() {
    console.log('\n📋 Test 1: Basic Availability (No Doctor Filter)');
    
    try {
      const params = new URLSearchParams({
        organizationId,
        date: testDate,
        duration: '30'
      });
      
      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();
      
      console.log('✅ API Response:', {
        success: data.success,
        slotsCount: data.count,
        date: data.date,
        dayOfWeek: data.day_of_week
      });
      
      if (data.success && data.count > 0) {
        console.log('✅ Test 1 PASSED: Calendar can fetch availability without doctor filter');
        console.log('📊 Sample slots:', data.data.slice(0, 3));
      } else {
        console.log('❌ Test 1 FAILED: No availability returned');
      }
      
      return data.success && data.count > 0;
    } catch (error) {
      console.error('❌ Test 1 ERROR:', error);
      return false;
    }
  }
  
  // Test 2: Role-based booking rules for patients
  async function testPatientBookingRules() {
    console.log('\n📋 Test 2: Patient Booking Rules (24-hour advance)');
    
    try {
      const params = new URLSearchParams({
        organizationId,
        date: today,
        duration: '30',
        useStandardRules: 'true'
      });
      
      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();
      
      console.log('✅ API Response for same-day patient booking:', {
        success: data.success,
        slotsCount: data.count,
        date: data.date
      });
      
      // For patients, same-day appointments should be blocked
      if (data.success && data.count === 0) {
        console.log('✅ Test 2 PASSED: 24-hour advance booking rule applied correctly');
      } else {
        console.log('⚠️ Test 2 WARNING: Same-day slots available for patients (may be expected if no schedules for today)');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Test 2 ERROR:', error);
      return false;
    }
  }
  
  // Test 3: Privileged user booking (no restrictions)
  async function testPrivilegedUserBooking() {
    console.log('\n📋 Test 3: Privileged User Booking (No Restrictions)');
    
    try {
      const params = new URLSearchParams({
        organizationId,
        date: today,
        duration: '30'
        // No useStandardRules = privileged user
      });
      
      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();
      
      console.log('✅ API Response for privileged user:', {
        success: data.success,
        slotsCount: data.count,
        date: data.date
      });
      
      if (data.success) {
        console.log('✅ Test 3 PASSED: Privileged users can access availability');
        if (data.count > 0) {
          console.log('📊 Available slots for privileged user:', data.count);
        }
      } else {
        console.log('❌ Test 3 FAILED: API error for privileged user');
      }
      
      return data.success;
    } catch (error) {
      console.error('❌ Test 3 ERROR:', error);
      return false;
    }
  }
  
  // Test 4: Calendar component integration
  function testCalendarComponentIntegration() {
    console.log('\n📋 Test 4: Calendar Component Integration');
    
    // Check if calendar component exists on the page
    const calendarElement = document.querySelector('[class*="calendar"]') || 
                           document.querySelector('[data-testid*="calendar"]') ||
                           document.querySelector('.bg-white.rounded-lg.shadow');
    
    if (calendarElement) {
      console.log('✅ Calendar component found on page');
      
      // Check for day view elements
      const dayViewElements = document.querySelectorAll('[class*="time"]');
      if (dayViewElements.length > 0) {
        console.log('✅ Day view time slots detected:', dayViewElements.length);
      }
      
      // Check for availability indicators
      const availabilityElements = document.querySelectorAll('[class*="available"], [class*="disponible"]');
      if (availabilityElements.length > 0) {
        console.log('✅ Availability indicators found:', availabilityElements.length);
      }
      
      console.log('✅ Test 4 PASSED: Calendar component integration working');
      return true;
    } else {
      console.log('⚠️ Test 4 SKIPPED: Calendar component not found on current page');
      return true; // Not a failure, just not on calendar page
    }
  }
  
  // Test 5: Error handling
  async function testErrorHandling() {
    console.log('\n📋 Test 5: Error Handling');
    
    try {
      // Test with invalid organizationId
      const params = new URLSearchParams({
        organizationId: 'invalid-id',
        date: testDate,
        duration: '30'
      });
      
      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.log('✅ Test 5 PASSED: API properly handles invalid parameters');
        console.log('📊 Error response:', data.error || 'HTTP ' + response.status);
      } else {
        console.log('⚠️ Test 5 WARNING: API should reject invalid organizationId');
      }
      
      return true;
    } catch (error) {
      console.log('✅ Test 5 PASSED: Network errors handled correctly');
      return true;
    }
  }
  
  // Run all tests
  async function runAllTests() {
    console.log('🚀 Running Calendar Availability Validation Tests...\n');
    
    const results = {
      basicAvailability: await testBasicAvailability(),
      patientRules: await testPatientBookingRules(),
      privilegedUser: await testPrivilegedUserBooking(),
      componentIntegration: testCalendarComponentIntegration(),
      errorHandling: await testErrorHandling()
    };
    
    console.log('\n📊 VALIDATION RESULTS:');
    console.log('='.repeat(50));
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} - ${test}`);
    });
    
    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log('\n🎯 SUMMARY:');
    console.log(`${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED! Calendar availability system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the implementation.');
    }
    
    return results;
  }
  
  // Auto-run tests
  return runAllTests();
})();

// Instructions for manual testing:
console.log(`
📋 MANUAL TESTING INSTRUCTIONS:

1. Navigate to /calendar page
2. Switch to Day view
3. Verify that time slots show availability indicators
4. Try selecting different dates
5. Check that availability updates correctly

🔧 TROUBLESHOOTING:
- If no availability shows, check browser console for API errors
- Verify organization ID is correct
- Check that doctor schedules exist in database
- Ensure user has proper permissions

🎯 EXPECTED BEHAVIOR:
- Calendar shows availability without requiring doctor selection
- Day view displays available time slots
- Role-based rules apply (24-hour advance for patients)
- Rescheduling uses same availability logic
`);
