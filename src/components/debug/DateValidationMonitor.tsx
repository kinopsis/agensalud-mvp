'use client';

/**
 * DATE VALIDATION MONITOR COMPONENT
 * Real-time validation and monitoring of date operations
 * 
 * Integrates the comprehensive-date-displacement-validator.js functionality
 */

import React, { useEffect, useState } from 'react';
import { Shield, AlertCircle, CheckCircle, Activity, Download, RefreshCw } from 'lucide-react';

interface ValidationResult {
  id: string;
  timestamp: string;
  operation: string;
  component: string;
  input: any;
  output: any;
  expected: any;
  isValid: boolean;
  displacement: {
    detected: boolean;
    originalDate?: string;
    resultDate?: string;
    daysDifference?: number;
  };
}

interface ValidationStats {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  displacementEvents: number;
  successRate: number;
}

export default function DateValidationMonitor() {
  const [isActive, setIsActive] = useState(true);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [stats, setStats] = useState<ValidationStats>({
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    displacementEvents: 0,
    successRate: 0
  });
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    initializeValidationMonitor();
    
    // Auto-run validation every 5 minutes (reduced frequency to prevent excessive API calls)
    const interval = setInterval(() => {
      if (isActive) {
        runValidationSuite();
      }
    }, 300000); // 5 minutes instead of 30 seconds

    return () => {
      clearInterval(interval);
      if (window.dateDisplacementValidator) {
        window.dateDisplacementValidator.isActive = false;
      }
    };
  }, [isActive]);

  const initializeValidationMonitor = () => {
    // CRITICAL FIX: Cleanup any existing validation scripts to prevent collisions
    const existingValidatorScripts = document.querySelectorAll('script[data-debugger-type="date-validation"]');
    existingValidatorScripts.forEach(script => script.remove());

    // CRITICAL FIX: Use IIFE with unique namespace to prevent variable collisions
    const validatorScript = `
      (function() {
        'use strict';

        // CRITICAL FIX: Check if already initialized to prevent double initialization
        if (window.dateDisplacementValidator && window.dateDisplacementValidator.isActive) {
          console.log('🔄 Date Displacement Validator already active, skipping initialization');
          return;
        }

        console.log('🚨 COMPREHENSIVE DATE DISPLACEMENT VALIDATOR ACTIVATED (ISOLATED SCOPE)');

        // Global validation system with collision protection
        window.dateDisplacementValidator = {
          validationResults: [],
          testResults: [],
          componentStatus: {},
          startTime: Date.now(),
          isActive: true,

          config: {
            testDates: [
              '2025-06-03', // The problematic date from screenshot
              '2025-06-04', // Next day (displacement target)
              '2025-06-05', // Future date
              '2025-06-02', // Previous day
              '2025-06-01'  // Week start
            ],
            expectedBehavior: {
              '2025-06-03': 'should_show_slots_for_2025-06-03',
              '2025-06-04': 'should_show_slots_for_2025-06-04',
              '2025-06-05': 'should_show_slots_for_2025-06-05'
            }
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
            resultDate: output,
            daysDifference: calculateDaysDifference(input, output)
          } : { detected: false }
        };
        
        window.dateDisplacementValidator.validationResults.push(validation);
        
        // Notify React component
        if (window.validationCallback) {
          window.validationCallback(validation);
        }
        
        // Log results
        if (!validation.isValid || validation.displacement.detected) {
          console.error('🚨 VALIDATION FAILED: ' + operation, validation);
        } else {
          console.log('✅ VALIDATION PASSED: ' + operation, {
            component,
            input,
            output,
            expected
          });
        }
        
        return validation;
      }

      // Calculate date difference
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

      // Test time slot display consistency
      function testTimeSlotDisplay() {
        const timeSlotHeaders = document.querySelectorAll('[class*="title"], h1, h2, h3, h4, h5, h6');
        const results = [];
        
        timeSlotHeaders.forEach(header => {
          const text = header.textContent || '';
          
          if (text.includes('Horarios disponibles para')) {
            const dateMatch = text.match(/(\\d{4}-\\d{2}-\\d{2})/);
            
            if (dateMatch) {
              const displayedDate = dateMatch[1];
              console.log('📅 Found time slot header: "' + text + '"');
              console.log('📊 Displayed date: ' + displayedDate);
              
              results.push({
                headerText: text,
                displayedDate: displayedDate,
                element: header
              });
            }
          }
        });
        
        return results;
      }

      // Test calendar date generation
      function testCalendarDateGeneration() {
        const calendarElements = document.querySelectorAll('[class*="calendar"], [class*="availability"], [class*="week"]');
        const results = [];
        
        calendarElements.forEach((element, index) => {
          const dateElements = element.querySelectorAll('[data-date], [class*="date"]');
          
          dateElements.forEach(dateEl => {
            const date = dateEl.getAttribute('data-date') || dateEl.textContent;
            if (date && /\\d{4}-\\d{2}-\\d{2}/.test(date)) {
              results.push({
                elementIndex: index,
                date: date,
                element: dateEl
              });
            }
          });
        });
        
        return results;
      }

      // Comprehensive validation suite
      function runComprehensiveValidation() {
        const results = {
          timeSlotDisplay: testTimeSlotDisplay(),
          calendarGeneration: testCalendarDateGeneration(),
          timestamp: new Date().toISOString()
        };
        
        window.dateDisplacementValidator.testResults.push(results);
        
        // Generate summary
        const totalValidations = window.dateDisplacementValidator.validationResults.length;
        const failedValidations = window.dateDisplacementValidator.validationResults.filter(v => !v.isValid).length;
        const displacementEvents = window.dateDisplacementValidator.validationResults.filter(v => v.displacement.detected).length;
        
        const summary = {
          totalValidations,
          successfulValidations: totalValidations - failedValidations,
          failedValidations,
          displacementEvents,
          successRate: totalValidations > 0 ? ((totalValidations - failedValidations) / totalValidations * 100) : 0
        };
        
        if (window.statsCallback) {
          window.statsCallback(summary);
        }
        
        return results;
      }

      // CRITICAL FIX: DOM monitoring for real-time updates with unique variable names
      const dateValidatorMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;

                // Check for time slot headers
                if (element.textContent && element.textContent.includes('Horarios disponibles para')) {
                  const dateMatch = element.textContent.match(/(\\d{4}-\\d{2}-\\d{2})/);
                  if (dateMatch) {
                    console.log('🔄 Time slot header updated: ' + element.textContent);
                    console.log('📊 Date detected: ' + dateMatch[1]);

                    // Get clicked date from global state if available
                    const clickedDate = window.lastClickedDate ? window.lastClickedDate.date : 'unknown';

                    // Validate if this matches expected behavior
                    validateDateOperation(
                      'TimeSlotHeaderUpdate',
                      clickedDate, // Use actual clicked date instead of 'unknown'
                      dateMatch[1],
                      'TimeSlotDisplay',
                      clickedDate // Expected date should match clicked date
                    );
                  }
                }
              }
            });
          }
        });
      });

      // CRITICAL FIX: Check if observer is already active to prevent multiple observers
      if (!window._dateValidatorObserverActive) {
        dateValidatorMutationObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
        window._dateValidatorObserverActive = true;
      }

      // Make functions globally available
      window.validateDateOperation = validateDateOperation;
      window.testTimeSlotDisplay = testTimeSlotDisplay;
      window.testCalendarDateGeneration = testCalendarDateGeneration;
      window.runComprehensiveValidation = runComprehensiveValidation;

      console.log('✅ Comprehensive Date Displacement Validator Ready (Isolated Scope)');

      })(); // CRITICAL FIX: Close IIFE to isolate scope
    `;

    // CRITICAL FIX: Execute the validation script with proper cleanup and collision prevention
    const script = document.createElement('script');
    script.setAttribute('data-debugger-type', 'date-validation');
    script.setAttribute('data-component', 'DateValidationMonitor');
    script.textContent = validatorScript;
    document.head.appendChild(script);

    // Set up callbacks for React component updates
    window.validationCallback = (validation: any) => {
      setValidationResults(prev => {
        const newResults = [...prev, validation];
        return newResults.slice(-50); // Keep only last 50 for performance
      });
    };

    window.statsCallback = (stats: ValidationStats) => {
      setStats(stats);
    };
  };

  const runValidationSuite = () => {
    if (window.runComprehensiveValidation) {
      window.runComprehensiveValidation();
    }
  };

  const clearResults = () => {
    setValidationResults([]);
    setStats({
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      displacementEvents: 0,
      successRate: 0
    });
    
    if (window.dateDisplacementValidator) {
      window.dateDisplacementValidator.validationResults = [];
      window.dateDisplacementValidator.testResults = [];
    }
  };

  const exportValidationData = () => {
    const data = {
      validationResults,
      stats,
      timestamp: new Date().toISOString(),
      validatorData: window.dateDisplacementValidator || null
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `date-validation-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed bottom-4 left-4 z-50 bg-white border-2 border-blue-300 rounded-lg shadow-lg transition-all duration-300 ${
      isMinimized ? 'w-64 h-12' : 'w-96 h-80'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-200 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">Validation Monitor</span>
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        
        <div className="flex items-center space-x-2">
          {stats.displacementEvents > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{stats.displacementEvents}</span>
            </div>
          )}
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isMinimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-green-50 p-2 rounded">
              <div className="text-green-700 font-medium">Success Rate</div>
              <div className="text-green-600">{stats.successRate.toFixed(1)}%</div>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <div className="text-red-700 font-medium">Displacements</div>
              <div className="text-red-600">{stats.displacementEvents}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1 text-xs rounded ${
                isActive 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {isActive ? 'Monitoring' : 'Paused'}
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={runValidationSuite}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                title="Run Validation"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={clearResults}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear
              </button>
              <button
                onClick={exportValidationData}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                title="Export Data"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Validation Results */}
          <div className="h-40 overflow-y-auto border border-gray-200 rounded text-xs">
            {validationResults.length === 0 ? (
              <div className="p-3 text-gray-500 text-center">
                No validation results yet. Click "Run Validation" or interact with date components.
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {validationResults.slice(-15).map((result) => (
                  <div
                    key={result.id}
                    className={`p-2 rounded ${
                      !result.isValid || result.displacement.detected
                        ? 'bg-red-50 border border-red-200' 
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        !result.isValid || result.displacement.detected ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {result.operation}
                      </span>
                      {!result.isValid || result.displacement.detected ? (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <div className="text-gray-600 mt-1">
                      {result.component} - {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                    {result.displacement.detected && (
                      <div className="text-red-600 mt-1">
                        Displacement: {result.displacement.originalDate} → {result.displacement.resultDate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
