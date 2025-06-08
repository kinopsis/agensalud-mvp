/**
 * WhatsApp Connection Monitor
 * 
 * Monitors WhatsApp connection status and handles automatic transitions
 * after QR code scanning.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface WhatsAppConnectionMonitorProps {
  instanceId: string;
  instanceName: string;
  onConnected?: () => void;
  onError?: (error: string) => void;
  onStatusUpdate?: (status: string) => void;
}

interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  message?: string;
  timestamp: string;
}

/**
 * WhatsApp Connection Monitor Component
 * 
 * Provides real-time monitoring of WhatsApp connection status
 * with automatic UI updates and callback handling.
 */
export const WhatsAppConnectionMonitor: React.FC<WhatsAppConnectionMonitorProps> = ({
  instanceId,
  instanceName,
  onConnected,
  onError,
  onStatusUpdate
}) => {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'connecting',
    timestamp: new Date().toISOString()
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrors = useRef(0);
  const maxErrors = 5;

  // =====================================================
  // CONNECTION MONITORING
  // =====================================================

  /**
   * Check connection status from Evolution API
   */
  const checkConnectionStatus = async (): Promise<ConnectionStatus> => {
    try {
      const response = await fetch(`/api/whatsapp/simple/instances/${instanceId}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return {
          status: result.data.status,
          message: result.data.message,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(result.error || 'Unknown status check error');
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection check failed',
        timestamp: new Date().toISOString()
      };
    }
  };

  /**
   * Start monitoring connection status
   */
  const startMonitoring = () => {
    if (isMonitoring || intervalRef.current) {
      return;
    }

    console.log(`🔍 Starting connection monitoring for instance: ${instanceId}`);
    setIsMonitoring(true);
    consecutiveErrors.current = 0;

    // Initial check
    checkAndUpdateStatus();

    // Set up polling interval (every 3 seconds)
    intervalRef.current = setInterval(checkAndUpdateStatus, 3000);
  };

  /**
   * Stop monitoring connection status
   */
  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
    console.log(`⏹️ Stopped connection monitoring for instance: ${instanceId}`);
  };

  /**
   * Check status and update state
   */
  const checkAndUpdateStatus = async () => {
    try {
      const newStatus = await checkConnectionStatus();
      
      // Reset error counter on successful check
      consecutiveErrors.current = 0;
      
      // Update state if status changed
      setConnectionStatus(prevStatus => {
        if (prevStatus.status !== newStatus.status) {
          console.log(`📱 Status changed: ${prevStatus.status} → ${newStatus.status}`);
          
          // Call callbacks
          onStatusUpdate?.(newStatus.status);
          
          if (newStatus.status === 'connected') {
            onConnected?.();
            stopMonitoring(); // Stop monitoring once connected
          } else if (newStatus.status === 'error') {
            onError?.(newStatus.message || 'Connection error');
          }
        }
        
        return newStatus;
      });
      
    } catch (error) {
      consecutiveErrors.current++;
      console.warn(`⚠️ Status check error ${consecutiveErrors.current}/${maxErrors}:`, error);
      
      // Stop monitoring after too many consecutive errors
      if (consecutiveErrors.current >= maxErrors) {
        console.error('🚨 Too many consecutive errors, stopping monitoring');
        stopMonitoring();
        onError?.('Connection monitoring failed');
      }
    }
  };

  // =====================================================
  // LIFECYCLE EFFECTS
  // =====================================================

  /**
   * Start monitoring when component mounts
   */
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [instanceId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  // =====================================================
  // RENDER
  // =====================================================

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case 'connecting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus.status) {
      case 'connecting':
        return 'Esperando conexión WhatsApp...';
      case 'connected':
        return '¡WhatsApp conectado exitosamente!';
      case 'error':
        return connectionStatus.message || 'Error de conexión';
      default:
        return 'Estado desconocido';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case 'connecting':
        return 'text-blue-600';
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
      {getStatusIcon()}
      <div className="flex-1">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusMessage()}
        </p>
        {isMonitoring && (
          <p className="text-xs text-gray-500 mt-1">
            Monitoreando conexión... ({instanceName})
          </p>
        )}
      </div>
      {connectionStatus.status === 'connected' && (
        <div className="text-xs text-green-600 font-medium">
          ✓ Listo
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnectionMonitor;
