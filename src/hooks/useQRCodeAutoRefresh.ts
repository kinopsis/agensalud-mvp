/**
 * QR Code Auto-Refresh Hook
 * 
 * Provides real-time QR code updates for WhatsApp instance connection.
 * Implements 30-second auto-refresh with webhook-based delivery and SSE streaming.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { qrRequestManager } from '@/utils/qrRequestManager';
import { emergencyQRCircuitBreaker } from '@/utils/emergencyQRCircuitBreaker';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface QRCodeData {
  qrCode: string | null;
  status: 'loading' | 'available' | 'expired' | 'error' | 'connected';
  expiresAt: string | null;
  lastUpdated: string | null;
  error?: string;
}

export interface QRCodeAutoRefreshOptions {
  instanceId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
  maxRetries?: number;
  onStatusChange?: (status: QRCodeData['status']) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  isSimpleInstance?: boolean; // Whether to use simple WhatsApp API endpoints
}

// =====================================================
// QR CODE AUTO-REFRESH HOOK
// =====================================================

/**
 * Hook for managing QR code auto-refresh with real-time updates
 * 
 * @param options - Configuration options for QR code management
 * @returns QR code data and control functions
 */
export function useQRCodeAutoRefresh(options: QRCodeAutoRefreshOptions) {
  const {
    instanceId,
    autoRefresh = true,
    refreshInterval = 30, // 30 seconds default
    maxRetries = 5,
    onStatusChange,
    onError,
    onConnected,
    isSimpleInstance = false
  } = options;

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [qrData, setQrData] = useState<QRCodeData>({
    qrCode: null,
    status: 'loading',
    expiresAt: null,
    lastUpdated: null
  });

  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // =====================================================
  // REFS FOR CLEANUP
  // =====================================================

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const componentIdRef = useRef<string>(`qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // =====================================================
  // QR CODE FETCHING
  // =====================================================

  /**
   * Fetch QR code from API
   */
  const fetchQRCode = useCallback(async (): Promise<QRCodeData> => {
    try {
      // EMERGENCY CIRCUIT BREAKER - First line of defense
      const circuitCheck = emergencyQRCircuitBreaker.shouldAllowRequest(instanceId, 'useQRCodeAutoRefresh');
      if (!circuitCheck.allowed) {
        console.log(`🚨 Emergency Circuit Breaker: ${circuitCheck.reason}`);
        throw new Error(`Emergency circuit breaker: ${circuitCheck.reason}`);
      }

      // CRITICAL FIX: Check QR request manager before making request
      const requestCheck = qrRequestManager.canMakeRequest(instanceId, componentIdRef.current);
      if (!requestCheck.allowed) {
        console.log(`🚫 QR request blocked: ${requestCheck.reason}`);
        if (requestCheck.waitTime) {
          console.log(`⏱️ Wait ${Math.ceil(requestCheck.waitTime / 1000)}s before next request`);
        }
        throw new Error(`QR request blocked: ${requestCheck.reason}`);
      }

      // Record the request
      qrRequestManager.recordRequest(instanceId, componentIdRef.current);

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Use different endpoints based on instance type
      const endpoint = isSimpleInstance
        ? `/api/whatsapp/simple/instances/${instanceId}/qr`
        : `/api/channels/whatsapp/instances/${instanceId}/qr`;

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
        if (response.status === 409) {
          // Instance already connected
          return {
            qrCode: null,
            status: 'connected',
            expiresAt: null,
            lastUpdated: new Date().toISOString()
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const response_data = await response.json();

      // Handle different response formats
      const data = isSimpleInstance ? response_data.data : response_data;

      if (data?.status === 'connected') {
        return {
          qrCode: null,
          status: 'connected',
          expiresAt: null,
          lastUpdated: new Date().toISOString()
        };
      }

      if (!data?.qrCode) {
        return {
          qrCode: null,
          status: 'loading',
          expiresAt: null,
          lastUpdated: new Date().toISOString()
        };
      }

      return {
        qrCode: data.qrCode,
        status: 'available',
        expiresAt: data.expiresAt || new Date(Date.now() + 60000).toISOString(), // Extended to 60 seconds
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, don't treat as error
        throw error;
      }

      console.error('Error fetching QR code:', error);
      return {
        qrCode: null,
        status: 'error',
        expiresAt: null,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [instanceId, isSimpleInstance]);

  /**
   * Update QR code data with status change notifications
   */
  const updateQRData = useCallback((newData: QRCodeData) => {
    setQrData(prevData => {
      // Only trigger status change if status actually changed
      if (prevData.status !== newData.status) {
        onStatusChange?.(newData.status);
        
        // Trigger specific callbacks
        if (newData.status === 'connected') {
          onConnected?.();
        } else if (newData.status === 'error' && newData.error) {
          onError?.(newData.error);
        }
      }

      return newData;
    });
  }, [onStatusChange, onConnected, onError]);

  // =====================================================
  // SMART REFRESH LOGIC
  // =====================================================

  /**
   * Check if QR code is in scanning window (don't refresh if user might be scanning)
   */
  const isInScanningWindow = useCallback((expiresAt: string | null): boolean => {
    if (!expiresAt) return false;

    const timeLeft = new Date(expiresAt).getTime() - Date.now();
    // Don't refresh if more than 15 seconds left (user might be scanning)
    return timeLeft > 15000;
  }, []);

  // =====================================================
  // POLLING LOGIC
  // =====================================================

  /**
   * Start polling for QR code updates
   */
  const startPolling = useCallback(async () => {
    if (isPolling || !autoRefresh) return;

    // CRITICAL FIX: Register with QR request manager
    const registration = qrRequestManager.register(instanceId, componentIdRef.current);
    if (!registration.success) {
      console.log(`🚫 Cannot start QR polling: ${registration.reason}`);
      return;
    }

    setIsPolling(true);
    setRetryCount(0);

    const poll = async () => {
      try {
        // Smart refresh: Don't refresh if user might be scanning
        if (qrData.expiresAt && isInScanningWindow(qrData.expiresAt)) {
          console.log('🔄 Skipping QR refresh - user might be scanning (>15s remaining)');
          return;
        }

        const newQrData = await fetchQRCode();
        updateQRData(newQrData);
        setRetryCount(0); // Reset retry count on success

        // Stop polling if connected
        if (newQrData.status === 'connected') {
          setIsPolling(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Ignore aborted requests
        }

        console.error('Polling error:', error);
        setRetryCount(prev => {
          const newCount = prev + 1;
          
          if (newCount >= maxRetries) {
            setIsPolling(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            updateQRData({
              qrCode: null,
              status: 'error',
              expiresAt: null,
              lastUpdated: new Date().toISOString(),
              error: `Max retries (${maxRetries}) exceeded`
            });
          }
          
          return newCount;
        });
      }
    };

    // Initial fetch
    await poll();

    // Set up interval for subsequent fetches
    if (autoRefresh && !intervalRef.current) {
      intervalRef.current = setInterval(poll, refreshInterval * 1000);
      // Register interval with QR request manager
      qrRequestManager.setIntervalId(instanceId, componentIdRef.current, intervalRef.current);
    }
  }, [isPolling, autoRefresh, fetchQRCode, updateQRData, refreshInterval, maxRetries, qrData.expiresAt, isInScanningWindow]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    setIsPolling(false);

    // CRITICAL FIX: Unregister from QR request manager
    qrRequestManager.unregister(instanceId, componentIdRef.current);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [instanceId]);

  /**
   * Manually refresh QR code
   */
  const refreshQRCode = useCallback(async () => {
    try {
      updateQRData({
        ...qrData,
        status: 'loading'
      });

      const newQrData = await fetchQRCode();
      updateQRData(newQrData);
      setRetryCount(0);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      console.error('Manual refresh error:', error);
      updateQRData({
        qrCode: null,
        status: 'error',
        expiresAt: null,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Refresh failed'
      });
    }
  }, [fetchQRCode, updateQRData, qrData]);

  // =====================================================
  // LIFECYCLE EFFECTS
  // =====================================================

  /**
   * Start polling when component mounts or instanceId changes
   */
  useEffect(() => {
    if (instanceId && autoRefresh) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [instanceId, autoRefresh, startPolling, stopPolling]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopPolling();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [stopPolling]);

  // =====================================================
  // RETURN HOOK INTERFACE
  // =====================================================

  return {
    // QR Code data
    qrCode: qrData.qrCode,
    status: qrData.status,
    expiresAt: qrData.expiresAt,
    lastUpdated: qrData.lastUpdated,
    error: qrData.error,

    // State flags
    isPolling,
    retryCount,

    // Control functions
    startPolling,
    stopPolling,
    refreshQRCode,

    // Computed properties
    isExpired: qrData.expiresAt ? new Date() > new Date(qrData.expiresAt) : false,
    timeUntilExpiry: qrData.expiresAt ? 
      Math.max(0, new Date(qrData.expiresAt).getTime() - Date.now()) : 0
  };
}
