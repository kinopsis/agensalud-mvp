/**
 * DEPLOYMENT SCRIPT FOR DATE DISPLACEMENT DEBUGGING TOOLS
 * One-click deployment of all debugging and validation tools
 * 
 * USAGE: Copy and paste this entire script into browser console
 * RESULT: All debugging tools will be activated and ready for testing
 */

console.log('🚀 DEPLOYING DATE DISPLACEMENT DEBUGGING TOOLS');
console.log('='.repeat(80));

/**
 * Step 1: Load Advanced Date Displacement Debugger
 */
function loadAdvancedDebugger() {
  console.log('📥 Loading Advanced Date Displacement Debugger...');
  
  const debuggerScript = document.createElement('script');
  debuggerScript.src = './advanced-date-displacement-debugger.js';
  debuggerScript.onload = () => {
    console.log('✅ Advanced Date Displacement Debugger loaded');
  };
  debuggerScript.onerror = () => {
    console.warn('⚠️ Could not load external debugger, using inline version');
    
    // Inline version of the debugger
    const inlineScript = document.createElement('script');
    inlineScript.textContent = `
      console.log('🚨 ADVANCED DATE DISPLACEMENT DEBUGGER ACTIVATED (INLINE)');
      
      window.advancedDateTracker = {
        events: [],
        formDataHistory: [],
        apiCallHistory: [],
        startTime: Date.now(),
        isActive: true,
        config: {
          maxEvents: 1000,
          trackStackTraces: true,
          alertOnDisplacement: true
        }
      };

      function trackDateEvent(type, data, component = 'Unknown') {
        if (!window.advancedDateTracker.isActive) return;
        
        const event = {
          id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          type,
          component,
          data: JSON.parse(JSON.stringify(data))
        };
        
        window.advancedDateTracker.events.push(event);
        
        if (window.advancedDateTracker.events.length > window.advancedDateTracker.config.maxEvents) {
          window.advancedDateTracker.events.shift();
        }
        
        if (['DATE_DISPLACEMENT_DETECTED', 'FORM_DATA_MISMATCH'].includes(type)) {
          console.error('🚨 CRITICAL: ' + type, event);
        } else {
          console.log('📋 ' + type + ':', event.data);
        }
        
        return event.id;
      }

      window.trackDateEvent = trackDateEvent;
      console.log('✅ Inline Advanced Date Displacement Debugger Ready');
    `;
    document.head.appendChild(inlineScript);
  };
  
  document.head.appendChild(debuggerScript);
}

/**
 * Step 2: Load Comprehensive Date Displacement Validator
 */
function loadValidator() {
  console.log('📥 Loading Comprehensive Date Displacement Validator...');
  
  const validatorScript = document.createElement('script');
  validatorScript.src = './comprehensive-date-displacement-validator.js';
  validatorScript.onload = () => {
    console.log('✅ Comprehensive Date Displacement Validator loaded');
  };
  validatorScript.onerror = () => {
    console.warn('⚠️ Could not load external validator, using inline version');
    
    // Inline version of the validator
    const inlineScript = document.createElement('script');
    inlineScript.textContent = `
      console.log('🚨 COMPREHENSIVE DATE DISPLACEMENT VALIDATOR ACTIVATED (INLINE)');
      
      window.dateDisplacementValidator = {
        validationResults: [],
        testResults: [],
        startTime: Date.now(),
        isActive: true,
        config: {
          testDates: ['2025-06-03', '2025-06-04', '2025-06-05']
        }
      };

      function validateDateOperation(operation, input, output, component, expected) {
        const validation = {
          id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
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
            resultDate: output
          } : { detected: false }
        };
        
        window.dateDisplacementValidator.validationResults.push(validation);
        
        if (!validation.isValid || validation.displacement.detected) {
          console.error('🚨 VALIDATION FAILED: ' + operation, validation);
        } else {
          console.log('✅ VALIDATION PASSED: ' + operation);
        }
        
        return validation;
      }

      window.validateDateOperation = validateDateOperation;
      console.log('✅ Inline Comprehensive Date Displacement Validator Ready');
    `;
    document.head.appendChild(inlineScript);
  };
  
  document.head.appendChild(validatorScript);
}

/**
 * Step 3: Load Comprehensive Test Suite
 */
function loadTestSuite() {
  console.log('📥 Loading Comprehensive Test Suite...');
  
  const testScript = document.createElement('script');
  testScript.src = './comprehensive-date-displacement-test.js';
  testScript.onload = () => {
    console.log('✅ Comprehensive Test Suite loaded');
  };
  testScript.onerror = () => {
    console.warn('⚠️ Could not load external test suite, using inline version');
    
    // Inline simplified test suite
    const inlineScript = document.createElement('script');
    inlineScript.textContent = `
      console.log('🧪 COMPREHENSIVE DATE DISPLACEMENT TEST SUITE ACTIVATED (INLINE)');
      
      window.dateDisplacementTestResults = {
        testResults: [],
        summary: { totalTests: 0, passedTests: 0, failedTests: 0, displacementEvents: 0 }
      };

      function runQuickTest() {
        console.log('🧪 Running Quick Date Displacement Test...');
        
        const testDate = '2025-06-03';
        let passed = true;
        
        // Test 1: Check if debugging tools are active
        if (!window.advancedDateTracker || !window.advancedDateTracker.isActive) {
          console.error('❌ Advanced Date Tracker not active');
          passed = false;
        } else {
          console.log('✅ Advanced Date Tracker active');
        }
        
        // Test 2: Check if validator is active
        if (!window.dateDisplacementValidator || !window.dateDisplacementValidator.isActive) {
          console.error('❌ Date Displacement Validator not active');
          passed = false;
        } else {
          console.log('✅ Date Displacement Validator active');
        }
        
        // Test 3: Simulate date tracking
        if (window.trackDateEvent) {
          window.trackDateEvent('TEST_DATE_SELECTION', { date: testDate }, 'TestSuite');
          console.log('✅ Date event tracking working');
        } else {
          console.error('❌ Date event tracking not available');
          passed = false;
        }
        
        console.log(passed ? '🎉 Quick test PASSED' : '⚠️ Quick test FAILED');
        return passed;
      }

      window.runQuickTest = runQuickTest;
      console.log('✅ Inline Test Suite Ready');
    `;
    document.head.appendChild(inlineScript);
  };
  
  document.head.appendChild(testScript);
}

/**
 * Step 4: Setup DOM monitoring
 */
function setupDOMMonitoring() {
  console.log('👁️ Setting up DOM monitoring for time slot headers...');
  
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
                console.log('🔄 TIME SLOT HEADER DETECTED:', element.textContent);
                console.log('📊 Date in header:', dateMatch[1]);
                
                // Track this event
                if (window.trackDateEvent) {
                  window.trackDateEvent('TIME_SLOT_HEADER_UPDATE', {
                    headerText: element.textContent,
                    extractedDate: dateMatch[1],
                    element: element.tagName
                  }, 'DOMMonitor');
                }
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
  
  console.log('✅ DOM monitoring active');
}

/**
 * Step 5: Create debugging UI
 */
function createDebuggingUI() {
  console.log('🎨 Creating debugging UI...');
  
  // Remove existing debug UI if present
  const existingUI = document.getElementById('date-debug-ui');
  if (existingUI) {
    existingUI.remove();
  }
  
  const debugUI = document.createElement('div');
  debugUI.id = 'date-debug-ui';
  debugUI.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    font-family: monospace;
    font-size: 12px;
    max-width: 300px;
  `;
  
  debugUI.innerHTML = `
    <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8px;">
      🔧 Date Displacement Debugger
    </div>
    <div id="debug-status" style="margin-bottom: 8px;">
      Status: <span style="color: green;">Active</span>
    </div>
    <div style="margin-bottom: 8px;">
      <button onclick="window.runQuickTest && window.runQuickTest()" style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;">
        Quick Test
      </button>
      <button onclick="window.runComprehensiveTests && window.runComprehensiveTests()" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px;">
        Full Test
      </button>
      <button onclick="document.getElementById('date-debug-ui').style.display='none'" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
        Hide
      </button>
    </div>
    <div id="debug-events" style="max-height: 200px; overflow-y: auto; border: 1px solid #e5e7eb; padding: 4px; font-size: 10px;">
      Waiting for events...
    </div>
  `;
  
  document.body.appendChild(debugUI);
  
  // Update events display
  setInterval(() => {
    const eventsDiv = document.getElementById('debug-events');
    if (eventsDiv && window.advancedDateTracker) {
      const recentEvents = window.advancedDateTracker.events.slice(-5);
      eventsDiv.innerHTML = recentEvents.length > 0 
        ? recentEvents.map(event => `${event.type}: ${JSON.stringify(event.data).substring(0, 50)}...`).join('<br>')
        : 'No events yet...';
    }
  }, 2000);
  
  console.log('✅ Debugging UI created');
}

/**
 * Main deployment function
 */
function deployAllTools() {
  console.log('🚀 DEPLOYING ALL DATE DISPLACEMENT DEBUGGING TOOLS');
  console.log('='.repeat(60));
  
  // Deploy tools in sequence
  loadAdvancedDebugger();
  
  setTimeout(() => {
    loadValidator();
  }, 1000);
  
  setTimeout(() => {
    loadTestSuite();
  }, 2000);
  
  setTimeout(() => {
    setupDOMMonitoring();
  }, 3000);
  
  setTimeout(() => {
    createDebuggingUI();
  }, 4000);
  
  setTimeout(() => {
    console.log('\n🎉 ALL DEBUGGING TOOLS DEPLOYED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('📋 Available Commands:');
    console.log('  - window.runQuickTest() - Run quick validation');
    console.log('  - window.runComprehensiveTests() - Run full test suite');
    console.log('  - window.advancedDateTracker.events - View tracked events');
    console.log('  - window.dateDisplacementValidator.validationResults - View validation results');
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Navigate to appointment booking page');
    console.log('2. Click on June 3rd in the calendar');
    console.log('3. Check if time slots show for June 3rd or June 4th');
    console.log('4. Monitor console for displacement detection');
    console.log('\n🔍 Look for the debugging UI in the top-right corner');
  }, 5000);
}

// Auto-deploy
deployAllTools();

// Make deployment function globally available
window.deployDateDebuggingTools = deployAllTools;
