/**
 * CRITICAL JUNE 3RD DISPLACEMENT TEST
 * Specific test for the June 3rd → June 4th displacement scenario
 * 
 * USAGE: Run this script in browser console after loading appointment booking page
 * FOCUS: Tests the exact problematic scenario from the validation report
 */

console.log('🚨 CRITICAL JUNE 3RD DISPLACEMENT TEST ACTIVATED');
console.log('='.repeat(80));

// Global test state
window.june3rdDisplacementTest = {
  testResults: [],
  displacementEvents: [],
  correlationChecks: [],
  startTime: Date.now(),
  isActive: true,
  targetDate: '2025-06-03',
  expectedHeader: 'Horarios disponibles para 2025-06-03'
};

/**
 * Enhanced tracking for June 3rd specific scenario
 */
function trackJune3rdEvent(eventType, data) {
  const event = {
    id: `june3rd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    eventType,
    data: JSON.parse(JSON.stringify(data)),
    testPhase: getCurrentTestPhase()
  };
  
  window.june3rdDisplacementTest.testResults.push(event);
  
  console.log(`📋 JUNE 3RD TEST: ${eventType}`, data);
  
  // Check for displacement in this event
  if (data.clickedDate === '2025-06-03' && data.displayedDate && data.displayedDate !== '2025-06-03') {
    const displacementEvent = {
      ...event,
      severity: 'CRITICAL',
      displacement: {
        clicked: '2025-06-03',
        displayed: data.displayedDate,
        daysDifference: calculateDaysDifference('2025-06-03', data.displayedDate)
      }
    };
    
    window.june3rdDisplacementTest.displacementEvents.push(displacementEvent);
    
    console.error('🚨 JUNE 3RD DISPLACEMENT DETECTED!', displacementEvent);
    
    // Immediate alert for critical displacement
    alert(`🚨 CRITICAL DISPLACEMENT DETECTED!\n\nClicked: June 3rd (2025-06-03)\nShowing: ${data.displayedDate}\n\nThis is the exact bug we're trying to fix!`);
  }
  
  return event;
}

/**
 * Get current test phase
 */
function getCurrentTestPhase() {
  const elapsed = Date.now() - window.june3rdDisplacementTest.startTime;
  if (elapsed < 5000) return 'initialization';
  if (elapsed < 15000) return 'date_click_simulation';
  if (elapsed < 30000) return 'correlation_monitoring';
  return 'analysis';
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
 * Enhanced tracking integration
 */
function integrateWithExistingTracking() {
  console.log('🔧 Integrating with existing tracking systems...');
  
  // Override existing trackDateEvent to capture June 3rd events
  if (window.trackDateEvent) {
    const originalTrackDateEvent = window.trackDateEvent;
    
    window.trackDateEvent = function(type, data, component) {
      // Call original tracking
      const result = originalTrackDateEvent.apply(this, arguments);
      
      // Additional June 3rd specific tracking
      if (data && (data.clickedDate === '2025-06-03' || data.displayedDate === '2025-06-03' || 
                   data.date === '2025-06-03' || data.extractedDate === '2025-06-03')) {
        trackJune3rdEvent(`EXISTING_TRACKER_${type}`, {
          originalType: type,
          component,
          ...data
        });
      }
      
      return result;
    };
    
    console.log('✅ Enhanced existing trackDateEvent for June 3rd monitoring');
  }
  
  // Monitor window.lastClickedDate changes
  if (typeof window.lastClickedDate !== 'undefined') {
    let lastClickedDateValue = window.lastClickedDate;
    
    Object.defineProperty(window, 'lastClickedDate', {
      get: function() {
        return lastClickedDateValue;
      },
      set: function(value) {
        lastClickedDateValue = value;
        
        if (value && value.date === '2025-06-03') {
          trackJune3rdEvent('LAST_CLICKED_DATE_SET', {
            clickedDate: value.date,
            timestamp: value.timestamp,
            clickId: value.clickId,
            component: value.component
          });
        }
      }
    });
    
    console.log('✅ Enhanced window.lastClickedDate monitoring for June 3rd');
  }
}

/**
 * Simulate June 3rd click
 */
function simulateJune3rdClick() {
  console.log('🎯 SIMULATING JUNE 3RD CLICK...');
  
  trackJune3rdEvent('SIMULATION_STARTED', {
    targetDate: '2025-06-03',
    simulationType: 'automated'
  });
  
  // Look for June 3rd date elements in the DOM
  const dateElements = document.querySelectorAll('*');
  let june3rdElements = [];
  
  dateElements.forEach(element => {
    const text = element.textContent || '';
    const dataDate = element.getAttribute('data-date');
    
    // Look for June 3rd indicators
    if (text.includes('3') || dataDate === '2025-06-03' || 
        text.includes('Martes') || text.includes('Mar')) {
      june3rdElements.push({
        element,
        text: text.trim(),
        dataDate,
        className: element.className
      });
    }
  });
  
  console.log('📋 Found potential June 3rd elements:', june3rdElements.length);
  june3rdElements.forEach((item, index) => {
    console.log(`  ${index + 1}. "${item.text}" (data-date: ${item.dataDate})`);
  });
  
  trackJune3rdEvent('JUNE_3RD_ELEMENTS_FOUND', {
    elementsCount: june3rdElements.length,
    elements: june3rdElements.map(item => ({
      text: item.text,
      dataDate: item.dataDate,
      className: item.className
    }))
  });
  
  // Try to click on June 3rd elements
  june3rdElements.forEach((item, index) => {
    if (item.element.click && typeof item.element.click === 'function') {
      console.log(`🖱️ Attempting to click element ${index + 1}: "${item.text}"`);
      
      trackJune3rdEvent('JUNE_3RD_CLICK_ATTEMPT', {
        elementIndex: index,
        elementText: item.text,
        dataDate: item.dataDate
      });
      
      try {
        item.element.click();
        
        trackJune3rdEvent('JUNE_3RD_CLICK_SUCCESS', {
          elementIndex: index,
          elementText: item.text,
          dataDate: item.dataDate
        });
        
        // Wait and check for time slot headers
        setTimeout(() => {
          checkTimeSlotHeaders(index);
        }, 1000);
        
      } catch (error) {
        trackJune3rdEvent('JUNE_3RD_CLICK_ERROR', {
          elementIndex: index,
          error: error.message
        });
      }
    }
  });
  
  // If no clickable elements found, try manual tracking
  if (june3rdElements.length === 0) {
    console.log('⚠️ No June 3rd elements found, triggering manual tracking');
    
    if (window.trackDateEvent) {
      window.trackDateEvent('MANUAL_JUNE_3RD_SIMULATION', {
        clickedDate: '2025-06-03',
        simulationType: 'manual_fallback'
      }, 'June3rdTest');
    }
    
    // Set lastClickedDate manually
    if (typeof window !== 'undefined') {
      window.lastClickedDate = {
        date: '2025-06-03',
        timestamp: new Date().toISOString(),
        clickId: `manual-${Date.now()}`,
        component: 'June3rdTest'
      };
    }
  }
}

/**
 * Check time slot headers after click
 */
function checkTimeSlotHeaders(clickElementIndex) {
  console.log('🔍 CHECKING TIME SLOT HEADERS after click...');
  
  const allElements = document.querySelectorAll('*');
  let timeSlotHeaders = [];
  
  allElements.forEach(element => {
    const text = element.textContent || '';
    if (text.includes('Horarios disponibles para')) {
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
      timeSlotHeaders.push({
        element,
        text,
        extractedDate: dateMatch ? dateMatch[1] : null
      });
    }
  });
  
  console.log('📋 Found time slot headers:', timeSlotHeaders.length);
  timeSlotHeaders.forEach((header, index) => {
    console.log(`  ${index + 1}. "${header.text}" → Date: ${header.extractedDate}`);
  });
  
  trackJune3rdEvent('TIME_SLOT_HEADERS_CHECK', {
    clickElementIndex,
    headersFound: timeSlotHeaders.length,
    headers: timeSlotHeaders.map(h => ({
      text: h.text,
      extractedDate: h.extractedDate
    }))
  });
  
  // Check each header for displacement
  timeSlotHeaders.forEach((header, index) => {
    const isCorrect = header.extractedDate === '2025-06-03';
    const isDisplacement = header.extractedDate && header.extractedDate !== '2025-06-03';
    
    trackJune3rdEvent('TIME_SLOT_HEADER_ANALYSIS', {
      headerIndex: index,
      headerText: header.text,
      extractedDate: header.extractedDate,
      clickedDate: '2025-06-03',
      isCorrect,
      isDisplacement,
      clickElementIndex
    });
    
    if (isDisplacement) {
      console.error(`🚨 DISPLACEMENT CONFIRMED in header ${index + 1}!`, {
        expected: '2025-06-03',
        actual: header.extractedDate,
        headerText: header.text
      });
    } else if (isCorrect) {
      console.log(`✅ CORRECT CORRELATION in header ${index + 1}!`, {
        date: header.extractedDate,
        headerText: header.text
      });
    }
  });
}

/**
 * Generate June 3rd test report
 */
function generateJune3rdReport() {
  const testResults = window.june3rdDisplacementTest;
  const duration = Date.now() - testResults.startTime;
  
  console.log('\n📊 JUNE 3RD DISPLACEMENT TEST REPORT');
  console.log('='.repeat(60));
  console.log(`Test Duration: ${duration}ms`);
  console.log(`Total Events: ${testResults.testResults.length}`);
  console.log(`Displacement Events: ${testResults.displacementEvents.length}`);
  
  if (testResults.displacementEvents.length > 0) {
    console.error('\n🚨 DISPLACEMENT EVENTS DETECTED:');
    testResults.displacementEvents.forEach((event, index) => {
      console.error(`${index + 1}. ${event.eventType}:`, event.displacement);
    });
    
    console.error('\n❌ JUNE 3RD TEST FAILED - DISPLACEMENT STILL EXISTS');
    return false;
  } else {
    console.log('\n✅ NO DISPLACEMENT EVENTS DETECTED');
    console.log('✅ JUNE 3RD TEST PASSED - NO DISPLACEMENT FOUND');
    return true;
  }
}

/**
 * Export June 3rd test data
 */
function exportJune3rdTestData() {
  const data = {
    testResults: window.june3rdDisplacementTest,
    timestamp: new Date().toISOString(),
    testType: 'June 3rd Displacement Test',
    browserInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `june-3rd-displacement-test-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Main June 3rd test runner
 */
function runJune3rdDisplacementTest() {
  console.log('\n🚀 RUNNING JUNE 3RD DISPLACEMENT TEST');
  console.log('='.repeat(60));
  
  // Phase 1: Integration
  integrateWithExistingTracking();
  
  // Phase 2: Simulation (after 2 seconds)
  setTimeout(() => {
    simulateJune3rdClick();
  }, 2000);
  
  // Phase 3: Analysis (after 10 seconds)
  setTimeout(() => {
    const success = generateJune3rdReport();
    
    if (success) {
      console.log('\n🎉 JUNE 3RD TEST COMPLETED SUCCESSFULLY!');
      console.log('✅ No date displacement detected for June 3rd scenario');
    } else {
      console.error('\n⚠️ JUNE 3RD TEST FAILED!');
      console.error('❌ Date displacement still exists for June 3rd scenario');
      console.error('📋 Review displacement events above for details');
    }
  }, 10000);
}

// Make functions globally available
window.runJune3rdDisplacementTest = runJune3rdDisplacementTest;
window.generateJune3rdReport = generateJune3rdReport;
window.exportJune3rdTestData = exportJune3rdTestData;

// Auto-run test after 3 seconds
setTimeout(() => {
  console.log('\n🔄 AUTO-RUNNING JUNE 3RD DISPLACEMENT TEST...');
  runJune3rdDisplacementTest();
}, 3000);

console.log('✅ June 3rd Displacement Test Ready');
console.log('📋 Use window.runJune3rdDisplacementTest() to run test manually');
console.log('📊 Use window.generateJune3rdReport() for analysis');
console.log('🔄 Test will auto-run in 3 seconds...');
