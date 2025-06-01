/**
 * FORCE DEBUGGING ACTIVATION SCRIPT
 * Manually activates the date displacement debugging system
 * 
 * USAGE: Copy and paste this entire script into browser console
 * PURPOSE: Force initialization of debugging components when automatic activation fails
 */

console.log('🚨 FORCE DEBUGGING ACTIVATION INITIATED');
console.log('='.repeat(80));

// Global activation state
window.forceDebugActivation = {
  startTime: Date.now(),
  activationSteps: [],
  errors: [],
  isActive: false
};

/**
 * Step 1: Check current debugging state
 */
function checkCurrentState() {
  console.log('\n🔍 STEP 1: Checking Current Debugging State');
  console.log('-'.repeat(50));
  
  const state = {
    advancedDateTracker: !!window.advancedDateTracker,
    dateDisplacementValidator: !!window.dateDisplacementValidator,
    trackDateEvent: typeof window.trackDateEvent === 'function',
    validateDateOperation: typeof window.validateDateOperation === 'function',
    lastClickedDate: !!window.lastClickedDate,
    debuggerScripts: document.querySelectorAll('script[data-debugger-type="date-displacement"]').length,
    validatorScripts: document.querySelectorAll('script[data-debugger-type="date-validation"]').length
  };
  
  console.log('Current State:', state);
  window.forceDebugActivation.activationSteps.push({
    step: 'checkCurrentState',
    result: state,
    timestamp: Date.now()
  });
  
  return state;
}

/**
 * Step 2: Force DateDisplacementDebugger activation
 */
function forceDebuggerActivation() {
  console.log('\n🚨 STEP 2: Force DateDisplacementDebugger Activation');
  console.log('-'.repeat(50));
  
  try {
    // Remove any existing debugger scripts
    const existingScripts = document.querySelectorAll('script[data-debugger-type="date-displacement"]');
    existingScripts.forEach(script => script.remove());
    console.log(`Removed ${existingScripts.length} existing debugger scripts`);
    
    // Create and inject the debugger script
    const debuggerScript = `
      (function() {
        'use strict';
        
        console.log('🚨 FORCE ADVANCED DATE DISPLACEMENT DEBUGGER ACTIVATED');
        
        // Initialize global tracking system
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

        // Core tracking function
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
          
          console.log('📋 DATE EVENT:', type, data);
          
          if (type.includes('DISPLACEMENT')) {
            console.error('🚨 DISPLACEMENT EVENT:', event);
            if (window.advancedDateTracker.config.alertOnDisplacement) {
              alert('DATE DISPLACEMENT DETECTED: ' + JSON.stringify(data));
            }
          }
          
          return event.id;
        }

        // Form data tracking
        function trackFormDataChange(componentName, previousData, newData, changeType = 'UPDATE') {
          const change = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            componentName,
            changeType,
            previousData: JSON.parse(JSON.stringify(previousData)),
            newData: JSON.parse(JSON.stringify(newData))
          };
          
          window.advancedDateTracker.formDataHistory.push(change);
          console.log('📝 FORM DATA CHANGE:', change);
          
          return change.id;
        }

        // Console.log interception (with collision protection)
        if (!console.log._forceDebuggerIntercepted) {
          const originalConsoleLog = console.log;
          console.log = function(...args) {
            const message = args.join(' ');
            
            if (message.includes('WEEKLY AVAILABILITY CLICK') || 
                message.includes('RESCHEDULE: handleDateSelect') ||
                message.includes('FECHA SELECCIONADA')) {
              
              trackDateEvent('COMPONENT_DEBUG_LOG', {
                message,
                args,
                source: 'console.log'
              }, 'ComponentDebug');
            }
            
            return originalConsoleLog.apply(this, args);
          };
          console.log._forceDebuggerIntercepted = true;
        }

        // Make functions globally available
        window.trackDateEvent = trackDateEvent;
        window.trackFormDataChange = trackFormDataChange;

        console.log('✅ Force DateDisplacementDebugger Ready');
        
      })();
    `;
    
    const script = document.createElement('script');
    script.setAttribute('data-debugger-type', 'date-displacement');
    script.setAttribute('data-component', 'ForceDebugger');
    script.textContent = debuggerScript;
    document.head.appendChild(script);
    
    console.log('✅ DateDisplacementDebugger script injected');
    
    window.forceDebugActivation.activationSteps.push({
      step: 'forceDebuggerActivation',
      result: 'success',
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Error in forceDebuggerActivation:', error);
    window.forceDebugActivation.errors.push({
      step: 'forceDebuggerActivation',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

/**
 * Step 3: Force DateValidationMonitor activation
 */
function forceValidatorActivation() {
  console.log('\n🚨 STEP 3: Force DateValidationMonitor Activation');
  console.log('-'.repeat(50));
  
  try {
    // Remove any existing validator scripts
    const existingScripts = document.querySelectorAll('script[data-debugger-type="date-validation"]');
    existingScripts.forEach(script => script.remove());
    console.log(`Removed ${existingScripts.length} existing validator scripts`);
    
    // Create and inject the validator script
    const validatorScript = `
      (function() {
        'use strict';
        
        console.log('🚨 FORCE COMPREHENSIVE DATE DISPLACEMENT VALIDATOR ACTIVATED');
        
        // Initialize global validation system
        window.dateDisplacementValidator = {
          validationResults: [],
          testResults: [],
          startTime: Date.now(),
          isActive: true,
          config: {
            testDates: ['2025-06-03', '2025-06-04', '2025-06-05']
          }
        };

        // Core validation function
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
            console.error('🚨 VALIDATION FAILED:', validation);
          } else {
            console.log('✅ VALIDATION PASSED:', operation);
          }
          
          return validation;
        }

        // DOM monitoring for time slot headers
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node;
                  
                  if (element.textContent && element.textContent.includes('Horarios disponibles para')) {
                    const dateMatch = element.textContent.match(/(\\d{4}-\\d{2}-\\d{2})/);
                    if (dateMatch) {
                      console.log('🔄 Time slot header detected:', element.textContent);
                      console.log('📊 Date extracted:', dateMatch[1]);
                      
                      const clickedDate = window.lastClickedDate ? window.lastClickedDate.date : 'unknown';
                      
                      validateDateOperation(
                        'TimeSlotHeaderUpdate',
                        clickedDate,
                        dateMatch[1],
                        'TimeSlotDisplay',
                        clickedDate
                      );
                    }
                  }
                }
              });
            }
          });
        });
        
        if (!window._forceValidatorObserverActive) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          window._forceValidatorObserverActive = true;
        }

        // Make functions globally available
        window.validateDateOperation = validateDateOperation;

        console.log('✅ Force DateValidationMonitor Ready');
        
      })();
    `;
    
    const script = document.createElement('script');
    script.setAttribute('data-debugger-type', 'date-validation');
    script.setAttribute('data-component', 'ForceValidator');
    script.textContent = validatorScript;
    document.head.appendChild(script);
    
    console.log('✅ DateValidationMonitor script injected');
    
    window.forceDebugActivation.activationSteps.push({
      step: 'forceValidatorActivation',
      result: 'success',
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Error in forceValidatorActivation:', error);
    window.forceDebugActivation.errors.push({
      step: 'forceValidatorActivation',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

/**
 * Step 4: Test debugging functionality
 */
function testDebuggingFunctionality() {
  console.log('\n🧪 STEP 4: Testing Debugging Functionality');
  console.log('-'.repeat(50));
  
  try {
    // Test trackDateEvent
    if (window.trackDateEvent) {
      const eventId = window.trackDateEvent('FORCE_ACTIVATION_TEST', {
        testDate: '2025-06-03',
        testType: 'functionality_check'
      }, 'ForceActivation');
      
      console.log('✅ trackDateEvent working, event ID:', eventId);
    } else {
      console.error('❌ trackDateEvent not available');
    }
    
    // Test validateDateOperation
    if (window.validateDateOperation) {
      const validation = window.validateDateOperation(
        'FORCE_ACTIVATION_TEST',
        '2025-06-03',
        '2025-06-03',
        'ForceActivation',
        '2025-06-03'
      );
      
      console.log('✅ validateDateOperation working:', validation.isValid);
    } else {
      console.error('❌ validateDateOperation not available');
    }
    
    // Test state access
    const debuggerActive = window.advancedDateTracker?.isActive;
    const validatorActive = window.dateDisplacementValidator?.isActive;
    
    console.log('Debugger active:', debuggerActive);
    console.log('Validator active:', validatorActive);
    
    window.forceDebugActivation.activationSteps.push({
      step: 'testDebuggingFunctionality',
      result: {
        trackDateEvent: typeof window.trackDateEvent === 'function',
        validateDateOperation: typeof window.validateDateOperation === 'function',
        debuggerActive,
        validatorActive
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Error in testDebuggingFunctionality:', error);
    window.forceDebugActivation.errors.push({
      step: 'testDebuggingFunctionality',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

/**
 * Step 5: Create debugging UI indicators
 */
function createDebuggingUI() {
  console.log('\n🎨 STEP 5: Creating Debugging UI Indicators');
  console.log('-'.repeat(50));
  
  try {
    // Remove existing debug UI
    const existingUI = document.getElementById('force-debug-ui');
    if (existingUI) {
      existingUI.remove();
    }
    
    // Create debug UI
    const debugUI = document.createElement('div');
    debugUI.id = 'force-debug-ui';
    debugUI.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      background: #1e40af;
      color: white;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 11px;
      max-width: 280px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    debugUI.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">
        🚨 FORCE DEBUG ACTIVATED
      </div>
      <div style="margin-bottom: 4px;">
        Debugger: <span id="debugger-status">❓</span>
      </div>
      <div style="margin-bottom: 4px;">
        Validator: <span id="validator-status">❓</span>
      </div>
      <div style="margin-bottom: 8px;">
        Functions: <span id="functions-status">❓</span>
      </div>
      <button onclick="window.testJune3rdScenario && window.testJune3rdScenario()" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 10px;">
        Test June 3rd
      </button>
      <button onclick="document.getElementById('force-debug-ui').style.display='none'" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">
        Hide
      </button>
    `;
    
    document.body.appendChild(debugUI);
    
    // Update status indicators
    const updateStatus = () => {
      const debuggerStatus = document.getElementById('debugger-status');
      const validatorStatus = document.getElementById('validator-status');
      const functionsStatus = document.getElementById('functions-status');
      
      if (debuggerStatus) {
        debuggerStatus.textContent = window.advancedDateTracker?.isActive ? '✅' : '❌';
      }
      if (validatorStatus) {
        validatorStatus.textContent = window.dateDisplacementValidator?.isActive ? '✅' : '❌';
      }
      if (functionsStatus) {
        const trackAvailable = typeof window.trackDateEvent === 'function';
        const validateAvailable = typeof window.validateDateOperation === 'function';
        functionsStatus.textContent = (trackAvailable && validateAvailable) ? '✅' : '❌';
      }
    };
    
    updateStatus();
    setInterval(updateStatus, 2000);
    
    console.log('✅ Debugging UI created');
    
  } catch (error) {
    console.error('❌ Error in createDebuggingUI:', error);
  }
}

/**
 * Step 6: Setup June 3rd test function
 */
function setupJune3rdTest() {
  console.log('\n🎯 STEP 6: Setting up June 3rd Test Function');
  console.log('-'.repeat(50));
  
  window.testJune3rdScenario = function() {
    console.log('🎯 TESTING JUNE 3RD SCENARIO...');
    
    // Set clicked date for correlation
    window.lastClickedDate = {
      date: '2025-06-03',
      timestamp: new Date().toISOString(),
      clickId: 'force-test-june-3rd',
      component: 'ForceTest'
    };
    
    // Track the test
    if (window.trackDateEvent) {
      window.trackDateEvent('JUNE_3RD_TEST_INITIATED', {
        targetDate: '2025-06-03',
        expectedHeader: 'Horarios disponibles para 2025-06-03'
      }, 'ForceTest');
    }
    
    // Check for time slot headers after a delay
    setTimeout(() => {
      const headers = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.textContent && el.textContent.includes('Horarios disponibles para')) {
          const dateMatch = el.textContent.match(/(\\d{4}-\\d{2}-\\d{2})/);
          if (dateMatch) {
            headers.push({
              text: el.textContent,
              date: dateMatch[1]
            });
          }
        }
      });
      
      console.log('📋 Found time slot headers:', headers);
      
      headers.forEach(header => {
        if (header.date === '2025-06-03') {
          console.log('✅ CORRECT: Header shows June 3rd');
        } else {
          console.error('🚨 DISPLACEMENT: Header shows', header.date, 'instead of 2025-06-03');
          alert('DISPLACEMENT DETECTED: ' + header.text);
        }
      });
      
      if (headers.length === 0) {
        console.log('⚠️ No time slot headers found. Navigate to appointment booking page and click June 3rd.');
      }
    }, 1000);
  };
  
  console.log('✅ June 3rd test function ready');
}

/**
 * Main activation function
 */
function runForceActivation() {
  console.log('\n🚀 RUNNING FORCE DEBUGGING ACTIVATION');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  // Run activation steps
  checkCurrentState();
  
  setTimeout(() => {
    forceDebuggerActivation();
  }, 500);
  
  setTimeout(() => {
    forceValidatorActivation();
  }, 1000);
  
  setTimeout(() => {
    testDebuggingFunctionality();
  }, 1500);
  
  setTimeout(() => {
    createDebuggingUI();
  }, 2000);
  
  setTimeout(() => {
    setupJune3rdTest();
  }, 2500);
  
  setTimeout(() => {
    const duration = Date.now() - startTime;
    const errors = window.forceDebugActivation.errors.length;
    
    console.log('\n📊 FORCE ACTIVATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Duration: ${duration}ms`);
    console.log(`Errors: ${errors}`);
    console.log(`Steps completed: ${window.forceDebugActivation.activationSteps.length}`);
    
    if (errors === 0) {
      console.log('✅ FORCE ACTIVATION SUCCESSFUL!');
      console.log('🎯 Ready for June 3rd displacement testing');
      window.forceDebugActivation.isActive = true;
    } else {
      console.error('⚠️ FORCE ACTIVATION COMPLETED WITH ERRORS');
      console.error('📋 Check window.forceDebugActivation.errors for details');
    }
  }, 3000);
}

// Make functions globally available
window.runForceActivation = runForceActivation;
window.checkCurrentState = checkCurrentState;

// Auto-run activation
console.log('🔄 AUTO-RUNNING FORCE ACTIVATION IN 2 SECONDS...');
setTimeout(() => {
  runForceActivation();
}, 2000);

console.log('✅ Force Debugging Activation Script Ready');
console.log('📋 Use window.runForceActivation() to run manually');
console.log('🎯 Use window.testJune3rdScenario() after activation');
console.log('🔄 Auto-activation starting in 2 seconds...');
