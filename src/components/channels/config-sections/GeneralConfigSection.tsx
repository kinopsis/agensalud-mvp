/**
 * General Configuration Section Component
 * 
 * Handles basic configuration settings for channel instances
 * including instance name, auto-reply, and general limits.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React from 'react';
import { Info, AlertCircle } from 'lucide-react';
import type { ChannelInstanceConfig } from '@/types/channels';

// =====================================================
// TYPES
// =====================================================

interface GeneralConfigSectionProps {
  /** Current configuration */
  config: Partial<ChannelInstanceConfig>;
  /** Function to update configuration */
  onUpdate: (updates: Partial<ChannelInstanceConfig>) => void;
  /** Validation errors */
  errors: Record<string, string>;
  /** Instance name (read-only) */
  instanceName: string;
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * GeneralConfigSection Component
 * 
 * @description Configuration section for general instance settings
 * including auto-reply, limits, and basic preferences.
 */
export const GeneralConfigSection: React.FC<GeneralConfigSectionProps> = ({
  config,
  onUpdate,
  errors,
  instanceName
}) => {
  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle auto-reply toggle
   */
  const handleAutoReplyChange = (enabled: boolean) => {
    onUpdate({ auto_reply: enabled });
  };

  /**
   * Handle limits update
   */
  const handleLimitsUpdate = (field: string, value: number) => {
    onUpdate({
      limits: {
        ...config.limits,
        [field]: value
      }
    });
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

  /**
   * Render number input
   */
  const renderNumberInput = (
    value: number | undefined,
    onChange: (value: number) => void,
    min: number,
    max: number,
    placeholder: string
  ) => (
    <input
      type="number"
      min={min}
      max={max}
      value={value || ''}
      onChange={(e) => onChange(parseInt(e.target.value) || min)}
      placeholder={placeholder}
      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    />
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h4 className="text-lg font-medium text-gray-900">Configuración General</h4>
        <p className="text-sm text-gray-500">
          Configuración básica de la instancia y comportamiento general.
        </p>
      </div>

      {/* Instance Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-center">
          <Info className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <h5 className="text-sm font-medium text-blue-800">Información de la Instancia</h5>
            <p className="text-sm text-blue-700">
              Nombre: <strong>{instanceName}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Reply Configuration */}
      <div className="space-y-4">
        <h5 className="text-md font-medium text-gray-900">Respuesta Automática</h5>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
          <div className="flex-1">
            <h6 className="text-sm font-medium text-gray-900">
              Habilitar Respuesta Automática
            </h6>
            <p className="text-sm text-gray-500">
              Permite que la IA responda automáticamente a los mensajes entrantes
            </p>
          </div>
          <div className="ml-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_reply || false}
                onChange={(e) => handleAutoReplyChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Limits Configuration */}
      <div className="space-y-4">
        <h5 className="text-md font-medium text-gray-900">Límites y Restricciones</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField(
            'Máximo de Chats Concurrentes',
            renderNumberInput(
              config.limits?.max_concurrent_chats,
              (value) => handleLimitsUpdate('max_concurrent_chats', value),
              1,
              1000,
              '100'
            ),
            errors['limits.max_concurrent_chats'],
            'Número máximo de conversaciones simultáneas'
          )}

          {renderField(
            'Límite de Mensajes por Minuto',
            renderNumberInput(
              config.limits?.message_rate_limit,
              (value) => handleLimitsUpdate('message_rate_limit', value),
              1,
              300,
              '60'
            ),
            errors['limits.message_rate_limit'],
            'Máximo de mensajes que se pueden enviar por minuto'
          )}

          {renderField(
            'Timeout de Sesión (minutos)',
            renderNumberInput(
              config.limits?.session_timeout_minutes,
              (value) => handleLimitsUpdate('session_timeout_minutes', value),
              5,
              1440,
              '30'
            ),
            errors['limits.session_timeout_minutes'],
            'Tiempo de inactividad antes de cerrar una conversación'
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-yellow-800">Consejos de Rendimiento</h5>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• Mantén el límite de chats concurrentes acorde a tu capacidad de servidor</li>
              <li>• Un límite de mensajes muy alto puede causar problemas con WhatsApp</li>
              <li>• El timeout de sesión ayuda a liberar recursos automáticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralConfigSection;
