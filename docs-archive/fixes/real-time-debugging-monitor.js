/**
 * REAL-TIME FRONTEND DEBUGGING MONITOR
 * 
 * This script intercepts and monitors all availability-related API calls,
 * component state changes, and data processing to identify inconsistencies
 * between the new appointment flow and reschedule modal.
 * 
 * Run this in browser console BEFORE navigating to appointment flows.
 * 
 * @author AgentSalud MVP Team - Critical Frontend Investigation
 * @version 1.0.0
 */

console.log('🚀 REAL-TIME DEBUGGING MONITOR ACTIVATED');
console.log('='.repeat(60));

// Global monitoring state
window.debugMonitor = {
  apiCalls: [],
  componentLogs: [],
  networkRequests: [],
  startTime: Date.now()
};

/**
 * Intercept fetch calls to monitor API requests
 */
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [url, options] = args;
  const requestId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();
  
  // Check if this is an availability API call
  if (url.includes('/api/appointments/availability')) {
    console.log(`🌐 API CALL INTERCEPTED [${requestId}]`);
    console.log(`   URL: ${url}`);
    console.log(`   Time: ${timestamp}`);
    console.log(`   Options:`, options);
    
    const startTime = performance.now();
    
    try {
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Clone response to read body without consuming it
      const responseClone = response.clone();
      const responseData = await responseClone.json();
      
      const callData = {
        requestId,
        url,
        options,
        timestamp,
        duration: `${duration.toFixed(2)}ms`,
        status: response.status,
        success: response.ok,
        responseData,
        stackTrace: new Error().stack
      };
      
      window.debugMonitor.apiCalls.push(callData);
      
      console.log(`✅ API RESPONSE [${requestId}]`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Duration: ${duration.toFixed(2)}ms`);
      console.log(`   Success: ${responseData.success}`);
      
      if (responseData.success && responseData.data) {
        const dates = Object.keys(responseData.data);
        console.log(`   Dates: ${dates.length} days`);
        
        // Log first few days for comparison
        dates.slice(0, 3).forEach(date => {
          const dayData = responseData.data[date];
          console.log(`   ${date}: ${dayData.availableSlots}/${dayData.totalSlots} slots`);
        });
      }
      
      return response;
      
    } catch (error) {
      const errorData = {
        requestId,
        url,
        options,
        timestamp,
        error: error.message,
        stackTrace: error.stack
      };
      
      window.debugMonitor.apiCalls.push(errorData);
      console.error(`❌ API ERROR [${requestId}]:`, error);
      throw error;
    }
  }
  
  return originalFetch.apply(this, args);
};

/**
 * Intercept console.log to capture component debug messages
 */
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  const timestamp = new Date().toISOString();
  
  // Capture our specific debug messages
  if (message.includes('NEW APPOINTMENT FLOW') || 
      message.includes('RESCHEDULE MODAL') || 
      message.includes('WEEKLY AVAILABILITY SELECTOR')) {
    
    window.debugMonitor.componentLogs.push({
      timestamp,
      message,
      args,
      stackTrace: new Error().stack
    });
    
    console.log(`📋 COMPONENT LOG CAPTURED: ${message}`);
  }
  
  return originalConsoleLog.apply(this, args);
};

/**
 * Monitor network requests via Performance API
 */
function monitorNetworkRequests() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes('/api/appointments/availability')) {
        window.debugMonitor.networkRequests.push({
          url: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          transferSize: entry.transferSize,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🌐 NETWORK REQUEST DETECTED:`);
        console.log(`   URL: ${entry.name}`);
        console.log(`   Duration: ${entry.duration.toFixed(2)}ms`);
        console.log(`   Size: ${entry.transferSize} bytes`);
      }
    }
  });
  
  observer.observe({ entryTypes: ['resource'] });
}

/**
 * Component state monitoring via React DevTools
 */
function setupReactDevToolsMonitoring() {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('🔧 React DevTools detected - setting up component monitoring');
    
    // Hook into React fiber updates
    const originalOnCommitFiberRoot = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot;
    
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = function(id, root, ...args) {
      // Monitor specific components
      const findComponent = (fiber, componentName) => {
        if (fiber.type && fiber.type.name === componentName) {
          return fiber;
        }
        
        let child = fiber.child;
        while (child) {
          const found = findComponent(child, componentName);
          if (found) return found;
          child = child.sibling;
        }
        
        return null;
      };
      
      // Look for our target components
      const targetComponents = [
        'UnifiedAppointmentFlow',
        'AIEnhancedRescheduleModal',
        'WeeklyAvailabilitySelector'
      ];
      
      targetComponents.forEach(componentName => {
        const component = findComponent(root.current, componentName);
        if (component) {
          console.log(`🔧 COMPONENT UPDATE: ${componentName}`);
          console.log(`   Props:`, component.memoizedProps);
          console.log(`   State:`, component.memoizedState);
        }
      });
      
      return originalOnCommitFiberRoot.call(this, id, root, ...args);
    };
  } else {
    console.warn('⚠️  React DevTools not available - component monitoring limited');
  }
}

/**
 * Generate comparison report
 */
function generateComparisonReport() {
  console.log('\n📊 DEBUGGING COMPARISON REPORT');
  console.log('='.repeat(60));
  
  const apiCalls = window.debugMonitor.apiCalls;
  const componentLogs = window.debugMonitor.componentLogs;
  
  console.log(`📈 STATISTICS:`);
  console.log(`   API Calls: ${apiCalls.length}`);
  console.log(`   Component Logs: ${componentLogs.length}`);
  console.log(`   Network Requests: ${window.debugMonitor.networkRequests.length}`);
  
  if (apiCalls.length >= 2) {
    console.log('\n🔍 API CALL COMPARISON:');
    
    // Group calls by URL pattern
    const callGroups = {};
    apiCalls.forEach(call => {
      const baseUrl = call.url.split('?')[0];
      if (!callGroups[baseUrl]) callGroups[baseUrl] = [];
      callGroups[baseUrl].push(call);
    });
    
    Object.keys(callGroups).forEach(baseUrl => {
      const calls = callGroups[baseUrl];
      console.log(`\n   ${baseUrl}:`);
      
      calls.forEach((call, index) => {
        console.log(`     Call ${index + 1}: ${call.timestamp}`);
        console.log(`       Status: ${call.status}`);
        console.log(`       Duration: ${call.duration}`);
        
        if (call.responseData && call.responseData.data) {
          const dates = Object.keys(call.responseData.data);
          const sampleDate = dates[0];
          const sampleData = call.responseData.data[sampleDate];
          console.log(`       Sample (${sampleDate}): ${sampleData?.availableSlots}/${sampleData?.totalSlots} slots`);
        }
      });
      
      // Compare responses if multiple calls
      if (calls.length > 1) {
        const firstCall = calls[0];
        const lastCall = calls[calls.length - 1];
        
        if (firstCall.responseData && lastCall.responseData) {
          const firstData = firstCall.responseData.data;
          const lastData = lastCall.responseData.data;
          
          const dates = Object.keys(firstData);
          let identical = true;
          
          dates.forEach(date => {
            const first = firstData[date];
            const last = lastData[date];
            
            if (first?.availableSlots !== last?.availableSlots) {
              identical = false;
              console.log(`     ❌ INCONSISTENCY on ${date}:`);
              console.log(`       First call: ${first?.availableSlots} slots`);
              console.log(`       Last call: ${last?.availableSlots} slots`);
            }
          });
          
          if (identical) {
            console.log(`     ✅ All responses identical`);
          }
        }
      }
    });
  }
  
  console.log('\n📋 COMPONENT ACTIVITY:');
  componentLogs.forEach(log => {
    console.log(`   ${log.timestamp}: ${log.message}`);
  });
  
  return {
    apiCalls,
    componentLogs,
    networkRequests: window.debugMonitor.networkRequests
  };
}

/**
 * Clear monitoring data
 */
function clearMonitoringData() {
  window.debugMonitor = {
    apiCalls: [],
    componentLogs: [],
    networkRequests: [],
    startTime: Date.now()
  };
  console.log('🧹 Monitoring data cleared');
}

// Initialize monitoring
monitorNetworkRequests();
setupReactDevToolsMonitoring();

// Export functions for manual use
window.generateComparisonReport = generateComparisonReport;
window.clearMonitoringData = clearMonitoringData;

console.log('\n💡 MONITORING FUNCTIONS AVAILABLE:');
console.log('   generateComparisonReport() - Generate detailed comparison');
console.log('   clearMonitoringData() - Clear all monitoring data');
console.log('\n🎯 NOW NAVIGATE TO BOTH APPOINTMENT FLOWS TO CAPTURE DATA');
console.log('='.repeat(60));
