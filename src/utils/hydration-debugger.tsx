/**
 * Hydration Debugger Utility
 *
 * Helps identify and debug hydration mismatches in Next.js applications
 * Provides detailed logging and detection of common hydration issues
 */

import React from 'react';

export interface HydrationIssue {
  type: 'date' | 'random' | 'conditional' | 'browser-only' | 'state' | 'unknown';
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Detects common hydration issues
 */
export class HydrationDebugger {
  private static issues: HydrationIssue[] = [];
  private static isClient = typeof window !== 'undefined';

  /**
   * Check for date-related hydration issues
   */
  static checkDateHydration(): HydrationIssue | null {
    if (!this.isClient) return null;

    // Check if there are any date objects being rendered differently
    const dateElements = document.querySelectorAll('[data-date], [data-time]');
    if (dateElements.length > 0) {
      return {
        type: 'date',
        description: 'Date/time elements detected that may cause hydration mismatches',
        suggestion: 'Use useEffect to render dates on client-side only, or format dates consistently',
        severity: 'high'
      };
    }
    return null;
  }

  /**
   * Check for random value hydration issues
   */
  static checkRandomValues(): HydrationIssue | null {
    // Check for common random value patterns in the DOM
    if (!this.isClient) return null;

    const randomElements = document.querySelectorAll('[id*="random"], [class*="random"], [data-random]');
    if (randomElements.length > 0) {
      return {
        type: 'random',
        description: 'Elements with random values detected',
        suggestion: 'Generate random values in useEffect or use stable IDs',
        severity: 'critical'
      };
    }
    return null;
  }

  /**
   * Check for conditional rendering issues
   */
  static checkConditionalRendering(): HydrationIssue | null {
    if (!this.isClient) return null;

    // Look for elements that might be conditionally rendered
    const conditionalElements = document.querySelectorAll('[data-conditional], .conditional');
    if (conditionalElements.length > 0) {
      return {
        type: 'conditional',
        description: 'Conditional rendering detected that may differ between server and client',
        suggestion: 'Use suppressHydrationWarning or ensure conditions are consistent',
        severity: 'medium'
      };
    }
    return null;
  }

  /**
   * Check for browser-only APIs
   */
  static checkBrowserOnlyAPIs(): HydrationIssue | null {
    // Common browser-only APIs that cause hydration issues
    const browserAPIs = [
      'localStorage',
      'sessionStorage',
      'navigator',
      'location',
      'document.cookie'
    ];

    // This is a static check - in real implementation, you'd scan the code
    return {
      type: 'browser-only',
      description: 'Browser-only APIs may be used during SSR',
      suggestion: 'Wrap browser API usage in useEffect or check typeof window !== "undefined"',
      severity: 'high'
    };
  }

  /**
   * Run all hydration checks
   */
  static runAllChecks(): HydrationIssue[] {
    const issues: HydrationIssue[] = [];

    const checks = [
      this.checkDateHydration(),
      this.checkRandomValues(),
      this.checkConditionalRendering(),
      this.checkBrowserOnlyAPIs()
    ];

    checks.forEach(issue => {
      if (issue) issues.push(issue);
    });

    this.issues = issues;
    return issues;
  }

  /**
   * Log hydration issues to console
   */
  static logIssues(): void {
    if (this.issues.length === 0) {
      console.log('✅ No hydration issues detected');
      return;
    }

    console.group('🚨 Hydration Issues Detected');
    this.issues.forEach((issue, index) => {
      const emoji = issue.severity === 'critical' ? '🔴' : 
                   issue.severity === 'high' ? '🟠' : 
                   issue.severity === 'medium' ? '🟡' : '🟢';
      
      console.group(`${emoji} Issue ${index + 1}: ${issue.type}`);
      console.log('Description:', issue.description);
      console.log('Suggestion:', issue.suggestion);
      console.log('Severity:', issue.severity);
      console.groupEnd();
    });
    console.groupEnd();
  }

  /**
   * Create a hydration-safe component wrapper
   */
  static createHydrationSafeWrapper<T>(
    Component: React.ComponentType<T>,
    fallback?: React.ReactNode
  ): React.ComponentType<T> {
    return function HydrationSafeWrapper(props: T) {
      const [isClient, setIsClient] = React.useState(false);

      React.useEffect(() => {
        setIsClient(true);
      }, []);

      if (!isClient) {
        return fallback || null;
      }

      return React.createElement(Component, props);
    };
  }

  /**
   * Suppress hydration warning for specific elements
   */
  static suppressHydrationWarning(element: React.ReactElement): React.ReactElement {
    return React.cloneElement(element, {
      suppressHydrationWarning: true,
      ...element.props
    });
  }
}

/**
 * Hook for detecting hydration issues
 */
export function useHydrationDebugger(): {
  isClient: boolean;
  issues: HydrationIssue[];
  runChecks: () => void;
} {
  const [isClient, setIsClient] = React.useState(false);
  const [issues, setIssues] = React.useState<HydrationIssue[]>([]);

  React.useEffect(() => {
    setIsClient(true);
    
    // Run checks after hydration
    setTimeout(() => {
      const detectedIssues = HydrationDebugger.runAllChecks();
      setIssues(detectedIssues);
      
      if (process.env.NODE_ENV === 'development') {
        HydrationDebugger.logIssues();
      }
    }, 100);
  }, []);

  const runChecks = React.useCallback(() => {
    const detectedIssues = HydrationDebugger.runAllChecks();
    setIssues(detectedIssues);
    HydrationDebugger.logIssues();
  }, []);

  return { isClient, issues, runChecks };
}

/**
 * Component for displaying hydration debug info in development
 */
export function HydrationDebugPanel(): React.ReactElement | null {
  const { isClient, issues, runChecks } = useHydrationDebugger();

  if (process.env.NODE_ENV !== 'development' || !isClient) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#1a1a1a',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
        🔍 Hydration Debugger
      </div>
      <div>Issues: {issues.length}</div>
      <button 
        onClick={runChecks}
        style={{
          background: '#0070f3',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer',
          marginTop: '5px'
        }}
      >
        Run Checks
      </button>
    </div>
  );
}

export default HydrationDebugger;
