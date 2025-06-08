/**
 * Global Monitoring Registry
 * 
 * Prevents multiple monitoring instances for the same WhatsApp instance
 * to avoid infinite loops and resource exhaustion.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

interface MonitoringInstance {
  instanceId: string;
  startTime: number;
  intervalId?: NodeJS.Timeout;
  isActive: boolean;
  componentId: string;
  checkInterval: number;
  lastCheck: number;
  errorCount: number;
  maxErrors: number;
  registrationAttempts: number;
  lastRegistrationAttempt: number;
}

class MonitoringRegistry {
  private monitors: Map<string, MonitoringInstance> = new Map();
  private readonly MAX_MONITORS_PER_INSTANCE = 1;
  private readonly MAX_ERRORS_BEFORE_STOP = 5;
  private readonly MIN_CHECK_INTERVAL = 10000; // 10 seconds minimum
  private readonly MAX_REGISTRATION_ATTEMPTS = 3; // Max attempts per instance
  private readonly REGISTRATION_COOLDOWN = 30000; // 30 seconds cooldown
  private readonly PROBLEMATIC_INSTANCES = new Set([
    '952314d2-d623-4485-b93e-f2b91b83d4c8' // Known problematic instance
  ]);
  
  /**
   * Register a new monitoring instance
   * @param instanceId WhatsApp instance ID
   * @param componentId Unique component identifier
   * @param checkInterval Monitoring interval in milliseconds
   * @returns Registration success and existing monitor info
   */
  register(instanceId: string, componentId: string, checkInterval: number): {
    success: boolean;
    reason?: string;
    existingMonitor?: MonitoringInstance;
  } {
    // CRITICAL FIX: Block problematic instances immediately
    if (this.PROBLEMATIC_INSTANCES.has(instanceId)) {
      console.log(`🚫 Monitoring registry: Instance ${instanceId} is blacklisted (infinite loop protection)`);
      return {
        success: false,
        reason: 'Instance is blacklisted due to infinite loop protection'
      };
    }

    const existingMonitor = this.monitors.get(instanceId);
    const now = Date.now();

    // CRITICAL FIX: Check registration attempts and cooldown
    if (existingMonitor) {
      const timeSinceLastRegistration = now - existingMonitor.lastRegistrationAttempt;

      // If too many registration attempts within cooldown period
      if (existingMonitor.registrationAttempts >= this.MAX_REGISTRATION_ATTEMPTS &&
          timeSinceLastRegistration < this.REGISTRATION_COOLDOWN) {
        console.log(`🚫 Monitoring registry: Instance ${instanceId} in cooldown (${existingMonitor.registrationAttempts} attempts)`);
        return {
          success: false,
          reason: `Too many registration attempts. Cooldown until ${new Date(existingMonitor.lastRegistrationAttempt + this.REGISTRATION_COOLDOWN).toLocaleTimeString()}`,
          existingMonitor
        };
      }

      // Check if existing monitor is still active
      const timeSinceLastCheck = now - existingMonitor.lastCheck;
      const isStale = timeSinceLastCheck > (existingMonitor.checkInterval * 3);

      if (existingMonitor.isActive && !isStale) {
        console.log(`🚫 Monitoring registry: Instance ${instanceId} already being monitored by ${existingMonitor.componentId}`);
        return {
          success: false,
          reason: 'Instance already being monitored',
          existingMonitor
        };
      } else {
        // Clean up stale monitor
        console.log(`🧹 Monitoring registry: Cleaning up stale monitor for ${instanceId}`);
        this.unregister(instanceId);
      }
    }

    // Enforce minimum check interval
    const safeInterval = Math.max(checkInterval, this.MIN_CHECK_INTERVAL);
    
    // Register new monitor
    const monitor: MonitoringInstance = {
      instanceId,
      startTime: now,
      isActive: true,
      componentId,
      checkInterval: safeInterval,
      lastCheck: now,
      errorCount: 0,
      maxErrors: this.MAX_ERRORS_BEFORE_STOP,
      registrationAttempts: existingMonitor ? existingMonitor.registrationAttempts + 1 : 1,
      lastRegistrationAttempt: now
    };

    this.monitors.set(instanceId, monitor);

    console.log(`✅ Monitoring registry: Registered monitor for ${instanceId} (component: ${componentId}, interval: ${safeInterval}ms, attempt: ${monitor.registrationAttempts})`);

    return { success: true };
  }
  
  /**
   * Unregister a monitoring instance
   * @param instanceId WhatsApp instance ID
   */
  unregister(instanceId: string): void {
    const monitor = this.monitors.get(instanceId);
    
    if (monitor) {
      if (monitor.intervalId) {
        clearInterval(monitor.intervalId);
      }
      
      this.monitors.delete(instanceId);
      console.log(`🗑️ Monitoring registry: Unregistered monitor for ${instanceId}`);
    }
  }
  
  /**
   * Update last check time for a monitor
   * @param instanceId WhatsApp instance ID
   */
  updateLastCheck(instanceId: string): void {
    const monitor = this.monitors.get(instanceId);
    if (monitor) {
      monitor.lastCheck = Date.now();
    }
  }
  
  /**
   * Record an error for a monitor
   * @param instanceId WhatsApp instance ID
   * @returns Whether monitoring should continue
   */
  recordError(instanceId: string): boolean {
    const monitor = this.monitors.get(instanceId);
    if (!monitor) return false;
    
    monitor.errorCount++;
    
    if (monitor.errorCount >= monitor.maxErrors) {
      console.log(`🛑 Monitoring registry: Max errors reached for ${instanceId}, stopping monitor`);
      this.unregister(instanceId);
      return false;
    }
    
    return true;
  }
  
  /**
   * Reset error count for a monitor
   * @param instanceId WhatsApp instance ID
   */
  resetErrors(instanceId: string): void {
    const monitor = this.monitors.get(instanceId);
    if (monitor) {
      monitor.errorCount = 0;
    }
  }
  
  /**
   * Check if an instance is being monitored
   * @param instanceId WhatsApp instance ID
   * @returns Whether instance is being monitored
   */
  isMonitored(instanceId: string): boolean {
    const monitor = this.monitors.get(instanceId);
    return monitor?.isActive === true;
  }
  
  /**
   * Get monitoring statistics
   * @returns Registry statistics
   */
  getStats(): {
    totalMonitors: number;
    activeMonitors: number;
    monitorDetails: Array<{
      instanceId: string;
      componentId: string;
      uptime: number;
      errorCount: number;
      lastCheck: number;
    }>;
  } {
    const now = Date.now();
    const monitorDetails = Array.from(this.monitors.values()).map(monitor => ({
      instanceId: monitor.instanceId,
      componentId: monitor.componentId,
      uptime: now - monitor.startTime,
      errorCount: monitor.errorCount,
      lastCheck: monitor.lastCheck
    }));
    
    return {
      totalMonitors: this.monitors.size,
      activeMonitors: Array.from(this.monitors.values()).filter(m => m.isActive).length,
      monitorDetails
    };
  }
  
  /**
   * Clean up all monitors (for debugging)
   */
  cleanup(): void {
    console.log(`🧹 Monitoring registry: Cleaning up ${this.monitors.size} monitors`);
    
    for (const [instanceId] of this.monitors) {
      this.unregister(instanceId);
    }
    
    this.monitors.clear();
  }
  
  /**
   * Set interval ID for a monitor
   * @param instanceId WhatsApp instance ID
   * @param intervalId Interval ID to track
   */
  setIntervalId(instanceId: string, intervalId: NodeJS.Timeout): void {
    const monitor = this.monitors.get(instanceId);
    if (monitor) {
      monitor.intervalId = intervalId;
    }
  }
}

// Global singleton instance
export const monitoringRegistry = new MonitoringRegistry();

// Debug function for development
if (typeof window !== 'undefined') {
  (window as any).monitoringRegistry = monitoringRegistry;
}
