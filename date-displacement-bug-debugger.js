/**
 * CRITICAL DATE DISPLACEMENT BUG DEBUGGER
 * 
 * Execute this script in the browser console to capture and analyze
 * the exact behavior of the date displacement bug.
 * 
 * INSTRUCTIONS:
 * 1. Open AgentSalud application in browser
 * 2. Navigate to appointment booking or reschedule modal
 * 3. Open Developer Tools (F12) → Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to execute
 * 6. Follow the on-screen instructions to test blocked date clicks
 * 
 * @author AgentSalud MVP Team - Critical Bug Investigation
 * @version 1.0.0
 */

console.log('🚨 CRITICAL DATE DISPLACEMENT BUG DEBUGGER');
console.log('='.repeat(80));

// Global debugging state
window.dateDisplacementDebugger = {
  dateClicks: [],
  timeSlotLoads: [],
  validationResults: [],
  startTime: Date.now(),
  isActive: false
};

/**
 * 1. SETUP COMPREHENSIVE MONITORING
 */
function setupDateDisplacementMonitoring() {
  console.log('\n🔍 SETTING UP DATE DISPLACEMENT MONITORING');
  console.log('-'.repeat(50));
  
  // Monitor all date selection events
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'click' && this.classList && this.classList.contains('availability-indicator')) {
      const originalListener = listener;
      const enhancedListener = function(event) {
        const dateElement = event.target.closest('[data-date]');
        const dateString = dateElement?.getAttribute('data-date') || 'unknown';
        
        console.log('🎯 DATE CLICK INTERCEPTED');
        console.log(`   Date: ${dateString}`);
        console.log(`   Element:`, event.target);
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        
        // Store click data
        window.dateDisplacementDebugger.dateClicks.push({
          date: dateString,
          timestamp: new Date().toISOString(),
          element: event.target.outerHTML,
          isBlocked: event.target.classList.contains('blocked') || event.target.closest('.blocked'),
          clickId: Math.random().toString(36).substr(2, 9)
        });
        
        // Call original listener
        const result = originalListener.call(this, event);
        
        console.log('   Click processed, monitoring for side effects...');
        
        // Monitor for time slot loading after click
        setTimeout(() => {
          monitorTimeSlotLoading(dateString);
        }, 100);
        
        return result;
      };
      
      return originalAddEventListener.call(this, type, enhancedListener, options);
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  console.log('✅ Date click monitoring activated');
}

/**
 * 2. MONITOR TIME SLOT LOADING
 */
function monitorTimeSlotLoading(triggerDate) {
  console.log('\n⏰ MONITORING TIME SLOT LOADING');
  console.log(`   Triggered by date: ${triggerDate}`);
  
  // Look for time slot containers
  const timeSlotContainers = document.querySelectorAll('[class*="time-slot"], [class*="TimeSlot"], .enhanced-time-slot-selector');
  
  timeSlotContainers.forEach(container => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Time slots were added
          const addedSlots = Array.from(mutation.addedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE)
            .filter(node => node.classList && (
              node.classList.contains('time-slot') || 
              node.querySelector('.time-slot') ||
              node.textContent.match(/\d{2}:\d{2}/)
            ));
          
          if (addedSlots.length > 0) {
            console.log('🕐 TIME SLOTS LOADED');
            console.log(`   Trigger date: ${triggerDate}`);
            console.log(`   Slots count: ${addedSlots.length}`);
            
            // Try to extract the actual date being displayed
            const dateHeaders = document.querySelectorAll('h3, h4, .title, [class*="title"]');
            let displayedDate = 'unknown';
            
            dateHeaders.forEach(header => {
              const text = header.textContent;
              const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                displayedDate = dateMatch[0];
              }
            });
            
            console.log(`   Displayed date: ${displayedDate}`);
            console.log(`   Date displacement: ${triggerDate !== displayedDate ? '❌ YES' : '✅ NO'}`);
            
            // Store time slot load data
            window.dateDisplacementDebugger.timeSlotLoads.push({
              triggerDate,
              displayedDate,
              slotsCount: addedSlots.length,
              timestamp: new Date().toISOString(),
              isDisplaced: triggerDate !== displayedDate,
              loadId: Math.random().toString(36).substr(2, 9)
            });
            
            // Disconnect observer after capturing
            observer.disconnect();
          }
        }
      });
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    
    // Auto-disconnect after 5 seconds
    setTimeout(() => observer.disconnect(), 5000);
  });
}

/**
 * 3. MONITOR VALIDATION ALERTS
 */
function monitorValidationAlerts() {
  console.log('\n🚨 MONITORING VALIDATION ALERTS');
  console.log('-'.repeat(50));
  
  // Override alert function to capture validation messages
  const originalAlert = window.alert;
  
  window.alert = function(message) {
    console.log('🚨 VALIDATION ALERT CAPTURED');
    console.log(`   Message: "${message}"`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
    // Store validation result
    window.dateDisplacementDebugger.validationResults.push({
      message,
      timestamp: new Date().toISOString(),
      alertId: Math.random().toString(36).substr(2, 9)
    });
    
    // Call original alert
    return originalAlert.call(this, message);
  };
  
  console.log('✅ Validation alert monitoring activated');
}

/**
 * 4. ANALYZE CAPTURED DATA
 */
function analyzeDisplacementBehavior() {
  console.log('\n📊 ANALYZING DATE DISPLACEMENT BEHAVIOR');
  console.log('='.repeat(80));
  
  const { dateClicks, timeSlotLoads, validationResults } = window.dateDisplacementDebugger;
  
  console.log(`📈 CAPTURED DATA SUMMARY:`);
  console.log(`   Date clicks: ${dateClicks.length}`);
  console.log(`   Time slot loads: ${timeSlotLoads.length}`);
  console.log(`   Validation alerts: ${validationResults.length}`);
  
  if (dateClicks.length === 0) {
    console.log('⚠️  No date clicks captured yet. Please click on dates to test.');
    return { needMoreData: true };
  }
  
  // Analyze each click sequence
  console.log('\n🔍 DETAILED CLICK ANALYSIS:');
  
  let displacementIssues = 0;
  let blockedClickIssues = 0;
  
  dateClicks.forEach((click, index) => {
    console.log(`\n📅 CLICK ${index + 1} [${click.clickId}]:`);
    console.log(`   Date clicked: ${click.date}`);
    console.log(`   Was blocked: ${click.isBlocked ? '🚫 YES' : '✅ NO'}`);
    console.log(`   Timestamp: ${click.timestamp}`);
    
    // Find corresponding time slot loads
    const relatedLoads = timeSlotLoads.filter(load => 
      Math.abs(new Date(load.timestamp) - new Date(click.timestamp)) < 5000 // Within 5 seconds
    );
    
    // Find corresponding validation alerts
    const relatedAlerts = validationResults.filter(alert =>
      Math.abs(new Date(alert.timestamp) - new Date(click.timestamp)) < 2000 // Within 2 seconds
    );
    
    console.log(`   Related alerts: ${relatedAlerts.length}`);
    relatedAlerts.forEach(alert => {
      console.log(`     - "${alert.message}"`);
    });
    
    console.log(`   Related time slot loads: ${relatedLoads.length}`);
    relatedLoads.forEach(load => {
      console.log(`     - Trigger: ${load.triggerDate}, Displayed: ${load.displayedDate}`);
      console.log(`     - Displaced: ${load.isDisplaced ? '❌ YES' : '✅ NO'}`);
      console.log(`     - Slots: ${load.slotsCount}`);
      
      if (load.isDisplaced) {
        displacementIssues++;
      }
    });
    
    // Check for blocked date issues
    if (click.isBlocked && relatedLoads.length > 0) {
      console.log(`   🚨 CRITICAL ISSUE: Blocked date triggered time slot loading!`);
      blockedClickIssues++;
    }
  });
  
  // Overall assessment
  console.log('\n🎯 BUG ASSESSMENT:');
  console.log(`   Date displacement issues: ${displacementIssues}`);
  console.log(`   Blocked date click issues: ${blockedClickIssues}`);
  console.log(`   Total critical issues: ${displacementIssues + blockedClickIssues}`);
  
  const hasCriticalBug = displacementIssues > 0 || blockedClickIssues > 0;
  
  console.log(`   Overall status: ${hasCriticalBug ? '❌ CRITICAL BUG CONFIRMED' : '✅ NO ISSUES DETECTED'}`);
  
  return {
    hasCriticalBug,
    displacementIssues,
    blockedClickIssues,
    totalClicks: dateClicks.length,
    totalLoads: timeSlotLoads.length
  };
}

/**
 * 5. GENERATE BUG REPORT
 */
function generateBugReport() {
  console.log('\n📋 GENERATING COMPREHENSIVE BUG REPORT');
  console.log('='.repeat(80));
  
  const analysis = analyzeDisplacementBehavior();
  
  if (analysis.needMoreData) {
    console.log('⚠️  INSUFFICIENT DATA FOR REPORT');
    console.log('   Please test the following scenarios:');
    console.log('   1. Click on today\'s date (should be blocked for patients)');
    console.log('   2. Click on a past date (should be blocked for everyone)');
    console.log('   3. Click on a future date with no availability');
    console.log('   4. Click on a valid future date');
    return;
  }
  
  const duration = ((Date.now() - window.dateDisplacementDebugger.startTime) / 1000).toFixed(2);
  
  console.log('🔍 BUG INVESTIGATION REPORT:');
  console.log(`   Test duration: ${duration}s`);
  console.log(`   Browser: ${navigator.userAgent}`);
  console.log(`   Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`   Current time: ${new Date().toISOString()}`);
  
  console.log('\n📊 FINDINGS:');
  console.log(`   Critical bug present: ${analysis.hasCriticalBug ? '❌ YES' : '✅ NO'}`);
  console.log(`   Date displacement issues: ${analysis.displacementIssues}`);
  console.log(`   Blocked date click issues: ${analysis.blockedClickIssues}`);
  
  if (analysis.hasCriticalBug) {
    console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
    
    if (analysis.displacementIssues > 0) {
      console.log('   ❌ Date displacement: Time slots shown for wrong dates');
    }
    
    if (analysis.blockedClickIssues > 0) {
      console.log('   ❌ Blocked date bypass: Blocked dates trigger time slot loading');
    }
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('   1. IMMEDIATE: Fix blocked date click handling');
    console.log('   2. URGENT: Implement proper date validation before time slot loading');
    console.log('   3. CRITICAL: Add comprehensive date handling tests');
    console.log('   4. IMPORTANT: Standardize timezone handling across components');
  } else {
    console.log('\n✅ NO CRITICAL ISSUES DETECTED');
    console.log('   The date displacement bug may have been resolved');
    console.log('   Continue monitoring in production environment');
  }
  
  console.log('\n='.repeat(80));
  
  return analysis;
}

/**
 * 6. TESTING INSTRUCTIONS
 */
function showTestingInstructions() {
  console.log('\n📋 TESTING INSTRUCTIONS');
  console.log('-'.repeat(50));
  
  console.log('🎯 CRITICAL TEST SCENARIOS:');
  console.log('');
  console.log('1. TEST BLOCKED DATE (TODAY):');
  console.log('   - Click on today\'s date in the calendar');
  console.log('   - Expected: Alert message, NO time slots');
  console.log('   - Bug: Alert + time slots for tomorrow');
  console.log('');
  console.log('2. TEST BLOCKED DATE (PAST):');
  console.log('   - Click on any past date');
  console.log('   - Expected: Alert message, NO time slots');
  console.log('   - Bug: Alert + time slots for next day');
  console.log('');
  console.log('3. TEST VALID DATE:');
  console.log('   - Click on a future date with availability');
  console.log('   - Expected: Time slots for selected date');
  console.log('   - Should work correctly');
  console.log('');
  console.log('4. ANALYZE RESULTS:');
  console.log('   - Run: analyzeDisplacementBehavior()');
  console.log('   - Run: generateBugReport()');
  console.log('');
  console.log('🔍 All interactions are being monitored automatically!');
}

/**
 * INITIALIZE DEBUGGER
 */
function initializeDateDisplacementDebugger() {
  console.log('🚀 Initializing date displacement debugger...');
  
  setupDateDisplacementMonitoring();
  monitorValidationAlerts();
  
  window.dateDisplacementDebugger.isActive = true;
  
  console.log('\n💡 AVAILABLE FUNCTIONS:');
  console.log('   analyzeDisplacementBehavior() - Analyze captured data');
  console.log('   generateBugReport() - Generate comprehensive bug report');
  console.log('   showTestingInstructions() - Show testing instructions again');
  
  showTestingInstructions();
  
  console.log('\n🔍 Date displacement debugger ready!');
  console.log('   Start testing blocked date clicks now...');
}

// Export functions to global scope
window.analyzeDisplacementBehavior = analyzeDisplacementBehavior;
window.generateBugReport = generateBugReport;
window.showTestingInstructions = showTestingInstructions;

// Auto-initialize
initializeDateDisplacementDebugger();
