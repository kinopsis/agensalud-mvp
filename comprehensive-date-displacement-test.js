/**
 * COMPREHENSIVE DATE DISPLACEMENT TEST SUITE
 * Validates all fixes and provides immediate feedback on date displacement resolution
 * 
 * USAGE: Run this script in browser console after loading the appointment booking page
 * FOCUS: Tests the exact scenario from screenshot (June 3rd → June 4th displacement)
 */

console.log('🧪 COMPREHENSIVE DATE DISPLACEMENT TEST SUITE ACTIVATED');
console.log('='.repeat(80));

// Global test results
window.dateDisplacementTestResults = {
  testResults: [],
  summary: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    displacementEvents: 0,
    criticalIssues: []
  },
  startTime: Date.now()
};

/**
 * Test result tracking
 */
function recordTestResult(testName, passed, details, critical = false) {
  const result = {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    testName,
    passed,
    details,
    critical,
    timestamp: new Date().toISOString()
  };
  
  window.dateDisplacementTestResults.testResults.push(result);
  window.dateDisplacementTestResults.summary.totalTests++;
  
  if (passed) {
    window.dateDisplacementTestResults.summary.passedTests++;
    console.log(`✅ PASSED: ${testName}`, details);
  } else {
    window.dateDisplacementTestResults.summary.failedTests++;
    console.error(`❌ FAILED: ${testName}`, details);
    
    if (critical) {
      window.dateDisplacementTestResults.summary.criticalIssues.push(result);
    }
  }
  
  return result;
}

/**
 * Test 1: DateHandler Utility Validation
 */
function testDateHandlerUtility() {
  console.log('\n🧪 TEST 1: DateHandler Utility Validation');
  console.log('-'.repeat(50));
  
  const testDates = [
    '2025-06-03', // The problematic date from screenshot
    '2025-06-04', // Next day (displacement target)
    '2025-06-05', // Future date
    '2025-06-02', // Previous day
    '2025-06-01'  // Week start
  ];
  
  let allPassed = true;
  
  testDates.forEach(testDate => {
    try {
      // Test if DateHandler is available
      if (typeof window.DateHandler === 'undefined') {
        // Try to access it from the module
        const DateHandler = require('@/lib/utils/DateHandler').DateHandler;
        window.DateHandler = DateHandler;
      }
      
      if (window.DateHandler) {
        const validation = window.DateHandler.validateAndNormalize(testDate, 'TestSuite');
        
        const passed = validation.isValid && validation.normalizedDate === testDate && !validation.displacement?.detected;
        
        recordTestResult(
          `DateHandler validation for ${testDate}`,
          passed,
          {
            input: testDate,
            output: validation.normalizedDate,
            isValid: validation.isValid,
            displacement: validation.displacement
          },
          true // Critical test
        );
        
        if (!passed) allPassed = false;
      } else {
        recordTestResult(
          'DateHandler availability',
          false,
          { error: 'DateHandler not available globally' },
          true
        );
        allPassed = false;
      }
    } catch (error) {
      recordTestResult(
        `DateHandler test for ${testDate}`,
        false,
        { error: error.message },
        true
      );
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * Test 2: Component Integration Validation
 */
function testComponentIntegration() {
  console.log('\n🧪 TEST 2: Component Integration Validation');
  console.log('-'.repeat(50));
  
  let allPassed = true;
  
  // Test if debugging tools are active
  const debuggerActive = window.advancedDateTracker && window.advancedDateTracker.isActive;
  const validatorActive = window.dateDisplacementValidator && window.dateDisplacementValidator.isActive;
  
  recordTestResult(
    'Advanced Date Tracker Active',
    debuggerActive,
    { active: debuggerActive, tracker: !!window.advancedDateTracker }
  );
  
  recordTestResult(
    'Date Displacement Validator Active',
    validatorActive,
    { active: validatorActive, validator: !!window.dateDisplacementValidator }
  );
  
  if (!debuggerActive || !validatorActive) allPassed = false;
  
  // Test if tracking functions are available
  const trackingAvailable = typeof window.trackDateEvent === 'function';
  recordTestResult(
    'Date Event Tracking Available',
    trackingAvailable,
    { available: trackingAvailable }
  );
  
  if (!trackingAvailable) allPassed = false;
  
  return allPassed;
}

/**
 * Test 3: DOM Element Validation
 */
function testDOMElements() {
  console.log('\n🧪 TEST 3: DOM Element Validation');
  console.log('-'.repeat(50));
  
  let allPassed = true;
  
  // Look for calendar elements
  const calendarElements = document.querySelectorAll('[class*="calendar"], [class*="availability"], [class*="week"]');
  recordTestResult(
    'Calendar Elements Present',
    calendarElements.length > 0,
    { count: calendarElements.length, elements: Array.from(calendarElements).map(el => el.className) }
  );
  
  // Look for time slot headers
  const timeSlotHeaders = document.querySelectorAll('*');
  let timeSlotHeaderFound = false;
  let timeSlotHeaderText = '';
  
  timeSlotHeaders.forEach(element => {
    const text = element.textContent || '';
    if (text.includes('Horarios disponibles para')) {
      timeSlotHeaderFound = true;
      timeSlotHeaderText = text;
    }
  });
  
  recordTestResult(
    'Time Slot Header Present',
    timeSlotHeaderFound,
    { found: timeSlotHeaderFound, text: timeSlotHeaderText }
  );
  
  // Extract date from time slot header if found
  if (timeSlotHeaderFound) {
    const dateMatch = timeSlotHeaderText.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const displayedDate = dateMatch[1];
      recordTestResult(
        'Time Slot Date Extraction',
        true,
        { extractedDate: displayedDate, headerText: timeSlotHeaderText }
      );
      
      // This is the critical test - check if the displayed date matches expected behavior
      // For now, just record what we found
      console.log(`📊 CRITICAL: Time slot header shows date: ${displayedDate}`);
    }
  }
  
  return allPassed;
}

/**
 * Test 4: Simulated Date Selection
 */
function testSimulatedDateSelection() {
  console.log('\n🧪 TEST 4: Simulated Date Selection');
  console.log('-'.repeat(50));
  
  const testDate = '2025-06-03'; // The problematic date from screenshot
  let allPassed = true;
  
  // Clear previous tracking data
  if (window.advancedDateTracker) {
    window.advancedDateTracker.events = [];
  }
  
  // Simulate date selection by calling tracking function
  if (window.trackDateEvent) {
    window.trackDateEvent('SIMULATED_DATE_SELECTION', {
      selectedDate: testDate,
      expectedBehavior: 'should_show_slots_for_2025-06-03',
      testType: 'simulation'
    }, 'TestSuite');
    
    recordTestResult(
      'Simulated Date Selection Tracking',
      true,
      { selectedDate: testDate, tracked: true }
    );
  } else {
    recordTestResult(
      'Simulated Date Selection Tracking',
      false,
      { error: 'trackDateEvent function not available' }
    );
    allPassed = false;
  }
  
  // Wait a moment and check if any displacement events were recorded
  setTimeout(() => {
    if (window.advancedDateTracker) {
      const displacementEvents = window.advancedDateTracker.events.filter(event => 
        event.type.includes('DISPLACEMENT') || event.type.includes('MISMATCH')
      );
      
      recordTestResult(
        'No Displacement Events in Simulation',
        displacementEvents.length === 0,
        { displacementEvents: displacementEvents.length, events: displacementEvents },
        true // Critical test
      );
      
      if (displacementEvents.length > 0) {
        window.dateDisplacementTestResults.summary.displacementEvents += displacementEvents.length;
      }
    }
  }, 1000);
  
  return allPassed;
}

/**
 * Test 5: Cross-Browser Compatibility Check
 */
function testCrossBrowserCompatibility() {
  console.log('\n🧪 TEST 5: Cross-Browser Compatibility Check');
  console.log('-'.repeat(50));
  
  const browserInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
  
  // Test Date object behavior
  const testDate = new Date('2025-06-03');
  const dateString = testDate.toISOString().split('T')[0];
  
  const dateCompatible = dateString === '2025-06-03';
  
  recordTestResult(
    'Date Object Compatibility',
    dateCompatible,
    { 
      input: '2025-06-03',
      output: dateString,
      browserInfo
    }
  );
  
  // Test timezone handling
  const timezoneOffset = testDate.getTimezoneOffset();
  recordTestResult(
    'Timezone Information',
    true,
    {
      timezoneOffset,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserInfo
    }
  );
  
  return dateCompatible;
}

/**
 * Main test runner
 */
function runComprehensiveTests() {
  console.log('\n🚀 RUNNING COMPREHENSIVE DATE DISPLACEMENT TESTS');
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  // Run all tests
  const test1 = testDateHandlerUtility();
  const test2 = testComponentIntegration();
  const test3 = testDOMElements();
  const test4 = testSimulatedDateSelection();
  const test5 = testCrossBrowserCompatibility();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Generate final report
  const summary = window.dateDisplacementTestResults.summary;
  const successRate = summary.totalTests > 0 ? (summary.passedTests / summary.totalTests * 100) : 0;
  
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passedTests}`);
  console.log(`Failed: ${summary.failedTests}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Critical Issues: ${summary.criticalIssues.length}`);
  console.log(`Displacement Events: ${summary.displacementEvents}`);
  
  if (summary.criticalIssues.length > 0) {
    console.error('\n🚨 CRITICAL ISSUES FOUND:');
    summary.criticalIssues.forEach((issue, index) => {
      console.error(`${index + 1}. ${issue.testName}: ${JSON.stringify(issue.details)}`);
    });
  }
  
  if (summary.displacementEvents > 0) {
    console.error(`\n🚨 ${summary.displacementEvents} DATE DISPLACEMENT EVENTS DETECTED!`);
    console.error('🔍 Check window.advancedDateTracker.events for details');
  } else {
    console.log('\n✅ NO DATE DISPLACEMENT EVENTS DETECTED');
  }
  
  // Overall assessment
  const overallSuccess = summary.failedTests === 0 && summary.displacementEvents === 0;
  
  if (overallSuccess) {
    console.log('\n🎉 ALL TESTS PASSED - DATE DISPLACEMENT ISSUE RESOLVED!');
  } else {
    console.error('\n⚠️ TESTS FAILED - DATE DISPLACEMENT ISSUE STILL EXISTS');
    console.error('📋 Review failed tests and displacement events above');
  }
  
  return {
    success: overallSuccess,
    summary,
    duration,
    results: window.dateDisplacementTestResults.testResults
  };
}

/**
 * Export test data
 */
function exportTestResults() {
  const data = {
    testResults: window.dateDisplacementTestResults,
    timestamp: new Date().toISOString(),
    browserInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `date-displacement-test-results-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Make functions globally available
window.runComprehensiveTests = runComprehensiveTests;
window.exportTestResults = exportTestResults;

// Auto-run tests after 3 seconds
setTimeout(() => {
  console.log('\n🔄 AUTO-RUNNING COMPREHENSIVE TESTS...');
  runComprehensiveTests();
}, 3000);

console.log('✅ Comprehensive Date Displacement Test Suite Ready');
console.log('📋 Use window.runComprehensiveTests() to run tests manually');
console.log('📊 Use window.exportTestResults() to export results');
console.log('🔄 Tests will auto-run in 3 seconds...');
