/**
 * WhatsApp Configuration Section Component
 * 
 * Handles WhatsApp-specific configuration settings including
 * Evolution API, phone number, QR code, and WhatsApp features.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState } from 'react';
import { MessageSquare, Phone, Key, QrCode, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import type { ChannelInstanceConfig, WhatsAppChannelConfig } from '@/types/channels';

// =====================================================
// TYPES
// =====================================================

interface WhatsAppConfigSectionProps {
  /** Current configuration */
  config: Partial<ChannelInstanceConfig>;
  /** Function to update configuration */
  onUpdate: (updates: Partial<ChannelInstanceConfig>) => void;
  /** Validation errors */
  errors: Record<string, string>;
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * WhatsAppConfigSection Component
 * 
 * @description Configuration section for WhatsApp-specific settings
 * including Evolution API configuration and WhatsApp features.
 */
export const WhatsAppConfigSection: React.FC<WhatsAppConfigSectionProps> = ({
  config,
  onUpdate,
  errors
}) => {
  // =====================================================
  // STATE
  // =====================================================

  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle WhatsApp configuration update
   */
  const handleWhatsAppUpdate = (field: string, value: any) => {
    const currentWhatsApp = config.whatsapp || {} as WhatsAppChannelConfig;
    
    // Handle nested fields
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      onUpdate({
        whatsapp: {
          ...currentWhatsApp,
          [parent]: {
            ...currentWhatsApp[parent as keyof WhatsAppChannelConfig],
            [child]: value
          }
        }
      });
    } else {
      onUpdate({
        whatsapp: {
          ...currentWhatsApp,
          [field]: value
        }
      });
    }
  };

  /**
   * Handle feature toggle
   */
  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    const currentFeatures = config.whatsapp?.features || {};
    handleWhatsAppUpdate('features', {
      ...currentFeatures,
      [feature]: enabled
    });
  };

  /**
   * Test Evolution API connection
   */
  const testEvolutionAPI = async () => {
    const evolutionConfig = config.whatsapp?.evolution_api;
    if (!evolutionConfig?.base_url || !evolutionConfig?.api_key) return;

    setTestingConnection(true);
    try {
      const response = await fetch('/api/channels/whatsapp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: evolutionConfig.base_url,
          api_key: evolutionConfig.api_key,
          instance_name: evolutionConfig.instance_name
        })
      });

      const result = await response.json();
      // Handle test result - could show toast or update UI
      console.log('Evolution API test result:', result);
    } catch (error) {
      console.error('Evolution API test failed:', error);
    } finally {
      setTestingConnection(false);
    }
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Render form field with error handling
   */
  const renderField = (
    label: string,
    children: React.ReactNode,
    error?: string,
    description?: string
  ) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {error && (
        <div className="flex items-center text-xs text-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          {error}
        </div>
      )}
    </div>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center">
          <MessageSquare className="h-6 w-6 text-green-600 mr-2" />
          <div>
            <h4 className="text-lg font-medium text-gray-900">Configuración de WhatsApp</h4>
            <p className="text-sm text-gray-500">
              Configuración específica para la integración con WhatsApp Business.
            </p>
          </div>
        </div>
      </div>

      {/* Phone Number Configuration */}
      <div className="space-y-4">
        <h5 className="text-md font-medium text-gray-900">Número de Teléfono</h5>
        
        {renderField(
          'Número de WhatsApp Business',
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={config.whatsapp?.phone_number || ''}
              onChange={(e) => handleWhatsAppUpdate('phone_number', e.target.value)}
              placeholder="+57300123456"
              className="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>,
          errors['whatsapp.phone_number'],
          'Número de teléfono asociado a WhatsApp Business (incluir código de país)'
        )}

        {renderField(
          'Business ID (Opcional)',
          <input
            type="text"
            value={config.whatsapp?.business_id || ''}
            onChange={(e) => handleWhatsAppUpdate('business_id', e.target.value)}
            placeholder="ID de WhatsApp Business"
            className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />,
          errors['whatsapp.business_id'],
          'ID de verificación de WhatsApp Business (si aplica)'
        )}
      </div>

      {/* Evolution API Configuration */}
      <div className="space-y-4">
        <h5 className="text-md font-medium text-gray-900">Evolution API</h5>
        
        <div className="grid grid-cols-1 gap-4">
          {renderField(
            'URL Base de Evolution API',
            <input
              type="url"
              value={config.whatsapp?.evolution_api?.base_url || ''}
              onChange={(e) => handleWhatsAppUpdate('evolution_api.base_url', e.target.value)}
              placeholder="https://api.evolution.com"
              className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />,
            errors['whatsapp.evolution_api.base_url'],
            'URL del servidor de Evolution API'
          )}

          {renderField(
            'API Key',
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.whatsapp?.evolution_api?.api_key || ''}
                onChange={(e) => handleWhatsAppUpdate('evolution_api.api_key', e.target.value)}
                placeholder="API Key de Evolution API"
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>,
            errors['whatsapp.evolution_api.api_key'],
            'Clave de autenticación para Evolution API'
          )}

          {renderField(
            'Nombre de Instancia',
            <input
              type="text"
              value={config.whatsapp?.evolution_api?.instance_name || ''}
              onChange={(e) => handleWhatsAppUpdate('evolution_api.instance_name', e.target.value)}
              placeholder="agentsalud-instance"
              className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />,
            errors['whatsapp.evolution_api.instance_name'],
            'Nombre único para identificar esta instancia en Evolution API'
          )}
        </div>

        <button
          type="button"
          onClick={testEvolutionAPI}
          disabled={testingConnection || !config.whatsapp?.evolution_api?.base_url || !config.whatsapp?.evolution_api?.api_key}
          className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {testingConnection ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Probando Conexión...
            </div>
          ) : (
            'Probar Conexión con Evolution API'
          )}
        </button>
      </div>

      {/* QR Code Configuration */}
      <div className="space-y-4">
        <h5 className="text-md font-medium text-gray-900">Configuración de Código QR</h5>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div className="flex items-center">
              <QrCode className="h-5 w-5 text-gray-600 mr-3" />
              <div>
                <h6 className="text-sm font-medium text-gray-900">Habilitar Código QR</h6>
                <p className="text-sm text-gray-500">Permite generar códigos QR para conexión</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.whatsapp?.qr_code?.enabled || false}
                onChange={(e) => handleWhatsAppUpdate('qr_code.enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {config.whatsapp?.qr_code?.enabled && (
            <>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                <div>
                  <h6 className="text-sm font-medium text-gray-900">Auto-renovación</h6>
                  <p className="text-sm text-gray-500">Renueva automáticamente códigos QR expirados</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.whatsapp?.qr_code?.auto_refresh || false}
                    onChange={(e) => handleWhatsAppUpdate('qr_code.auto_refresh', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {renderField(
                'Intervalo de Renovación (minutos)',
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.whatsapp?.qr_code?.refresh_interval_minutes || 5}
                  onChange={(e) => handleWhatsAppUpdate('qr_code.refresh_interval_minutes', parseInt(e.target.value))}
                  className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />,
                errors['whatsapp.qr_code.refresh_interval_minutes'],
                'Frecuencia de renovación automática del código QR'
              )}
            </>
          )}
        </div>
      </div>

      {/* WhatsApp Features */}
      <div className="space-y-4">
        <h5 className="text-md font-medium text-gray-900">Características de WhatsApp</h5>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div>
              <h6 className="text-sm font-medium text-gray-900">Confirmaciones de Lectura</h6>
              <p className="text-sm text-gray-500">Envía confirmaciones cuando se leen los mensajes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.whatsapp?.features?.read_receipts || false}
                onChange={(e) => handleFeatureToggle('read_receipts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div>
              <h6 className="text-sm font-medium text-gray-900">Indicador de Escritura</h6>
              <p className="text-sm text-gray-500">Muestra cuando el bot está escribiendo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.whatsapp?.features?.typing_indicator || false}
                onChange={(e) => handleFeatureToggle('typing_indicator', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div>
              <h6 className="text-sm font-medium text-gray-900">Actualizaciones de Presencia</h6>
              <p className="text-sm text-gray-500">Actualiza el estado de presencia (en línea/desconectado)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.whatsapp?.features?.presence_update || false}
                onChange={(e) => handleFeatureToggle('presence_update', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConfigSection;
