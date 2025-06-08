/**
 * Simplified WhatsApp Instance Creation Modal
 * 
 * Streamlined 3-step process for tenant admin users to create WhatsApp instances
 * with auto-configured system defaults and minimal user input requirements.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Phone, QrCode, CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import QRCodeDisplay, { QRCodeDebugInfo } from '@/components/ui/QRCodeDisplay';
import {
  validateInstanceName,
  validatePhoneNumber,
  getValidationErrors
} from '@/lib/utils/whatsapp-defaults';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface SimplifiedWhatsAppCreationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Callback when instance is successfully created */
  onSuccess?: (instanceId: string) => void;
  /** Whether creation is in progress */
  loading?: boolean;
}

interface FormData {
  instanceName: string;
  phoneNumber: string;
}

interface CreationStep {
  id: number;
  title: string;
  description: string;
  estimatedTime: string;
  icon: React.ComponentType<any>;
}

interface QRCodeData {
  code?: string;
  base64?: string;
  expiresAt: Date;
  isRealQR?: boolean;
  source?: 'evolution_api' | 'database' | 'mock';
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * SimplifiedWhatsAppCreationModal Component
 * 
 * @description Provides a streamlined 3-step process for creating WhatsApp instances
 * with auto-configured defaults and minimal user input.
 */
export const SimplifiedWhatsAppCreationModal: React.FC<SimplifiedWhatsAppCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  loading = false
}) => {
  // =====================================================
  // HOOKS AND CONTEXT
  // =====================================================

  const { profile } = useAuth();
  const { organization } = useTenant();

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    instanceName: '',
    phoneNumber: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connecting' | 'connected' | 'error'>('waiting');
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // QR code stream reference
  const qrStreamRef = useRef<EventSource | null>(null);

  // =====================================================
  // STEP CONFIGURATION
  // =====================================================

  const steps: CreationStep[] = [
    {
      id: 1,
      title: 'Información Básica',
      description: 'Configura el nombre y número de WhatsApp',
      estimatedTime: '30 segundos',
      icon: MessageSquare
    },
    {
      id: 2,
      title: 'Autenticación QR',
      description: 'Escanea el código QR con WhatsApp',
      estimatedTime: '2-3 minutos',
      icon: QrCode
    },
    {
      id: 3,
      title: 'Activación Completa',
      description: 'Configuración automática finalizada',
      estimatedTime: '30 segundos',
      icon: CheckCircle
    }
  ];

  // =====================================================
  // EFFECTS
  // =====================================================

  /**
   * Reset form when modal opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFormData({ instanceName: '', phoneNumber: '' });
      setErrors({});
      setQRCodeData(null);
      setConnectionStatus('waiting');
      setInstanceId(null);
    } else {
      // Clear auto-refresh interval when modal closes
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }

      // Close QR code stream when modal closes
      if (qrStreamRef.current) {
        qrStreamRef.current.close();
        qrStreamRef.current = null;
      }
    }
  }, [isOpen]); // ✅ FIXED: Removed autoRefreshInterval from dependencies

  /**
   * Auto-refresh QR code every 30 seconds
   */
  useEffect(() => {
    if (currentStep === 2 && qrCodeData && connectionStatus === 'waiting') {
      const interval = setInterval(() => {
        refreshQRCode();
      }, 30000); // 30 seconds

      setAutoRefreshInterval(interval);

      return () => {
        clearInterval(interval);
        setAutoRefreshInterval(null);
      };
    }
  }, [currentStep, qrCodeData, connectionStatus]);

  /**
   * Cleanup auto-refresh interval when component unmounts
   */
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  // =====================================================
  // FORM HANDLERS
  // =====================================================

  /**
   * Handle form input changes
   */
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Validate current step
   */
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      // Enable QR code flow (allows empty phone number)
      const validationErrors = getValidationErrors(formData.instanceName, formData.phoneNumber, true);
      setErrors(validationErrors);
      return Object.keys(validationErrors).length === 0;
    }
    return true;
  };

  /**
   * Handle next step
   */
  const handleNextStep = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep === 1) {
      // Move to QR step and create instance
      await createInstance();
    } else if (currentStep === 2 && connectionStatus === 'connected') {
      // Move to completion step
      setCurrentStep(3);

      // Auto-close modal after 3 seconds and call success callback
      setTimeout(() => {
        if (onSuccess && instanceId) {
          onSuccess(instanceId);
        }
        onClose();
      }, 3000);
    }
  };

  /**
   * Handle previous step
   */
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // =====================================================
  // API OPERATIONS
  // =====================================================

  /**
   * Create WhatsApp instance with auto-configuration
   */
  const createInstance = async () => {
    if (!organization?.id || !profile?.organization_id) {
      setErrors({ general: 'Error de organización. Por favor recarga la página.' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Send simplified data for auto-configuration
      const response = await fetch('/api/channels/whatsapp/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instance_name: formData.instanceName,
          phone_number: formData.phoneNumber
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al crear la instancia');
      }

      const result = await response.json();
      const newInstanceId = result.data?.instance?.id;

      if (!newInstanceId) {
        throw new Error('No se pudo obtener el ID de la instancia creada');
      }

      setInstanceId(newInstanceId);

      // Move to QR step first for better UX
      setCurrentStep(2);

      // Connect to QR code stream after UI update
      setTimeout(() => {
        connectToQRStream(newInstanceId);
      }, 100);

    } catch (error) {
      console.error('❌ Error creating instance:', error);

      // In development mode, continue to QR step even if Evolution API fails
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      if (isDevelopment) {
        // Generate a mock instance ID for development with consistent naming
        const timestamp = Date.now();
        const mockInstanceId = `dev-instance-${timestamp}`;
        console.log(`🔧 Development mode: Creating mock instance ID "${mockInstanceId}"`);
        setInstanceId(mockInstanceId);
        setCurrentStep(2);

        // Connect to mock stream after UI update
        setTimeout(() => {
          connectToQRStream(mockInstanceId);
        }, 100);
      } else {
        setErrors({
          general: error instanceof Error ? error.message : 'Error desconocido al crear la instancia'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Connect to QR code real-time stream
   */
  const connectToQRStream = (instanceId: string) => {
    // Close existing connection if any
    if (qrStreamRef.current) {
      qrStreamRef.current.close();
    }

    // Enhanced development mode - connect to real stream with better logging
    const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    if (isDevelopment) {
      console.log('🔧 Development mode: Connecting to real QR stream with enhanced logging');
      setConnectionStatus('connecting');
      // Continue with real stream connection below - no mock QR generation
    }

    try {
      const eventSource = new EventSource(`/api/channels/whatsapp/instances/${instanceId}/qrcode/stream`);
      qrStreamRef.current = eventSource;

      eventSource.onopen = () => {
        setErrors(prev => ({ ...prev, qr: undefined }));
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'qr_code':
              console.log('📱 Received QR code event:', {
                hasQRCode: !!data.data.qrCode,
                qrCodeLength: data.data.qrCode?.length || 0,
                isRealQR: data.data.isRealQR,
                source: data.data.source,
                expiresAt: data.data.expiresAt
              });

              setQRCodeData({
                code: data.data.qrCode, // For legacy compatibility
                base64: data.data.qrCode, // Real base64 QR code from Evolution API
                expiresAt: new Date(data.data.expiresAt || Date.now() + 45000),
                isRealQR: data.data.isRealQR || false,
                source: data.data.source || 'unknown'
              });
              break;

            case 'status_update':
              console.log('📊 Status update received:', data.data.status);
              if (data.data.status === 'connected') {
                setConnectionStatus('connected');
                console.log('✅ WhatsApp connected! Auto-advancing to completion step...');

                // Close the event source first
                eventSource.close();

                // Auto-advance to step 3 after a brief delay to show the connected status
                setTimeout(() => {
                  setCurrentStep(3);

                  // Auto-close modal after showing completion for 3 seconds
                  setTimeout(() => {
                    if (onSuccess && instanceId) {
                      onSuccess(instanceId);
                    }
                    onClose();
                  }, 3000);
                }, 1500); // 1.5 second delay to show connected status
              }
              break;

            case 'error':
              const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
              if (!isDev) {
                setErrors({ qr: data.data.message });
              }
              eventSource.close();
              break;

            case 'heartbeat':
              // Heartbeat received - connection is alive
              break;
          }
        } catch (parseError) {
          console.error('❌ Error parsing stream event:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ QR code stream error:', error);
        eventSource.close();

        // Only show error in production mode
        const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
        if (!isDev) {
          setErrors({ qr: 'Error de conexión. Por favor, intenta de nuevo.' });
        }
      };

    } catch (error) {
      console.error('❌ Failed to connect to QR stream:', error);
      const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      if (!isDev) {
        setErrors({ qr: 'Error al conectar con el servicio de códigos QR' });
      }
    }
  };

  /**
   * Refresh QR code by restarting stream
   */
  const refreshQRCode = async () => {
    if (!instanceId) return;

    try {
      // Close current stream
      if (qrStreamRef.current) {
        qrStreamRef.current.close();
      }

      // Restart instance to generate new QR code
      const response = await fetch(`/api/channels/whatsapp/instances/${instanceId}/qrcode`, {
        method: 'POST'
      });

      if (response.ok) {
        // Reconnect to stream for new QR code
        connectToQRStream(instanceId);
      }
    } catch (error) {
      console.error('Error refreshing QR code:', error);
    }
  };

  /**
   * Check connection status
   */
  const checkConnectionStatus = async () => {
    if (!instanceId) return;
    
    try {
      const response = await fetch(`/api/channels/whatsapp/instances/${instanceId}/status`);
      
      if (response.ok) {
        const statusData = await response.json();
        const status = statusData.data?.status;
        
        if (status === 'connected') {
          setConnectionStatus('connected');
          // Clear auto-refresh interval
          if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            setAutoRefreshInterval(null);
          }
        }
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Render step indicator
   */
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const StepIcon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
              ${isActive ? 'border-blue-500 bg-blue-500 text-white' :
                isCompleted ? 'border-green-500 bg-green-500 text-white' :
                'border-gray-300 bg-white text-gray-400'}
            `}>
              {isCompleted ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <StepIcon className="h-5 w-5" />
              )}
            </div>

            {index < steps.length - 1 && (
              <div className={`
                w-16 h-0.5 mx-2 transition-colors
                ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-300'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );

  /**
   * Render basic information step
   */
  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          Información Básica
        </h4>
        <p className="text-sm text-gray-500">
          Solo necesitamos el nombre de la instancia y tu número de WhatsApp Business.
          Todo lo demás se configurará automáticamente.
        </p>
      </div>

      <div className="space-y-4">
        {/* Instance Name */}
        <div>
          <label htmlFor="instanceName" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la Instancia
          </label>
          <input
            type="text"
            id="instanceName"
            value={formData.instanceName}
            onChange={(e) => handleInputChange('instanceName', e.target.value)}
            placeholder="ej: WhatsApp Consultas Médicas"
            className={`
              block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
              ${errors.instance_name ? 'border-red-300' : 'border-gray-300'}
            `}
          />
          {errors.instance_name && (
            <p className="mt-1 text-sm text-red-600" role="alert">{errors.instance_name}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Número de WhatsApp Business
            <span className="text-sm text-gray-500 font-normal ml-1">(opcional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="+57300123456"
              className={`
                block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm
                ${errors.phone_number ? 'border-red-300' : 'border-gray-300'}
              `}
            />
          </div>
          {errors.phone_number && (
            <p className="mt-1 text-sm text-red-600" role="alert">{errors.phone_number}</p>
          )}
          <div className="mt-1 text-xs text-gray-500 space-y-1">
            <p>
              <strong>Opcional:</strong> Si no lo ingresas, se detectará automáticamente al escanear el código QR
            </p>
            <p>
              Formato internacional con código de país (ej: +57300123456 o 57300123456)
            </p>
          </div>
        </div>
      </div>

      {/* Auto-configuration info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h5 className="text-sm font-medium text-blue-900 mb-2">
          ✨ Configuración Automática Incluida
        </h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Webhook configurado automáticamente</li>
          <li>• Bot de IA para citas médicas activado</li>
          <li>• Horarios de atención predefinidos</li>
          <li>• Plantillas de mensajes médicos</li>
          <li>• Integración con sistema de citas</li>
        </ul>
      </div>
    </div>
  );

  /**
   * Render QR authentication step
   */
  const renderQRAuthStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <QrCode className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          Autenticación QR
        </h4>
        <p className="text-sm text-gray-500">
          Escanea el código QR con tu WhatsApp Business para conectar la instancia.
        </p>
      </div>

      {/* QR Code Display - New Robust Component */}
      <div className="flex justify-center">
        <div className="text-center">
          <QRCodeDisplay
            qrData={qrCodeData}
            size={192} // 48 * 4 = 192px (equivalent to w-48 h-48)
            onRefresh={() => instanceId && connectToQRStream(instanceId)}
            showRefreshButton={true}
            className="mx-auto"
          />

          {/* Status and timing information */}
          <div className="mt-3 space-y-1">
            {qrCodeData && (
              <p className="text-xs text-gray-500">
                {process.env.NODE_ENV === 'development'
                  ? `QR Code ${qrCodeData.isRealQR ? 'real' : 'generado'} desde ${qrCodeData.source || 'fuente desconocida'}`
                  : 'El código se actualiza automáticamente cada 30 segundos'
                }
              </p>
            )}

            {errors.qr && (
              <p className="text-xs text-red-600 font-medium">
                ⚠️ {errors.qr}
              </p>
            )}
          </div>

          {/* Debug information in development mode */}
          {process.env.NODE_ENV === 'development' && (
            <QRCodeDebugInfo qrData={qrCodeData} />
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="text-center">
        {connectionStatus === 'waiting' && (
          <div className="flex items-center justify-center text-yellow-600">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Esperando conexión...
          </div>
        )}
        {connectionStatus === 'connecting' && (
          <div className="flex items-center justify-center text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Conectando...
          </div>
        )}
        {connectionStatus === 'connected' && (
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            ¡Conectado exitosamente!
          </div>
        )}
        {connectionStatus === 'error' && (
          <div className="flex items-center justify-center text-red-600">
            <AlertCircle className="h-4 w-4 mr-2" />
            Error de conexión
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h5 className="text-sm font-medium text-gray-900 mb-2">
          📱 Instrucciones
        </h5>
        <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
          <li>Abre WhatsApp Business en tu teléfono</li>
          <li>Ve a Configuración → Dispositivos vinculados</li>
          <li>Toca "Vincular un dispositivo"</li>
          <li>Escanea este código QR</li>
        </ol>
      </div>
    </div>
  );

  /**
   * Render completion step
   */
  const renderCompletionStep = () => (
    <div className="space-y-6 text-center">
      <div>
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h4 className="text-xl font-medium text-gray-900 mb-2">
          ¡Instancia Creada Exitosamente!
        </h4>
        <p className="text-sm text-gray-500">
          Tu instancia de WhatsApp está lista y completamente configurada.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h5 className="text-sm font-medium text-green-900 mb-3">
          ✅ Configuración Completada
        </h5>
        <div className="grid grid-cols-2 gap-3 text-xs text-green-700">
          <div>• Instancia conectada</div>
          <div>• Bot de IA activado</div>
          <div>• Webhook configurado</div>
          <div>• Plantillas instaladas</div>
          <div>• Horarios definidos</div>
          <div>• Citas integradas</div>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Serás redirigido al dashboard en unos segundos...
      </p>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Crear Instancia de WhatsApp
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {steps[currentStep - 1]?.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Step indicator */}
          {renderStepIndicator()}

          {/* Error display */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Step content */}
          <div className="mb-6">
            {currentStep === 1 && renderBasicInfoStep()}
            {currentStep === 2 && renderQRAuthStep()}
            {currentStep === 3 && renderCompletionStep()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handlePreviousStep}
              disabled={currentStep === 1 || isSubmitting}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${currentStep === 1 || isSubmitting
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              Anterior
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              {currentStep < 3 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSubmitting || (currentStep === 2 && connectionStatus !== 'connected')}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center
                    ${isSubmitting || (currentStep === 2 && connectionStatus !== 'connected')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : currentStep === 1 ? (
                    <>
                      Crear Instancia
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Finalizar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedWhatsAppCreationModal;
