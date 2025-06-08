/**
 * Unified WhatsApp Polling Service
 * 
 * Centralized polling management to prevent infinite loops and ensure
 * only one polling mechanism per instance is active at any time.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createEvolutionAPIService } from './EvolutionAPIService';
import { createClient } from '@/lib/supabase/server';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface PollingState {
  instanceId: string;
  instanceName: string;
  isActive: boolean;
  currentInterval: number;
  failureCount: number;
  lastRequest: number;
  lastSuccess: number;
  circuitBreakerOpen: boolean;
  intervalId?: NodeJS.Timeout;
  callbacks: PollingCallbacks;
}

interface PollingCallbacks {
  onQRUpdate: (qrData: QRUpdateData) => void;
  onStatusUpdate: (status: StatusUpdateData) => void;
  onError: (error: PollingError) => void;
  onConnected: () => void;
}

interface QRUpdateData {
  instanceId: string;
  qrCode: string;
  expiresAt: string;
  timestamp: string;
  source: 'evolution_api' | 'database' | 'webhook';
  isRealQR: boolean;
}

interface StatusUpdateData {
  instanceId: string;
  status: string;
  state: string;
  timestamp: string;
  message?: string;
}

interface PollingError {
  instanceId: string;
  error: string;
  timestamp: string;
  retryable: boolean;
}

interface PollingConfig {
  initialInterval: number;
  maxInterval: number;
  backoffMultiplier: number;
  maxFailures: number;
  resetTimeout: number;
  qrExpirationTime: number;
}

// =====================================================
// UNIFIED POLLING SERVICE
// =====================================================

/**
 * Centralized WhatsApp polling service to prevent infinite loops
 * and ensure consistent state management across all components.
 */
export class UnifiedWhatsAppPollingService {
  private static instance: UnifiedWhatsAppPollingService;
  private activePollers = new Map<string, PollingState>();
  private globalRequestCount = 0;
  private globalRequestWindow = Date.now();
  
  private readonly config: PollingConfig = {
    initialInterval: 5000,      // Start with 5 seconds
    maxInterval: 30000,         // Max 30 seconds
    backoffMultiplier: 1.5,     // Gradual increase
    maxFailures: 3,             // Circuit breaker threshold
    resetTimeout: 60000,        // 1 minute reset
    qrExpirationTime: 45000     // QR codes expire in 45 seconds
  };

  private readonly GLOBAL_RATE_LIMIT = 10; // Max 10 requests per second globally
  private readonly RATE_LIMIT_WINDOW = 1000; // 1 second window

  private constructor() {
    // Cleanup on process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => this.cleanup());
      process.on('SIGINT', () => this.cleanup());
      process.on('SIGTERM', () => this.cleanup());
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UnifiedWhatsAppPollingService {
    if (!UnifiedWhatsAppPollingService.instance) {
      UnifiedWhatsAppPollingService.instance = new UnifiedWhatsAppPollingService();
    }
    return UnifiedWhatsAppPollingService.instance;
  }

  /**
   * Start polling for a WhatsApp instance
   * 
   * @param instanceId - Database instance ID
   * @param instanceName - Evolution API instance name
   * @param callbacks - Callback functions for updates
   * @returns Success status
   */
  startPolling(
    instanceId: string, 
    instanceName: string, 
    callbacks: PollingCallbacks
  ): { success: boolean; reason?: string } {
    // Check if already polling
    if (this.activePollers.has(instanceId)) {
      const existing = this.activePollers.get(instanceId)!;
      if (existing.isActive) {
        console.log(`🚫 Polling already active for instance ${instanceId}`);
        return { success: false, reason: 'Polling already active for this instance' };
      }
    }

    // Check global rate limiting
    if (!this.checkGlobalRateLimit()) {
      console.log(`🚫 Global rate limit exceeded, cannot start polling for ${instanceId}`);
      return { success: false, reason: 'Global rate limit exceeded' };
    }

    // Create polling state
    const pollingState: PollingState = {
      instanceId,
      instanceName,
      isActive: true,
      currentInterval: this.config.initialInterval,
      failureCount: 0,
      lastRequest: 0,
      lastSuccess: 0,
      circuitBreakerOpen: false,
      callbacks
    };

    this.activePollers.set(instanceId, pollingState);
    
    console.log(`✅ Started unified polling for instance ${instanceId} (${instanceName})`);
    
    // Start the polling loop
    this.scheduleNextPoll(instanceId);
    
    return { success: true };
  }

  /**
   * Stop polling for an instance
   */
  stopPolling(instanceId: string): void {
    const pollingState = this.activePollers.get(instanceId);
    if (!pollingState) {
      return;
    }

    pollingState.isActive = false;
    
    if (pollingState.intervalId) {
      clearTimeout(pollingState.intervalId);
      pollingState.intervalId = undefined;
    }

    this.activePollers.delete(instanceId);
    
    console.log(`🛑 Stopped unified polling for instance ${instanceId}`);
  }

  /**
   * Check if polling is active for an instance
   */
  isPollingActive(instanceId: string): boolean {
    const pollingState = this.activePollers.get(instanceId);
    return pollingState?.isActive || false;
  }

  /**
   * Get polling statistics
   */
  getPollingStats(): {
    activePollers: number;
    totalRequests: number;
    averageInterval: number;
    circuitBreakersOpen: number;
  } {
    const activePollers = Array.from(this.activePollers.values()).filter(p => p.isActive);
    const circuitBreakersOpen = activePollers.filter(p => p.circuitBreakerOpen).length;
    const averageInterval = activePollers.length > 0 
      ? activePollers.reduce((sum, p) => sum + p.currentInterval, 0) / activePollers.length 
      : 0;

    return {
      activePollers: activePollers.length,
      totalRequests: this.globalRequestCount,
      averageInterval,
      circuitBreakersOpen
    };
  }

  /**
   * Emergency stop all polling
   */
  emergencyStop(): void {
    console.log(`🚨 Emergency stop - stopping ${this.activePollers.size} active pollers`);
    
    for (const [instanceId] of this.activePollers) {
      this.stopPolling(instanceId);
    }
    
    this.activePollers.clear();
    this.globalRequestCount = 0;
    
    console.log('🛑 All polling stopped');
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  /**
   * Schedule next polling attempt with exponential backoff
   */
  private scheduleNextPoll(instanceId: string): void {
    const pollingState = this.activePollers.get(instanceId);
    if (!pollingState || !pollingState.isActive) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(pollingState)) {
      console.log(`🚨 Circuit breaker OPEN for instance ${instanceId} - stopping polling`);
      pollingState.callbacks.onError({
        instanceId,
        error: 'Circuit breaker open - too many failures',
        timestamp: new Date().toISOString(),
        retryable: false
      });
      this.stopPolling(instanceId);
      return;
    }

    pollingState.intervalId = setTimeout(() => {
      this.performPoll(instanceId);
    }, pollingState.currentInterval);
  }

  /**
   * Perform actual polling operation
   */
  private async performPoll(instanceId: string): Promise<void> {
    const pollingState = this.activePollers.get(instanceId);
    if (!pollingState || !pollingState.isActive) {
      return;
    }

    const now = Date.now();
    pollingState.lastRequest = now;
    this.incrementGlobalRequestCount();

    try {
      console.log(`🔄 Polling instance ${instanceId} (${pollingState.instanceName})`);

      const evolutionAPI = createEvolutionAPIService();
      
      // Get instance status
      const statusResult = await evolutionAPI.getInstanceStatus(pollingState.instanceName);
      
      // Send status update
      pollingState.callbacks.onStatusUpdate({
        instanceId,
        status: statusResult.status,
        state: statusResult.state,
        timestamp: new Date().toISOString(),
        message: `Status: ${statusResult.state}`
      });

      // Handle different states
      if (statusResult.state === 'open') {
        // Instance is connected - stop polling
        console.log(`✅ Instance ${instanceId} connected - stopping polling`);
        pollingState.callbacks.onConnected();
        this.stopPolling(instanceId);
        return;
      } else if (statusResult.state === 'connecting') {
        // Try to get QR code
        try {
          const qrResult = await evolutionAPI.getQRCode(pollingState.instanceName);
          if (qrResult.base64) {
            pollingState.callbacks.onQRUpdate({
              instanceId,
              qrCode: qrResult.base64,
              expiresAt: new Date(now + this.config.qrExpirationTime).toISOString(),
              timestamp: new Date().toISOString(),
              source: 'evolution_api',
              isRealQR: true
            });
          }
        } catch (qrError) {
          console.log(`⚠️ QR code not ready for ${pollingState.instanceName}:`, qrError.message);
        }
      }

      // Success - reset failure count and interval
      pollingState.failureCount = 0;
      pollingState.lastSuccess = now;
      pollingState.currentInterval = this.config.initialInterval;
      pollingState.circuitBreakerOpen = false;

      // Schedule next poll
      this.scheduleNextPoll(instanceId);

    } catch (error) {
      console.error(`❌ Polling failed for ${pollingState.instanceName}:`, error);
      
      // Handle failure with exponential backoff
      pollingState.failureCount++;
      pollingState.currentInterval = Math.min(
        pollingState.currentInterval * this.config.backoffMultiplier,
        this.config.maxInterval
      );

      console.log(`📊 Failure ${pollingState.failureCount}/${this.config.maxFailures} for ${pollingState.instanceName}, next poll in ${pollingState.currentInterval}ms`);

      pollingState.callbacks.onError({
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown polling error',
        timestamp: new Date().toISOString(),
        retryable: pollingState.failureCount < this.config.maxFailures
      });

      // Check if we should continue or stop
      if (pollingState.failureCount >= this.config.maxFailures) {
        pollingState.circuitBreakerOpen = true;
        console.log(`🛑 Max failures reached for ${pollingState.instanceName} - opening circuit breaker`);
      }

      // Schedule next poll with backoff
      this.scheduleNextPoll(instanceId);
    }
  }

  /**
   * Check if circuit breaker is open for a polling state
   */
  private isCircuitBreakerOpen(pollingState: PollingState): boolean {
    if (!pollingState.circuitBreakerOpen) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastFailure = now - pollingState.lastRequest;

    // Reset circuit breaker if enough time has passed
    if (timeSinceLastFailure > this.config.resetTimeout) {
      console.log(`🔄 Circuit breaker reset for instance ${pollingState.instanceId}`);
      pollingState.circuitBreakerOpen = false;
      pollingState.failureCount = 0;
      pollingState.currentInterval = this.config.initialInterval;
      return false;
    }

    return true;
  }

  /**
   * Check global rate limiting
   */
  private checkGlobalRateLimit(): boolean {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.globalRequestWindow > this.RATE_LIMIT_WINDOW) {
      this.globalRequestCount = 0;
      this.globalRequestWindow = now;
    }

    return this.globalRequestCount < this.GLOBAL_RATE_LIMIT;
  }

  /**
   * Increment global request counter
   */
  private incrementGlobalRequestCount(): void {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.globalRequestWindow > this.RATE_LIMIT_WINDOW) {
      this.globalRequestCount = 0;
      this.globalRequestWindow = now;
    }

    this.globalRequestCount++;
  }

  /**
   * Cleanup all resources
   */
  private cleanup(): void {
    console.log('🧹 Cleaning up UnifiedWhatsAppPollingService');
    this.emergencyStop();
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

/**
 * Get the unified polling service instance
 */
export const getUnifiedPollingService = () => UnifiedWhatsAppPollingService.getInstance();

/**
 * Convenience function to start polling
 */
export const startWhatsAppPolling = (
  instanceId: string,
  instanceName: string,
  callbacks: PollingCallbacks
) => {
  return getUnifiedPollingService().startPolling(instanceId, instanceName, callbacks);
};

/**
 * Convenience function to stop polling
 */
export const stopWhatsAppPolling = (instanceId: string) => {
  getUnifiedPollingService().stopPolling(instanceId);
};

// Debug function for development
if (typeof window !== 'undefined') {
  (window as any).unifiedPollingService = getUnifiedPollingService();
}
