/**
 * COMPREHENSIVE AVAILABILITY CONSISTENCY TEST SCRIPT
 * 
 * Tests the critical fix for availability inconsistencies between
 * new appointment flow and reschedule modal by ensuring both flows
 * use identical parameters and receive identical responses.
 * 
 * @author AgentSalud MVP Team - Critical System Investigation
 * @version 2.0.0 - Post-Fix Validation
 */

console.log('🧪 COMPREHENSIVE AVAILABILITY CONSISTENCY TEST');
console.log('='.repeat(80));

// Global test state
window.availabilityTest = {
  results: {},
  startTime: Date.now(),
  testSequence: [],
  apiCalls: []
};

/**
 * 1. ENHANCED NETWORK INTERCEPTOR WITH DETAILED COMPARISON
 */
function setupEnhancedNetworkInterceptor() {
  console.log('\n🌐 ENHANCED NETWORK INTERCEPTOR SETUP');
  console.log('-'.repeat(50));
  
  const originalFetch = window.fetch;
  const apiCalls = [];
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    const callId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    
    // Only intercept availability API calls
    if (url.includes('/api/appointments/availability')) {
      console.log(`🎯 AVAILABILITY API INTERCEPTED [${callId}]`);
      console.log(`   URL: ${url}`);
      console.log(`   Method: ${options?.method || 'GET'}`);
      console.log(`   Timestamp: ${timestamp}`);
      
      // Parse URL parameters for detailed analysis
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
        
        const callData = {
          id: callId,
          url,
          fullUrl: url,
          method: options?.method || 'GET',
          parameters: params,
          timestamp,
          duration: `${duration.toFixed(2)}ms`,
          status: response.status,
          statusText: response.statusText,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseData,
          success: response.ok,
          source: detectCallSource()
        };
        
        apiCalls.push(callData);
        
        console.log(`✅ AVAILABILITY RESPONSE [${callId}]`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Duration: ${duration.toFixed(2)}ms`);
        console.log(`   Source: ${callData.source}`);
        
        // Detailed availability analysis
        if (responseData?.success && responseData?.data) {
          const dates = Object.keys(responseData.data);
          console.log(`   Dates returned: ${dates.length}`);
          
          // Sample analysis for first 3 dates
          dates.slice(0, 3).forEach(date => {
            const dayData = responseData.data[date];
            console.log(`   ${date}: ${dayData.availableSlots}/${dayData.totalSlots} slots (${dayData.slots?.length || 0} slot details)`);
          });
          
          // Calculate total available slots across all dates
          const totalAvailableSlots = dates.reduce((sum, date) => {
            return sum + (responseData.data[date]?.availableSlots || 0);
          }, 0);
          
          console.log(`   Total available slots across all dates: ${totalAvailableSlots}`);
        }
        
        return response;
        
      } catch (error) {
        const errorData = {
          id: callId,
          url,
          method: options?.method || 'GET',
          parameters: params,
          timestamp,
          error: error.message,
          stack: error.stack,
          source: detectCallSource()
        };
        
        apiCalls.push(errorData);
        
        console.log(`❌ AVAILABILITY ERROR [${callId}]: ${error.message}`);
        throw error;
      }
    }
    
    // For non-availability calls, proceed normally
    return originalFetch.apply(this, args);
  };
  
  // Store API calls for analysis
  window.availabilityTest.apiCalls = apiCalls;
  
  console.log('✅ Enhanced network interceptor activated for availability API');
  
  return { interceptorActive: true };
}

/**
 * 2. DETECT CALL SOURCE (NEW APPOINTMENT VS RESCHEDULE)
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
 * 3. PARAMETER COMPARISON ANALYSIS
 */
function compareAPIParameters() {
  console.log('\n🔍 API PARAMETERS COMPARISON ANALYSIS');
  console.log('-'.repeat(50));
  
  const availabilityCalls = window.availabilityTest.apiCalls.filter(call => 
    call.url && call.url.includes('/api/appointments/availability')
  );
  
  if (availabilityCalls.length < 2) {
    console.log('⚠️  Need at least 2 availability API calls to compare');
    console.log('   Current calls:', availabilityCalls.length);
    return { needMoreCalls: true };
  }
  
  console.log(`📊 Analyzing ${availabilityCalls.length} availability API calls`);
  
  // Group calls by source
  const newAppointmentCalls = availabilityCalls.filter(call => call.source === 'NEW_APPOINTMENT_FLOW');
  const rescheduleCalls = availabilityCalls.filter(call => call.source === 'RESCHEDULE_MODAL');
  
  console.log(`   New Appointment Flow calls: ${newAppointmentCalls.length}`);
  console.log(`   Reschedule Modal calls: ${rescheduleCalls.length}`);
  
  if (newAppointmentCalls.length === 0 || rescheduleCalls.length === 0) {
    console.log('⚠️  Need calls from both flows to compare');
    return { needBothFlows: true };
  }
  
  // Compare most recent call from each flow
  const latestNewAppointment = newAppointmentCalls[newAppointmentCalls.length - 1];
  const latestReschedule = rescheduleCalls[rescheduleCalls.length - 1];
  
  console.log('\n🔍 COMPARING LATEST CALLS FROM EACH FLOW:');
  console.log(`   New Appointment: [${latestNewAppointment.id}] ${latestNewAppointment.timestamp}`);
  console.log(`   Reschedule: [${latestReschedule.id}] ${latestReschedule.timestamp}`);
  
  // Parameter comparison
  const newParams = latestNewAppointment.parameters;
  const rescheduleParams = latestReschedule.parameters;
  
  console.log('\n📋 PARAMETER COMPARISON:');
  const allParamKeys = new Set([...Object.keys(newParams), ...Object.keys(rescheduleParams)]);
  
  let parameterDifferences = 0;
  
  allParamKeys.forEach(key => {
    const newValue = newParams[key];
    const rescheduleValue = rescheduleParams[key];
    const isIdentical = newValue === rescheduleValue;
    
    console.log(`   ${key}:`);
    console.log(`     New Appointment: "${newValue}"`);
    console.log(`     Reschedule: "${rescheduleValue}"`);
    console.log(`     Identical: ${isIdentical ? '✅' : '❌'}`);
    
    if (!isIdentical) {
      parameterDifferences++;
    }
  });
  
  console.log(`\n📊 PARAMETER ANALYSIS SUMMARY:`);
  console.log(`   Total parameters compared: ${allParamKeys.size}`);
  console.log(`   Parameter differences: ${parameterDifferences}`);
  console.log(`   Parameters identical: ${parameterDifferences === 0 ? '✅' : '❌'}`);
  
  return {
    parameterDifferences,
    parametersIdentical: parameterDifferences === 0,
    newAppointmentParams: newParams,
    rescheduleParams: rescheduleParams
  };
}

/**
 * 4. RESPONSE DATA COMPARISON ANALYSIS
 */
function compareResponseData() {
  console.log('\n🔍 RESPONSE DATA COMPARISON ANALYSIS');
  console.log('-'.repeat(50));
  
  const availabilityCalls = window.availabilityTest.apiCalls.filter(call => 
    call.url && call.url.includes('/api/appointments/availability') && call.responseData?.success
  );
  
  if (availabilityCalls.length < 2) {
    console.log('⚠️  Need at least 2 successful availability API calls to compare responses');
    return { needMoreCalls: true };
  }
  
  // Group calls by source
  const newAppointmentCalls = availabilityCalls.filter(call => call.source === 'NEW_APPOINTMENT_FLOW');
  const rescheduleCalls = availabilityCalls.filter(call => call.source === 'RESCHEDULE_MODAL');
  
  if (newAppointmentCalls.length === 0 || rescheduleCalls.length === 0) {
    console.log('⚠️  Need successful calls from both flows to compare responses');
    return { needBothFlows: true };
  }
  
  // Compare most recent successful call from each flow
  const latestNewAppointment = newAppointmentCalls[newAppointmentCalls.length - 1];
  const latestReschedule = rescheduleCalls[rescheduleCalls.length - 1];
  
  console.log('\n🔍 COMPARING RESPONSE DATA:');
  console.log(`   New Appointment: [${latestNewAppointment.id}]`);
  console.log(`   Reschedule: [${latestReschedule.id}]`);
  
  const newData = latestNewAppointment.responseData.data;
  const rescheduleData = latestReschedule.responseData.data;
  
  if (!newData || !rescheduleData) {
    console.log('❌ Missing response data in one or both calls');
    return { missingData: true };
  }
  
  // Compare dates returned
  const newDates = Object.keys(newData).sort();
  const rescheduleDates = Object.keys(rescheduleData).sort();
  
  console.log(`   New Appointment dates: ${newDates.length}`);
  console.log(`   Reschedule dates: ${rescheduleDates.length}`);
  console.log(`   Date count identical: ${newDates.length === rescheduleDates.length ? '✅' : '❌'}`);
  
  // Compare slot counts for overlapping dates
  const commonDates = newDates.filter(date => rescheduleDates.includes(date));
  console.log(`   Common dates: ${commonDates.length}`);
  
  let slotCountDifferences = 0;
  let totalSlotsComparison = { new: 0, reschedule: 0 };
  
  console.log('\n📊 SLOT COUNT COMPARISON (First 5 common dates):');
  commonDates.slice(0, 5).forEach(date => {
    const newSlots = newData[date]?.availableSlots || 0;
    const rescheduleSlots = rescheduleData[date]?.availableSlots || 0;
    const isIdentical = newSlots === rescheduleSlots;
    
    totalSlotsComparison.new += newSlots;
    totalSlotsComparison.reschedule += rescheduleSlots;
    
    console.log(`   ${date}:`);
    console.log(`     New Appointment: ${newSlots} slots`);
    console.log(`     Reschedule: ${rescheduleSlots} slots`);
    console.log(`     Identical: ${isIdentical ? '✅' : '❌'}`);
    
    if (!isIdentical) {
      slotCountDifferences++;
    }
  });
  
  console.log(`\n📊 RESPONSE ANALYSIS SUMMARY:`);
  console.log(`   Common dates analyzed: ${Math.min(commonDates.length, 5)}`);
  console.log(`   Slot count differences: ${slotCountDifferences}`);
  console.log(`   Slot counts identical: ${slotCountDifferences === 0 ? '✅' : '❌'}`);
  console.log(`   Total slots - New: ${totalSlotsComparison.new}, Reschedule: ${totalSlotsComparison.reschedule}`);
  
  return {
    slotCountDifferences,
    slotCountsIdentical: slotCountDifferences === 0,
    totalSlotsComparison,
    commonDatesAnalyzed: Math.min(commonDates.length, 5)
  };
}

/**
 * 5. COMPREHENSIVE TEST REPORT
 */
function generateComprehensiveTestReport() {
  console.log('\n📊 COMPREHENSIVE AVAILABILITY CONSISTENCY TEST REPORT');
  console.log('='.repeat(80));
  
  const apiCalls = window.availabilityTest.apiCalls;
  const availabilityCalls = apiCalls.filter(call => 
    call.url && call.url.includes('/api/appointments/availability')
  );
  
  console.log('🔍 TEST EXECUTION SUMMARY:');
  console.log(`   Test start time: ${new Date(window.availabilityTest.startTime).toISOString()}`);
  console.log(`   Test duration: ${((Date.now() - window.availabilityTest.startTime) / 1000).toFixed(2)}s`);
  console.log(`   Total API calls captured: ${apiCalls.length}`);
  console.log(`   Availability API calls: ${availabilityCalls.length}`);
  
  // Analyze call sources
  const sourceBreakdown = availabilityCalls.reduce((acc, call) => {
    acc[call.source] = (acc[call.source] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📊 CALL SOURCE BREAKDOWN:');
  Object.entries(sourceBreakdown).forEach(([source, count]) => {
    console.log(`   ${source}: ${count} calls`);
  });
  
  // Run parameter comparison
  const parameterAnalysis = compareAPIParameters();
  
  // Run response comparison
  const responseAnalysis = compareResponseData();
  
  // Overall consistency assessment
  console.log('\n🎯 CONSISTENCY ASSESSMENT:');
  
  const hasParameterConsistency = parameterAnalysis.parametersIdentical;
  const hasResponseConsistency = responseAnalysis.slotCountsIdentical;
  const overallConsistency = hasParameterConsistency && hasResponseConsistency;
  
  console.log(`   Parameter consistency: ${hasParameterConsistency ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Response consistency: ${hasResponseConsistency ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Overall consistency: ${overallConsistency ? '✅ PASS' : '❌ FAIL'}`);
  
  if (overallConsistency) {
    console.log('\n🎉 SUCCESS: Availability consistency issue has been RESOLVED!');
    console.log('   Both flows are now using identical parameters and receiving identical responses.');
  } else {
    console.log('\n⚠️  ISSUE PERSISTS: Availability inconsistency still detected.');
    console.log('   Further investigation required.');
    
    if (!hasParameterConsistency) {
      console.log('   - Parameter differences detected');
    }
    if (!hasResponseConsistency) {
      console.log('   - Response differences detected');
    }
  }
  
  console.log('\n🔧 NEXT STEPS:');
  if (overallConsistency) {
    console.log('1. ✅ Test both flows in the UI to confirm visual consistency');
    console.log('2. ✅ Clear browser cache and test again');
    console.log('3. ✅ Test with different user roles and parameters');
    console.log('4. ✅ Mark the critical issue as RESOLVED');
  } else {
    console.log('1. 🔍 Investigate remaining parameter differences');
    console.log('2. 🔍 Check for additional API endpoints being called');
    console.log('3. 🔍 Verify component prop passing is correct');
    console.log('4. 🔍 Check for caching or state management issues');
  }
  
  console.log('\n='.repeat(80));
  
  return {
    overallConsistency,
    hasParameterConsistency,
    hasResponseConsistency,
    availabilityCallsCount: availabilityCalls.length,
    sourceBreakdown,
    timestamp: new Date().toISOString()
  };
}

/**
 * 6. MANUAL TESTING GUIDE
 */
function displayManualTestingGuide() {
  console.log('\n📋 MANUAL TESTING GUIDE');
  console.log('-'.repeat(50));
  
  console.log('🎯 STEP-BY-STEP TESTING SEQUENCE:');
  console.log('');
  console.log('1. SETUP:');
  console.log('   - Clear browser cache (Ctrl+Shift+Delete)');
  console.log('   - Open browser DevTools Console');
  console.log('   - Run: setupEnhancedNetworkInterceptor()');
  console.log('');
  console.log('2. TEST NEW APPOINTMENT FLOW:');
  console.log('   - Navigate to new appointment booking');
  console.log('   - Select service, flow type, doctor, location');
  console.log('   - Reach the date selection step');
  console.log('   - Observe slot counts in WeeklyAvailabilitySelector');
  console.log('   - Note the exact numbers for comparison');
  console.log('');
  console.log('3. TEST RESCHEDULE MODAL:');
  console.log('   - Navigate to existing appointments');
  console.log('   - Click "Reagendar" on any appointment');
  console.log('   - Observe slot counts in WeeklyAvailabilitySelector');
  console.log('   - Compare with numbers from step 2');
  console.log('');
  console.log('4. ANALYZE RESULTS:');
  console.log('   - Run: compareAPIParameters()');
  console.log('   - Run: compareResponseData()');
  console.log('   - Run: generateComprehensiveTestReport()');
  console.log('');
  console.log('5. EXPECTED OUTCOME:');
  console.log('   - ✅ Identical slot counts between both flows');
  console.log('   - ✅ Identical API parameters');
  console.log('   - ✅ Identical API responses');
  console.log('   - ✅ Overall consistency: PASS');
}

// Initialize testing environment
function initializeAvailabilityConsistencyTest() {
  console.log('🚀 Initializing Availability Consistency Test...');
  
  setupEnhancedNetworkInterceptor();
  
  console.log('\n💡 AVAILABLE TEST FUNCTIONS:');
  console.log('   setupEnhancedNetworkInterceptor() - Setup API call monitoring');
  console.log('   compareAPIParameters() - Compare API parameters between flows');
  console.log('   compareResponseData() - Compare API responses between flows');
  console.log('   generateComprehensiveTestReport() - Generate full test report');
  console.log('   displayManualTestingGuide() - Show step-by-step testing guide');
  
  displayManualTestingGuide();
  
  console.log('\n🔍 Test environment ready!');
  console.log('='.repeat(80));
}

// Export functions
window.setupEnhancedNetworkInterceptor = setupEnhancedNetworkInterceptor;
window.compareAPIParameters = compareAPIParameters;
window.compareResponseData = compareResponseData;
window.generateComprehensiveTestReport = generateComprehensiveTestReport;
window.displayManualTestingGuide = displayManualTestingGuide;

// Auto-initialize
initializeAvailabilityConsistencyTest();
