/**
 * Simple WhatsApp Modal Component
 * 
 * Modal simplificado para crear y conectar instancias WhatsApp.
 * Diseñado para máxima simplicidad y funcionalidad MVP.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Smartphone, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

interface SimpleWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (instanceId: string) => void;
}

interface WhatsAppInstance {
  id: string;
  display_name: string;
  status: string;
}

interface QRCodeData {
  qrCode?: string;
  status: 'available' | 'connecting' | 'connected' | 'error';
  expiresAt?: string;
  message?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export default function SimpleWhatsAppModal({ isOpen, onClose, onSuccess }: SimpleWhatsAppModalProps) {
  // Estados
  const [step, setStep] = useState<'form' | 'creating' | 'qr' | 'success'>('form');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [qrRefreshInterval, setQrRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setDisplayName('');
      setIsLoading(false);
      setError(null);
      setInstance(null);
      setQrData(null);
      if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
        setQrRefreshInterval(null);
      }
    }
  }, [isOpen, qrRefreshInterval]);

  // =====================================================
  // HANDLERS
  // =====================================================

  /**
   * Crear instancia WhatsApp
   */
  const handleCreateInstance = async () => {
    if (!displayName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('creating');

    try {
      console.log('🚀 Creating WhatsApp instance:', displayName);

      const response = await fetch('/api/whatsapp/simple/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create instance');
      }

      console.log('✅ Instance created:', result.data.id);
      setInstance(result.data);
      setStep('qr');
      
      // Iniciar obtención de QR code
      await fetchQRCode(result.data.id);

    } catch (error) {
      console.error('❌ Error creating instance:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtener código QR
   */
  const fetchQRCode = async (instanceId: string) => {
    try {
      console.log('📱 Fetching QR code for:', instanceId);

      const response = await fetch(`/api/whatsapp/simple/instances/${instanceId}/qr`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to get QR code');
      }

      const qrData: QRCodeData = {
        qrCode: result.data.qrCode,
        status: result.data.status,
        expiresAt: result.data.expiresAt,
        message: result.data.message
      };

      setQrData(qrData);

      // Si está conectado, ir a success
      if (qrData.status === 'connected') {
        setStep('success');
        if (onSuccess && instance) {
          onSuccess(instance.id);
        }
        return;
      }

      // Si hay QR code, configurar auto-refresh
      if (qrData.qrCode && qrData.status === 'available') {
        startQRRefresh(instanceId);
      }

      console.log('✅ QR code fetched:', qrData.status);

    } catch (error) {
      console.error('❌ Error fetching QR code:', error);
      setQrData({
        status: 'error',
        message: error instanceof Error ? error.message : 'Error obteniendo QR'
      });
    }
  };

  /**
   * Iniciar auto-refresh del QR code con circuit breaker
   */
  const startQRRefresh = (instanceId: string) => {
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
    }

    let consecutiveErrors = 0;
    const maxErrors = 3;
    let isCircuitBreakerOpen = false;

    const interval = setInterval(async () => {
      // Stop if not in QR step or already connected
      if (step !== 'qr' || qrData?.status === 'connected') {
        clearInterval(interval);
        setQrRefreshInterval(null);
        return;
      }

      // Circuit breaker check
      if (isCircuitBreakerOpen) {
        console.log('🚨 QR refresh circuit breaker is open, skipping refresh');
        return;
      }

      try {
        await fetchQRCode(instanceId);
        consecutiveErrors = 0; // Reset on success
      } catch (error) {
        consecutiveErrors++;
        console.warn(`⚠️ QR refresh error ${consecutiveErrors}/${maxErrors}:`, error);

        if (consecutiveErrors >= maxErrors) {
          console.error('🚨 QR refresh circuit breaker tripped due to consecutive errors');
          isCircuitBreakerOpen = true;

          // Reset circuit breaker after 60 seconds
          setTimeout(() => {
            console.log('🔄 QR refresh circuit breaker reset');
            isCircuitBreakerOpen = false;
            consecutiveErrors = 0;
          }, 60000);
        }
      }
    }, 30000); // Increased to 30 seconds to reduce load

    setQrRefreshInterval(interval);
  };

  /**
   * Refresh manual del QR
   */
  const handleRefreshQR = () => {
    if (instance) {
      fetchQRCode(instance.id);
    }
  };

  /**
   * Cerrar modal
   */
  const handleClose = () => {
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
    }
    onClose();
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <MessageSquare className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-lg font-medium text-gray-900">WhatsApp</span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            {/* Content based on step */}
            {step === 'form' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Crear Instancia de WhatsApp
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Crea una nueva instancia de WhatsApp para tu organización.
                </p>
                
                <div className="mb-4">
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Instancia
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej: WhatsApp Principal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInstance}
                    disabled={isLoading || !displayName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Crear Instancia
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 'creating' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto text-green-600 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Creando Instancia
                </h3>
                <p className="text-sm text-gray-600">
                  Configurando tu instancia de WhatsApp...
                </p>
              </div>
            )}

            {step === 'qr' && (
              <div className="text-center">
                <Smartphone className="h-12 w-12 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Conectar WhatsApp
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Escanea este código QR con WhatsApp
                </p>

                {/* QR Code Display */}
                <div className="flex justify-center mb-4">
                  <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    {qrData?.qrCode ? (
                      <img
                        src={qrData.qrCode}
                        alt="Código QR de WhatsApp"
                        className="w-56 h-56"
                      />
                    ) : qrData?.status === 'error' ? (
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                        <div className="text-sm text-red-700">{qrData.message}</div>
                        <button
                          onClick={handleRefreshQR}
                          className="mt-2 text-sm text-red-600 hover:text-red-800"
                        >
                          <RefreshCw className="h-4 w-4 inline mr-1" />
                          Reintentar
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 mx-auto text-green-600 animate-spin mb-2" />
                        <div className="text-sm text-gray-600">Generando QR...</div>
                      </div>
                    )}
                  </div>
                </div>

                {qrData?.qrCode && (
                  <button
                    onClick={handleRefreshQR}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    <RefreshCw className="h-4 w-4 inline mr-1" />
                    Actualizar QR
                  </button>
                )}
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡WhatsApp Conectado!
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Tu instancia de WhatsApp está lista para usar.
                </p>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                >
                  Finalizar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
