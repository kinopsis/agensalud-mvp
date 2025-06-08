/**
 * Global QR Request Manager
 * 
 * Prevents multiple QR code requests for the same instance to avoid infinite loops
 * and ensures only one QR component can request QR codes per instance at a time.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

interface QRRequestState {
  instanceId: string;
  isActive: boolean;
  lastRequest: number;
  requestCount: number;
  componentId: string;
  intervalId?: NodeJS.Timeout;
}

class QRRequestManager {
  private activeRequests: Map<string, QRRequestState> = new Map();
  private readonly RATE_LIMIT_WINDOW = 30000; // 30 seconds
  private readonly MAX_REQUESTS_PER_WINDOW = 2;
  private readonly MIN_REQUEST_INTERVAL = 10000; // 10 seconds minimum between requests
  
  /**
   * Register a QR component for an instance
   * @param instanceId WhatsApp instance ID
   * @param componentId Unique component identifier
   * @returns Registration result
   */
  register(instanceId: string, componentId: string): {
    success: boolean;
    reason?: string;
    canRequest: boolean;
  } {
    const existing = this.activeRequests.get(instanceId);
    
    if (existing && existing.isActive && existing.componentId !== componentId) {
      console.log(`🚫 QR Manager: Instance ${instanceId} already has active component ${existing.componentId}`);
      return {
        success: false,
        reason: 'Another component is already managing QR for this instance',
        canRequest: false
      };
    }
    
    // Register or update the component
    this.activeRequests.set(instanceId, {
      instanceId,
      isActive: true,
      lastRequest: 0,
      requestCount: 0,
      componentId
    });
    
    console.log(`✅ QR Manager: Registered component ${componentId} for instance ${instanceId}`);
    return { success: true, canRequest: true };
  }
  
  /**
   * Unregister a QR component
   * @param instanceId WhatsApp instance ID
   * @param componentId Component identifier
   */
  unregister(instanceId: string, componentId: string): void {
    const existing = this.activeRequests.get(instanceId);
    
    if (existing && existing.componentId === componentId) {
      if (existing.intervalId) {
        clearInterval(existing.intervalId);
      }
      this.activeRequests.delete(instanceId);
      console.log(`🗑️ QR Manager: Unregistered component ${componentId} for instance ${instanceId}`);
    }
  }
  
  /**
   * Check if a QR request is allowed
   * @param instanceId WhatsApp instance ID
   * @param componentId Component identifier
   * @returns Whether request is allowed
   */
  canMakeRequest(instanceId: string, componentId: string): {
    allowed: boolean;
    reason?: string;
    waitTime?: number;
  } {
    const state = this.activeRequests.get(instanceId);
    
    if (!state || state.componentId !== componentId) {
      return {
        allowed: false,
        reason: 'Component not registered for this instance'
      };
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - state.lastRequest;
    
    // Check minimum interval
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      return {
        allowed: false,
        reason: `Too soon since last request`,
        waitTime
      };
    }
    
    // Check rate limiting
    if (timeSinceLastRequest < this.RATE_LIMIT_WINDOW) {
      if (state.requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
        const waitTime = this.RATE_LIMIT_WINDOW - timeSinceLastRequest;
        return {
          allowed: false,
          reason: `Rate limit exceeded (${this.MAX_REQUESTS_PER_WINDOW} requests per ${this.RATE_LIMIT_WINDOW/1000}s)`,
          waitTime
        };
      }
    } else {
      // Reset rate limit window
      state.requestCount = 0;
    }
    
    return { allowed: true };
  }
  
  /**
   * Record a QR request
   * @param instanceId WhatsApp instance ID
   * @param componentId Component identifier
   */
  recordRequest(instanceId: string, componentId: string): void {
    const state = this.activeRequests.get(instanceId);
    
    if (state && state.componentId === componentId) {
      const now = Date.now();
      
      if (now - state.lastRequest >= this.RATE_LIMIT_WINDOW) {
        state.requestCount = 1;
      } else {
        state.requestCount++;
      }
      
      state.lastRequest = now;
    }
  }
  
  /**
   * Set interval ID for a component
   * @param instanceId WhatsApp instance ID
   * @param componentId Component identifier
   * @param intervalId Interval ID
   */
  setIntervalId(instanceId: string, componentId: string, intervalId: NodeJS.Timeout): void {
    const state = this.activeRequests.get(instanceId);
    
    if (state && state.componentId === componentId) {
      // Clear existing interval
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }
      state.intervalId = intervalId;
    }
  }
  
  /**
   * Get statistics for debugging
   * @returns Manager statistics
   */
  getStats(): {
    totalActiveRequests: number;
    activeInstances: Array<{
      instanceId: string;
      componentId: string;
      lastRequest: number;
      requestCount: number;
      timeSinceLastRequest: number;
    }>;
  } {
    const now = Date.now();
    const activeInstances = Array.from(this.activeRequests.values()).map(state => ({
      instanceId: state.instanceId,
      componentId: state.componentId,
      lastRequest: state.lastRequest,
      requestCount: state.requestCount,
      timeSinceLastRequest: now - state.lastRequest
    }));
    
    return {
      totalActiveRequests: this.activeRequests.size,
      activeInstances
    };
  }
  
  /**
   * Emergency cleanup - stop all QR requests
   */
  emergencyStop(): void {
    console.log(`🚨 QR Manager: Emergency stop - cleaning up ${this.activeRequests.size} active requests`);
    
    for (const [instanceId, state] of this.activeRequests) {
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }
    }
    
    this.activeRequests.clear();
    console.log('🛑 QR Manager: All QR requests stopped');
  }
}

// Global singleton instance
export const qrRequestManager = new QRRequestManager();

// Debug function for development
if (typeof window !== 'undefined') {
  (window as any).qrRequestManager = qrRequestManager;
}
