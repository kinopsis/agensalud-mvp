/**
 * =====================================================
 * AGENTSALUD MVP - MONITORING REGISTRY
 * =====================================================
 * Central registry for monitoring WhatsApp instances and system health
 * 
 * @author AgentSalud Development Team
 * @date January 2025
 */

interface MonitoringInstance {
  instanceId: string;
  organizationId: string;
  status: 'active' | 'inactive' | 'error' | 'problematic';
  lastCheck: Date;
  intervalId?: NodeJS.Timeout;
  errorCount: number;
  metadata?: Record<string, any>;
}

interface MonitoringStatus {
  totalInstances: number;
  activeInstances: number;
  problematicInstances: number;
  lastCleanup: Date | null;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

class MonitoringRegistry {
  private instances: Map<string, MonitoringInstance> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private problematicInstances: Set<string> = new Set();
  private lastCleanup: Date | null = null;

  /**
   * Register a new instance for monitoring
   */
  register(instanceId: string, organizationId: string, metadata?: Record<string, any>): boolean {
    try {
      const instance: MonitoringInstance = {
        instanceId,
        organizationId,
        status: 'active',
        lastCheck: new Date(),
        errorCount: 0,
        metadata
      };

      this.instances.set(instanceId, instance);
      console.log(`📊 Monitoring registered for instance: ${instanceId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to register monitoring for ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Unregister an instance from monitoring
   */
  unregister(instanceId: string): boolean {
    try {
      // Stop any active intervals
      this.forceStop(instanceId);
      
      // Remove from registry
      const removed = this.instances.delete(instanceId);
      this.problematicInstances.delete(instanceId);
      
      if (removed) {
        console.log(`📊 Monitoring unregistered for instance: ${instanceId}`);
      }
      
      return removed;
    } catch (error) {
      console.error(`❌ Failed to unregister monitoring for ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Start monitoring for an instance
   */
  startMonitoring(instanceId: string, intervalMs: number = 30000): boolean {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        console.warn(`⚠️ Cannot start monitoring: instance ${instanceId} not registered`);
        return false;
      }

      // Stop existing monitoring if any
      this.stopMonitoring(instanceId);

      // Start new monitoring interval
      const intervalId = setInterval(() => {
        this.checkInstance(instanceId);
      }, intervalMs);

      // Store interval reference
      this.intervals.set(instanceId, intervalId);
      instance.intervalId = intervalId;
      instance.status = 'active';
      instance.lastCheck = new Date();

      console.log(`📊 Monitoring started for instance: ${instanceId} (interval: ${intervalMs}ms)`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to start monitoring for ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Stop monitoring for an instance
   */
  stopMonitoring(instanceId: string): boolean {
    try {
      const intervalId = this.intervals.get(instanceId);
      if (intervalId) {
        clearInterval(intervalId);
        this.intervals.delete(instanceId);
      }

      const instance = this.instances.get(instanceId);
      if (instance) {
        instance.status = 'inactive';
        instance.intervalId = undefined;
      }

      console.log(`📊 Monitoring stopped for instance: ${instanceId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to stop monitoring for ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Force stop monitoring (emergency cleanup)
   */
  forceStop(instanceId: string): boolean {
    try {
      // Clear interval if exists
      const intervalId = this.intervals.get(instanceId);
      if (intervalId) {
        clearInterval(intervalId);
        this.intervals.delete(instanceId);
      }

      // Update instance status
      const instance = this.instances.get(instanceId);
      if (instance) {
        instance.status = 'inactive';
        instance.intervalId = undefined;
      }

      console.log(`🛑 Force stopped monitoring for instance: ${instanceId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to force stop monitoring for ${instanceId}:`, error);
      return false;
    }
  }

  /**
   * Check instance health
   */
  private async checkInstance(instanceId: string): Promise<void> {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) return;

      instance.lastCheck = new Date();

      // Here you would implement actual health checks
      // For now, we'll just update the timestamp
      
      // Reset error count if check is successful
      instance.errorCount = 0;
      
      // Remove from problematic instances if it was there
      this.problematicInstances.delete(instanceId);
      
    } catch (error) {
      console.error(`❌ Health check failed for ${instanceId}:`, error);
      
      const instance = this.instances.get(instanceId);
      if (instance) {
        instance.errorCount++;
        instance.status = 'error';
        
        // Mark as problematic if too many errors
        if (instance.errorCount >= 3) {
          instance.status = 'problematic';
          this.problematicInstances.add(instanceId);
        }
      }
    }
  }

  /**
   * Get all registered instances
   */
  getAllInstances(): MonitoringInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId: string): MonitoringInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get monitoring status
   */
  getStatus(): MonitoringStatus {
    const instances = this.getAllInstances();
    
    return {
      totalInstances: instances.length,
      activeInstances: instances.filter(i => i.status === 'active').length,
      problematicInstances: this.problematicInstances.size,
      lastCleanup: this.lastCleanup,
      systemHealth: this.calculateSystemHealth(instances)
    };
  }

  /**
   * Reset problematic instances list
   */
  resetProblematicInstances(): void {
    this.problematicInstances.clear();
    this.lastCleanup = new Date();
    console.log('🧹 Problematic instances list reset');
  }

  /**
   * Stop all monitoring (emergency cleanup)
   */
  stopAll(): number {
    let stoppedCount = 0;
    
    for (const [instanceId] of this.instances) {
      if (this.forceStop(instanceId)) {
        stoppedCount++;
      }
    }
    
    console.log(`🛑 Emergency stop: ${stoppedCount} instances stopped`);
    return stoppedCount;
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(instances: MonitoringInstance[]): 'healthy' | 'degraded' | 'critical' {
    if (instances.length === 0) return 'healthy';
    
    const problematicCount = this.problematicInstances.size;
    const problematicRatio = problematicCount / instances.length;
    
    if (problematicRatio >= 0.5) return 'critical';
    if (problematicRatio >= 0.2) return 'degraded';
    return 'healthy';
  }

  /**
   * Cleanup old instances and intervals
   */
  cleanup(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [instanceId, instance] of this.instances) {
      const age = now.getTime() - instance.lastCheck.getTime();
      
      if (age > maxAge && instance.status === 'inactive') {
        this.unregister(instanceId);
        console.log(`🧹 Cleaned up old instance: ${instanceId}`);
      }
    }
    
    this.lastCleanup = now;
  }
}

// Global singleton instance
export const monitoringRegistry = new MonitoringRegistry();

// Export the class for testing
export { MonitoringRegistry };

// Default export
export default monitoringRegistry;
