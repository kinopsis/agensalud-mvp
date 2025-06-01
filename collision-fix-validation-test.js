/**
 * COLLISION FIX VALIDATION TEST
 * Tests that the JavaScript variable collision fixes work correctly
 * 
 * USAGE: Run this script in browser console after loading the dashboard
 * PURPOSE: Validate that debugging components can coexist without variable conflicts
 */

console.log('🧪 COLLISION FIX VALIDATION TEST ACTIVATED');
console.log('='.repeat(80));

// Global test state
window.collisionFixTest = {
  testResults: [],
  errors: [],
  startTime: Date.now(),
  isActive: true
};

/**
 * Test result tracking
 */
function recordCollisionTestResult(testName, passed, details, error = null) {
  const result = {
    id: `collision-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    testName,
    passed,
    details,
    error,
    timestamp: new Date().toISOString()
  };
  
  window.collisionFixTest.testResults.push(result);
  
  if (passed) {
    console.log(`✅ COLLISION TEST PASSED: ${testName}`, details);
  } else {
    console.error(`❌ COLLISION TEST FAILED: ${testName}`, details, error);
    if (error) {
      window.collisionFixTest.errors.push(result);
    }
  }
  
  return result;
}

/**
 * Test 1: Check for JavaScript runtime errors
 */
function testJavaScriptErrors() {
  console.log('\n🧪 TEST 1: JavaScript Runtime Errors Check');
  console.log('-'.repeat(50));
  
  let errorCount = 0;
  const originalConsoleError = console.error;
  
  // Temporarily intercept console.error to count JavaScript errors
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('SyntaxError') || message.includes('identifier') || message.includes('already declared')) {
      errorCount++;
      console.log('🚨 JavaScript Error Detected:', message);
    }
    return originalConsoleError.apply(this, args);
  };
  
  // Wait a moment for any errors to surface
  setTimeout(() => {
    console.error = originalConsoleError;
    
    recordCollisionTestResult(
      'JavaScript Runtime Errors',
      errorCount === 0,
      { errorCount, message: errorCount === 0 ? 'No JavaScript errors detected' : `${errorCount} errors found` }
    );
  }, 2000);
}

/**
 * Test 2: Check debugging components initialization
 */
function testDebuggingComponentsInitialization() {
  console.log('\n🧪 TEST 2: Debugging Components Initialization');
  console.log('-'.repeat(50));
  
  // Check if DateDisplacementDebugger initialized
  const debuggerActive = window.advancedDateTracker && window.advancedDateTracker.isActive;
  recordCollisionTestResult(
    'DateDisplacementDebugger Initialization',
    debuggerActive,
    { 
      active: debuggerActive, 
      tracker: !!window.advancedDateTracker,
      trackingFunction: typeof window.trackDateEvent === 'function'
    }
  );
  
  // Check if DateValidationMonitor initialized
  const validatorActive = window.dateDisplacementValidator && window.dateDisplacementValidator.isActive;
  recordCollisionTestResult(
    'DateValidationMonitor Initialization',
    validatorActive,
    { 
      active: validatorActive, 
      validator: !!window.dateDisplacementValidator,
      validationFunction: typeof window.validateDateOperation === 'function'
    }
  );
  
  // Check if both can coexist
  const bothActive = debuggerActive && validatorActive;
  recordCollisionTestResult(
    'Both Components Coexistence',
    bothActive,
    { 
      debuggerActive, 
      validatorActive, 
      bothActive,
      message: bothActive ? 'Both components active simultaneously' : 'Components cannot coexist'
    }
  );
}

/**
 * Test 3: Check for variable collision prevention
 */
function testVariableCollisionPrevention() {
  console.log('\n🧪 TEST 3: Variable Collision Prevention');
  console.log('-'.repeat(50));
  
  // Test that console.log interception is properly isolated
  const consoleLogIntercepted = console.log._dateDebuggerIntercepted;
  recordCollisionTestResult(
    'Console.log Interception Isolation',
    consoleLogIntercepted === true,
    { 
      intercepted: consoleLogIntercepted,
      message: consoleLogIntercepted ? 'Console.log properly intercepted with collision prevention' : 'Console.log interception not isolated'
    }
  );
  
  // Test that fetch interception is properly isolated
  const fetchIntercepted = window.fetch._dateDebuggerIntercepted;
  recordCollisionTestResult(
    'Fetch Interception Isolation',
    fetchIntercepted === true,
    { 
      intercepted: fetchIntercepted,
      message: fetchIntercepted ? 'Fetch properly intercepted with collision prevention' : 'Fetch interception not isolated'
    }
  );
  
  // Test that DOM observer is properly isolated
  const observerActive = window._dateValidatorObserverActive;
  recordCollisionTestResult(
    'DOM Observer Isolation',
    observerActive === true,
    { 
      active: observerActive,
      message: observerActive ? 'DOM observer properly isolated' : 'DOM observer not isolated'
    }
  );
}

/**
 * Test 4: Check script cleanup mechanism
 */
function testScriptCleanupMechanism() {
  console.log('\n🧪 TEST 4: Script Cleanup Mechanism');
  console.log('-'.repeat(50));
  
  // Check for debugging script tags with proper attributes
  const debuggerScripts = document.querySelectorAll('script[data-debugger-type="date-displacement"]');
  const validatorScripts = document.querySelectorAll('script[data-debugger-type="date-validation"]');
  
  recordCollisionTestResult(
    'Debugger Script Cleanup',
    debuggerScripts.length <= 1,
    { 
      scriptCount: debuggerScripts.length,
      message: debuggerScripts.length <= 1 ? 'Proper script cleanup - no duplicates' : `${debuggerScripts.length} duplicate scripts found`
    }
  );
  
  recordCollisionTestResult(
    'Validator Script Cleanup',
    validatorScripts.length <= 1,
    { 
      scriptCount: validatorScripts.length,
      message: validatorScripts.length <= 1 ? 'Proper script cleanup - no duplicates' : `${validatorScripts.length} duplicate scripts found`
    }
  );
}

/**
 * Test 5: Functional testing of debugging capabilities
 */
function testDebuggingFunctionality() {
  console.log('\n🧪 TEST 5: Debugging Functionality');
  console.log('-'.repeat(50));
  
  // Test trackDateEvent function
  let trackingWorked = false;
  if (window.trackDateEvent) {
    try {
      const eventId = window.trackDateEvent('COLLISION_TEST', {
        testDate: '2025-06-03',
        testType: 'functionality'
      }, 'CollisionTest');
      
      trackingWorked = !!eventId;
    } catch (error) {
      console.error('Error testing trackDateEvent:', error);
    }
  }
  
  recordCollisionTestResult(
    'Date Event Tracking Functionality',
    trackingWorked,
    { 
      functionAvailable: typeof window.trackDateEvent === 'function',
      trackingWorked,
      message: trackingWorked ? 'Date event tracking working correctly' : 'Date event tracking failed'
    }
  );
  
  // Test validateDateOperation function
  let validationWorked = false;
  if (window.validateDateOperation) {
    try {
      const validation = window.validateDateOperation(
        'COLLISION_TEST',
        '2025-06-03',
        '2025-06-03',
        'CollisionTest',
        '2025-06-03'
      );
      
      validationWorked = !!validation;
    } catch (error) {
      console.error('Error testing validateDateOperation:', error);
    }
  }
  
  recordCollisionTestResult(
    'Date Validation Functionality',
    validationWorked,
    { 
      functionAvailable: typeof window.validateDateOperation === 'function',
      validationWorked,
      message: validationWorked ? 'Date validation working correctly' : 'Date validation failed'
    }
  );
}

/**
 * Generate collision fix test report
 */
function generateCollisionFixReport() {
  const testResults = window.collisionFixTest;
  const duration = Date.now() - testResults.startTime;
  const totalTests = testResults.testResults.length;
  const passedTests = testResults.testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100) : 0;
  
  console.log('\n📊 COLLISION FIX TEST REPORT');
  console.log('='.repeat(60));
  console.log(`Test Duration: ${duration}ms`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`JavaScript Errors: ${testResults.errors.length}`);
  
  if (testResults.errors.length > 0) {
    console.error('\n🚨 JAVASCRIPT ERRORS DETECTED:');
    testResults.errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error.testName}:`, error.error);
    });
  }
  
  if (failedTests === 0 && testResults.errors.length === 0) {
    console.log('\n✅ ALL COLLISION FIX TESTS PASSED');
    console.log('✅ No JavaScript variable collisions detected');
    console.log('✅ Debugging components can coexist safely');
    return true;
  } else {
    console.error('\n❌ COLLISION FIX TESTS FAILED');
    console.error('⚠️ JavaScript variable collisions may still exist');
    return false;
  }
}

/**
 * Main collision fix test runner
 */
function runCollisionFixTests() {
  console.log('\n🚀 RUNNING COLLISION FIX VALIDATION TESTS');
  console.log('='.repeat(60));
  
  // Run tests in sequence
  testJavaScriptErrors();
  
  setTimeout(() => {
    testDebuggingComponentsInitialization();
    testVariableCollisionPrevention();
    testScriptCleanupMechanism();
    testDebuggingFunctionality();
    
    // Generate report after all tests complete
    setTimeout(() => {
      const success = generateCollisionFixReport();
      
      if (success) {
        console.log('\n🎉 COLLISION FIX VALIDATION COMPLETED SUCCESSFULLY!');
        console.log('✅ JavaScript variable collision issues have been resolved');
        console.log('✅ Debugging components are ready for date displacement testing');
      } else {
        console.error('\n⚠️ COLLISION FIX VALIDATION FAILED!');
        console.error('❌ JavaScript variable collision issues may still exist');
        console.error('📋 Review failed tests above for details');
      }
    }, 3000);
  }, 3000);
}

// Make functions globally available
window.runCollisionFixTests = runCollisionFixTests;
window.generateCollisionFixReport = generateCollisionFixReport;

// Auto-run tests after 2 seconds
setTimeout(() => {
  console.log('\n🔄 AUTO-RUNNING COLLISION FIX TESTS...');
  runCollisionFixTests();
}, 2000);

console.log('✅ Collision Fix Validation Test Ready');
console.log('📋 Use window.runCollisionFixTests() to run tests manually');
console.log('📊 Use window.generateCollisionFixReport() for analysis');
console.log('🔄 Tests will auto-run in 2 seconds...');
