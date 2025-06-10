/**
 * Connection Status Monitoring Hook
 * 
 * Provides real-time monitoring of WhatsApp instance connection status with health checks,
 * automatic reconnection attempts, and UI state management.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringRegistry } from '@/utils/monitoringRegistry';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'unknown';
  lastSeen: string | null;
  lastCheck: string | null;
  errorMessage?: string;
  isHealthy: boolean;
  reconnectAttempts: number;
  uptime?: number; // seconds
}

export interface ConnectionStatusMonitorOptions {
  instanceId: string;
  enabled?: boolean;
  checkInterval?: number; // seconds
  maxReconnectAttempts?: number;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: string) => void;
  onReconnected?: () => void;
  isSimpleInstance?: boolean; // Whether to use simple WhatsApp API endpoints
}

// =====================================================
// CONNECTION STATUS MONITORING HOOK
// =====================================================

/**
 * Hook for monitoring WhatsApp instance connection status in real-time
 * 
 * @param options - Configuration options for status monitoring
 * @returns Connection status data and control functions
 */
export function useConnectionStatusMonitor(options: ConnectionStatusMonitorOptions) {
  const {
    instanceId,
    enabled = true,
    checkInterval = 30, // 30 seconds default
    maxReconnectAttempts = 3,
    onStatusChange,
    onError,
    onReconnected,
    isSimpleInstance = false
  } = options;

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'unknown',
    lastSeen: null,
    lastCheck: null,
    isHealthy: false,
    reconnectAttempts: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  // =====================================================
  // REFS FOR CLEANUP
  // =====================================================

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentIdRef = useRef<string>(`monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // =====================================================
  // STATUS CHECKING LOGIC
  // =====================================================

  /**
   * Check connection status from API
   */
  const checkConnectionStatus = useCallback(async (): Promise<ConnectionStatus> => {
    try {
      // ENHANCED CIRCUIT BREAKER: Block monitoring for problematic instances that cause infinite loops
      const problematicInstances = [
        '927cecbe-hhghg',
        '927cecbe-polopolo',
        '927cecbe-pticavisualcarwhatsa',
        '693b032b-bdd2-4ae4-91eb-83a031aef568', // The "polo" instance causing infinite loops
        'bc3f6952-378a-4dc4-9d1e-1e8f8f426967', // Current problematic instance causing infinite loops
        'kinopsis' // Instance from screenshot causing issues
      ];

      const isProblematic = problematicInstances.some(problematic => instanceId.includes(problematic));

      if (isProblematic) {
        console.log(`🛑 MONITORING BLOCKED: Stopping monitoring for problematic instance: ${instanceId}`);

        // Throw error to stop monitoring completely
        throw new Error(`Instance ${instanceId} has been disabled due to infinite monitoring loop protection`);
      }

      // CRITICAL FIX: Dynamic problematic instance detection
      const registryData = monitoringRegistry.getInstanceData(instanceId);
      if (registryData && registryData.errorCount > 10) {
        console.log(`🛑 MONITORING BLOCKED: Instance ${instanceId} has too many errors (${registryData.errorCount}) - stopping monitoring`);

        throw new Error(`Instance ${instanceId} has been disabled due to excessive errors (${registryData.errorCount})`);
      }

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Use different endpoints based on instance type
      const endpoint = isSimpleInstance
        ? `/api/whatsapp/simple/instances/${instanceId}` // Simple instances don't have a separate status endpoint
        : `/api/channels/whatsapp/instances/${instanceId}/status`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Instance not found');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const response_data = await response.json();
      const now = new Date().toISOString();

      // ENHANCED: Handle different response formats with null safety
      const data = response_data?.data || response_data;

      // ENHANCED: Parse status with comprehensive fallbacks and null checks
      const apiStatus = data?.status || data?.connectionState || response_data?.status || 'unknown';
      const lastSeen = data?.lastSeen || data?.last_seen || data?.updated_at || data?.lastUpdated || null;
      const uptime = data?.uptime || null;
      const errorMessage = data?.error || data?.error_message || data?.errorMessage || response_data?.error?.message || null;

      // Determine health status
      const isHealthy = apiStatus === 'connected' && !errorMessage;

      const statusData: ConnectionStatus = {
        status: apiStatus,
        lastSeen,
        lastCheck: now,
        errorMessage,
        isHealthy,
        reconnectAttempts: connectionStatus.reconnectAttempts,
        uptime
      };

      return statusData;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't treat as error
        throw error;
      }

      console.error('Error checking connection status:', error);
      
      const now = new Date().toISOString();
      return {
        status: 'error',
        lastSeen: connectionStatus.lastSeen,
        lastCheck: now,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isHealthy: false,
        reconnectAttempts: connectionStatus.reconnectAttempts
      };
    }
  }, [instanceId, isSimpleInstance, connectionStatus.reconnectAttempts, connectionStatus.lastSeen]);

  /**
   * Update connection status with notifications
   */
  const updateConnectionStatus = useCallback((newStatus: ConnectionStatus) => {
    setConnectionStatus(prevStatus => {
      // Only trigger callbacks if status actually changed
      if (prevStatus.status !== newStatus.status) {
        onStatusChange?.(newStatus);
        
        // Trigger specific callbacks
        if (newStatus.status === 'connected' && prevStatus.status !== 'connected') {
          onReconnected?.();
        } else if (newStatus.status === 'error' && newStatus.errorMessage) {
          onError?.(newStatus.errorMessage);
        }
      }

      return newStatus;
    });
  }, [onStatusChange, onReconnected, onError]);

  // =====================================================
  // MONITORING CONTROL FUNCTIONS (DEFINED FIRST TO AVOID CIRCULAR DEPENDENCIES)
  // =====================================================

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    console.log(`🔍 Stopping connection monitoring for instance: ${instanceId}`);
    setIsMonitoring(false);

    // Unregister from monitoring registry
    monitoringRegistry.unregister(instanceId);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [instanceId]);

  // =====================================================
  // HEALTH CHECK LOGIC
  // =====================================================

  /**
   * Perform health check and update status
   */
  const performHealthCheck = useCallback(async () => {
    if (!enabled) return;

    // Update registry with last check time
    monitoringRegistry.updateLastCheck(instanceId);

    try {
      const statusData = await checkConnectionStatus();
      updateConnectionStatus(statusData);
      setLastHealthCheck(new Date());

      // Reset error count in registry on successful check
      monitoringRegistry.resetErrors(instanceId);

      // Reset reconnect attempts if connection is healthy
      if (statusData.isHealthy && statusData.reconnectAttempts > 0) {
        updateConnectionStatus({
          ...statusData,
          reconnectAttempts: 0
        });
      }

      // CRITICAL FIX: Stop monitoring if instance is connected and stable
      if (statusData.status === 'connected' && statusData.isHealthy) {
        console.log(`✅ Instance ${instanceId} is connected and stable - stopping monitoring to prevent infinite loops`);
        stopMonitoring();
        return;
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Ignore aborted requests
      }

      console.error('Health check failed:', error);

      // Record error in registry and check if monitoring should continue
      const shouldContinue = monitoringRegistry.recordError(instanceId);
      if (!shouldContinue) {
        console.log(`🛑 Max errors reached for instance ${instanceId} - stopping monitoring`);
        stopMonitoring();
        return;
      }

      // CRITICAL FIX: Stop monitoring if instance is not found
      if (error instanceof Error && error.message.includes('Instance not found')) {
        console.log(`🛑 Instance ${instanceId} not found - stopping monitoring`);
        stopMonitoring();
        return;
      }

      // CRITICAL FIX: Stop monitoring if instance is problematic (infinite loop protection)
      if (error instanceof Error && error.message.includes('infinite monitoring loop protection')) {
        console.log(`🛑 Instance ${instanceId} is problematic - stopping monitoring permanently`);
        stopMonitoring();
        return;
      }

      const errorStatus: ConnectionStatus = {
        status: 'error',
        lastSeen: connectionStatus.lastSeen,
        lastCheck: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Health check failed',
        isHealthy: false,
        reconnectAttempts: connectionStatus.reconnectAttempts
      };

      updateConnectionStatus(errorStatus);
    }
  }, [enabled, checkConnectionStatus, updateConnectionStatus, connectionStatus.lastSeen, connectionStatus.reconnectAttempts, instanceId, stopMonitoring]);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring || !enabled) return;

    // CRITICAL FIX: Check monitoring registry to prevent multiple instances
    const registrationResult = monitoringRegistry.register(
      instanceId,
      componentIdRef.current,
      checkInterval * 1000
    );

    if (!registrationResult.success) {
      console.log(`🚫 Cannot start monitoring for ${instanceId}: ${registrationResult.reason}`);
      return;
    }

    console.log(`🔍 Starting connection monitoring for instance: ${instanceId}`);
    setIsMonitoring(true);

    // Initial health check
    performHealthCheck();

    // Set up interval for subsequent checks
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      performHealthCheck();
    }, checkInterval * 1000);

    // Register interval ID with monitoring registry
    monitoringRegistry.setIntervalId(instanceId, intervalRef.current);

  }, [isMonitoring, enabled, instanceId, performHealthCheck, checkInterval]);

  /**
   * Manual status refresh
   */
  const refreshStatus = useCallback(async () => {
    await performHealthCheck();
  }, [performHealthCheck]);

  /**
   * Attempt reconnection
   */
  const attemptReconnection = useCallback(async () => {
    if (connectionStatus.reconnectAttempts >= maxReconnectAttempts) {
      console.log(`❌ Max reconnection attempts reached for instance: ${instanceId}`);
      return false;
    }

    try {
      console.log(`🔄 Attempting reconnection for instance: ${instanceId} (attempt ${connectionStatus.reconnectAttempts + 1})`);
      
      // Update reconnect attempts
      const updatedStatus = {
        ...connectionStatus,
        reconnectAttempts: connectionStatus.reconnectAttempts + 1,
        status: 'connecting' as const
      };
      updateConnectionStatus(updatedStatus);

      // Call reconnection API
      const response = await fetch(`/api/channels/whatsapp/instances/${instanceId}/reconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Wait a bit then check status
        reconnectTimeoutRef.current = setTimeout(() => {
          performHealthCheck();
        }, 5000);
        return true;
      } else {
        throw new Error('Reconnection request failed');
      }

    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      
      const errorStatus: ConnectionStatus = {
        ...connectionStatus,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Reconnection failed',
        lastCheck: new Date().toISOString()
      };
      updateConnectionStatus(errorStatus);
      return false;
    }
  }, [connectionStatus, maxReconnectAttempts, instanceId, updateConnectionStatus, performHealthCheck]);

  // =====================================================
  // LIFECYCLE EFFECTS
  // =====================================================

  /**
   * Start monitoring when component mounts or instanceId changes
   */
  useEffect(() => {
    if (instanceId && enabled) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [instanceId, enabled, startMonitoring, stopMonitoring]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // =====================================================
  // RETURN HOOK INTERFACE
  // =====================================================

  return {
    // Status data
    connectionStatus,
    isMonitoring,
    lastHealthCheck,

    // Control functions
    startMonitoring,
    stopMonitoring,
    refreshStatus,
    attemptReconnection,

    // Computed properties
    isConnected: connectionStatus.status === 'connected',
    isDisconnected: connectionStatus.status === 'disconnected',
    isError: connectionStatus.status === 'error',
    canReconnect: connectionStatus.reconnectAttempts < maxReconnectAttempts,
    timeSinceLastCheck: lastHealthCheck ? Date.now() - lastHealthCheck.getTime() : null
  };
}
