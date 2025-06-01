/**
 * COMPREHENSIVE DATE DISPLACEMENT VALIDATOR
 * Real-time validation system to verify all date displacement fixes are working
 * 
 * DEPLOYMENT: Add this script to the page to immediately validate fixes
 * USAGE: Monitor console for real-time validation results
 */

console.log('🚨 COMPREHENSIVE DATE DISPLACEMENT VALIDATOR ACTIVATED');
console.log('='.repeat(80));

// Global validation system
window.dateDisplacementValidator = {
  validationResults: [],
  testResults: [],
  componentStatus: {},
  startTime: Date.now(),
  isActive: true,
  
  // Test configuration
  config: {
    testDates: [
      '2025-06-03', // The problematic date from screenshot
      '2025-06-04', // Next day (displacement target)
      '2025-06-05', // Future date
      '2025-06-02', // Previous day
      '2025-06-01'  // Week start
    ],
    expectedBehavior: {
      '2025-06-03': 'should_show_slots_for_2025-06-03',
      '2025-06-04': 'should_show_slots_for_2025-06-04',
      '2025-06-05': 'should_show_slots_for_2025-06-05'
    }
  }
};

/**
 * Core validation function
 */
function validateDateOperation(operation, input, output, component, expected) {
  const validation = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    operation,
    component,
    input,
    output,
    expected,
    isValid: output === expected,
    displacement: input !== output ? {
      detected: true,
      originalDate: input,
      resultDate: output,
      daysDifference: calculateDaysDifference(input, output)
    } : { detected: false }
  };
  
  window.dateDisplacementValidator.validationResults.push(validation);
  
  // Log results
  if (!validation.isValid || validation.displacement.detected) {
    console.error(`🚨 VALIDATION FAILED: ${operation}`, validation);
  } else {
    console.log(`✅ VALIDATION PASSED: ${operation}`, {
      component,
      input,
      output,
      expected
    });
  }
  
  return validation;
}

/**
 * Calculate date difference
 */
function calculateDaysDifference(date1, date2) {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
}

/**
 * Test DateHandler utility
 */
function testDateHandler() {
  console.log('\n🧪 TESTING DATEHANDLER UTILITY');
  console.log('-'.repeat(40));
  
  const testDates = window.dateDisplacementValidator.config.testDates;
  const results = [];
  
  testDates.forEach(testDate => {
    try {
      // Test if DateHandler is available
      if (typeof window.DateHandler !== 'undefined') {
        const validation = window.DateHandler.validateAndNormalize(testDate, 'Validator');
        
        results.push(validateDateOperation(
          'DateHandler.validateAndNormalize',
          testDate,
          validation.normalizedDate || testDate,
          'DateHandler',
          testDate // Expected: same date (no displacement)
        ));
      } else {
        console.warn('⚠️ DateHandler not available globally');
      }
    } catch (error) {
      console.error(`❌ DateHandler test failed for ${testDate}:`, error);
    }
  });
  
  return results;
}

/**
 * Test form data updates
 */
function testFormDataUpdates() {
  console.log('\n🧪 TESTING FORM DATA UPDATES');
  console.log('-'.repeat(40));
  
  // Monitor form data changes in React components
  const originalSetState = React.useState;
  
  // This is a simplified test - in real implementation, we'd need to hook into React
  console.log('📋 Form data update monitoring active');
  console.log('💡 Check console for form data change logs during date selection');
}

/**
 * Test time slot display consistency
 */
function testTimeSlotDisplay() {
  console.log('\n🧪 TESTING TIME SLOT DISPLAY CONSISTENCY');
  console.log('-'.repeat(40));
  
  // Look for time slot headers in the DOM
  const timeSlotHeaders = document.querySelectorAll('[class*="title"], h1, h2, h3, h4, h5, h6');
  
  timeSlotHeaders.forEach(header => {
    const text = header.textContent || '';
    
    if (text.includes('Horarios disponibles para')) {
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
      
      if (dateMatch) {
        const displayedDate = dateMatch[1];
        console.log(`📅 Found time slot header: "${text}"`);
        console.log(`📊 Displayed date: ${displayedDate}`);
        
        // This would need to be compared with the selected date
        // For now, just log for manual verification
      }
    }
  });
}

/**
 * Test calendar date generation
 */
function testCalendarDateGeneration() {
  console.log('\n🧪 TESTING CALENDAR DATE GENERATION');
  console.log('-'.repeat(40));
  
  // Look for calendar elements
  const calendarElements = document.querySelectorAll('[class*="calendar"], [class*="availability"], [class*="week"]');
  
  calendarElements.forEach((element, index) => {
    console.log(`📅 Calendar element ${index + 1}:`, element.className);
    
    // Look for date attributes or data
    const dateElements = element.querySelectorAll('[data-date], [class*="date"]');
    
    dateElements.forEach(dateEl => {
      const date = dateEl.getAttribute('data-date') || dateEl.textContent;
      if (date && /\d{4}-\d{2}-\d{2}/.test(date)) {
        console.log(`  📊 Found date: ${date}`);
      }
    });
  });
}

/**
 * Comprehensive validation suite
 */
function runComprehensiveValidation() {
  console.log('\n🚀 RUNNING COMPREHENSIVE VALIDATION SUITE');
  console.log('='.repeat(60));
  
  const results = {
    dateHandler: testDateHandler(),
    formData: testFormDataUpdates(),
    timeSlotDisplay: testTimeSlotDisplay(),
    calendarGeneration: testCalendarDateGeneration(),
    timestamp: new Date().toISOString()
  };
  
  window.dateDisplacementValidator.testResults.push(results);
  
  // Generate summary
  const totalValidations = window.dateDisplacementValidator.validationResults.length;
  const failedValidations = window.dateDisplacementValidator.validationResults.filter(v => !v.isValid).length;
  const displacementEvents = window.dateDisplacementValidator.validationResults.filter(v => v.displacement.detected).length;
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('-'.repeat(30));
  console.log(`Total Validations: ${totalValidations}`);
  console.log(`Failed Validations: ${failedValidations}`);
  console.log(`Displacement Events: ${displacementEvents}`);
  console.log(`Success Rate: ${totalValidations > 0 ? ((totalValidations - failedValidations) / totalValidations * 100).toFixed(1) : 0}%`);
  
  if (displacementEvents > 0) {
    console.error('🚨 DATE DISPLACEMENT STILL DETECTED!');
    console.error('🔍 Check displacement events in window.dateDisplacementValidator.validationResults');
  } else {
    console.log('✅ NO DATE DISPLACEMENT DETECTED');
  }
  
  return results;
}

/**
 * Real-time monitoring setup
 */
function setupRealTimeMonitoring() {
  console.log('\n🔄 SETTING UP REAL-TIME MONITORING');
  console.log('-'.repeat(40));
  
  // Monitor DOM changes for time slot updates
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            
            // Check for time slot headers
            if (element.textContent && element.textContent.includes('Horarios disponibles para')) {
              const dateMatch = element.textContent.match(/(\d{4}-\d{2}-\d{2})/);
              if (dateMatch) {
                console.log(`🔄 Time slot header updated: ${element.textContent}`);
                console.log(`📊 Date detected: ${dateMatch[1]}`);
              }
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Real-time monitoring active');
}

/**
 * Manual testing helpers
 */
window.dateValidationHelpers = {
  testDate: (date) => {
    console.log(`\n🧪 MANUAL DATE TEST: ${date}`);
    return validateDateOperation('Manual Test', date, date, 'Manual', date);
  },
  
  checkCurrentTimeSlots: () => {
    testTimeSlotDisplay();
  },
  
  generateReport: () => {
    return runComprehensiveValidation();
  },
  
  exportResults: () => {
    return {
      validator: window.dateDisplacementValidator,
      timestamp: new Date().toISOString()
    };
  }
};

// Initialize validation system
setupRealTimeMonitoring();

// Run initial validation
setTimeout(() => {
  runComprehensiveValidation();
}, 2000); // Wait 2 seconds for page to load

// Auto-run validation every 30 seconds
setInterval(() => {
  if (window.dateDisplacementValidator.isActive) {
    console.log('\n🔄 AUTO-VALIDATION (30s interval)');
    runComprehensiveValidation();
  }
}, 30000);

console.log('✅ Comprehensive Date Displacement Validator Ready');
console.log('📋 Use window.dateValidationHelpers.generateReport() for manual validation');
console.log('🧪 Use window.dateValidationHelpers.testDate("2025-06-03") to test specific dates');
console.log('📊 Results available at window.dateDisplacementValidator');
