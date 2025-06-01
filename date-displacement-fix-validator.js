/**
 * DATE DISPLACEMENT BUG FIX VALIDATOR
 * 
 * Execute this script in the browser console to validate that the
 * critical date displacement bug fixes are working correctly.
 * 
 * INSTRUCTIONS:
 * 1. Open AgentSalud application in browser
 * 2. Navigate to appointment booking or reschedule modal
 * 3. Open Developer Tools (F12) → Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to execute
 * 6. Follow the automated testing instructions
 * 
 * @author AgentSalud MVP Team - Fix Validation
 * @version 1.0.0
 */

console.log('🔧 DATE DISPLACEMENT BUG FIX VALIDATOR');
console.log('='.repeat(80));

// Global validation state
window.fixValidator = {
  testResults: [],
  blockedDateClicks: [],
  timeSlotLoads: [],
  validationAlerts: [],
  startTime: Date.now(),
  isActive: false
};

/**
 * 1. SETUP FIX VALIDATION MONITORING
 */
function setupFixValidationMonitoring() {
  console.log('\n🔍 SETTING UP FIX VALIDATION MONITORING');
  console.log('-'.repeat(50));
  
  // Monitor console logs for our fix markers
  const originalConsoleLog = console.log;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Detect our enhanced blocking messages
    if (message.includes('🚫 FECHA BLOQUEADA - DETENIENDO EJECUCIÓN COMPLETAMENTE')) {
      window.fixValidator.blockedDateClicks.push({
        type: 'WEEKLY_SELECTOR_BLOCK',
        message,
        timestamp: new Date().toISOString(),
        source: 'WeeklyAvailabilitySelector'
      });
      console.log('✅ FIX DETECTED: WeeklyAvailabilitySelector blocking working');
    }
    
    if (message.includes('🚫 RESCHEDULE: Past date selected, blocking') || 
        message.includes('🚫 RESCHEDULE: Same-day booking blocked')) {
      window.fixValidator.blockedDateClicks.push({
        type: 'RESCHEDULE_BLOCK',
        message,
        timestamp: new Date().toISOString(),
        source: 'AIEnhancedRescheduleModal'
      });
      console.log('✅ FIX DETECTED: RescheduleModal blocking working');
    }
    
    if (message.includes('✅ Passing date directly to parent (no timezone manipulation)')) {
      window.fixValidator.blockedDateClicks.push({
        type: 'SIMPLIFIED_TIMEZONE',
        message,
        timestamp: new Date().toISOString(),
        source: 'AvailabilityIndicator'
      });
      console.log('✅ FIX DETECTED: Simplified timezone handling working');
    }
    
    if (message.includes('✅ RESCHEDULE: Loading time slots for validated date') ||
        message.includes('✅ FECHA VÁLIDA - PROCEDIENDO con onDateSelect')) {
      window.fixValidator.timeSlotLoads.push({
        type: 'VALID_TIME_SLOT_LOAD',
        message,
        timestamp: new Date().toISOString(),
        isValidLoad: true
      });
    }
    
    // Call original console.log
    return originalConsoleLog.apply(this, args);
  };
  
  // Monitor alerts for validation messages
  const originalAlert = window.alert;
  
  window.alert = function(message) {
    console.log('🚨 VALIDATION ALERT CAPTURED');
    console.log(`   Message: "${message}"`);
    
    window.fixValidator.validationAlerts.push({
      message,
      timestamp: new Date().toISOString(),
      isBlockingAlert: message.includes('no está disponible') || 
                      message.includes('fechas pasadas') ||
                      message.includes('24 horas de anticipación')
    });
    
    return originalAlert.call(this, message);
  };
  
  console.log('✅ Fix validation monitoring activated');
}

/**
 * 2. AUTOMATED FIX TESTING
 */
function runAutomatedFixTests() {
  console.log('\n🧪 RUNNING AUTOMATED FIX TESTS');
  console.log('-'.repeat(50));
  
  const tests = [
    {
      name: 'WeeklyAvailabilitySelector Enhanced Blocking',
      description: 'Verify enhanced blocked date validation',
      test: () => {
        // Look for WeeklyAvailabilitySelector component
        const weeklySelector = document.querySelector('[class*="WeeklyAvailability"], .weekly-availability-selector');
        if (!weeklySelector) {
          return { status: 'SKIP', reason: 'WeeklyAvailabilitySelector not found on page' };
        }
        
        // Check if enhanced blocking logs are present
        const hasEnhancedBlocking = window.fixValidator.blockedDateClicks.some(
          click => click.source === 'WeeklyAvailabilitySelector'
        );
        
        return {
          status: hasEnhancedBlocking ? 'PASS' : 'PENDING',
          reason: hasEnhancedBlocking ? 'Enhanced blocking detected' : 'No blocked date clicks yet - test manually'
        };
      }
    },
    {
      name: 'AIEnhancedRescheduleModal Date Validation',
      description: 'Verify enhanced date validation in reschedule modal',
      test: () => {
        // Look for reschedule modal
        const rescheduleModal = document.querySelector('[class*="reschedule"], [class*="Reschedule"]');
        if (!rescheduleModal) {
          return { status: 'SKIP', reason: 'RescheduleModal not found on page' };
        }
        
        const hasRescheduleValidation = window.fixValidator.blockedDateClicks.some(
          click => click.source === 'AIEnhancedRescheduleModal'
        );
        
        return {
          status: hasRescheduleValidation ? 'PASS' : 'PENDING',
          reason: hasRescheduleValidation ? 'Reschedule validation detected' : 'No reschedule validation yet - test manually'
        };
      }
    },
    {
      name: 'AvailabilityIndicator Simplified Timezone',
      description: 'Verify simplified timezone handling',
      test: () => {
        const hasSimplifiedTimezone = window.fixValidator.blockedDateClicks.some(
          click => click.type === 'SIMPLIFIED_TIMEZONE'
        );
        
        return {
          status: hasSimplifiedTimezone ? 'PASS' : 'PENDING',
          reason: hasSimplifiedTimezone ? 'Simplified timezone handling detected' : 'No timezone handling detected yet'
        };
      }
    },
    {
      name: 'No Date Displacement',
      description: 'Verify no time slots load for blocked dates',
      test: () => {
        const blockedClicks = window.fixValidator.blockedDateClicks.length;
        const validLoads = window.fixValidator.timeSlotLoads.filter(load => load.isValidLoad).length;
        const alerts = window.fixValidator.validationAlerts.filter(alert => alert.isBlockingAlert).length;
        
        if (blockedClicks === 0) {
          return { status: 'PENDING', reason: 'No blocked date clicks to test yet' };
        }
        
        // If we have blocked clicks but no corresponding time slot loads, that's good
        const hasDisplacement = blockedClicks > 0 && validLoads > blockedClicks;
        
        return {
          status: hasDisplacement ? 'FAIL' : 'PASS',
          reason: hasDisplacement ? 
            `Potential displacement: ${blockedClicks} blocked clicks, ${validLoads} time slot loads` :
            `No displacement detected: ${blockedClicks} blocked clicks, ${validLoads} valid loads, ${alerts} alerts`
        };
      }
    }
  ];
  
  console.log('📋 RUNNING TEST SUITE:');
  
  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   Description: ${test.description}`);
    
    try {
      const result = test.test();
      console.log(`   Status: ${result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏳'} ${result.status}`);
      console.log(`   Result: ${result.reason}`);
      
      window.fixValidator.testResults.push({
        name: test.name,
        status: result.status,
        reason: result.reason,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log(`   Status: ❌ ERROR`);
      console.log(`   Error: ${error.message}`);
      
      window.fixValidator.testResults.push({
        name: test.name,
        status: 'ERROR',
        reason: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * 3. GENERATE FIX VALIDATION REPORT
 */
function generateFixValidationReport() {
  console.log('\n📊 GENERATING FIX VALIDATION REPORT');
  console.log('='.repeat(80));
  
  const duration = ((Date.now() - window.fixValidator.startTime) / 1000).toFixed(2);
  
  console.log('🔍 FIX VALIDATION SUMMARY:');
  console.log(`   Test duration: ${duration}s`);
  console.log(`   Browser: ${navigator.userAgent.split(' ')[0]}`);
  console.log(`   Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`   Current time: ${new Date().toISOString()}`);
  
  // Test results summary
  const passedTests = window.fixValidator.testResults.filter(t => t.status === 'PASS').length;
  const failedTests = window.fixValidator.testResults.filter(t => t.status === 'FAIL').length;
  const pendingTests = window.fixValidator.testResults.filter(t => t.status === 'PENDING').length;
  const skippedTests = window.fixValidator.testResults.filter(t => t.status === 'SKIP').length;
  
  console.log('\n📈 TEST RESULTS:');
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   ⏳ Pending: ${pendingTests}`);
  console.log(`   ⏭️  Skipped: ${skippedTests}`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  window.fixValidator.testResults.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏳';
    console.log(`   ${icon} ${test.name}: ${test.reason}`);
  });
  
  // Fix detection summary
  console.log('\n🔧 FIX DETECTION SUMMARY:');
  console.log(`   Blocked date clicks detected: ${window.fixValidator.blockedDateClicks.length}`);
  console.log(`   Validation alerts captured: ${window.fixValidator.validationAlerts.length}`);
  console.log(`   Valid time slot loads: ${window.fixValidator.timeSlotLoads.length}`);
  
  // Overall assessment
  const criticalFailures = failedTests > 0;
  const hasDetectedFixes = window.fixValidator.blockedDateClicks.length > 0;
  
  console.log('\n🎯 OVERALL ASSESSMENT:');
  if (criticalFailures) {
    console.log('   ❌ CRITICAL FAILURES DETECTED');
    console.log('   🔧 Additional fixes may be required');
  } else if (hasDetectedFixes) {
    console.log('   ✅ FIXES ARE WORKING CORRECTLY');
    console.log('   🎉 Date displacement bug appears to be resolved');
  } else if (pendingTests > 0) {
    console.log('   ⏳ TESTING INCOMPLETE');
    console.log('   🧪 Manual testing required to validate fixes');
  } else {
    console.log('   ✅ NO ISSUES DETECTED');
    console.log('   🔍 Continue monitoring in production');
  }
  
  console.log('\n='.repeat(80));
  
  return {
    passedTests,
    failedTests,
    pendingTests,
    criticalFailures,
    hasDetectedFixes
  };
}

/**
 * 4. MANUAL TESTING INSTRUCTIONS
 */
function showManualTestingInstructions() {
  console.log('\n📋 MANUAL TESTING INSTRUCTIONS FOR FIX VALIDATION');
  console.log('-'.repeat(50));
  
  console.log('🎯 CRITICAL TEST SCENARIOS TO VALIDATE FIXES:');
  console.log('');
  console.log('1. TEST ENHANCED BLOCKED DATE VALIDATION:');
  console.log('   - Click on today\'s date in the calendar');
  console.log('   - Expected: Alert + NO time slots (fix working)');
  console.log('   - Bug behavior: Alert + time slots for tomorrow');
  console.log('');
  console.log('2. TEST RESCHEDULE MODAL VALIDATION:');
  console.log('   - Open reschedule modal');
  console.log('   - Click on a past date');
  console.log('   - Expected: Alert + NO time slots (fix working)');
  console.log('   - Bug behavior: Alert + time slots for next day');
  console.log('');
  console.log('3. TEST SIMPLIFIED TIMEZONE HANDLING:');
  console.log('   - Click on any valid future date');
  console.log('   - Expected: Time slots for SAME date (fix working)');
  console.log('   - Bug behavior: Time slots for different date');
  console.log('');
  console.log('4. VALIDATE RESULTS:');
  console.log('   - Run: generateFixValidationReport()');
  console.log('   - Check console for fix detection messages');
  console.log('   - Verify no date displacement occurs');
  console.log('');
  console.log('🔍 All interactions are being monitored automatically!');
}

/**
 * INITIALIZE FIX VALIDATOR
 */
function initializeFixValidator() {
  console.log('🚀 Initializing date displacement fix validator...');
  
  setupFixValidationMonitoring();
  
  window.fixValidator.isActive = true;
  
  console.log('\n💡 AVAILABLE FUNCTIONS:');
  console.log('   runAutomatedFixTests() - Run automated fix validation tests');
  console.log('   generateFixValidationReport() - Generate comprehensive validation report');
  console.log('   showManualTestingInstructions() - Show manual testing instructions');
  
  // Run initial automated tests
  runAutomatedFixTests();
  
  showManualTestingInstructions();
  
  console.log('\n🔧 Date displacement fix validator ready!');
  console.log('   Start testing the fixes now...');
}

// Export functions to global scope
window.runAutomatedFixTests = runAutomatedFixTests;
window.generateFixValidationReport = generateFixValidationReport;
window.showManualTestingInstructions = showManualTestingInstructions;

// Auto-initialize
initializeFixValidator();
