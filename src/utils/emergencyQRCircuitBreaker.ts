/**
 * Emergency QR Circuit Breaker
 * 
 * Frontend-level circuit breaker that prevents infinite QR loops
 * regardless of component state or QR Request Manager status.
 * 
 * This is a NUCLEAR OPTION that will forcibly stop QR requests
 * when infinite loops are detected.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

interface QRRequestRecord {
  timestamp: number;
  instanceId: string;
  source: string;
}

interface CircuitBreakerState {
  isTripped: boolean;
  tripTime: number;
  requestHistory: QRRequestRecord[];
  blockedRequests: number;
  lastResetAttempt: number;
}

class EmergencyQRCircuitBreaker {
  private state: CircuitBreakerState = {
    isTripped: false,
    tripTime: 0,
    requestHistory: [],
    blockedRequests: 0,
    lastResetAttempt: 0
  };

  // Circuit breaker thresholds
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // Very conservative
  private readonly MAX_REQUESTS_PER_5_MINUTES = 20;
  private readonly CIRCUIT_RESET_TIME = 300000; // 5 minutes
  private readonly HISTORY_CLEANUP_INTERVAL = 60000; // 1 minute
  
  // Problematic instance that should be blocked immediately
  private readonly BLOCKED_INSTANCE = '693b032b-bdd2-4ae4-91eb-83a031aef568';

  constructor() {
    this.startHistoryCleanup();
    this.installGlobalFetchInterceptor();
    
    // Make available globally for emergency access
    if (typeof window !== 'undefined') {
      (window as any).emergencyQRCircuitBreaker = this;
    }
  }

  /**
   * Check if a QR request should be allowed
   */
  shouldAllowRequest(instanceId: string, source: string = 'unknown'): {
    allowed: boolean;
    reason?: string;
    waitTime?: number;
  } {
    // IMMEDIATE BLOCK: Problematic instance
    if (instanceId === this.BLOCKED_INSTANCE) {
      this.recordBlockedRequest(instanceId, source, 'Problematic instance blocked');
      return {
        allowed: false,
        reason: 'Instance 693b032b-bdd2-4ae4-91eb-83a031aef568 is permanently blocked due to infinite loops'
      };
    }

    // Circuit breaker is tripped
    if (this.state.isTripped) {
      const timeSinceTrip = Date.now() - this.state.tripTime;
      if (timeSinceTrip < this.CIRCUIT_RESET_TIME) {
        this.recordBlockedRequest(instanceId, source, 'Circuit breaker tripped');
        return {
          allowed: false,
          reason: 'Circuit breaker is tripped due to excessive QR requests',
          waitTime: this.CIRCUIT_RESET_TIME - timeSinceTrip
        };
      } else {
        // Attempt to reset circuit breaker
        this.resetCircuitBreaker();
      }
    }

    // Check request frequency
    const now = Date.now();
    const recentRequests = this.state.requestHistory.filter(
      record => now - record.timestamp < 60000 // Last minute
    );
    const veryRecentRequests = this.state.requestHistory.filter(
      record => now - record.timestamp < 300000 // Last 5 minutes
    );

    // Trip circuit breaker if too many requests
    if (recentRequests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      this.tripCircuitBreaker('Too many requests in last minute');
      this.recordBlockedRequest(instanceId, source, 'Rate limit exceeded');
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${recentRequests.length} requests in last minute (max ${this.MAX_REQUESTS_PER_MINUTE})`
      };
    }

    if (veryRecentRequests.length >= this.MAX_REQUESTS_PER_5_MINUTES) {
      this.tripCircuitBreaker('Too many requests in last 5 minutes');
      this.recordBlockedRequest(instanceId, source, 'Rate limit exceeded');
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${veryRecentRequests.length} requests in last 5 minutes (max ${this.MAX_REQUESTS_PER_5_MINUTES})`
      };
    }

    // Allow request and record it
    this.recordRequest(instanceId, source);
    return { allowed: true };
  }

  /**
   * Record a successful QR request
   */
  private recordRequest(instanceId: string, source: string): void {
    this.state.requestHistory.push({
      timestamp: Date.now(),
      instanceId,
      source
    });

    console.log(`🔍 QR Circuit Breaker: Allowed request for ${instanceId} from ${source}`);
  }

  /**
   * Record a blocked request
   */
  private recordBlockedRequest(instanceId: string, source: string, reason: string): void {
    this.state.blockedRequests++;
    console.log(`🚫 QR Circuit Breaker: Blocked request for ${instanceId} from ${source} - ${reason}`);
  }

  /**
   * Trip the circuit breaker
   */
  private tripCircuitBreaker(reason: string): void {
    if (!this.state.isTripped) {
      this.state.isTripped = true;
      this.state.tripTime = Date.now();
      console.log(`🚨 QR Circuit Breaker: TRIPPED - ${reason}`);
      
      // Emit custom event for components to react
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qr-circuit-breaker-tripped', {
          detail: { reason, timestamp: this.state.tripTime }
        }));
      }
    }
  }

  /**
   * Reset the circuit breaker
   */
  private resetCircuitBreaker(): void {
    const now = Date.now();
    if (now - this.state.lastResetAttempt < 30000) {
      // Prevent rapid reset attempts
      return;
    }

    this.state.lastResetAttempt = now;
    this.state.isTripped = false;
    this.state.tripTime = 0;
    this.state.blockedRequests = 0;
    
    console.log('🔄 QR Circuit Breaker: RESET - Circuit breaker is now allowing requests');
    
    // Emit reset event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('qr-circuit-breaker-reset', {
        detail: { timestamp: now }
      }));
    }
  }

  /**
   * Install global fetch interceptor to catch QR requests
   */
  private installGlobalFetchInterceptor(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    const self = this;

    window.fetch = function(...args: Parameters<typeof fetch>): Promise<Response> {
      const url = args[0]?.toString() || '';
      
      // Intercept QR requests
      if (url.includes('/qr') && url.includes('instances')) {
        // Extract instance ID from URL
        const instanceIdMatch = url.match(/instances\/([^\/]+)\/qr/);
        const instanceId = instanceIdMatch ? instanceIdMatch[1] : 'unknown';
        
        const requestCheck = self.shouldAllowRequest(instanceId, 'fetch-interceptor');
        
        if (!requestCheck.allowed) {
          console.log(`🚫 Fetch Interceptor: Blocked QR request to ${url}`);
          return Promise.reject(new Error(`QR request blocked: ${requestCheck.reason}`));
        }
      }
      
      return originalFetch.apply(this, args);
    };

    console.log('🛡️ QR Circuit Breaker: Global fetch interceptor installed');
  }

  /**
   * Start periodic cleanup of request history
   */
  private startHistoryCleanup(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const now = Date.now();
      const cutoff = now - 300000; // Keep last 5 minutes
      
      const oldLength = this.state.requestHistory.length;
      this.state.requestHistory = this.state.requestHistory.filter(
        record => record.timestamp > cutoff
      );
      
      if (this.state.requestHistory.length !== oldLength) {
        console.log(`🧹 QR Circuit Breaker: Cleaned up ${oldLength - this.state.requestHistory.length} old request records`);
      }
    }, this.HISTORY_CLEANUP_INTERVAL);
  }

  /**
   * Emergency stop - block all QR requests immediately
   */
  emergencyStop(): void {
    this.tripCircuitBreaker('Emergency stop activated');
    this.state.tripTime = Date.now() + this.CIRCUIT_RESET_TIME; // Extend trip time
    
    console.log('🚨 QR Circuit Breaker: EMERGENCY STOP - All QR requests blocked');
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    isTripped: boolean;
    requestsInLastMinute: number;
    requestsInLast5Minutes: number;
    totalBlockedRequests: number;
    timeUntilReset?: number;
  } {
    const now = Date.now();
    const recentRequests = this.state.requestHistory.filter(
      record => now - record.timestamp < 60000
    );
    const veryRecentRequests = this.state.requestHistory.filter(
      record => now - record.timestamp < 300000
    );

    const stats = {
      isTripped: this.state.isTripped,
      requestsInLastMinute: recentRequests.length,
      requestsInLast5Minutes: veryRecentRequests.length,
      totalBlockedRequests: this.state.blockedRequests
    };

    if (this.state.isTripped) {
      const timeUntilReset = Math.max(0, this.CIRCUIT_RESET_TIME - (now - this.state.tripTime));
      return { ...stats, timeUntilReset };
    }

    return stats;
  }

  /**
   * Force reset (for emergency use)
   */
  forceReset(): void {
    this.state.isTripped = false;
    this.state.tripTime = 0;
    this.state.requestHistory = [];
    this.state.blockedRequests = 0;
    this.state.lastResetAttempt = 0;
    
    console.log('🔄 QR Circuit Breaker: FORCE RESET - All state cleared');
  }
}

// Create global singleton
export const emergencyQRCircuitBreaker = new EmergencyQRCircuitBreaker();

// Debug functions for development
if (typeof window !== 'undefined') {
  (window as any).emergencyQRCircuitBreaker = emergencyQRCircuitBreaker;
}
