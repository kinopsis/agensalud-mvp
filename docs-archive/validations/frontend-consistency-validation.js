/**
 * FRONTEND CONSISTENCY VALIDATION SCRIPT
 * 
 * Comprehensive testing script to validate that both appointment flows
 * now show identical availability slot counts after the critical fix.
 * 
 * This script should be run in the browser console AFTER implementing
 * the fix to ensure complete resolution of the inconsistency issue.
 * 
 * @author AgentSalud MVP Team - Critical Frontend Fix Validation
 * @version 1.0.0
 */

console.log('🚀 FRONTEND CONSISTENCY VALIDATION SCRIPT ACTIVATED');
console.log('='.repeat(70));

// Global validation state
window.validationResults = {
  newAppointmentFlow: null,
  rescheduleModal: null,
  apiCalls: [],
  startTime: Date.now(),
  testResults: []
};

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  // Test parameters - adjust these to match your test environment
  organizationId: 'your-org-id', // Replace with actual org ID
  serviceId: 'your-service-id',   // Replace with actual service ID
  doctorId: 'your-doctor-id',     // Replace with actual doctor ID
  
  // Test date range (next 7 days)
  startDate: new Date().toISOString().split('T')[0],
  endDate: (() => {
    const date = new Date();
    date.setDate(date.getDate() + 6);
    return date.toISOString().split('T')[0];
  })(),
  
  // Expected debug messages
  expectedMessages: [
    'NEW APPOINTMENT FLOW',
    'RESCHEDULE MODAL',
    'WEEKLY AVAILABILITY SELECTOR'
  ]
};

/**
 * Enhanced API call interceptor for validation
 */
function setupValidationInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    const timestamp = new Date().toISOString();
    
    // Track availability API calls
    if (url.includes('/api/appointments/availability')) {
      console.log(`🌐 VALIDATION: Availability API call detected`);
      console.log(`   URL: ${url}`);
      console.log(`   Time: ${timestamp}`);
      
      const startTime = performance.now();
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();
      
      // Clone and analyze response
      const responseClone = response.clone();
      const responseData = await responseClone.json();
      
      const callData = {
        url,
        timestamp,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        success: responseData.success,
        dataKeys: responseData.data ? Object.keys(responseData.data) : [],
        sampleSlotCounts: {}
      };
      
      // Extract slot counts for validation
      if (responseData.success && responseData.data) {
        const dates = Object.keys(responseData.data).slice(0, 3);
        dates.forEach(date => {
          const dayData = responseData.data[date];
          callData.sampleSlotCounts[date] = {
            available: dayData.availableSlots,
            total: dayData.totalSlots
          };
        });
      }
      
      window.validationResults.apiCalls.push(callData);
      
      console.log(`✅ VALIDATION: API response analyzed`);
      console.log(`   Success: ${responseData.success}`);
      console.log(`   Sample slots:`, callData.sampleSlotCounts);
      
      return response;
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('🔧 VALIDATION: API interceptor activated');
}

/**
 * Component activity monitor
 */
function monitorComponentActivity() {
  const originalConsoleLog = console.log;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Capture our debug messages
    if (TEST_CONFIG.expectedMessages.some(expected => message.includes(expected))) {
      window.validationResults.testResults.push({
        timestamp: new Date().toISOString(),
        message,
        type: 'component_activity'
      });
      
      console.log(`📋 VALIDATION: Component activity captured - ${message}`);
    }
    
    return originalConsoleLog.apply(this, args);
  };
}

/**
 * Test the new appointment flow
 */
async function testNewAppointmentFlow() {
  console.log('\n🧪 TESTING NEW APPOINTMENT FLOW');
  console.log('-'.repeat(50));
  
  // Instructions for manual testing
  console.log('📋 MANUAL STEPS:');
  console.log('1. Navigate to the new appointment booking page');
  console.log('2. Select a service and proceed to date selection');
  console.log('3. Observe the WeeklyAvailabilitySelector');
  console.log('4. Note the slot counts displayed for each day');
  console.log('5. Return here and run: recordNewAppointmentResults()');
  
  window.recordNewAppointmentResults = function() {
    const results = {
      timestamp: new Date().toISOString(),
      component: 'WeeklyAvailabilitySelector',
      flow: 'new_appointment',
      apiCalls: window.validationResults.apiCalls.filter(call => 
        call.timestamp > new Date(Date.now() - 60000).toISOString()
      )
    };
    
    window.validationResults.newAppointmentFlow = results;
    console.log('✅ New appointment flow results recorded');
    console.log('📊 Results:', results);
  };
}

/**
 * Test the reschedule modal
 */
async function testRescheduleModal() {
  console.log('\n🧪 TESTING RESCHEDULE MODAL');
  console.log('-'.repeat(50));
  
  console.log('📋 MANUAL STEPS:');
  console.log('1. Navigate to an existing appointment');
  console.log('2. Click "Reagendar" to open the reschedule modal');
  console.log('3. Verify it shows "Modo IA Activo" (no toggle button)');
  console.log('4. Observe the WeeklyAvailabilitySelector');
  console.log('5. Note the slot counts displayed for each day');
  console.log('6. Return here and run: recordRescheduleResults()');
  
  window.recordRescheduleResults = function() {
    const results = {
      timestamp: new Date().toISOString(),
      component: 'WeeklyAvailabilitySelector',
      flow: 'reschedule_modal',
      apiCalls: window.validationResults.apiCalls.filter(call => 
        call.timestamp > new Date(Date.now() - 60000).toISOString()
      )
    };
    
    window.validationResults.rescheduleModal = results;
    console.log('✅ Reschedule modal results recorded');
    console.log('📊 Results:', results);
  };
}

/**
 * Compare results and generate validation report
 */
function generateValidationReport() {
  console.log('\n📊 VALIDATION REPORT');
  console.log('='.repeat(70));
  
  const newFlow = window.validationResults.newAppointmentFlow;
  const rescheduleFlow = window.validationResults.rescheduleModal;
  
  if (!newFlow || !rescheduleFlow) {
    console.log('❌ INCOMPLETE: Both flows must be tested first');
    console.log('   New appointment flow:', newFlow ? '✅ Tested' : '❌ Not tested');
    console.log('   Reschedule modal:', rescheduleFlow ? '✅ Tested' : '❌ Not tested');
    return;
  }
  
  console.log('🔍 CONSISTENCY ANALYSIS:');
  
  // Compare API calls
  const newFlowCalls = newFlow.apiCalls;
  const rescheduleFlowCalls = rescheduleFlow.apiCalls;
  
  console.log(`\n📈 API CALLS COMPARISON:`);
  console.log(`   New appointment flow: ${newFlowCalls.length} calls`);
  console.log(`   Reschedule modal: ${rescheduleFlowCalls.length} calls`);
  
  // Compare slot counts for same dates
  let consistencyIssues = 0;
  const allDates = new Set();
  
  newFlowCalls.forEach(call => {
    Object.keys(call.sampleSlotCounts).forEach(date => allDates.add(date));
  });
  
  rescheduleFlowCalls.forEach(call => {
    Object.keys(call.sampleSlotCounts).forEach(date => allDates.add(date));
  });
  
  console.log(`\n🗓️  SLOT COUNT COMPARISON:`);
  
  Array.from(allDates).forEach(date => {
    const newFlowSlots = newFlowCalls
      .map(call => call.sampleSlotCounts[date])
      .filter(Boolean)[0];
    
    const rescheduleSlots = rescheduleFlowCalls
      .map(call => call.sampleSlotCounts[date])
      .filter(Boolean)[0];
    
    if (newFlowSlots && rescheduleSlots) {
      const isConsistent = 
        newFlowSlots.available === rescheduleSlots.available &&
        newFlowSlots.total === rescheduleSlots.total;
      
      console.log(`   ${date}:`);
      console.log(`     New flow: ${newFlowSlots.available}/${newFlowSlots.total} slots`);
      console.log(`     Reschedule: ${rescheduleSlots.available}/${rescheduleSlots.total} slots`);
      console.log(`     Status: ${isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
      
      if (!isConsistent) {
        consistencyIssues++;
      }
    }
  });
  
  // Final verdict
  console.log(`\n🎯 FINAL VALIDATION RESULT:`);
  if (consistencyIssues === 0) {
    console.log('✅ SUCCESS: Both flows show identical slot counts');
    console.log('🎉 The frontend consistency issue has been RESOLVED!');
  } else {
    console.log(`❌ FAILURE: Found ${consistencyIssues} consistency issues`);
    console.log('🔧 Additional debugging required');
  }
  
  // Component usage verification
  console.log(`\n🔧 COMPONENT USAGE VERIFICATION:`);
  const componentLogs = window.validationResults.testResults;
  const rescheduleModalLogs = componentLogs.filter(log => 
    log.message.includes('RESCHEDULE MODAL')
  );
  
  if (rescheduleModalLogs.length > 0) {
    console.log('✅ Reschedule modal is using WeeklyAvailabilitySelector');
  } else {
    console.log('❌ No reschedule modal component activity detected');
  }
  
  return {
    consistent: consistencyIssues === 0,
    issues: consistencyIssues,
    newFlowCalls: newFlowCalls.length,
    rescheduleFlowCalls: rescheduleFlowCalls.length,
    componentActivity: componentLogs.length
  };
}

/**
 * Initialize validation testing
 */
function initializeValidation() {
  console.log('🔧 Initializing frontend consistency validation...');
  
  setupValidationInterceptor();
  monitorComponentActivity();
  
  console.log('\n💡 VALIDATION FUNCTIONS AVAILABLE:');
  console.log('   testNewAppointmentFlow() - Test the new appointment booking');
  console.log('   testRescheduleModal() - Test the reschedule modal');
  console.log('   generateValidationReport() - Compare results and generate report');
  console.log('   recordNewAppointmentResults() - Record new appointment test results');
  console.log('   recordRescheduleResults() - Record reschedule modal test results');
  
  console.log('\n🎯 TESTING SEQUENCE:');
  console.log('1. Run testNewAppointmentFlow() and follow instructions');
  console.log('2. Run testRescheduleModal() and follow instructions');
  console.log('3. Run generateValidationReport() to see final results');
  
  console.log('\n🚀 Ready for validation testing!');
  console.log('='.repeat(70));
}

// Export functions to global scope
window.testNewAppointmentFlow = testNewAppointmentFlow;
window.testRescheduleModal = testRescheduleModal;
window.generateValidationReport = generateValidationReport;

// Auto-initialize
initializeValidation();
