/**
 * Webpack Module Loading Diagnostics
 * 
 * Provides utilities to detect and prevent webpack module loading failures
 * Helps identify circular dependencies and import issues before they cause problems
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React from 'react';

export interface ModuleLoadingError {
  type: 'CIRCULAR_DEPENDENCY' | 'MISSING_EXPORT' | 'IMPORT_ERROR' | 'FACTORY_ERROR';
  module: string;
  error: string;
  stack?: string;
  timestamp: string;
}

export interface WebpackDiagnostics {
  errors: ModuleLoadingError[];
  warnings: string[];
  moduleCount: number;
  loadTime: number;
  isHealthy: boolean;
}

/**
 * Webpack Module Loading Diagnostics
 */
export class WebpackModuleDiagnostics {
  private static errors: ModuleLoadingError[] = [];
  private static startTime = Date.now();
  
  /**
   * Initialize webpack diagnostics
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;
    
    // Monitor webpack module loading errors
    this.setupErrorHandlers();
    
    // Monitor module factory errors
    this.setupModuleFactoryMonitoring();
    
    console.log('🔧 Webpack Module Diagnostics initialized');
  }
  
  /**
   * Setup error handlers for webpack module loading
   */
  private static setupErrorHandlers(): void {
    // Global error handler for module loading failures
    window.addEventListener('error', (event) => {
      if (this.isWebpackModuleError(event.error)) {
        this.recordError({
          type: 'FACTORY_ERROR',
          module: this.extractModuleName(event.error),
          error: event.error.message,
          stack: event.error.stack,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Unhandled promise rejections (often from dynamic imports)
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isWebpackModuleError(event.reason)) {
        this.recordError({
          type: 'IMPORT_ERROR',
          module: this.extractModuleName(event.reason),
          error: event.reason.message,
          stack: event.reason.stack,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  /**
   * Setup monitoring for webpack module factory errors
   */
  private static setupModuleFactoryMonitoring(): void {
    // Monitor webpack require function if available
    if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
      const originalRequire = (window as any).__webpack_require__;
      
      (window as any).__webpack_require__ = function(moduleId: string) {
        try {
          return originalRequire.call(this, moduleId);
        } catch (error) {
          WebpackModuleDiagnostics.recordError({
            type: 'FACTORY_ERROR',
            module: moduleId,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      };
    }
  }
  
  /**
   * Check if error is related to webpack module loading
   */
  private static isWebpackModuleError(error: any): boolean {
    if (!error || !error.message) return false;
    
    const webpackErrorPatterns = [
      'Cannot read properties of undefined (reading \'call\')',
      'Module not found',
      'Circular dependency',
      'options.factory',
      '__webpack_require__',
      'requireAsyncModule'
    ];
    
    return webpackErrorPatterns.some(pattern => 
      error.message.includes(pattern) || 
      (error.stack && error.stack.includes(pattern))
    );
  }
  
  /**
   * Extract module name from error
   */
  private static extractModuleName(error: any): string {
    if (!error) return 'unknown';
    
    // Try to extract module name from stack trace
    if (error.stack) {
      const moduleMatch = error.stack.match(/at\s+(.+?)\s+\(/);
      if (moduleMatch) return moduleMatch[1];
      
      const fileMatch = error.stack.match(/\/([^\/]+\.tsx?)/);
      if (fileMatch) return fileMatch[1];
    }
    
    return 'unknown';
  }
  
  /**
   * Record a module loading error
   */
  static recordError(error: ModuleLoadingError): void {
    this.errors.push(error);
    
    // Keep only last 50 errors to prevent memory issues
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
    
    console.error('🚨 Webpack Module Error:', error);
  }
  
  /**
   * Get current diagnostics
   */
  static getDiagnostics(): WebpackDiagnostics {
    const moduleCount = this.getModuleCount();
    const loadTime = Date.now() - this.startTime;
    
    return {
      errors: [...this.errors],
      warnings: this.getWarnings(),
      moduleCount,
      loadTime,
      isHealthy: this.errors.length === 0
    };
  }
  
  /**
   * Get webpack module count
   */
  private static getModuleCount(): number {
    if (typeof window === 'undefined') return 0;
    
    try {
      const webpack = (window as any).__webpack_require__;
      if (webpack && webpack.cache) {
        return Object.keys(webpack.cache).length;
      }
    } catch (error) {
      // Ignore errors when accessing webpack internals
    }
    
    return 0;
  }
  
  /**
   * Get current warnings
   */
  private static getWarnings(): string[] {
    const warnings: string[] = [];
    
    // Check for potential circular dependencies
    if (this.errors.some(e => e.type === 'CIRCULAR_DEPENDENCY')) {
      warnings.push('Circular dependencies detected');
    }
    
    // Check for high error rate
    if (this.errors.length > 10) {
      warnings.push('High module loading error rate');
    }
    
    return warnings;
  }
  
  /**
   * Clear all recorded errors
   */
  static clearErrors(): void {
    this.errors = [];
    console.log('🧹 Webpack module errors cleared');
  }
  
  /**
   * Check if a specific module is causing issues
   */
  static isModuleProblematic(moduleName: string): boolean {
    return this.errors.some(error => 
      error.module.includes(moduleName)
    );
  }
  
  /**
   * Get errors for a specific module
   */
  static getModuleErrors(moduleName: string): ModuleLoadingError[] {
    return this.errors.filter(error => 
      error.module.includes(moduleName)
    );
  }
  
  /**
   * Export diagnostics data for debugging
   */
  static exportDiagnostics(): string {
    const diagnostics = this.getDiagnostics();
    return JSON.stringify(diagnostics, null, 2);
  }
}

/**
 * Hook for using webpack diagnostics in React components
 */
export function useWebpackDiagnostics() {
  const [diagnostics, setDiagnostics] = React.useState<WebpackDiagnostics | null>(null);
  
  React.useEffect(() => {
    // Initialize diagnostics
    WebpackModuleDiagnostics.initialize();
    
    // Update diagnostics periodically
    const interval = setInterval(() => {
      setDiagnostics(WebpackModuleDiagnostics.getDiagnostics());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    diagnostics,
    clearErrors: WebpackModuleDiagnostics.clearErrors,
    exportDiagnostics: WebpackModuleDiagnostics.exportDiagnostics,
    isModuleProblematic: WebpackModuleDiagnostics.isModuleProblematic
  };
}

// Auto-initialize in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  WebpackModuleDiagnostics.initialize();
}

export default WebpackModuleDiagnostics;
