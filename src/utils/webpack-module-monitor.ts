/**
 * Webpack Module Loading Monitor
 * 
 * Real-time monitoring and prevention of webpack module loading failures
 * Specifically designed to catch and handle the "Cannot read properties of undefined (reading 'call')" error
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

export interface ModuleLoadingEvent {
  type: 'SUCCESS' | 'ERROR' | 'WARNING';
  module: string;
  timestamp: number;
  error?: string;
  stack?: string;
  context?: string;
}

export interface ModuleHealthMetrics {
  totalAttempts: number;
  successfulLoads: number;
  failedLoads: number;
  errorRate: number;
  lastError?: ModuleLoadingEvent;
  problematicModules: string[];
}

/**
 * Webpack Module Loading Monitor
 */
export class WebpackModuleMonitor {
  private static instance: WebpackModuleMonitor | null = null;
  private events: ModuleLoadingEvent[] = [];
  private isInitialized = false;
  private maxEvents = 100;
  private errorThreshold = 0.1; // 10% error rate threshold

  private constructor() {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebpackModuleMonitor {
    if (!WebpackModuleMonitor.instance) {
      WebpackModuleMonitor.instance = new WebpackModuleMonitor();
    }
    return WebpackModuleMonitor.instance;
  }

  /**
   * Initialize monitoring
   */
  private initialize(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;

    console.log('🔧 Webpack Module Monitor: Initializing...');

    // Monitor global errors
    this.setupGlobalErrorHandling();
    
    // Monitor webpack require function
    this.setupWebpackRequireMonitoring();
    
    // Monitor dynamic imports
    this.setupDynamicImportMonitoring();

    this.isInitialized = true;
    console.log('✅ Webpack Module Monitor: Initialized successfully');
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      if (this.isWebpackModuleError(event.error)) {
        this.recordEvent({
          type: 'ERROR',
          module: this.extractModuleName(event.error),
          timestamp: Date.now(),
          error: event.error.message,
          stack: event.error.stack,
          context: 'global-error'
        });
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (this.isWebpackModuleError(event.reason)) {
        this.recordEvent({
          type: 'ERROR',
          module: this.extractModuleName(event.reason),
          timestamp: Date.now(),
          error: event.reason.message,
          stack: event.reason.stack,
          context: 'unhandled-rejection'
        });
      }
    });
  }

  /**
   * Setup webpack require monitoring
   */
  private setupWebpackRequireMonitoring(): void {
    if ((window as any).__webpack_require__) {
      const originalRequire = (window as any).__webpack_require__;
      
      (window as any).__webpack_require__ = (moduleId: string) => {
        try {
          const result = originalRequire.call(this, moduleId);
          
          this.recordEvent({
            type: 'SUCCESS',
            module: moduleId,
            timestamp: Date.now(),
            context: 'webpack-require'
          });
          
          return result;
        } catch (error: any) {
          this.recordEvent({
            type: 'ERROR',
            module: moduleId,
            timestamp: Date.now(),
            error: error.message,
            stack: error.stack,
            context: 'webpack-require'
          });
          throw error;
        }
      };
    }
  }

  /**
   * Setup dynamic import monitoring
   *
   * Note: Direct interception of dynamic imports is not possible in browser environments
   * due to security restrictions and the fact that import() is a language feature, not a function.
   * Instead, we monitor webpack chunk loading events and module resolution failures.
   */
  private setupDynamicImportMonitoring(): void {
    // Monitor webpack chunk loading events if available
    if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
      this.setupWebpackChunkMonitoring();
    }

    // Monitor unhandled promise rejections that might be from failed dynamic imports
    this.setupPromiseRejectionMonitoring();

    // Expose monitor to global scope for manual tracking if needed
    (window as any).__webpackModuleMonitor = {
      recordSuccess: (module: string) => {
        this.recordEvent({
          type: 'SUCCESS',
          module,
          timestamp: Date.now(),
          context: 'dynamic-import'
        });
      },
      recordError: (module: string, error: any) => {
        this.recordEvent({
          type: 'ERROR',
          module,
          timestamp: Date.now(),
          error: error.message,
          stack: error.stack,
          context: 'dynamic-import'
        });
      }
    };
  }

  /**
   * Setup webpack chunk loading monitoring
   */
  private setupWebpackChunkMonitoring(): void {
    const webpackRequire = (window as any).__webpack_require__;

    // Monitor webpack chunk loading if the function exists
    if (webpackRequire && webpackRequire.e) {
      const originalEnsure = webpackRequire.e;

      webpackRequire.e = (chunkId: string) => {
        return originalEnsure.call(webpackRequire, chunkId)
          .then((result: any) => {
            this.recordEvent({
              type: 'SUCCESS',
              module: `chunk-${chunkId}`,
              timestamp: Date.now(),
              context: 'webpack-chunk'
            });
            return result;
          })
          .catch((error: any) => {
            this.recordEvent({
              type: 'ERROR',
              module: `chunk-${chunkId}`,
              timestamp: Date.now(),
              error: error.message,
              stack: error.stack,
              context: 'webpack-chunk'
            });
            throw error;
          });
      };
    }
  }

  /**
   * Setup promise rejection monitoring for dynamic import failures
   */
  private setupPromiseRejectionMonitoring(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;

      // Check if this looks like a dynamic import error
      if (this.isDynamicImportError(error)) {
        this.recordEvent({
          type: 'ERROR',
          module: this.extractModuleName(error),
          timestamp: Date.now(),
          error: error.message,
          stack: error.stack,
          context: 'dynamic-import-rejection'
        });
      }
    });
  }

  /**
   * Check if error is likely from a dynamic import failure
   */
  private isDynamicImportError(error: any): boolean {
    if (!error || !error.message) return false;

    const dynamicImportErrorPatterns = [
      'Loading chunk',
      'ChunkLoadError',
      'Failed to import',
      'Module not found',
      'Cannot resolve module'
    ];

    return dynamicImportErrorPatterns.some(pattern =>
      error.message.includes(pattern)
    );
  }

  /**
   * Check if error is webpack module related
   */
  private isWebpackModuleError(error: any): boolean {
    if (!error || !error.message) return false;

    const webpackErrorPatterns = [
      'Cannot read properties of undefined (reading \'call\')',
      'Cannot read property \'call\' of undefined',
      'Module not found',
      'Loading chunk',
      'ChunkLoadError',
      '__webpack_require__',
      'webpackJsonp',
      'options.factory'
    ];

    return webpackErrorPatterns.some(pattern => 
      error.message.includes(pattern) || 
      (error.stack && error.stack.includes(pattern))
    );
  }

  /**
   * Extract module name from error
   */
  private extractModuleName(error: any): string {
    if (!error) return 'unknown';

    // Try to extract from stack trace
    if (error.stack) {
      // Look for file paths
      const fileMatch = error.stack.match(/\/([^\/\s]+\.(tsx?|jsx?|js))/);
      if (fileMatch) return fileMatch[1];

      // Look for webpack module IDs
      const moduleMatch = error.stack.match(/webpack:\/\/\/(.+?):/);
      if (moduleMatch) return moduleMatch[1];

      // Look for function names
      const functionMatch = error.stack.match(/at\s+([^\s]+)/);
      if (functionMatch) return functionMatch[1];
    }

    return 'unknown';
  }

  /**
   * Record a module loading event
   */
  private recordEvent(event: ModuleLoadingEvent): void {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log critical errors
    if (event.type === 'ERROR') {
      console.error('🚨 Webpack Module Error:', event);
      
      // Check if error rate is too high
      const metrics = this.getHealthMetrics();
      if (metrics.errorRate > this.errorThreshold) {
        console.warn('⚠️ High webpack module error rate detected:', metrics);
        this.triggerRecoveryActions();
      }
    }
  }

  /**
   * Get health metrics
   */
  getHealthMetrics(): ModuleHealthMetrics {
    const recentEvents = this.events.filter(e => Date.now() - e.timestamp < 60000); // Last minute
    const totalAttempts = recentEvents.length;
    const successfulLoads = recentEvents.filter(e => e.type === 'SUCCESS').length;
    const failedLoads = recentEvents.filter(e => e.type === 'ERROR').length;
    const errorRate = totalAttempts > 0 ? failedLoads / totalAttempts : 0;

    const errorEvents = recentEvents.filter(e => e.type === 'ERROR');
    const problematicModules = [...new Set(errorEvents.map(e => e.module))];

    return {
      totalAttempts,
      successfulLoads,
      failedLoads,
      errorRate,
      lastError: errorEvents[errorEvents.length - 1],
      problematicModules
    };
  }

  /**
   * Trigger recovery actions for high error rates with loop prevention
   */
  private triggerRecoveryActions(): void {
    const now = Date.now();
    const lastRecovery = (window as any).__lastWebpackRecovery || 0;
    const recoveryInterval = 30000; // 30 seconds minimum between recovery attempts

    // Prevent recovery action loops
    if (now - lastRecovery < recoveryInterval) {
      console.log('🔄 Webpack Module Monitor: Recovery action skipped (too recent)');
      return;
    }

    (window as any).__lastWebpackRecovery = now;
    console.log('🔄 Webpack Module Monitor: Triggering recovery actions...');

    // Clear webpack cache if available
    if ((window as any).__webpack_require__ && (window as any).__webpack_require__.cache) {
      console.log('🧹 Clearing webpack module cache...');
      (window as any).__webpack_require__.cache = {};
    }

    // Clear browser caches (but don't wait for it)
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      }).catch(error => {
        console.warn('Failed to clear browser caches:', error);
      });
    }

    // Get current metrics
    const metrics = this.getHealthMetrics();

    // Only suggest reload for persistent critical issues
    if (metrics.errorRate > 0.8 && metrics.totalAttempts > 5) {
      console.warn('🔄 Critical error rate detected. Page reload may be needed.');

      // Show user notification instead of auto-reload to prevent loops
      this.showRecoveryNotification();
    } else if (metrics.errorRate > 0.5) {
      console.warn('🔄 High error rate detected. Monitoring for improvement...');
    }
  }

  /**
   * Show user notification for manual recovery
   */
  private showRecoveryNotification(): void {
    // Only show notification once per session
    if ((window as any).__webpackRecoveryNotificationShown) {
      return;
    }

    (window as any).__webpackRecoveryNotificationShown = true;

    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f87171;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 300px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">
        ⚠️ Problemas de Carga Detectados
      </div>
      <div style="margin-bottom: 12px;">
        Se han detectado errores en la carga de módulos.
        Recargar la página puede resolver el problema.
      </div>
      <button onclick="window.location.reload()" style="
        background: white;
        color: #f87171;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        margin-right: 8px;
      ">
        Recargar
      </button>
      <button onclick="this.parentElement.remove()" style="
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
      ">
        Cerrar
      </button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 30000);
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit = 10): ModuleLoadingEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
    console.log('🧹 Webpack module events cleared');
  }

  /**
   * Check if a specific module is problematic
   */
  isModuleProblematic(moduleName: string): boolean {
    const recentErrors = this.events
      .filter(e => e.type === 'ERROR' && Date.now() - e.timestamp < 300000) // Last 5 minutes
      .filter(e => e.module.includes(moduleName));

    return recentErrors.length > 2; // More than 2 errors in 5 minutes
  }
}

/**
 * Initialize webpack module monitoring
 */
export function initializeWebpackModuleMonitoring(): WebpackModuleMonitor {
  return WebpackModuleMonitor.getInstance();
}

/**
 * Hook for React components to access webpack module health
 */
export function useWebpackModuleHealth() {
  const monitor = WebpackModuleMonitor.getInstance();
  
  return {
    getHealthMetrics: () => monitor.getHealthMetrics(),
    getRecentEvents: (limit?: number) => monitor.getRecentEvents(limit),
    isModuleProblematic: (moduleName: string) => monitor.isModuleProblematic(moduleName),
    clearEvents: () => monitor.clearEvents()
  };
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  initializeWebpackModuleMonitoring();
}
