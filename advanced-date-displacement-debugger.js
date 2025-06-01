/**
 * ADVANCED DATE DISPLACEMENT DEBUGGER
 * Comprehensive real-time tracking system to identify exact cause of date displacement
 * 
 * USAGE: Add this script to the page and monitor console for detailed tracking
 */

console.log('🚨 ADVANCED DATE DISPLACEMENT DEBUGGER ACTIVATED');
console.log('='.repeat(80));

// Global tracking system
window.advancedDateTracker = {
  events: [],
  formDataHistory: [],
  apiCallHistory: [],
  stateUpdates: [],
  componentRenders: [],
  startTime: Date.now(),
  isActive: true,
  
  // Configuration
  config: {
    maxEvents: 1000,
    trackStackTraces: true,
    trackComponentRenders: true,
    trackApiCalls: true,
    alertOnDisplacement: true
  }
};

/**
 * Core tracking function
 */
function trackDateEvent(type, data, component = 'Unknown') {
  if (!window.advancedDateTracker.isActive) return;
  
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    relativeTime: Date.now() - window.advancedDateTracker.startTime,
    type,
    component,
    data: JSON.parse(JSON.stringify(data)), // Deep clone
    stackTrace: window.advancedDateTracker.config.trackStackTraces ? new Error().stack : null
  };
  
  window.advancedDateTracker.events.push(event);
  
  // Limit events to prevent memory issues
  if (window.advancedDateTracker.events.length > window.advancedDateTracker.config.maxEvents) {
    window.advancedDateTracker.events.shift();
  }
  
  // Log important events
  if (['DATE_DISPLACEMENT_DETECTED', 'FORM_DATA_MISMATCH', 'API_DATE_MISMATCH'].includes(type)) {
    console.error(`🚨 CRITICAL: ${type}`, event);
    
    if (window.advancedDateTracker.config.alertOnDisplacement) {
      console.error('🔍 DISPLACEMENT ANALYSIS:', {
        event,
        recentEvents: window.advancedDateTracker.events.slice(-10),
        formDataHistory: window.advancedDateTracker.formDataHistory.slice(-5)
      });
    }
  } else {
    console.log(`📋 ${type}:`, event.data);
  }
  
  return event.id;
}

/**
 * Enhanced console.log interception for component debugging
 */
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  // Track specific component debug messages
  if (message.includes('WEEKLY AVAILABILITY CLICK') || 
      message.includes('RESCHEDULE: handleDateSelect') ||
      message.includes('FECHA SELECCIONADA')) {
    
    trackDateEvent('COMPONENT_DEBUG_LOG', {
      message,
      args,
      source: 'console.log'
    }, 'ComponentDebug');
  }
  
  // Track date-related operations
  if (message.includes('date') || message.includes('Date') || message.includes('fecha')) {
    trackDateEvent('DATE_RELATED_LOG', {
      message,
      args
    }, 'DateRelated');
  }
  
  return originalConsoleLog.apply(this, args);
};

/**
 * Form data change tracking
 */
function trackFormDataChange(componentName, previousData, newData, changeType = 'UPDATE') {
  const change = {
    timestamp: new Date().toISOString(),
    component: componentName,
    changeType,
    previousData: JSON.parse(JSON.stringify(previousData || {})),
    newData: JSON.parse(JSON.stringify(newData || {})),
    dateFields: {}
  };
  
  // Extract date-related fields
  ['newDate', 'appointment_date', 'date', 'selectedDate'].forEach(field => {
    if (previousData && previousData[field]) {
      change.dateFields[`previous_${field}`] = previousData[field];
    }
    if (newData && newData[field]) {
      change.dateFields[`new_${field}`] = newData[field];
    }
  });
  
  // Check for date displacement
  const dateFields = Object.keys(change.dateFields);
  for (let i = 0; i < dateFields.length; i += 2) {
    const prevField = dateFields[i];
    const newField = dateFields[i + 1];
    
    if (prevField && newField && prevField.startsWith('previous_') && newField.startsWith('new_')) {
      const prevDate = change.dateFields[prevField];
      const newDate = change.dateFields[newField];
      
      if (prevDate && newDate && prevDate !== newDate) {
        trackDateEvent('FORM_DATA_DATE_CHANGE', {
          field: prevField.replace('previous_', ''),
          previousDate: prevDate,
          newDate: newDate,
          displacement: calculateDateDisplacement(prevDate, newDate)
        }, componentName);
      }
    }
  }
  
  window.advancedDateTracker.formDataHistory.push(change);
  trackDateEvent('FORM_DATA_CHANGE', change, componentName);
}

/**
 * API call tracking
 */
function trackApiCall(url, method, params, response, component = 'Unknown') {
  const apiCall = {
    timestamp: new Date().toISOString(),
    url,
    method,
    params: JSON.parse(JSON.stringify(params || {})),
    response: response ? JSON.parse(JSON.stringify(response)) : null,
    component
  };
  
  // Extract date parameters
  const dateParams = {};
  if (params) {
    Object.keys(params).forEach(key => {
      if (key.includes('date') || key.includes('Date')) {
        dateParams[key] = params[key];
      }
    });
  }
  
  if (Object.keys(dateParams).length > 0) {
    trackDateEvent('API_CALL_WITH_DATES', {
      ...apiCall,
      dateParams
    }, component);
  }
  
  window.advancedDateTracker.apiCallHistory.push(apiCall);
}

/**
 * Calculate date displacement
 */
function calculateDateDisplacement(date1, date2) {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays,
      direction: d2 > d1 ? 'forward' : 'backward',
      isDisplacement: diffDays > 0
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Enhanced fetch interception for API tracking
 */
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const startTime = Date.now();
  
  return originalFetch.apply(this, arguments)
    .then(response => {
      const endTime = Date.now();
      
      // Track API calls that might involve dates
      if (url.includes('availability') || url.includes('appointments') || url.includes('doctors')) {
        trackApiCall(url, options.method || 'GET', {
          url,
          options,
          duration: endTime - startTime
        }, null, 'FetchAPI');
      }
      
      return response;
    })
    .catch(error => {
      trackDateEvent('API_ERROR', {
        url,
        error: error.message
      }, 'FetchAPI');
      throw error;
    });
};

/**
 * Date validation utilities
 */
window.dateValidationUtils = {
  isValidDateFormat: (date) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(date);
  },
  
  detectDisplacement: (originalDate, processedDate) => {
    if (!originalDate || !processedDate) return false;
    return originalDate !== processedDate;
  },
  
  analyzeDisplacement: (originalDate, processedDate) => {
    return calculateDateDisplacement(originalDate, processedDate);
  }
};

/**
 * Analysis and reporting functions
 */
window.dateDisplacementAnalysis = {
  generateReport: () => {
    const events = window.advancedDateTracker.events;
    const displacementEvents = events.filter(e => 
      e.type.includes('DISPLACEMENT') || e.type.includes('MISMATCH')
    );
    
    console.log('\n📊 DATE DISPLACEMENT ANALYSIS REPORT');
    console.log('='.repeat(50));
    console.log(`Total Events: ${events.length}`);
    console.log(`Displacement Events: ${displacementEvents.length}`);
    console.log(`Form Data Changes: ${window.advancedDateTracker.formDataHistory.length}`);
    console.log(`API Calls: ${window.advancedDateTracker.apiCallHistory.length}`);
    
    if (displacementEvents.length > 0) {
      console.log('\n🚨 DISPLACEMENT EVENTS:');
      displacementEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.type} at ${event.timestamp}`);
        console.log('   Data:', event.data);
      });
    }
    
    return {
      totalEvents: events.length,
      displacementEvents: displacementEvents.length,
      formDataChanges: window.advancedDateTracker.formDataHistory.length,
      apiCalls: window.advancedDateTracker.apiCallHistory.length,
      events: displacementEvents
    };
  },
  
  exportData: () => {
    return {
      tracker: window.advancedDateTracker,
      utils: window.dateValidationUtils,
      timestamp: new Date().toISOString()
    };
  }
};

// Auto-generate report every 30 seconds
setInterval(() => {
  if (window.advancedDateTracker.events.length > 0) {
    console.log('\n🔄 AUTO-REPORT (30s interval)');
    window.dateDisplacementAnalysis.generateReport();
  }
}, 30000);

console.log('✅ Advanced Date Displacement Debugger Ready');
console.log('📋 Use window.dateDisplacementAnalysis.generateReport() for analysis');
console.log('📊 Use window.dateDisplacementAnalysis.exportData() to export data');
console.log('🔧 Tracker available at window.advancedDateTracker');
