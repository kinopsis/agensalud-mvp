/**
 * Connection Status Indicator Component
 * 
 * Real-time visual indicator for WhatsApp instance connection status with
 * health monitoring, automatic reconnection, and detailed status information.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  RefreshCw,
  Clock,
  Activity,
  Info
} from 'lucide-react';
import { useConnectionStatusMonitor } from '@/hooks/useConnectionStatusMonitor';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface ConnectionStatusIndicatorProps {
  /** WhatsApp instance ID */
  instanceId: string;
  /** Instance name for display */
  instanceName?: string;
  /** Enable real-time monitoring (default: true) */
  enabled?: boolean;
  /** Check interval in seconds (default: 30) */
  checkInterval?: number;
  /** Show detailed status information (default: false) */
  showDetails?: boolean;
  /** Compact display mode (default: false) */
  compact?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Callback when status changes */
  onStatusChange?: (status: string) => void;
  /** Whether this is a simple instance (uses different API endpoints) */
  isSimpleInstance?: boolean;
}

// =====================================================
// CONNECTION STATUS INDICATOR COMPONENT
// =====================================================

/**
 * ConnectionStatusIndicator Component
 * 
 * @description Displays real-time connection status with visual indicators,
 * health monitoring, and automatic reconnection capabilities.
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  instanceId,
  instanceName,
  enabled = true,
  checkInterval = 30,
  showDetails = false,
  compact = false,
  className = '',
  onStatusChange,
  isSimpleInstance = false
}) => {
  // =====================================================
  // HOOKS AND STATE
  // =====================================================

  const [showDetailedInfo, setShowDetailedInfo] = useState(false);

  const {
    connectionStatus,
    isMonitoring,
    lastHealthCheck,
    refreshStatus,
    attemptReconnection,
    isConnected,
    isDisconnected,
    isError,
    canReconnect,
    timeSinceLastCheck
  } = useConnectionStatusMonitor({
    instanceId,
    enabled,
    checkInterval,
    maxReconnectAttempts: 3,
    isSimpleInstance,
    onStatusChange: (status) => {
      onStatusChange?.(status.status);
    }
  });

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Get status icon and color
   */
  const getStatusDisplay = () => {
    switch (connectionStatus.status) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Conectado',
          description: 'Instancia funcionando correctamente'
        };

      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Conectando',
          description: 'Estableciendo conexión...',
          animate: true
        };

      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          label: 'Desconectado',
          description: 'Instancia desconectada'
        };

      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Error',
          description: connectionStatus.errorMessage || 'Error de conexión'
        };

      default:
        return {
          icon: Activity,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Desconocido',
          description: 'Estado no disponible'
        };
    }
  };

  /**
   * Format time since last check
   */
  const formatTimeSince = (timestamp: string | null) => {
    if (!timestamp) return 'Nunca';
    
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  /**
   * Format uptime
   */
  const formatUptime = (seconds: number | undefined) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  // =====================================================
  // COMPACT MODE RENDER
  // =====================================================

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${statusDisplay.bgColor} ${statusDisplay.borderColor} border`}>
          <StatusIcon className={`h-3 w-3 ${statusDisplay.color} ${statusDisplay.animate ? 'animate-spin' : ''}`} />
        </div>
        <span className={`text-sm font-medium ${statusDisplay.color}`}>
          {statusDisplay.label}
        </span>
      </div>
    );
  }

  // =====================================================
  // FULL MODE RENDER
  // =====================================================

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Status Display */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border">
            <StatusIcon className={`h-4 w-4 ${statusDisplay.color} ${statusDisplay.animate ? 'animate-spin' : ''}`} />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${statusDisplay.color}`}>
                {statusDisplay.label}
              </span>
              {instanceName && (
                <span className="text-xs text-gray-500">
                  • {instanceName}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {statusDisplay.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={refreshStatus}
            disabled={!isMonitoring}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualizar estado"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Reconnect Button */}
          {(isDisconnected || isError) && canReconnect && (
            <button
              type="button"
              onClick={attemptReconnection}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
              title="Intentar reconectar"
            >
              Reconectar
            </button>
          )}

          {/* Details Toggle */}
          {showDetails && (
            <button
              type="button"
              onClick={() => setShowDetailedInfo(!showDetailedInfo)}
              className="p-1.5 text-gray-400 hover:text-gray-600"
              title="Ver detalles"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Detailed Information */}
      {showDetails && showDetailedInfo && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Información Detallada</h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Última verificación:</span>
              <div className="font-medium text-gray-900">
                {formatTimeSince(connectionStatus.lastCheck)}
              </div>
            </div>
            
            <div>
              <span className="text-gray-500">Última conexión:</span>
              <div className="font-medium text-gray-900">
                {formatTimeSince(connectionStatus.lastSeen)}
              </div>
            </div>
            
            {connectionStatus.uptime && (
              <div>
                <span className="text-gray-500">Tiempo activo:</span>
                <div className="font-medium text-gray-900">
                  {formatUptime(connectionStatus.uptime)}
                </div>
              </div>
            )}
            
            <div>
              <span className="text-gray-500">Intentos reconexión:</span>
              <div className="font-medium text-gray-900">
                {connectionStatus.reconnectAttempts}/3
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <div className={`w-2 h-2 rounded-full ${connectionStatus.isHealthy ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-600">
              {connectionStatus.isHealthy ? 'Saludable' : 'Requiere atención'}
            </span>
            {isMonitoring && (
              <span className="text-xs text-blue-600">• Monitoreando</span>
            )}
          </div>

          {/* Error Message */}
          {connectionStatus.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2">
              <p className="text-xs text-red-700">
                <strong>Error:</strong> {connectionStatus.errorMessage}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Monitoring Status */}
      {enabled && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              Verificación cada {checkInterval}s
            </span>
          </div>
          
          {timeSinceLastCheck !== null && (
            <span>
              Última: {Math.floor(timeSinceLastCheck / 1000)}s
            </span>
          )}
        </div>
      )}
    </div>
  );
};
