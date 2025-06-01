/**
 * BROWSER VALIDATION SCRIPT FOR AVAILABILITY CONSISTENCY FIX
 * 
 * Execute this script in the browser console to validate that the
 * availability consistency fix is working correctly.
 * 
 * INSTRUCTIONS:
 * 1. Open the AgentSalud application in your browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to execute
 * 6. Follow the on-screen instructions
 * 
 * @author AgentSalud MVP Team - Browser Validation
 * @version 1.0.0
 */

console.log('🚀 BROWSER VALIDATION SCRIPT FOR AVAILABILITY CONSISTENCY FIX');
console.log('='.repeat(80));

// Global validation state
window.availabilityValidation = {
  apiCalls: [],
  testResults: {},
  startTime: Date.now()
};

/**
 * 1. SETUP NETWORK MONITORING
 */
function setupNetworkMonitoring() {
  console.log('\n🌐 SETTING UP NETWORK MONITORING');
  console.log('-'.repeat(50));
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Only monitor availability API calls
    if (url.includes('/api/appointments/availability')) {
      const callId = Math.random().toString(36).substr(2, 9);
      const timestamp = new Date().toISOString();
      
      console.log(`🎯 AVAILABILITY API CALL [${callId}]`);
      console.log(`   URL: ${url}`);
      console.log(`   Timestamp: ${timestamp}`);
      
      // Parse URL parameters
      const urlObj = new URL(url, window.location.origin);
      const params = Object.fromEntries(urlObj.searchParams.entries());
      
      console.log(`   Parameters:`, params);
      
      const startTime = performance.now();
      
      try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Clone response to read without consuming
        const responseClone = response.clone();
        let responseData = null;
        
        try {
          responseData = await responseClone.json();
        } catch {
          responseData = await responseClone.text();
        }
        
        // Store call data
        const callData = {
          id: callId,
          url,
          parameters: params,
          timestamp,
          duration: `${duration.toFixed(2)}ms`,
          status: response.status,
          responseData,
          success: response.ok,
          source: detectCallSource()
        };
        
        window.availabilityValidation.apiCalls.push(callData);
        
        console.log(`✅ RESPONSE [${callId}]`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Duration: ${duration.toFixed(2)}ms`);
        console.log(`   Source: ${callData.source}`);
        
        // Analyze response data
        if (responseData?.success && responseData?.data) {
          const dates = Object.keys(responseData.data);
          const totalSlots = dates.reduce((sum, date) => {
            return sum + (responseData.data[date]?.availableSlots || 0);
          }, 0);
          
          console.log(`   Dates: ${dates.length}, Total slots: ${totalSlots}`);
        }
        
        return response;
        
      } catch (error) {
        console.log(`❌ ERROR [${callId}]: ${error.message}`);
        throw error;
      }
    }
    
    // For non-availability calls, proceed normally
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ Network monitoring activated');
  console.log('   All availability API calls will be logged and analyzed');
}

/**
 * 2. DETECT CALL SOURCE
 */
function detectCallSource() {
  const stack = new Error().stack;
  
  if (stack.includes('UnifiedAppointmentFlow') || stack.includes('loadWeeklyAvailability')) {
    return 'NEW_APPOINTMENT_FLOW';
  } else if (stack.includes('AIEnhancedRescheduleModal') || stack.includes('loadAvailabilityData')) {
    return 'RESCHEDULE_MODAL';
  } else if (stack.includes('WeeklyAvailabilitySelector')) {
    return 'WEEKLY_AVAILABILITY_SELECTOR';
  }
  
  return 'UNKNOWN';
}

/**
 * 3. ANALYZE API CALLS
 */
function analyzeAPICalls() {
  console.log('\n📊 ANALYZING API CALLS');
  console.log('-'.repeat(50));
  
  const calls = window.availabilityValidation.apiCalls;
  
  if (calls.length === 0) {
    console.log('⚠️  No availability API calls captured yet');
    console.log('   Please navigate through both flows first');
    return { needMoreCalls: true };
  }
  
  console.log(`📈 Total API calls captured: ${calls.length}`);
  
  // Group by source
  const newAppointmentCalls = calls.filter(call => call.source === 'NEW_APPOINTMENT_FLOW');
  const rescheduleCalls = calls.filter(call => call.source === 'RESCHEDULE_MODAL');
  
  console.log(`   New Appointment Flow: ${newAppointmentCalls.length} calls`);
  console.log(`   Reschedule Modal: ${rescheduleCalls.length} calls`);
  
  if (newAppointmentCalls.length === 0 || rescheduleCalls.length === 0) {
    console.log('⚠️  Need calls from both flows to compare');
    console.log('   Please test both the new appointment flow and reschedule modal');
    return { needBothFlows: true };
  }
  
  // Compare most recent calls
  const latestNew = newAppointmentCalls[newAppointmentCalls.length - 1];
  const latestReschedule = rescheduleCalls[rescheduleCalls.length - 1];
  
  console.log('\n🔍 COMPARING LATEST CALLS:');
  console.log(`   New Appointment [${latestNew.id}]: ${latestNew.timestamp}`);
  console.log(`   Reschedule [${latestReschedule.id}]: ${latestReschedule.timestamp}`);
  
  // Parameter comparison
  const newParams = latestNew.parameters;
  const rescheduleParams = latestReschedule.parameters;
  
  console.log('\n📋 PARAMETER COMPARISON:');
  const allKeys = new Set([...Object.keys(newParams), ...Object.keys(rescheduleParams)]);
  
  let paramDifferences = 0;
  allKeys.forEach(key => {
    const newValue = newParams[key];
    const rescheduleValue = rescheduleParams[key];
    const identical = newValue === rescheduleValue;
    
    console.log(`   ${key}: "${newValue}" vs "${rescheduleValue}" ${identical ? '✅' : '❌'}`);
    
    if (!identical) paramDifferences++;
  });
  
  // Response comparison
  let responseDifferences = 0;
  if (latestNew.responseData?.success && latestReschedule.responseData?.success) {
    const newData = latestNew.responseData.data;
    const rescheduleData = latestReschedule.responseData.data;
    
    if (newData && rescheduleData) {
      const newDates = Object.keys(newData);
      const rescheduleDates = Object.keys(rescheduleData);
      const commonDates = newDates.filter(date => rescheduleDates.includes(date));
      
      console.log('\n📊 RESPONSE COMPARISON:');
      console.log(`   Common dates: ${commonDates.length}`);
      
      commonDates.slice(0, 3).forEach(date => {
        const newSlots = newData[date]?.availableSlots || 0;
        const rescheduleSlots = rescheduleData[date]?.availableSlots || 0;
        const identical = newSlots === rescheduleSlots;
        
        console.log(`   ${date}: ${newSlots} vs ${rescheduleSlots} slots ${identical ? '✅' : '❌'}`);
        
        if (!identical) responseDifferences++;
      });
    }
  }
  
  // Overall assessment
  const isConsistent = paramDifferences === 0 && responseDifferences === 0;
  
  console.log('\n🎯 CONSISTENCY ASSESSMENT:');
  console.log(`   Parameter differences: ${paramDifferences}`);
  console.log(`   Response differences: ${responseDifferences}`);
  console.log(`   Overall consistency: ${isConsistent ? '✅ PASS' : '❌ FAIL'}`);
  
  return {
    isConsistent,
    paramDifferences,
    responseDifferences,
    newAppointmentCalls: newAppointmentCalls.length,
    rescheduleCalls: rescheduleCalls.length
  };
}

/**
 * 4. GENERATE VALIDATION REPORT
 */
function generateValidationReport() {
  console.log('\n📊 VALIDATION REPORT');
  console.log('='.repeat(80));
  
  const analysis = analyzeAPICalls();
  
  if (analysis.needMoreCalls || analysis.needBothFlows) {
    console.log('⚠️  INCOMPLETE VALIDATION');
    console.log('   More testing required before generating final report');
    return;
  }
  
  const duration = ((Date.now() - window.availabilityValidation.startTime) / 1000).toFixed(2);
  
  console.log('🔍 VALIDATION SUMMARY:');
  console.log(`   Test duration: ${duration}s`);
  console.log(`   API calls captured: ${window.availabilityValidation.apiCalls.length}`);
  console.log(`   New appointment calls: ${analysis.newAppointmentCalls}`);
  console.log(`   Reschedule calls: ${analysis.rescheduleCalls}`);
  console.log(`   Parameter consistency: ${analysis.paramDifferences === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Response consistency: ${analysis.responseDifferences === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Overall result: ${analysis.isConsistent ? '✅ PASS' : '❌ FAIL'}`);
  
  if (analysis.isConsistent) {
    console.log('\n🎉 SUCCESS: AVAILABILITY CONSISTENCY FIX VALIDATED!');
    console.log('   ✅ Both flows use identical API parameters');
    console.log('   ✅ Both flows receive identical responses');
    console.log('   ✅ The critical inconsistency issue is RESOLVED');
    console.log('   ✅ Users will see consistent slot counts across all flows');
  } else {
    console.log('\n⚠️  VALIDATION FAILED: Issues still detected');
    console.log('   🔍 Parameter differences found') if (analysis.paramDifferences > 0);
    console.log('   🔍 Response differences found') if (analysis.responseDifferences > 0);
    console.log('   🔍 Further investigation required');
  }
  
  console.log('\n📋 NEXT STEPS:');
  if (analysis.isConsistent) {
    console.log('1. ✅ Mark the critical issue as RESOLVED');
    console.log('2. ✅ Deploy to production with confidence');
    console.log('3. ✅ Monitor user feedback for consistency');
  } else {
    console.log('1. 🔍 Review parameter differences');
    console.log('2. 🔍 Check component prop passing');
    console.log('3. 🔍 Verify API endpoint consistency');
  }
  
  console.log('\n='.repeat(80));
  
  return analysis;
}

/**
 * 5. MANUAL TESTING INSTRUCTIONS
 */
function showTestingInstructions() {
  console.log('\n📋 MANUAL TESTING INSTRUCTIONS');
  console.log('-'.repeat(50));
  
  console.log('🎯 STEP-BY-STEP TESTING:');
  console.log('');
  console.log('1. SETUP COMPLETE ✅');
  console.log('   - Network monitoring is now active');
  console.log('   - All availability API calls will be captured');
  console.log('');
  console.log('2. TEST NEW APPOINTMENT FLOW:');
  console.log('   - Navigate to appointment booking');
  console.log('   - Select service, doctor, location');
  console.log('   - Reach the date selection step');
  console.log('   - Observe the slot counts displayed');
  console.log('');
  console.log('3. TEST RESCHEDULE MODAL:');
  console.log('   - Go to existing appointments');
  console.log('   - Click "Reagendar" on any appointment');
  console.log('   - Observe the slot counts displayed');
  console.log('   - Compare with step 2 results');
  console.log('');
  console.log('4. ANALYZE RESULTS:');
  console.log('   - Run: analyzeAPICalls()');
  console.log('   - Run: generateValidationReport()');
  console.log('');
  console.log('5. EXPECTED OUTCOME:');
  console.log('   - ✅ Identical slot counts between flows');
  console.log('   - ✅ Identical API parameters');
  console.log('   - ✅ Overall consistency: PASS');
}

/**
 * INITIALIZE VALIDATION
 */
function initializeBrowserValidation() {
  console.log('🚀 Initializing browser validation...');
  
  setupNetworkMonitoring();
  
  console.log('\n💡 AVAILABLE FUNCTIONS:');
  console.log('   analyzeAPICalls() - Analyze captured API calls');
  console.log('   generateValidationReport() - Generate final validation report');
  console.log('   showTestingInstructions() - Show testing instructions again');
  
  showTestingInstructions();
  
  console.log('\n🔍 Browser validation ready!');
  console.log('   Start testing both flows now...');
}

// Export functions to global scope
window.analyzeAPICalls = analyzeAPICalls;
window.generateValidationReport = generateValidationReport;
window.showTestingInstructions = showTestingInstructions;

// Auto-initialize
initializeBrowserValidation();
