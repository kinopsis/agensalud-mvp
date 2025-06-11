/**
 * WhatsApp Connect View Component
 * 
 * Streamlined connection interface for WhatsApp instances with QR code display,
 * status monitoring, and auto-refresh functionality. Part of the radical solution.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  ArrowLeft,
  Zap
} from 'lucide-react';
import { UnifiedQRCodeDisplay } from '@/components/channels/UnifiedQRCodeDisplay';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface WhatsAppConnectViewProps {
  /** Instance ID */
  instanceId: string;
  /** Instance name for display */
  instanceName: string;
  /** Initial connection status */
  initialStatus: string;
  /** Organization ID */
  organizationId: string;
  /** User role for permissions */
  userRole: 'admin' | 'superadmin';
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  message?: string;
  lastUpdated: Date;
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * WhatsAppConnectView - Streamlined connection interface
 * 
 * @description Provides a clean, focused interface for connecting WhatsApp
 * instances with QR code display and real-time status updates.
 */
export const WhatsAppConnectView: React.FC<WhatsAppConnectViewProps> = ({
  instanceId,
  instanceName,
  initialStatus,
  organizationId,
  userRole
}) => {
  // =====================================================
  // HOOKS AND STATE
  // =====================================================

  const router = useRouter();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: initialStatus as any,
    lastUpdated: new Date()
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  /**
   * Handle connect button click
   */
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log(`🔄 Initiating connection for instance: ${instanceId}`);

      // Call connect endpoint with 5-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/channels/whatsapp/instances/${instanceId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Connection initiated successfully:', result);

      // Update connection state
      setConnectionState({
        status: 'connecting',
        message: result.message || 'Generando código QR...',
        lastUpdated: new Date()
      });

      // Show QR code interface
      setShowQR(true);

    } catch (error) {
      console.error('❌ Connection failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al iniciar la conexión';
      
      setError(errorMessage);
      setConnectionState({
        status: 'error',
        message: errorMessage,
        lastUpdated: new Date()
      });
    } finally {
      setIsConnecting(false);
    }
  }, [instanceId]);

  /**
   * Handle successful connection
   */
  const handleConnectionSuccess = useCallback(() => {
    console.log('🎉 WhatsApp connected successfully!');
    
    setConnectionState({
      status: 'connected',
      message: 'WhatsApp conectado exitosamente',
      lastUpdated: new Date()
    });

    // Auto-redirect to dashboard after 3 seconds
    setTimeout(() => {
      router.push('/admin/channels');
    }, 3000);
  }, [router]);

  /**
   * Handle connection error
   */
  const handleConnectionError = useCallback((error: string) => {
    console.error('❌ Connection error:', error);
    
    setError(error);
    setConnectionState({
      status: 'error',
      message: error,
      lastUpdated: new Date()
    });
  }, []);

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Render status indicator
   */
  const renderStatusIndicator = () => {
    const { status, message } = connectionState;
    
    const statusConfig = {
      disconnected: {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        text: 'Desconectado'
      },
      connecting: {
        icon: Wifi,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        text: 'Conectando...'
      },
      connected: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        text: 'Conectado'
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        text: 'Error'
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
        <Icon className="h-4 w-4 mr-2" />
        {config.text}
        {message && (
          <span className="ml-2 text-xs opacity-75">
            {message}
          </span>
        )}
      </div>
    );
  };

  /**
   * Render main action button
   */
  const renderActionButton = () => {
    if (connectionState.status === 'connected') {
      return (
        <button
          onClick={() => router.push('/admin/channels')}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Ir al Dashboard
        </button>
      );
    }

    if (showQR) {
      return (
        <button
          onClick={() => setShowQR(false)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </button>
      );
    }

    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <Zap className="h-5 w-5 mr-2" />
            Conectar WhatsApp
          </>
        )}
      </button>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-green-100 rounded-full">
            <Smartphone className="h-12 w-12 text-green-600" />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Conectar WhatsApp
          </h2>
          <p className="text-gray-600 mt-2">
            Instancia: <span className="font-medium">{instanceName}</span>
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex justify-center">
          {renderStatusIndicator()}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {!showQR ? (
          /* Initial Connect View */
          <div className="text-center space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-3">
                ¿Listo para conectar?
              </h3>
              <p className="text-blue-800 mb-4">
                Haz clic en "Conectar WhatsApp" para generar tu código QR y vincular tu dispositivo.
              </p>
              <div className="text-sm text-blue-700">
                <p>⚡ El código QR se generará en menos de 5 segundos</p>
                <p>🔄 Se actualiza automáticamente cada 30 segundos</p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center">
              {renderActionButton()}
            </div>
          </div>
        ) : (
          /* QR Code View */
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Escanea el código QR
              </h3>
              <p className="text-gray-600">
                Usa WhatsApp en tu teléfono para escanear este código
              </p>
            </div>

            {/* QR Code Display */}
            <div className="flex justify-center">
              <UnifiedQRCodeDisplay
                instanceId={instanceId}
                instanceName={instanceName}
                size={300}
                showRefreshButton={true}
                showStatusIndicator={true}
                showTimestamp={true}
                onConnected={handleConnectionSuccess}
                onError={handleConnectionError}
                autoStart={true}
              />
            </div>

            {/* Back Button */}
            <div className="flex justify-center">
              {renderActionButton()}
            </div>
          </div>
        )}
      </div>

      {/* Success State */}
      {connectionState.status === 'connected' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              ¡WhatsApp Conectado!
            </h3>
            <p className="text-green-800 mb-4">
              Tu instancia está lista para recibir y enviar mensajes.
            </p>
            <p className="text-sm text-green-700">
              Redirigiendo al dashboard en 3 segundos...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnectView;
