/**
 * Global Monitoring Cleanup Utility
 * 
 * This utility provides functions to stop infinite monitoring loops
 * and clean up problematic instances that are causing resource drain.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

// Global registry of active monitoring intervals
const activeMonitoringIntervals = new Map<string, NodeJS.Timeout>();
const problematicInstances = new Set([
  '927cecbe-hhghg',
  '927cecbe-polopolo',
  'df3d987c-2e6b-46a0-9b9d-40d8de867a09'
]);

/**
 * Register a monitoring interval for cleanup
 */
export function registerMonitoringInterval(instanceId: string, interval: NodeJS.Timeout): void {
  console.log(`📝 Registering monitoring interval for instance: ${instanceId}`);
  activeMonitoringIntervals.set(instanceId, interval);
}

/**
 * Unregister and clear a monitoring interval
 */
export function unregisterMonitoringInterval(instanceId: string): void {
  const interval = activeMonitoringIntervals.get(instanceId);
  if (interval) {
    clearInterval(interval);
    activeMonitoringIntervals.delete(instanceId);
    console.log(`🧹 Cleared monitoring interval for instance: ${instanceId}`);
  }
}

/**
 * Stop all monitoring for problematic instances
 */
export function stopProblematicInstanceMonitoring(): void {
  console.log('🛑 Stopping monitoring for all problematic instances...');
  
  for (const instanceId of problematicInstances) {
    unregisterMonitoringInterval(instanceId);
  }
  
  // Clear any global intervals that might be running
  if (typeof window !== 'undefined') {
    // Browser environment - dispatch cleanup event
    window.dispatchEvent(new CustomEvent('stop-all-monitoring', {
      detail: { problematicInstances: Array.from(problematicInstances) }
    }));
  }
  
  console.log('✅ Problematic instance monitoring cleanup completed');
}

/**
 * Check if an instance is problematic and should not be monitored
 */
export function isProblematicInstance(instanceId: string): boolean {
  return problematicInstances.has(instanceId) || 
         Array.from(problematicInstances).some(id => instanceId.includes(id));
}

/**
 * Add an instance to the problematic list
 */
export function markInstanceAsProblematic(instanceId: string): void {
  problematicInstances.add(instanceId);
  unregisterMonitoringInterval(instanceId);
  console.log(`⚠️ Marked instance as problematic: ${instanceId}`);
}

/**
 * Remove an instance from the problematic list
 */
export function unmarkInstanceAsProblematic(instanceId: string): void {
  problematicInstances.delete(instanceId);
  console.log(`✅ Unmarked instance as problematic: ${instanceId}`);
}

/**
 * Get all currently active monitoring intervals
 */
export function getActiveMonitoringIntervals(): string[] {
  return Array.from(activeMonitoringIntervals.keys());
}

/**
 * Emergency cleanup - stop ALL monitoring intervals
 */
export function emergencyStopAllMonitoring(): void {
  console.log('🚨 EMERGENCY: Stopping ALL monitoring intervals...');
  
  for (const [instanceId, interval] of activeMonitoringIntervals.entries()) {
    clearInterval(interval);
    console.log(`🛑 Emergency stopped monitoring for: ${instanceId}`);
  }
  
  activeMonitoringIntervals.clear();
  
  // Broadcast emergency stop event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('emergency-stop-monitoring'));
  }
  
  console.log('✅ Emergency monitoring cleanup completed');
}

/**
 * Initialize cleanup listeners
 */
export function initializeMonitoringCleanup(): void {
  if (typeof window !== 'undefined') {
    // Listen for instance deletion events
    window.addEventListener('instance-deleted', (event: any) => {
      const { instanceId } = event.detail;
      unregisterMonitoringInterval(instanceId);
    });
    
    // Listen for emergency stop events
    window.addEventListener('emergency-stop-monitoring', () => {
      emergencyStopAllMonitoring();
    });
    
    console.log('🔧 Monitoring cleanup listeners initialized');
  }
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  initializeMonitoringCleanup();
}
