/**
 * QRCodeDisplay Component
 * 
 * Component for displaying WhatsApp QR codes with auto-refresh functionality
 * and integration with Evolution API.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Smartphone
} from 'lucide-react';
import { useQRCodeAutoRefresh } from '@/hooks/useQRCodeAutoRefresh';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface QRCodeData {
  /** Base64 encoded QR code image */
  qrCode: string;
  /** Expiration timestamp */
  expiresAt: string;
  /** QR code generation timestamp */
  generatedAt: string;
  /** Instance connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

interface QRCodeDisplayProps {
  /** Instance ID for QR code retrieval */
  instanceId: string;
  /** Instance name for display */
  instanceName: string;
  /** Current connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Auto-refresh interval in seconds (default: 30) */
  refreshInterval?: number;
  /** Callback when QR code is scanned and connected */
  onConnected?: () => void;
  /** Callback when QR code expires or fails */
  onError?: (error: string) => void;
  /** Whether this is a simple instance (uses different API endpoints) */
  isSimpleInstance?: boolean;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * QRCodeDisplay - Component for displaying WhatsApp QR codes
 * 
 * @description Displays QR codes for WhatsApp connection with auto-refresh,
 * status monitoring, and user guidance.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  instanceId,
  instanceName,
  status,
  refreshInterval = 30,
  onConnected,
  onError,
  isSimpleInstance = false
}) => {
  // =====================================================
  // AUTO-REFRESH HOOK
  // =====================================================

  const {
    qrCode,
    status: qrStatus,
    expiresAt,
    lastUpdated,
    error: qrError,
    isPolling,
    retryCount,
    refreshQRCode,
    timeUntilExpiry
  } = useQRCodeAutoRefresh({
    instanceId,
    autoRefresh: status === 'connecting',
    refreshInterval,
    maxRetries: 5,
    onConnected,
    onError,
    isSimpleInstance
  });

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [timeLeft, setTimeLeft] = useState<number>(0);

  // =====================================================
  // COUNTDOWN TIMER
  // =====================================================

  /**
   * Update countdown timer from hook data
   */
  useEffect(() => {
    if (expiresAt) {
      const updateCountdown = () => {
        const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [expiresAt]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Manual refresh handler
   */
  const handleManualRefresh = () => {
    refreshQRCode();
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Format time left as MM:SS
   */
  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Render status indicator
   */
  const renderStatusIndicator = () => {
    const statusConfig = {
      connecting: {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: 'Esperando conexión'
      },
      connected: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Conectado'
      },
      disconnected: {
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: 'Desconectado'
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Error'
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${config.bgColor}`}>
        <Icon className="h-4 w-4 mr-2" />
        {config.label}
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  if (status === 'connected') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-green-900 mb-2">
          ¡WhatsApp Conectado!
        </h3>
        <p className="text-sm text-green-700">
          La instancia <strong>{instanceName}</strong> está conectada y lista para recibir mensajes.
        </p>
      </div>
    );
  }

  if (status !== 'connecting') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <QrCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Código QR no disponible
        </h3>
        <p className="text-sm text-gray-600">
          El código QR solo está disponible cuando la instancia está en estado "conectando".
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            Código QR de WhatsApp
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Escanea con WhatsApp para conectar <strong>{instanceName}</strong>
          </p>
        </div>
        {renderStatusIndicator()}
      </div>

      {/* QR Code Display */}
      <div className="text-center">
        {qrStatus === 'loading' ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-600">Generando código QR...</p>
          </div>
        ) : qrStatus === 'error' || qrError ? (
          <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-sm text-red-700 mb-4">{qrError || 'Error al generar código QR'}</p>
            {retryCount > 0 && (
              <p className="text-xs text-red-600 mb-2">Intento {retryCount}/5</p>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isPolling}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 inline ${isPolling ? 'animate-spin' : ''}`} />
              Reintentar
            </button>
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            {/* QR Code Image */}
            <div className="relative inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="Código QR de WhatsApp"
                className="w-64 h-64 mx-auto"
              />

              {/* Countdown overlay for urgent expiration */}
              {timeLeft > 0 && timeLeft <= 10 && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold">
                  {timeLeft}s
                </div>
              )}
            </div>

            {/* Timer and Controls */}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              {timeLeft > 0 && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Expira en: {formatTimeLeft(timeLeft)}
                </div>
              )}

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isPolling}
                className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isPolling ? 'animate-spin' : ''}`} />
                Actualizar
              </button>

              {lastUpdated && (
                <span className="text-xs text-gray-400">
                  Actualizado: {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
            <QrCode className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">No hay código QR disponible</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      {qrStatus === 'available' && qrCode && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
            <Smartphone className="h-4 w-4 mr-2" />
            Instrucciones de conexión:
          </h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Abre WhatsApp en tu teléfono</li>
            <li>Ve a Configuración → Dispositivos vinculados</li>
            <li>Toca "Vincular un dispositivo"</li>
            <li>Escanea este código QR con la cámara</li>
            <li>Espera a que se establezca la conexión</li>
          </ol>
          <p className="mt-2 text-xs text-blue-600">
            El código se actualiza automáticamente cada {refreshInterval} segundos
          </p>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {status === 'connecting' && qrStatus !== 'connected' && (
        <div className="flex items-center justify-center text-xs text-gray-500 mt-4">
          <RefreshCw className="h-3 w-3 mr-1" />
          Actualización automática cada {refreshInterval}s
          {isPolling && <span className="ml-2 text-blue-500">• Activa</span>}
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
