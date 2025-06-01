/**
 * COMPREHENSIVE CACHE INVESTIGATION SCRIPT
 * 
 * Deep analysis of all caching layers that could cause availability inconsistencies
 * between new appointment flow and reschedule modal.
 * 
 * @author AgentSalud MVP Team - Critical System Investigation
 * @version 1.0.0
 */

console.log('🔍 COMPREHENSIVE CACHE INVESTIGATION ACTIVATED');
console.log('='.repeat(80));

// Global investigation state
window.cacheInvestigation = {
  results: {},
  startTime: Date.now(),
  testSequence: []
};

/**
 * 1. BROWSER CACHE ANALYSIS
 */
async function analyzeBrowserCache() {
  console.log('\n🧹 BROWSER CACHE ANALYSIS');
  console.log('-'.repeat(50));
  
  const results = {
    localStorage: {},
    sessionStorage: {},
    cookies: {},
    serviceWorker: null,
    cacheStorage: []
  };
  
  // Analyze localStorage
  console.log('📦 LocalStorage Analysis:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    results.localStorage[key] = {
      size: value.length,
      isJSON: (() => {
        try { JSON.parse(value); return true; } catch { return false; }
      })(),
      preview: value.substring(0, 100)
    };
    console.log(`   ${key}: ${value.length} chars`);
  }
  
  // Analyze sessionStorage
  console.log('\n📦 SessionStorage Analysis:');
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    results.sessionStorage[key] = {
      size: value.length,
      isJSON: (() => {
        try { JSON.parse(value); return true; } catch { return false; }
      })(),
      preview: value.substring(0, 100)
    };
    console.log(`   ${key}: ${value.length} chars`);
  }
  
  // Analyze cookies
  console.log('\n🍪 Cookies Analysis:');
  const cookies = document.cookie.split(';');
  cookies.forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      results.cookies[name] = {
        value: value.substring(0, 50),
        size: value.length
      };
      console.log(`   ${name}: ${value.length} chars`);
    }
  });
  
  // Check Service Worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    results.serviceWorker = {
      active: registrations.length > 0,
      registrations: registrations.map(reg => ({
        scope: reg.scope,
        state: reg.active?.state
      }))
    };
    console.log(`\n🔧 Service Worker: ${registrations.length} registrations`);
    registrations.forEach(reg => {
      console.log(`   Scope: ${reg.scope}, State: ${reg.active?.state}`);
    });
  }
  
  // Check Cache Storage
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    results.cacheStorage = cacheNames;
    console.log(`\n💾 Cache Storage: ${cacheNames.length} caches`);
    cacheNames.forEach(name => console.log(`   ${name}`));
  }
  
  window.cacheInvestigation.results.browserCache = results;
  return results;
}

/**
 * 2. CLEAR ALL CACHES
 */
async function clearAllCaches() {
  console.log('\n🧹 CLEARING ALL CACHES');
  console.log('-'.repeat(50));
  
  const clearResults = {
    localStorage: false,
    sessionStorage: false,
    serviceWorker: false,
    cacheStorage: false
  };
  
  try {
    // Clear localStorage
    const localStorageCount = localStorage.length;
    localStorage.clear();
    clearResults.localStorage = true;
    console.log(`✅ LocalStorage cleared (${localStorageCount} items)`);
  } catch (e) {
    console.log(`❌ LocalStorage clear failed: ${e.message}`);
  }
  
  try {
    // Clear sessionStorage
    const sessionStorageCount = sessionStorage.length;
    sessionStorage.clear();
    clearResults.sessionStorage = true;
    console.log(`✅ SessionStorage cleared (${sessionStorageCount} items)`);
  } catch (e) {
    console.log(`❌ SessionStorage clear failed: ${e.message}`);
  }
  
  try {
    // Clear Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      clearResults.serviceWorker = true;
      console.log(`✅ Service Workers cleared (${registrations.length} registrations)`);
    }
  } catch (e) {
    console.log(`❌ Service Worker clear failed: ${e.message}`);
  }
  
  try {
    // Clear Cache Storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
      clearResults.cacheStorage = true;
      console.log(`✅ Cache Storage cleared (${cacheNames.length} caches)`);
    }
  } catch (e) {
    console.log(`❌ Cache Storage clear failed: ${e.message}`);
  }
  
  console.log('\n🔄 RECOMMENDATION: Hard refresh the page (Ctrl+Shift+R) now');
  
  window.cacheInvestigation.results.clearResults = clearResults;
  return clearResults;
}

/**
 * 3. REACT DEVTOOLS STATE ANALYSIS
 */
function analyzeReactState() {
  console.log('\n⚛️  REACT STATE ANALYSIS');
  console.log('-'.repeat(50));
  
  if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('❌ React DevTools not available');
    return { available: false };
  }
  
  console.log('✅ React DevTools detected');
  console.log('📋 MANUAL INSPECTION REQUIRED:');
  console.log('1. Open React DevTools');
  console.log('2. Navigate to Components tab');
  console.log('3. Search for "WeeklyAvailabilitySelector"');
  console.log('4. Compare props and state between both flows');
  console.log('5. Look for differences in:');
  console.log('   - organizationId');
  console.log('   - serviceId');
  console.log('   - doctorId');
  console.log('   - dateRange');
  console.log('   - onLoadAvailability function');
  
  return { available: true, manualInspectionRequired: true };
}

/**
 * 4. NETWORK LAYER DEEP ANALYSIS
 */
function setupNetworkAnalysis() {
  console.log('\n🌐 NETWORK LAYER ANALYSIS SETUP');
  console.log('-'.repeat(50));
  
  // Enhanced fetch interceptor with detailed logging
  const originalFetch = window.fetch;
  const networkCalls = [];
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    const callId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    
    console.log(`🌐 NETWORK CALL [${callId}]`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${options?.method || 'GET'}`);
    console.log(`   Headers:`, options?.headers || 'None');
    console.log(`   Body:`, options?.body || 'None');
    console.log(`   Timestamp: ${timestamp}`);
    
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
        method: options?.method || 'GET',
        headers: options?.headers || {},
        body: options?.body,
        timestamp,
        duration: `${duration.toFixed(2)}ms`,
        status: response.status,
        statusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseData,
        success: response.ok
      };
      
      networkCalls.push(callData);
      
      console.log(`✅ RESPONSE [${callId}]`);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Duration: ${duration.toFixed(2)}ms`);
      console.log(`   Size: ${JSON.stringify(responseData).length} chars`);
      
      // Special handling for availability API
      if (url.includes('/api/appointments/availability')) {
        console.log(`🎯 AVAILABILITY API DETECTED [${callId}]`);
        if (responseData?.success && responseData?.data) {
          const dates = Object.keys(responseData.data);
          console.log(`   Dates returned: ${dates.length}`);
          dates.slice(0, 3).forEach(date => {
            const dayData = responseData.data[date];
            console.log(`   ${date}: ${dayData.availableSlots}/${dayData.totalSlots} slots`);
          });
        }
      }
      
      return response;
      
    } catch (error) {
      const errorData = {
        id: callId,
        url,
        method: options?.method || 'GET',
        timestamp,
        error: error.message,
        stack: error.stack
      };
      
      networkCalls.push(errorData);
      
      console.log(`❌ ERROR [${callId}]: ${error.message}`);
      throw error;
    }
  };
  
  // Store network calls for analysis
  window.cacheInvestigation.networkCalls = networkCalls;
  
  console.log('✅ Network analysis interceptor activated');
  console.log('📊 All network calls will be logged and stored');
  
  return { interceptorActive: true };
}

/**
 * 5. COMPONENT PROPS COMPARISON
 */
function compareComponentProps() {
  console.log('\n🔍 COMPONENT PROPS COMPARISON');
  console.log('-'.repeat(50));
  
  console.log('📋 MANUAL TESTING SEQUENCE:');
  console.log('1. Open new appointment flow');
  console.log('2. Open browser console and run: captureNewAppointmentProps()');
  console.log('3. Open reschedule modal');
  console.log('4. Run: captureRescheduleProps()');
  console.log('5. Run: compareProps()');
  
  window.captureNewAppointmentProps = function() {
    console.log('📊 Capturing new appointment flow props...');
    // This would need to be implemented based on actual component structure
    console.log('⚠️  Manual capture required - inspect WeeklyAvailabilitySelector props in React DevTools');
  };
  
  window.captureRescheduleProps = function() {
    console.log('📊 Capturing reschedule modal props...');
    console.log('⚠️  Manual capture required - inspect WeeklyAvailabilitySelector props in React DevTools');
  };
  
  window.compareProps = function() {
    console.log('📊 Comparing props...');
    console.log('⚠️  Manual comparison required - check for differences in React DevTools');
  };
}

/**
 * 6. GENERATE INVESTIGATION REPORT
 */
function generateInvestigationReport() {
  console.log('\n📊 CACHE INVESTIGATION REPORT');
  console.log('='.repeat(80));
  
  const results = window.cacheInvestigation.results;
  const networkCalls = window.cacheInvestigation.networkCalls || [];
  
  console.log('🔍 INVESTIGATION SUMMARY:');
  console.log(`   Start time: ${new Date(window.cacheInvestigation.startTime).toISOString()}`);
  console.log(`   Duration: ${((Date.now() - window.cacheInvestigation.startTime) / 1000).toFixed(2)}s`);
  console.log(`   Network calls captured: ${networkCalls.length}`);
  
  if (results.browserCache) {
    console.log('\n📦 BROWSER CACHE ANALYSIS:');
    console.log(`   LocalStorage items: ${Object.keys(results.browserCache.localStorage).length}`);
    console.log(`   SessionStorage items: ${Object.keys(results.browserCache.sessionStorage).length}`);
    console.log(`   Cookies: ${Object.keys(results.browserCache.cookies).length}`);
    console.log(`   Service Workers: ${results.browserCache.serviceWorker?.registrations?.length || 0}`);
    console.log(`   Cache Storage: ${results.browserCache.cacheStorage?.length || 0}`);
  }
  
  // Analyze availability API calls
  const availabilityCalls = networkCalls.filter(call => 
    call.url && call.url.includes('/api/appointments/availability')
  );
  
  if (availabilityCalls.length > 0) {
    console.log('\n🎯 AVAILABILITY API CALLS:');
    availabilityCalls.forEach((call, index) => {
      console.log(`   Call ${index + 1}: ${call.timestamp}`);
      console.log(`     URL: ${call.url}`);
      console.log(`     Status: ${call.status}`);
      console.log(`     Duration: ${call.duration}`);
      
      if (call.responseData?.success && call.responseData?.data) {
        const dates = Object.keys(call.responseData.data);
        const sampleDate = dates[0];
        const sampleData = call.responseData.data[sampleDate];
        console.log(`     Sample (${sampleDate}): ${sampleData?.availableSlots}/${sampleData?.totalSlots} slots`);
      }
    });
    
    // Compare calls if multiple
    if (availabilityCalls.length > 1) {
      console.log('\n🔍 AVAILABILITY CALLS COMPARISON:');
      const firstCall = availabilityCalls[0];
      const lastCall = availabilityCalls[availabilityCalls.length - 1];
      
      console.log('   Comparing first and last calls...');
      console.log(`   URLs identical: ${firstCall.url === lastCall.url}`);
      console.log(`   Status identical: ${firstCall.status === lastCall.status}`);
      
      if (firstCall.responseData?.data && lastCall.responseData?.data) {
        const firstDates = Object.keys(firstCall.responseData.data);
        const lastDates = Object.keys(lastCall.responseData.data);
        
        console.log(`   Date count: ${firstDates.length} vs ${lastDates.length}`);
        
        // Compare slot counts for same dates
        let inconsistencies = 0;
        firstDates.forEach(date => {
          const firstSlots = firstCall.responseData.data[date]?.availableSlots;
          const lastSlots = lastCall.responseData.data[date]?.availableSlots;
          
          if (firstSlots !== lastSlots) {
            inconsistencies++;
            console.log(`   ❌ ${date}: ${firstSlots} vs ${lastSlots} slots`);
          }
        });
        
        if (inconsistencies === 0) {
          console.log('   ✅ All slot counts identical');
        } else {
          console.log(`   ❌ Found ${inconsistencies} slot count inconsistencies`);
        }
      }
    }
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. If caches were cleared, test both flows again');
  console.log('2. If inconsistencies persist, proceed to database investigation');
  console.log('3. Check for authentication or session differences');
  console.log('4. Verify component props are identical');
  
  return {
    networkCalls: networkCalls.length,
    availabilityCalls: availabilityCalls.length,
    cacheCleared: !!results.clearResults,
    timestamp: new Date().toISOString()
  };
}

// Initialize investigation
async function initializeCacheInvestigation() {
  console.log('🚀 Initializing comprehensive cache investigation...');
  
  setupNetworkAnalysis();
  
  console.log('\n💡 INVESTIGATION FUNCTIONS AVAILABLE:');
  console.log('   analyzeBrowserCache() - Analyze all browser caches');
  console.log('   clearAllCaches() - Clear all caches and storage');
  console.log('   analyzeReactState() - Guide for React state analysis');
  console.log('   compareComponentProps() - Guide for props comparison');
  console.log('   generateInvestigationReport() - Generate comprehensive report');
  
  console.log('\n🎯 RECOMMENDED SEQUENCE:');
  console.log('1. Run analyzeBrowserCache()');
  console.log('2. Run clearAllCaches()');
  console.log('3. Hard refresh page (Ctrl+Shift+R)');
  console.log('4. Test both flows');
  console.log('5. Run generateInvestigationReport()');
  
  console.log('\n🔍 Investigation ready!');
  console.log('='.repeat(80));
}

// Export functions
window.analyzeBrowserCache = analyzeBrowserCache;
window.clearAllCaches = clearAllCaches;
window.analyzeReactState = analyzeReactState;
window.compareComponentProps = compareComponentProps;
window.generateInvestigationReport = generateInvestigationReport;

// Auto-initialize
initializeCacheInvestigation();
