/**
 * Unified QR Code Display Component
 * 
 * Replaces the existing QRCodeDisplay with a unified approach that prevents
 * infinite loops and ensures proper resource management.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useUnifiedQRCodeStream } from '@/hooks/useUnifiedQRCodeStream';
import { QRCodeSVG } from 'qrcode.react';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface UnifiedQRCodeDisplayProps {
  instanceId: string;
  instanceName: string;
  size?: number;
  className?: string;
  showRefreshButton?: boolean;
  showStatusIndicator?: boolean;
  showTimestamp?: boolean;
  onConnected?: () => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

interface QRCodeValidation {
  isValid: boolean;
  isRealQR: boolean;
  reason?: string;
}

// =====================================================
// UNIFIED QR CODE DISPLAY COMPONENT
// =====================================================

/**
 * Unified QR Code Display component with proper resource management
 * and infinite loop prevention.
 */
export const UnifiedQRCodeDisplay: React.FC<UnifiedQRCodeDisplayProps> = ({
  instanceId,
  instanceName,
  size = 256,
  className = '',
  showRefreshButton = true,
  showStatusIndicator = true,
  showTimestamp = false,
  onConnected,
  onError,
  autoStart = true
}) => {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [refreshCooldown, setRefreshCooldown] = useState<boolean>(false);

  // Use unified QR code stream
  const {
    qrData,
    connectionStatus,
    isLoading,
    error,
    isConnected,
    retryCount,
    isActive,
    startStream,
    stopStream,
    restartStream,
    refreshQRCode,
    getPollingStats,
    getSyncStatus
  } = useUnifiedQRCodeStream(instanceId, instanceName, {
    autoStart,
    enableStateSync: true,
    onConnected,
    onError
  });

  // =====================================================
  // QR CODE VALIDATION
  // =====================================================

  /**
   * Validate QR code data
   */
  const validateQRCode = useCallback((qrCode: string): QRCodeValidation => {
    if (!qrCode || typeof qrCode !== 'string') {
      return { isValid: false, isRealQR: false, reason: 'Empty or invalid QR code' };
    }

    // Remove data URL prefix if present
    let cleanBase64 = qrCode;
    if (qrCode.startsWith('data:image/')) {
      const commaIndex = qrCode.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = qrCode.substring(commaIndex + 1);
      }
    }

    // Check minimum length for real QR codes
    if (cleanBase64.length < 1000) {
      return { isValid: true, isRealQR: false, reason: 'QR code too short, likely mock' };
    }

    try {
      // Try to decode base64 to verify it's valid
      const decoded = atob(cleanBase64);
      if (decoded.length < 500) {
        return { isValid: true, isRealQR: false, reason: 'Decoded QR too small' };
      }

      // Check for PNG header (real WhatsApp QR codes are PNG)
      const isPNG = decoded.startsWith('\x89PNG\r\n\x1a\n');
      if (!isPNG) {
        return { isValid: true, isRealQR: false, reason: 'Not PNG format' };
      }

      return { isValid: true, isRealQR: true };
    } catch (decodeError) {
      return { isValid: false, isRealQR: false, reason: 'Invalid base64 encoding' };
    }
  }, []);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle manual refresh with cooldown
   */
  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefresh;
    const cooldownPeriod = 5000; // 5 seconds cooldown

    if (timeSinceLastRefresh < cooldownPeriod) {
      console.log(`⏳ Refresh cooldown active, wait ${Math.ceil((cooldownPeriod - timeSinceLastRefresh) / 1000)}s`);
      return;
    }

    setLastRefresh(now);
    setRefreshCooldown(true);

    try {
      await refreshQRCode();
      console.log(`✅ QR code refresh triggered for instance ${instanceId}`);
    } catch (error) {
      console.error(`❌ Failed to refresh QR code:`, error);
    } finally {
      // Remove cooldown after delay
      setTimeout(() => {
        setRefreshCooldown(false);
      }, cooldownPeriod);
    }
  }, [instanceId, refreshQRCode, lastRefresh]);

  /**
   * Handle stream restart
   */
  const handleRestart = useCallback(() => {
    console.log(`🔄 Restarting QR stream for instance ${instanceId}`);
    restartStream();
  }, [instanceId, restartStream]);

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Render QR code image or placeholder
   */
  const renderQRCode = () => {
    if (!qrData?.qrCode) {
      return (
        <div 
          className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
          style={{ width: size, height: size }}
        >
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm">
              {isLoading ? 'Generando QR...' : 'QR no disponible'}
            </div>
          </div>
        </div>
      );
    }

    const validation = validateQRCode(qrData.qrCode);

    // For valid QR codes, display them
    if (validation.isValid) {
      // If it's a data URL, display as image
      if (qrData.qrCode.startsWith('data:image/')) {
        return (
          <div className="relative">
            <img
              src={qrData.qrCode}
              alt="WhatsApp QR Code"
              width={size}
              height={size}
              className="border border-gray-200 rounded-lg"
            />
            {!validation.isRealQR && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                DEMO
              </div>
            )}
          </div>
        );
      } else {
        // For text QR codes, use QRCodeSVG
        return (
          <div className="relative">
            <QRCodeSVG
              value={qrData.qrCode}
              size={size}
              level="M"
              includeMargin={true}
              className="border border-gray-200 rounded-lg"
            />
            {!validation.isRealQR && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                DEMO
              </div>
            )}
          </div>
        );
      }
    }

    // Invalid QR code
    return (
      <div 
        className="flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg"
        style={{ width: size, height: size }}
      >
        <div className="text-center text-red-600">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm">QR inválido</div>
          <div className="text-xs mt-1">{validation.reason}</div>
        </div>
      </div>
    );
  };

  /**
   * Render status indicator
   */
  const renderStatusIndicator = () => {
    if (!showStatusIndicator) return null;

    const getStatusColor = () => {
      if (isConnected) return 'text-green-600';
      if (isLoading) return 'text-blue-600';
      if (error) return 'text-red-600';
      return 'text-gray-600';
    };

    const getStatusText = () => {
      if (isConnected) return '✅ Conectado';
      if (isLoading) return '🔄 Conectando...';
      if (error) return '❌ Error';
      if (!isActive) return '⏸️ Pausado';
      return '⏳ Esperando...';
    };

    return (
      <div className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
        {connectionStatus?.message && (
          <div className="text-xs text-gray-500 mt-1">
            {connectionStatus.message}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render action buttons
   */
  const renderActionButtons = () => {
    return (
      <div className="flex gap-2 justify-center">
        {showRefreshButton && !isConnected && (
          <button
            onClick={handleRefresh}
            disabled={refreshCooldown || isLoading}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshCooldown ? '⏳' : '🔄'} Actualizar
          </button>
        )}

        {error && (
          <button
            onClick={handleRestart}
            className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            🔄 Reintentar
          </button>
        )}

        {!isActive && (
          <button
            onClick={startStream}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          >
            ▶️ Iniciar
          </button>
        )}

        {isActive && !isConnected && (
          <button
            onClick={stopStream}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ⏸️ Pausar
          </button>
        )}
      </div>
    );
  };

  /**
   * Render debug information (development only)
   */
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    const pollingStats = getPollingStats();
    const syncStatus = getSyncStatus();

    return (
      <details className="mt-4 text-xs text-gray-500">
        <summary className="cursor-pointer">🔧 Debug Info</summary>
        <div className="mt-2 space-y-1">
          <div>Instance: {instanceId}</div>
          <div>Active Pollers: {pollingStats.activePollers}</div>
          <div>Retry Count: {retryCount}</div>
          <div>Last Sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : 'Never'}</div>
          {qrData && (
            <div>QR Source: {qrData.source} ({qrData.isRealQR ? 'Real' : 'Mock'})</div>
          )}
        </div>
      </details>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className={`text-center space-y-4 ${className}`}>
      {/* QR Code Display */}
      <div className="flex justify-center">
        {renderQRCode()}
      </div>

      {/* Status Indicator */}
      {renderStatusIndicator()}

      {/* Timestamp */}
      {showTimestamp && qrData?.timestamp && (
        <div className="text-xs text-gray-500">
          Actualizado: {new Date(qrData.timestamp).toLocaleTimeString()}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Action Buttons */}
      {renderActionButtons()}

      {/* Instructions */}
      {qrData && !isConnected && (
        <div className="text-sm text-gray-600 max-w-md mx-auto">
          <p className="font-medium mb-1">📱 Para conectar WhatsApp:</p>
          <ol className="text-left space-y-1">
            <li>1. Abre WhatsApp Business en tu teléfono</li>
            <li>2. Ve a Configuración → Dispositivos Vinculados</li>
            <li>3. Toca "Vincular un dispositivo"</li>
            <li>4. Escanea este código QR</li>
          </ol>
          <p className="text-xs text-gray-500 mt-2">
            El código se actualiza automáticamente cada 30 segundos
          </p>
        </div>
      )}

      {/* Success Message */}
      {isConnected && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
          🎉 ¡WhatsApp conectado exitosamente! Ya puedes recibir y enviar mensajes.
        </div>
      )}

      {/* Debug Information */}
      {renderDebugInfo()}
    </div>
  );
};

export default UnifiedQRCodeDisplay;
