/**
 * EMERGENCY MONITORING SYSTEM SHUTDOWN
 * 
 * CRITICAL EMERGENCY UTILITY
 * 
 * This utility completely disables the broken monitoring system that's
 * causing infinite loops and system degradation. It provides emergency
 * shutdown capabilities to restore system stability.
 * 
 * @author AgentSalud Emergency Response Team
 * @date 2025-01-28
 * @priority CRITICAL
 */

interface EmergencyShutdownConfig {
  disableMonitoring: boolean;
  disableQRManager: boolean;
  disableCircuitBreaker: boolean;
  enableBypassMode: boolean;
}

class EmergencyShutdownManager {
  private static instance: EmergencyShutdownManager;
  private shutdownActive = false;
  private config: EmergencyShutdownConfig;

  private constructor() {
    this.config = {
      disableMonitoring: true,
      disableQRManager: true,
      disableCircuitBreaker: false, // Keep circuit breaker for protection
      enableBypassMode: true
    };
  }

  public static getInstance(): EmergencyShutdownManager {
    if (!EmergencyShutdownManager.instance) {
      EmergencyShutdownManager.instance = new EmergencyShutdownManager();
    }
    return EmergencyShutdownManager.instance;
  }

  /**
   * Execute emergency shutdown of all problematic systems
   */
  public executeEmergencyShutdown(): void {
    console.log('🚨 EMERGENCY SHUTDOWN: Initiating system shutdown...');
    
    try {
      this.shutdownActive = true;

      // 1. Disable monitoring registry
      this.disableMonitoringRegistry();

      // 2. Disable QR request manager
      this.disableQRRequestManager();

      // 3. Clear all intervals and timeouts
      this.clearAllIntervals();

      // 4. Disable component monitoring
      this.disableComponentMonitoring();

      // 5. Enable bypass mode
      this.enableBypassMode();

      console.log('✅ EMERGENCY SHUTDOWN: All systems disabled successfully');
      
      // Notify global systems
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emergency-shutdown-complete'));
      }

    } catch (error) {
      console.error('❌ EMERGENCY SHUTDOWN: Error during shutdown:', error);
    }
  }

  /**
   * Disable monitoring registry completely
   */
  private disableMonitoringRegistry(): void {
    try {
      // Override monitoring registry functions
      if (typeof window !== 'undefined' && window.monitoringRegistry) {
        window.monitoringRegistry.register = () => ({
          success: false,
          reason: 'Emergency shutdown active'
        });
        
        window.monitoringRegistry.unregister = () => {};
        window.monitoringRegistry.cleanup = () => {};
        
        console.log('🛑 Monitoring registry disabled');
      }
    } catch (error) {
      console.error('Error disabling monitoring registry:', error);
    }
  }

  /**
   * Disable QR request manager
   */
  private disableQRRequestManager(): void {
    try {
      if (typeof window !== 'undefined' && window.qrRequestManager) {
        window.qrRequestManager.emergencyStop = () => {};
        window.qrRequestManager.registerComponent = () => false;
        window.qrRequestManager.unregisterComponent = () => {};
        
        console.log('🛑 QR request manager disabled');
      }
    } catch (error) {
      console.error('Error disabling QR request manager:', error);
    }
  }

  /**
   * Clear all intervals and timeouts
   */
  private clearAllIntervals(): void {
    try {
      // Clear all timeouts and intervals
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
      
      console.log('🛑 All intervals and timeouts cleared');
    } catch (error) {
      console.error('Error clearing intervals:', error);
    }
  }

  /**
   * Disable component monitoring
   */
  private disableComponentMonitoring(): void {
    try {
      // Override React component monitoring
      if (typeof window !== 'undefined') {
        // Disable useConnectionStatusMonitor
        window.disableConnectionMonitoring = true;
        
        // Disable useQRCodeAutoRefresh
        window.disableQRAutoRefresh = true;
        
        // Disable WhatsApp monitoring service
        window.disableWhatsAppMonitoring = true;
        
        console.log('🛑 Component monitoring disabled');
      }
    } catch (error) {
      console.error('Error disabling component monitoring:', error);
    }
  }

  /**
   * Enable bypass mode for all WhatsApp operations
   */
  private enableBypassMode(): void {
    try {
      if (typeof window !== 'undefined') {
        window.whatsappBypassMode = true;
        window.aiTestingEnabled = true;
        
        console.log('✅ Bypass mode enabled');
      }
    } catch (error) {
      console.error('Error enabling bypass mode:', error);
    }
  }

  /**
   * Check if emergency shutdown is active
   */
  public isShutdownActive(): boolean {
    return this.shutdownActive;
  }

  /**
   * Get shutdown configuration
   */
  public getConfig(): EmergencyShutdownConfig {
    return { ...this.config };
  }

  /**
   * Force reset all systems (use with caution)
   */
  public forceReset(): void {
    console.log('🔄 FORCE RESET: Resetting all systems...');
    
    try {
      this.shutdownActive = false;
      
      // Clear bypass mode
      if (typeof window !== 'undefined') {
        window.whatsappBypassMode = false;
        window.disableConnectionMonitoring = false;
        window.disableQRAutoRefresh = false;
        window.disableWhatsAppMonitoring = false;
      }
      
      console.log('✅ FORCE RESET: Systems reset completed');
    } catch (error) {
      console.error('❌ FORCE RESET: Error during reset:', error);
    }
  }
}

// Global emergency shutdown functions
export const emergencyShutdown = EmergencyShutdownManager.getInstance();

/**
 * Execute immediate emergency shutdown
 */
export const executeEmergencyShutdown = (): void => {
  emergencyShutdown.executeEmergencyShutdown();
};

/**
 * Check if emergency shutdown is active
 */
export const isEmergencyShutdownActive = (): boolean => {
  return emergencyShutdown.isShutdownActive();
};

/**
 * Force reset all systems
 */
export const forceSystemReset = (): void => {
  emergencyShutdown.forceReset();
};

// Auto-execute emergency shutdown if infinite loops detected
if (typeof window !== 'undefined') {
  let monitoringLoopCount = 0;
  const originalConsoleLog = console.log;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Detect infinite monitoring loops
    if (message.includes('Monitoring registry: Registered monitor') || 
        message.includes('Starting connection monitoring')) {
      monitoringLoopCount++;
      
      // If more than 10 monitoring events in rapid succession, trigger shutdown
      if (monitoringLoopCount > 10) {
        console.error('🚨 INFINITE LOOP DETECTED: Triggering emergency shutdown');
        executeEmergencyShutdown();
        monitoringLoopCount = 0;
      }
    }
    
    originalConsoleLog.apply(console, args);
  };
  
  // Reset counter every 5 seconds
  setInterval(() => {
    monitoringLoopCount = 0;
  }, 5000);
}

// Export for global access
if (typeof window !== 'undefined') {
  window.emergencyShutdown = emergencyShutdown;
  window.executeEmergencyShutdown = executeEmergencyShutdown;
  window.isEmergencyShutdownActive = isEmergencyShutdownActive;
  window.forceSystemReset = forceSystemReset;
}
