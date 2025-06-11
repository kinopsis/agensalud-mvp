/**
 * WhatsApp Instance Monitoring Service
 * 
 * Centralized monitoring service with circuit breakers and exponential backoff
 * to prevent infinite loops and coordinate all monitoring activities.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createEvolutionAPIService } from './EvolutionAPIService';
import { getEvolutionAPIConnectionPool } from './EvolutionAPIConnectionPool';

interface MonitoringState {
  isActive: boolean;
  failureCount: number;
  lastFailure: number;
  backoffDelay: number;
  maxRetries: number;
}

interface CircuitBreakerConfig {
  maxFailures: number;
  resetTimeout: number;
  backoffMultiplier: number;
  maxBackoffDelay: number;
}

/**
 * Centralized WhatsApp Instance Monitoring Service
 */
export class WhatsAppMonitoringService {
  private static instance: WhatsAppMonitoringService;
  private monitoringStates = new Map<string, MonitoringState>();
  private activeIntervals = new Map<string, NodeJS.Timeout>();
  
  private readonly circuitBreakerConfig: CircuitBreakerConfig = {
    maxFailures: 3,
    resetTimeout: 5 * 60 * 1000, // 5 minutes
    backoffMultiplier: 2,
    maxBackoffDelay: 30 * 1000 // 30 seconds
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WhatsAppMonitoringService {
    if (!WhatsAppMonitoringService.instance) {
      WhatsAppMonitoringService.instance = new WhatsAppMonitoringService();
    }
    return WhatsAppMonitoringService.instance;
  }

  /**
   * Start monitoring an instance with circuit breaker protection
   */
  startMonitoring(
    instanceId: string,
    instanceName: string,
    onStatusUpdate: (status: any) => void,
    onQRUpdate: (qrData: any) => void,
    onError: (error: Error) => void
  ): void {
    // Stop existing monitoring for this instance
    this.stopMonitoring(instanceId);

    // Initialize monitoring state
    const state: MonitoringState = {
      isActive: true,
      failureCount: 0,
      lastFailure: 0,
      backoffDelay: 1000, // Start with 1 second
      maxRetries: 10
    };

    this.monitoringStates.set(instanceId, state);

    console.log(`🔍 Starting centralized monitoring for instance: ${instanceId} (${instanceName})`);

    // Start monitoring loop with circuit breaker
    this.scheduleNextCheck(instanceId, instanceName, onStatusUpdate, onQRUpdate, onError);
  }

  /**
   * Stop monitoring an instance
   */
  stopMonitoring(instanceId: string): void {
    const interval = this.activeIntervals.get(instanceId);
    if (interval) {
      clearTimeout(interval);
      this.activeIntervals.delete(instanceId);
    }

    const state = this.monitoringStates.get(instanceId);
    if (state) {
      state.isActive = false;
      this.monitoringStates.delete(instanceId);
    }

    console.log(`🛑 Stopped monitoring for instance: ${instanceId}`);
  }

  /**
   * Check if instance is being monitored
   */
  isMonitoring(instanceId: string): boolean {
    const state = this.monitoringStates.get(instanceId);
    return state?.isActive || false;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(instanceId: string): MonitoringState | null {
    return this.monitoringStates.get(instanceId) || null;
  }

  /**
   * Schedule next monitoring check with exponential backoff
   */
  private scheduleNextCheck(
    instanceId: string,
    instanceName: string,
    onStatusUpdate: (status: any) => void,
    onQRUpdate: (qrData: any) => void,
    onError: (error: Error) => void
  ): void {
    const state = this.monitoringStates.get(instanceId);
    if (!state || !state.isActive) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(instanceId)) {
      console.log(`🚨 Circuit breaker OPEN for instance ${instanceId} - stopping monitoring`);
      onError(new Error('Circuit breaker open - too many failures'));
      this.stopMonitoring(instanceId);
      return;
    }

    const timeout = setTimeout(async () => {
      await this.performMonitoringCheck(instanceId, instanceName, onStatusUpdate, onQRUpdate, onError);
    }, state.backoffDelay);

    this.activeIntervals.set(instanceId, timeout);
  }

  /**
   * Perform actual monitoring check
   */
  private async performMonitoringCheck(
    instanceId: string,
    instanceName: string,
    onStatusUpdate: (status: any) => void,
    onQRUpdate: (qrData: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const state = this.monitoringStates.get(instanceId);
    if (!state || !state.isActive) {
      return;
    }

    try {
      const evolutionAPI = createEvolutionAPIService();

      // Check instance status
      const statusResult = await evolutionAPI.getInstanceStatus(instanceName);
      
      onStatusUpdate({
        instanceId,
        instanceName,
        status: statusResult.status,
        state: statusResult.state,
        timestamp: new Date().toISOString()
      });

      // If connecting, try to get QR code
      if (statusResult.state === 'connecting') {
        try {
          const qrResult = await evolutionAPI.getQRCode(instanceName);
          if (qrResult.base64 || qrResult.qrcode) {
            onQRUpdate({
              instanceId,
              qrCode: qrResult.base64 || qrResult.qrcode,
              status: 'available',
              timestamp: new Date().toISOString()
            });
          }
        } catch (qrError) {
          console.log(`⚠️ QR code not ready for ${instanceName}:`, qrError.message);
        }
      }

      // Reset failure count on success
      state.failureCount = 0;
      state.backoffDelay = 1000; // Reset to 1 second

      // Stop monitoring if connected
      if (statusResult.state === 'open') {
        console.log(`✅ Instance ${instanceName} connected - stopping monitoring`);
        onStatusUpdate({
          instanceId,
          instanceName,
          status: 'connected',
          state: 'open',
          timestamp: new Date().toISOString()
        });
        this.stopMonitoring(instanceId);
        return;
      }

      // Schedule next check
      this.scheduleNextCheck(instanceId, instanceName, onStatusUpdate, onQRUpdate, onError);

    } catch (error) {
      console.error(`❌ Monitoring check failed for ${instanceName}:`, error);
      
      // Handle failure with exponential backoff
      state.failureCount++;
      state.lastFailure = Date.now();
      state.backoffDelay = Math.min(
        state.backoffDelay * this.circuitBreakerConfig.backoffMultiplier,
        this.circuitBreakerConfig.maxBackoffDelay
      );

      console.log(`📊 Failure ${state.failureCount}/${this.circuitBreakerConfig.maxFailures} for ${instanceName}, next check in ${state.backoffDelay}ms`);

      onError(error instanceof Error ? error : new Error('Unknown monitoring error'));

      // Check if we should continue or stop
      if (state.failureCount >= state.maxRetries) {
        console.log(`🛑 Max retries reached for ${instanceName} - stopping monitoring`);
        this.stopMonitoring(instanceId);
        return;
      }

      // Schedule next check with backoff
      this.scheduleNextCheck(instanceId, instanceName, onStatusUpdate, onQRUpdate, onError);
    }
  }

  /**
   * Check if circuit breaker is open for an instance
   */
  private isCircuitBreakerOpen(instanceId: string): boolean {
    const state = this.monitoringStates.get(instanceId);
    if (!state) return false;

    const now = Date.now();
    const timeSinceLastFailure = now - state.lastFailure;

    // Circuit breaker is open if:
    // 1. Too many failures AND
    // 2. Not enough time has passed since last failure
    return state.failureCount >= this.circuitBreakerConfig.maxFailures &&
           timeSinceLastFailure < this.circuitBreakerConfig.resetTimeout;
  }

  /**
   * Get all active monitoring instances
   */
  getActiveMonitoring(): string[] {
    return Array.from(this.monitoringStates.keys()).filter(instanceId => {
      const state = this.monitoringStates.get(instanceId);
      return state?.isActive || false;
    });
  }

  /**
   * Stop all monitoring (cleanup)
   */
  stopAllMonitoring(): void {
    console.log('🧹 Stopping all WhatsApp instance monitoring');
    
    for (const instanceId of this.monitoringStates.keys()) {
      this.stopMonitoring(instanceId);
    }
  }
}

/**
 * Get the singleton monitoring service instance
 */
export function getWhatsAppMonitoringService(): WhatsAppMonitoringService {
  return WhatsAppMonitoringService.getInstance();
}
