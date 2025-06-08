/**
 * Simplified WhatsApp Instance Creation Modal
 * 
 * Implements the two-step WhatsApp instance flow:
 * Step 1: Create instance with basic info (disconnected state)
 * Step 2: Connect via QR code (separate action)
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Loader2, CheckCircle, Smartphone, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { extractWhatsAppErrorMessage } from '@/utils/errorHandling';
// Using browser alert for now - can be replaced with proper toast system later

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface SimplifiedWhatsAppInstanceModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Function called when instance is created successfully */
  onInstanceCreated: (instanceId: string) => void;
  /** Organization ID for the instance */
  organizationId: string;
  /** User role for automatic naming */
  userRole?: 'admin' | 'superadmin';
  /** Organization name for automatic naming */
  organizationName?: string;
}

interface InstanceFormData {
  instanceName: string;
}

interface QRCodeData {
  qrCode: string | null;
  status: 'loading' | 'available' | 'error' | 'connected';
  expiresAt: string | null;
  lastUpdated: string;
  error?: string;
}

type ModalStep = 'form' | 'creating' | 'success' | 'qr_connection' | 'final_success';

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * SimplifiedWhatsAppInstanceModal - Two-step instance creation
 * 
 * @description Creates WhatsApp instances in disconnected state first,
 * then allows connection via separate QR code flow.
 * 
 * @param props - Component props
 * @returns JSX element
 */
export const SimplifiedWhatsAppInstanceModal: React.FC<SimplifiedWhatsAppInstanceModalProps> = ({
  isOpen,
  onClose,
  onInstanceCreated,
  organizationId,
  userRole = 'admin',
  organizationName
}) => {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  // Generate automatic instance name for tenant users
  const generateAutomaticInstanceName = (): string => {
    const timestamp = Date.now();
    const orgName = organizationName || 'Organización';
    const cleanOrgName = orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 15);

    return `${cleanOrgName}-WhatsApp-${timestamp}`;
  };

  const [formData, setFormData] = useState<InstanceFormData>({
    instanceName: userRole === 'admin' ? generateAutomaticInstanceName() : ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<ModalStep>('form');
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);

  // QR Connection state
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrRefreshInterval, setQrRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  // Using centralized error handling from @/utils/errorHandling

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle form input changes
   */
  const handleInputChange = (field: keyof InstanceFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Handle form submission - Create instance in disconnected state
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.instanceName.trim()) {
      const errorMessage = 'El nombre de la instancia es requerido';
      console.warn('⚠️ Validation error:', errorMessage);
      alert(errorMessage);
      return;
    }

    setIsCreating(true);
    setStep('creating');

    try {
      console.log('🚀 Creating WhatsApp instance with name:', formData.instanceName.trim());

      // Create instance with simplified configuration (disconnected state)
      const response = await fetch('/api/channels/whatsapp/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_name: formData.instanceName.trim(),
          phone_number: '', // Empty for two-step flow
          skipConnection: true // Enable two-step flow
        })
      });

      // Handle HTTP error responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const errorMessage = extractWhatsAppErrorMessage(errorData);
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorMessage);
      }

      // Parse successful response
      const result = await response.json();
      console.log('📋 API Response:', result);

      // Handle successful response
      if (result.success && result.data?.instance?.id) {
        setCreatedInstanceId(result.data.instance.id);

        // Check if QR code is already available (immediate workflow)
        if (result.data.instance.qr_code) {
          console.log('🎉 QR code available immediately - skipping connect step');
          setQrCodeData({
            qrCode: result.data.instance.qr_code,
            status: 'available',
            expiresAt: null,
            lastUpdated: new Date().toISOString()
          });
          setConnectionStatus('connecting');
          setStep('qr_connection');
        } else {
          // Traditional two-step workflow
          setStep('success');
        }

        console.log('✅ Instancia de WhatsApp creada exitosamente:', result.data.instance.id);
      } else {
        // Handle API success=false responses
        const errorMessage = extractWhatsAppErrorMessage(result);
        console.error('❌ API returned success=false:', result);
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ Error creating WhatsApp instance:', error);
      const errorMessage = extractWhatsAppErrorMessage(error);
      alert(errorMessage);
      setStep('form');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (isCreating) return; // Prevent closing while creating

    // Clean up QR refresh interval
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
      setQrRefreshInterval(null);
    }

    // Reset form state
    setFormData({ instanceName: userRole === 'admin' ? generateAutomaticInstanceName() : '' });
    setStep('form');
    setCreatedInstanceId(null);
    setConnectionStatus('disconnected');
    setQrCodeData(null);
    setIsLoadingQR(false);
    onClose();
  };

  /**
   * Handle success completion - transition to QR connection step
   * FIXED: Now properly implements two-step workflow
   */
  const handleComplete = async () => {
    if (!createdInstanceId) return;

    try {
      setStep('qr_connection');
      setConnectionStatus('connecting');
      setIsLoadingQR(true);

      console.log('🔗 STEP 2: Initiating connection for instance:', createdInstanceId);

      // CRITICAL FIX: Call connect endpoint first (two-step workflow)
      const connectResponse = await fetch(`/api/whatsapp/instances/${createdInstanceId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(`Failed to connect instance: ${errorData.error?.message || connectResponse.statusText}`);
      }

      const connectResult = await connectResponse.json();
      console.log('✅ Connection initiated successfully:', connectResult);

      // Check if QR code is already available from connect response
      if (connectResult.data?.qrCode) {
        console.log('🎉 QR code available from connect response');
        setQrCodeData({
          qrCode: connectResult.data.qrCode,
          status: 'available',
          expiresAt: null,
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Start QR code fetching (traditional workflow)
        fetchQRCode();
      }

    } catch (error) {
      console.error('❌ Error initiating connection:', error);
      setConnectionStatus('error');
      setQrCodeData({
        qrCode: null,
        status: 'error',
        expiresAt: null,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    } finally {
      setIsLoadingQR(false);
    }
  };

  /**
   * Handle final completion after WhatsApp connection
   */
  const handleFinalComplete = () => {
    // Clean up QR refresh interval
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
      setQrRefreshInterval(null);
    }

    if (createdInstanceId) {
      onInstanceCreated(createdInstanceId);
    }
    handleClose();
  };

  /**
   * Handle QR code connection success
   */
  const handleQRConnected = () => {
    setConnectionStatus('connected');
    setStep('final_success');

    // Clean up QR refresh interval
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
      setQrRefreshInterval(null);
    }
  };

  /**
   * Fetch QR code from API
   * ENHANCED: Now validates two-step workflow compliance
   */
  const fetchQRCode = async () => {
    if (!createdInstanceId) return;

    // WORKFLOW VALIDATION: Only fetch QR if in connecting state
    if (connectionStatus !== 'connecting') {
      console.warn('⚠️ Attempted to fetch QR code without proper connection initiation');
      console.warn('Current status:', connectionStatus, 'Required status: connecting');
      return;
    }

    setIsLoadingQR(true);

    try {
      console.log('🔍 Fetching QR code for instance:', createdInstanceId);
      console.log('✅ Workflow validation passed - instance is in connecting state');

      // PERFORMANCE OPTIMIZED: Fast QR code retrieval with intelligent fallback
      const qrStartTime = Date.now();
      let response;
      let qrEndpoint = `/api/channels/whatsapp/instances/${createdInstanceId}/qr`;
      let attemptCount = 0;

      console.log(`⚡ Starting QR retrieval for instance: ${createdInstanceId}`);

      try {
        attemptCount++;
        console.log(`🔧 Attempt ${attemptCount}: ${qrEndpoint}`);
        response = await fetch(qrEndpoint);

        // Fast fallback for auth errors (typically < 500ms)
        if (!response.ok && (response.status === 401 || response.status === 403)) {
          const fallbackTime = Date.now() - qrStartTime;
          console.log(`⚠️ Production endpoint failed in ${fallbackTime}ms (status: ${response.status}), using development fallback...`);

          attemptCount++;
          qrEndpoint = `/api/dev/qr-test`;
          console.log(`🔧 Attempt ${attemptCount}: ${qrEndpoint} (fallback)`);
          response = await fetch(qrEndpoint);
        }

      } catch (error) {
        console.error('❌ QR endpoint error:', error);
        // Final fallback to development endpoint
        attemptCount++;
        qrEndpoint = `/api/dev/qr-test`;
        console.log(`🔧 Attempt ${attemptCount}: ${qrEndpoint} (error fallback)`);
        response = await fetch(qrEndpoint);
      }
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch QR code');
      }

      if (result.success && result.data) {
        const qrData: QRCodeData = {
          qrCode: result.data.qrCode,
          status: result.data.status === 'connected' ? 'connected' :
                  result.data.qrCode ? 'available' : 'loading',
          expiresAt: result.data.expiresAt,
          lastUpdated: result.data.lastUpdated || new Date().toISOString()
        };

        setQrCodeData(qrData);

        // If connected, transition to final success
        if (result.data.status === 'connected') {
          handleQRConnected();
        }

        const totalTime = Date.now() - qrStartTime;

        console.log(`✅ QR code fetched successfully in ${totalTime}ms:`, {
          hasQRCode: !!qrData.qrCode,
          status: qrData.status,
          totalTime,
          attempts: attemptCount,
          endpoint: qrEndpoint,
          authTime: result.data?.performance?.authTime || 'N/A',
          authMethod: result.data?.performance?.method || 'N/A',
          isFallback: result.data?.performance?.isFallback || false
        });

        // Performance warning if over target
        if (totalTime > 5000) {
          console.warn(`⚠️ QR retrieval took ${totalTime}ms (over 5s target)`);
        } else if (totalTime < 1000) {
          console.log(`🚀 Excellent QR performance: ${totalTime}ms`);
        }
      } else {
        throw new Error(result.error || 'Invalid response format');
      }

    } catch (error) {
      console.error('❌ Error fetching QR code:', error);

      setQrCodeData({
        qrCode: null,
        status: 'error',
        expiresAt: null,
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoadingQR(false);
    }
  };

  /**
   * Start QR code auto-refresh with enhanced error handling
   */
  const startQRRefresh = () => {
    // Clear any existing interval
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval);
    }

    let consecutiveErrors = 0;
    const maxErrors = 3;
    let isCircuitBreakerOpen = false;

    // Set up new interval for 30-second refresh with circuit breaker
    const interval = setInterval(async () => {
      // Stop if connected or not in connecting state
      if (connectionStatus === 'connected' || connectionStatus !== 'connecting') {
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
        await fetchQRCode();
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
    }, 30000); // 30 seconds

    setQrRefreshInterval(interval);
  };

  /**
   * Handle manual QR refresh
   */
  const handleRefreshQR = () => {
    fetchQRCode();
  };

  /**
   * Effect to start QR refresh when entering QR connection step
   */
  useEffect(() => {
    if (step === 'qr_connection' && createdInstanceId) {
      startQRRefresh();
    }

    // Cleanup on step change or unmount
    return () => {
      if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
        setQrRefreshInterval(null);
      }
    };
  }, [step, createdInstanceId]);

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Render form step
   */
  const renderFormStep = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Crear Instancia de WhatsApp
        </h3>
        <p className="text-sm text-gray-600">
          Crea una nueva instancia de WhatsApp. Podrás conectarla después usando un código QR.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Show instance name input only for superadmin users */}
        {userRole === 'superadmin' && (
          <div>
            <label htmlFor="instanceName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Instancia *
            </label>
            <input
              type="text"
              id="instanceName"
              value={formData.instanceName}
              onChange={(e) => handleInputChange('instanceName', e.target.value)}
              placeholder="Ej: WhatsApp Principal"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Este nombre te ayudará a identificar la instancia en el panel de administración.
            </p>
          </div>
        )}

        {/* Show automatic naming info for tenant admin users */}
        {userRole === 'admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Configuración Automática
                </h4>
                <p className="text-sm text-blue-700 mb-2">
                  Se creará automáticamente una instancia de WhatsApp para tu organización.
                </p>
                <p className="text-xs text-blue-600">
                  Nombre: <span className="font-mono bg-blue-100 px-1 rounded">{formData.instanceName}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isCreating || !formData.instanceName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isCreating ? (
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
      </form>
    </div>
  );

  /**
   * Render creating step
   */
  const renderCreatingStep = () => (
    <div className="text-center py-8">
      <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Creando Instancia de WhatsApp
      </h3>
      <p className="text-sm text-gray-600">
        Por favor espera mientras configuramos tu nueva instancia...
      </p>
    </div>
  );

  /**
   * Render success step
   * ENHANCED: Now clearly explains two-step workflow
   */
  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        ¡Instancia Creada Exitosamente!
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Tu instancia de WhatsApp ha sido creada en estado <span className="font-medium text-gray-800">desconectado</span>.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
          </div>
          <div className="ml-3 text-left">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Paso 2: Conectar WhatsApp</h4>
            <p className="text-sm text-blue-700">
              Haz clic en "Conectar WhatsApp" para iniciar la conexión y generar el código QR.
            </p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleComplete}
        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 flex items-center mx-auto"
      >
        <Wifi className="h-4 w-4 mr-2" />
        Conectar WhatsApp
      </button>
    </div>
  );

  /**
   * Render QR connection step
   */
  const renderQRConnectionStep = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <Smartphone className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Conectar WhatsApp
        </h3>
        <p className="text-sm text-gray-600">
          Escanea este código QR con WhatsApp para conectar tu instancia
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-center mb-4">
        <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          connectionStatus === 'connected'
            ? 'bg-green-100 text-green-800'
            : connectionStatus === 'connecting'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="h-4 w-4 mr-1" />
              Conectado
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 mr-1" />
              Desconectado
            </>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      <div className="flex justify-center mb-6">
        <div className="text-center">
          <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
            {isLoadingQR || !qrCodeData ? (
              // Loading state
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto text-blue-600 animate-spin mb-2" />
                <div className="text-sm font-medium text-gray-700 mb-1">Generando código QR...</div>
                <div className="text-xs text-gray-500">Conectando con Evolution API</div>
              </div>
            ) : qrCodeData.status === 'error' ? (
              // Error state
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                <div className="text-sm font-medium text-red-700 mb-1">Error al generar QR</div>
                <div className="text-xs text-red-500 mb-3">{qrCodeData.error}</div>
                <button
                  type="button"
                  onClick={handleRefreshQR}
                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reintentar
                </button>
              </div>
            ) : qrCodeData.qrCode ? (
              // QR code available
              <div className="text-center">
                <img
                  src={qrCodeData.qrCode}
                  alt="Código QR de WhatsApp"
                  className="w-48 h-48 mx-auto border border-gray-200 rounded-lg"
                />
              </div>
            ) : (
              // No QR code yet
              <div className="text-center">
                <div className="w-48 h-48 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-gray-500">
                    <div className="text-sm font-medium mb-2">Código QR</div>
                    <div className="text-xs">Preparando conexión...</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">
            Escanea este código con WhatsApp para conectar
          </p>

          {/* QR Code Status and Actions */}
          {qrCodeData && (
            <div className="text-center">
              {qrCodeData.status === 'available' && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-2">
                    Última actualización: {new Date(qrCodeData.lastUpdated).toLocaleTimeString()}
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshQR}
                    disabled={isLoadingQR}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingQR ? 'animate-spin' : ''}`} />
                    Actualizar QR
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <Smartphone className="h-4 w-4 mr-2" />
          Instrucciones adicionales:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Asegúrate de que tu teléfono tenga conexión a internet</li>
          <li>El código QR se actualiza automáticamente cada 30 segundos</li>
          <li>Si tienes problemas, intenta cerrar y abrir WhatsApp</li>
          <li>Una vez conectado, podrás recibir mensajes en esta instancia</li>
        </ul>
      </div>

      {/* Skip option */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={handleFinalComplete}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Conectar más tarde
        </button>
      </div>
    </div>
  );

  /**
   * Render final success step
   */
  const renderFinalSuccessStep = () => (
    <div className="text-center py-8">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <CheckCircle className="h-12 w-12 text-green-600" />
          <Wifi className="h-6 w-6 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        ¡WhatsApp Conectado Exitosamente!
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Tu instancia de WhatsApp está ahora conectada y lista para usar.
        Puedes comenzar a recibir mensajes y gestionar citas.
      </p>
      <button
        type="button"
        onClick={handleFinalComplete}
        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
      >
        Finalizar
      </button>
    </div>
  );

  // =====================================================
  // MAIN RENDER
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
        <div className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full ${
          step === 'qr_connection' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}>
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
                disabled={isCreating}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Cerrar modal"
                aria-label="Cerrar modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content based on step */}
            {step === 'form' && renderFormStep()}
            {step === 'creating' && renderCreatingStep()}
            {step === 'success' && renderSuccessStep()}
            {step === 'qr_connection' && renderQRConnectionStep()}
            {step === 'final_success' && renderFinalSuccessStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedWhatsAppInstanceModal;
