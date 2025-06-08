/**
 * Unified QR Code Stream Hook
 * 
 * Replaces multiple polling mechanisms with a single, unified approach
 * that prevents infinite loops and ensures proper resource cleanup.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getUnifiedPollingService, type PollingCallbacks } from '@/lib/services/UnifiedWhatsAppPollingService';
import { getStateSyncService } from '@/lib/services/WhatsAppStateSyncService';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface QRCodeData {
  qrCode: string;
  expiresAt: string;
  timestamp: string;
  source: 'evolution_api' | 'database' | 'webhook';
  isRealQR: boolean;
}

interface ConnectionStatus {
  status: string;
  state: string;
  message?: string;
  timestamp: string;
}

interface QRStreamState {
  qrData: QRCodeData | null;
  connectionStatus: ConnectionStatus | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  retryCount: number;
}

interface UseUnifiedQRCodeStreamOptions {
  autoStart?: boolean;
  enableStateSync?: boolean;
  onConnected?: () => void;
  onError?: (error: string) => void;
  onQRUpdate?: (qrData: QRCodeData) => void;
}

// =====================================================
// UNIFIED QR CODE STREAM HOOK
// =====================================================

/**
 * Unified hook for QR code streaming that prevents infinite loops
 * and ensures proper resource management.
 */
export function useUnifiedQRCodeStream(
  instanceId: string,
  instanceName: string,
  options: UseUnifiedQRCodeStreamOptions = {}
) {
  const {
    autoStart = true,
    enableStateSync = true,
    onConnected,
    onError,
    onQRUpdate
  } = options;

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [state, setState] = useState<QRStreamState>({
    qrData: null,
    connectionStatus: null,
    isLoading: false,
    error: null,
    isConnected: false,
    retryCount: 0
  });

  // Refs for cleanup and preventing stale closures
  const isActiveRef = useRef(false);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const componentIdRef = useRef(`qr-stream-${instanceId}-${Date.now()}`);

  // =====================================================
  // POLLING CALLBACKS
  // =====================================================

  const pollingCallbacks: PollingCallbacks = {
    onQRUpdate: useCallback((qrData) => {
      if (!isActiveRef.current) return;

      setState(prev => ({
        ...prev,
        qrData: {
          qrCode: qrData.qrCode,
          expiresAt: qrData.expiresAt,
          timestamp: qrData.timestamp,
          source: qrData.source,
          isRealQR: qrData.isRealQR
        },
        isLoading: false,
        error: null
      }));

      // Call external callback
      onQRUpdate?.(qrData);

      console.log(`📱 QR code updated for instance ${instanceId}:`, {
        source: qrData.source,
        isRealQR: qrData.isRealQR,
        expiresAt: qrData.expiresAt
      });
    }, [instanceId, onQRUpdate]),

    onStatusUpdate: useCallback((statusData) => {
      if (!isActiveRef.current) return;

      setState(prev => ({
        ...prev,
        connectionStatus: {
          status: statusData.status,
          state: statusData.state,
          message: statusData.message,
          timestamp: statusData.timestamp
        },
        isConnected: statusData.state === 'open',
        error: null
      }));

      console.log(`📊 Status updated for instance ${instanceId}:`, statusData);
    }, [instanceId]),

    onConnected: useCallback(() => {
      if (!isActiveRef.current) return;

      setState(prev => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        error: null,
        connectionStatus: {
          status: 'connected',
          state: 'open',
          message: 'WhatsApp connected successfully',
          timestamp: new Date().toISOString()
        }
      }));

      // Call external callback
      onConnected?.();

      console.log(`✅ WhatsApp connected for instance ${instanceId}`);
    }, [instanceId, onConnected]),

    onError: useCallback((errorData) => {
      if (!isActiveRef.current) return;

      setState(prev => ({
        ...prev,
        error: errorData.error,
        isLoading: false,
        retryCount: prev.retryCount + 1
      }));

      // Call external callback
      onError?.(errorData.error);

      console.error(`❌ Error for instance ${instanceId}:`, errorData);
    }, [instanceId, onError])
  };

  // =====================================================
  // STREAM MANAGEMENT
  // =====================================================

  /**
   * Start the unified QR code stream
   */
  const startStream = useCallback(() => {
    if (isActiveRef.current) {
      console.log(`⚠️ Stream already active for instance ${instanceId}`);
      return;
    }

    console.log(`🚀 Starting unified QR stream for instance ${instanceId} (${instanceName})`);

    isActiveRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Start unified polling
    const pollingService = getUnifiedPollingService();
    const pollingResult = pollingService.startPolling(instanceId, instanceName, pollingCallbacks);

    if (!pollingResult.success) {
      setState(prev => ({
        ...prev,
        error: pollingResult.reason || 'Failed to start polling',
        isLoading: false
      }));
      isActiveRef.current = false;
      return;
    }

    // Add polling cleanup function
    cleanupFunctionsRef.current.push(() => {
      pollingService.stopPolling(instanceId);
    });

    // Start state synchronization if enabled
    if (enableStateSync) {
      const stateSyncService = getStateSyncService();
      stateSyncService.startContinuousSync(instanceId, instanceName);

      // Add state sync cleanup function
      cleanupFunctionsRef.current.push(() => {
        stateSyncService.stopContinuousSync(instanceId);
      });
    }

    console.log(`✅ Unified QR stream started for instance ${instanceId}`);
  }, [instanceId, instanceName, enableStateSync, pollingCallbacks]);

  /**
   * Stop the unified QR code stream
   */
  const stopStream = useCallback(() => {
    if (!isActiveRef.current) {
      return;
    }

    console.log(`🛑 Stopping unified QR stream for instance ${instanceId}`);

    isActiveRef.current = false;

    // Execute all cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
      }
    });

    // Clear cleanup functions
    cleanupFunctionsRef.current = [];

    // Reset state
    setState({
      qrData: null,
      connectionStatus: null,
      isLoading: false,
      error: null,
      isConnected: false,
      retryCount: 0
    });

    console.log(`✅ Unified QR stream stopped for instance ${instanceId}`);
  }, [instanceId]);

  /**
   * Restart the stream (useful for error recovery)
   */
  const restartStream = useCallback(() => {
    console.log(`🔄 Restarting unified QR stream for instance ${instanceId}`);
    stopStream();
    setTimeout(() => {
      startStream();
    }, 1000); // Brief delay to ensure cleanup
  }, [stopStream, startStream, instanceId]);

  /**
   * Force refresh QR code
   */
  const refreshQRCode = useCallback(async () => {
    if (!isActiveRef.current) {
      console.log(`⚠️ Cannot refresh QR - stream not active for instance ${instanceId}`);
      return;
    }

    console.log(`🔄 Force refreshing QR code for instance ${instanceId}`);

    // Trigger state sync to get latest QR code
    if (enableStateSync) {
      try {
        const stateSyncService = getStateSyncService();
        const syncResult = await stateSyncService.syncInstanceState(instanceId, instanceName);
        
        if (syncResult.synced && syncResult.changed) {
          console.log(`✅ QR code refreshed via state sync for instance ${instanceId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to refresh QR code for instance ${instanceId}:`, error);
        setState(prev => ({
          ...prev,
          error: 'Failed to refresh QR code'
        }));
      }
    }
  }, [instanceId, instanceName, enableStateSync]);

  // =====================================================
  // LIFECYCLE MANAGEMENT
  // =====================================================

  // Auto-start effect
  useEffect(() => {
    if (autoStart && instanceId && instanceName) {
      startStream();
    }

    // Cleanup on unmount or dependency change
    return () => {
      stopStream();
    };
  }, [instanceId, instanceName, autoStart]); // Only depend on essential props

  // Page unload cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isActiveRef.current) {
        console.log(`🧹 Page unload cleanup for instance ${instanceId}`);
        stopStream();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [instanceId, stopStream]);

  // =====================================================
  // RETURN INTERFACE
  // =====================================================

  return {
    // State
    qrData: state.qrData,
    connectionStatus: state.connectionStatus,
    isLoading: state.isLoading,
    error: state.error,
    isConnected: state.isConnected,
    retryCount: state.retryCount,
    isActive: isActiveRef.current,

    // Actions
    startStream,
    stopStream,
    restartStream,
    refreshQRCode,

    // Utilities
    getPollingStats: () => getUnifiedPollingService().getPollingStats(),
    getSyncStatus: () => getStateSyncService().getSyncStatus(instanceId)
  };
}

// =====================================================
// CONVENIENCE HOOKS
// =====================================================

/**
 * Simplified hook for basic QR code display
 */
export function useQRCodeDisplay(instanceId: string, instanceName: string) {
  return useUnifiedQRCodeStream(instanceId, instanceName, {
    autoStart: true,
    enableStateSync: true
  });
}

/**
 * Hook for connection monitoring only (no QR codes)
 */
export function useConnectionMonitoring(instanceId: string, instanceName: string) {
  return useUnifiedQRCodeStream(instanceId, instanceName, {
    autoStart: true,
    enableStateSync: true
  });
}
