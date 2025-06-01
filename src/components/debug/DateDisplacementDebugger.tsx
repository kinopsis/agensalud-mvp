'use client';

/**
 * DATE DISPLACEMENT DEBUGGER COMPONENT
 * Integrates advanced debugging tools for real-time date displacement detection
 * 
 * USAGE: Add to any page where date displacement issues occur
 * CONTROL: Can be enabled/disabled via environment variable or prop
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bug, CheckCircle, XCircle, Activity } from 'lucide-react';

interface DateDisplacementDebuggerProps {
  enabled?: boolean;
  autoStart?: boolean;
  showUI?: boolean;
}

interface DebugEvent {
  id: string;
  timestamp: string;
  type: string;
  component: string;
  data: any;
  isError: boolean;
}

export default function DateDisplacementDebugger({
  enabled = process.env.NODE_ENV === 'development',
  autoStart = true,
  showUI = true
}: DateDisplacementDebuggerProps) {
  const [isActive, setIsActive] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [displacementCount, setDisplacementCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Initialize debugging system
    initializeDebugging();

    if (autoStart) {
      setIsActive(true);
    }

    return () => {
      // Cleanup
      if (window.advancedDateTracker) {
        window.advancedDateTracker.isActive = false;
      }
    };
  }, [enabled, autoStart]);

  const initializeDebugging = () => {
    // CRITICAL FIX: Cleanup any existing debugging scripts to prevent collisions
    const existingDebuggerScripts = document.querySelectorAll('script[data-debugger-type="date-displacement"]');
    existingDebuggerScripts.forEach(script => script.remove());

    // CRITICAL FIX: Use IIFE with unique namespace to prevent variable collisions
    const debuggerScript = `
      (function() {
        'use strict';

        // CRITICAL FIX: Check if already initialized to prevent double initialization
        if (window.advancedDateTracker && window.advancedDateTracker.isActive) {
          console.log('🔄 Advanced Date Tracker already active, skipping initialization');
          return;
        }

        console.log('🚨 ADVANCED DATE DISPLACEMENT DEBUGGER ACTIVATED (ISOLATED SCOPE)');
        console.log('='.repeat(80));

        // Global tracking system with collision protection
        window.advancedDateTracker = {
          events: [],
          formDataHistory: [],
          apiCallHistory: [],
          stateUpdates: [],
          componentRenders: [],
          startTime: Date.now(),
          isActive: true,

          config: {
            maxEvents: 1000,
            trackStackTraces: true,
            trackComponentRenders: true,
            trackApiCalls: true,
            alertOnDisplacement: true
          }
        };

      // Core tracking function with infinite loop prevention
      function trackDateEvent(type, data, component = 'Unknown') {
        if (!window.advancedDateTracker.isActive) return;

        // Prevent infinite loops by limiting rapid successive calls
        const now = Date.now();
        const lastCall = window.advancedDateTracker.lastTrackCall || 0;
        if (now - lastCall < 5) { // Minimum 5ms between calls
          return;
        }
        window.advancedDateTracker.lastTrackCall = now;

        const event = {
          id: now + '-' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          relativeTime: now - window.advancedDateTracker.startTime,
          type,
          component,
          data: JSON.parse(JSON.stringify(data)),
          stackTrace: window.advancedDateTracker.config.trackStackTraces ? new Error().stack : null
        };

        window.advancedDateTracker.events.push(event);

        // Limit events to prevent memory issues
        if (window.advancedDateTracker.events.length > window.advancedDateTracker.config.maxEvents) {
          window.advancedDateTracker.events.shift();
        }

        // Notify React component with additional safety check
        if (window.dateDebuggerCallback && typeof window.dateDebuggerCallback === 'function') {
          try {
            window.dateDebuggerCallback(event);
          } catch (error) {
            console.warn('DateDebugger callback error:', error);
          }
        }
        
        // Log important events
        if (['DATE_DISPLACEMENT_DETECTED', 'FORM_DATA_MISMATCH', 'API_DATE_MISMATCH'].includes(type)) {
          console.error('🚨 CRITICAL: ' + type, event);
        } else {
          console.log('📋 ' + type + ':', event.data);
        }
        
        return event.id;
      }

      // CRITICAL FIX: Enhanced console.log interception with unique variable names
      const dateDebuggerOriginalConsoleLog = console.log;

      // CRITICAL FIX: Check if console.log is already intercepted to prevent double wrapping
      if (!console.log._dateDebuggerIntercepted) {
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

          return dateDebuggerOriginalConsoleLog.apply(this, args);
        };

        // Mark as intercepted to prevent double wrapping
        console.log._dateDebuggerIntercepted = true;
      }

      // Form data change tracking
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
            change.dateFields['previous_' + field] = previousData[field];
          }
          if (newData && newData[field]) {
            change.dateFields['new_' + field] = newData[field];
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

      // Calculate date displacement
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

      // CRITICAL FIX: Enhanced fetch interception with unique variable names
      const dateDebuggerOriginalFetch = window.fetch;

      // CRITICAL FIX: Check if fetch is already intercepted to prevent double wrapping
      if (!window.fetch._dateDebuggerIntercepted) {
        window.fetch = function(url, options = {}) {
          const startTime = Date.now();

          return dateDebuggerOriginalFetch.apply(this, arguments)
            .then(response => {
              const endTime = Date.now();

              // Track API calls that might involve dates
              if (url.includes('availability') || url.includes('appointments') || url.includes('doctors')) {
                trackDateEvent('API_CALL', {
                  url,
                  method: options.method || 'GET',
                  duration: endTime - startTime
                }, 'FetchAPI');
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

        // Mark as intercepted to prevent double wrapping
        window.fetch._dateDebuggerIntercepted = true;
      }

      // Make tracking functions globally available
      window.trackDateEvent = trackDateEvent;
      window.trackFormDataChange = trackFormDataChange;
      window.calculateDateDisplacement = calculateDateDisplacement;

      console.log('✅ Advanced Date Displacement Debugger Ready (Isolated Scope)');

      })(); // CRITICAL FIX: Close IIFE to isolate scope
    `;

    // CRITICAL FIX: Execute the debugging script with proper cleanup and collision prevention
    const script = document.createElement('script');
    script.setAttribute('data-debugger-type', 'date-displacement');
    script.setAttribute('data-component', 'DateDisplacementDebugger');
    script.textContent = debuggerScript;
    document.head.appendChild(script);

    // Set up callback for React component updates with debouncing to prevent infinite loops
    let updateTimeout: NodeJS.Timeout | null = null;

    window.dateDebuggerCallback = (event: any) => {
      // Prevent infinite loops by debouncing updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(() => {
        const debugEvent: DebugEvent = {
          id: event.id,
          timestamp: event.timestamp,
          type: event.type,
          component: event.component,
          data: event.data,
          isError: ['DATE_DISPLACEMENT_DETECTED', 'FORM_DATA_MISMATCH', 'API_DATE_MISMATCH'].includes(event.type)
        };

        // Use functional updates to prevent dependency issues
        setEvents(prev => {
          const newEvents = [...prev, debugEvent];
          // Keep only last 100 events for UI performance
          return newEvents.slice(-100);
        });

        if (debugEvent.isError) {
          setDisplacementCount(prev => prev + 1);
        }

        updateTimeout = null;
      }, 10); // Small delay to batch updates
    };
  };

  const clearEvents = () => {
    setEvents([]);
    setDisplacementCount(0);
    if (window.advancedDateTracker) {
      window.advancedDateTracker.events = [];
      window.advancedDateTracker.formDataHistory = [];
      window.advancedDateTracker.apiCallHistory = [];
    }
  };

  const exportDebugData = () => {
    const data = {
      events,
      displacementCount,
      timestamp: new Date().toISOString(),
      trackerData: window.advancedDateTracker || null
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `date-displacement-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!enabled || !showUI) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-lg transition-all duration-300 ${
      isMinimized ? 'w-64 h-12' : 'w-96 h-80'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bug className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">Date Debugger</span>
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        
        <div className="flex items-center space-x-2">
          {displacementCount > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{displacementCount}</span>
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
              {isActive ? 'Active' : 'Inactive'}
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={clearEvents}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear
              </button>
              <button
                onClick={exportDebugData}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Export
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="h-48 overflow-y-auto border border-gray-200 rounded text-xs">
            {events.length === 0 ? (
              <div className="p-3 text-gray-500 text-center">
                No events captured yet. Interact with date components to see debug data.
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {events.slice(-20).map((event) => (
                  <div
                    key={event.id}
                    className={`p-2 rounded ${
                      event.isError 
                        ? 'bg-red-50 border border-red-200' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${event.isError ? 'text-red-700' : 'text-gray-700'}`}>
                        {event.type}
                      </span>
                      {event.isError ? (
                        <XCircle className="w-3 h-3 text-red-500" />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <div className="text-gray-600 mt-1">
                      {event.component} - {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                    {event.data && (
                      <div className="text-gray-500 mt-1 truncate">
                        {JSON.stringify(event.data).substring(0, 100)}...
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
