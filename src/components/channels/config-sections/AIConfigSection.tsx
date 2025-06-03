/**
 * AI Configuration Section Component
 * 
 * Handles AI assistant configuration settings for channel instances
 * including model selection, parameters, and custom prompts.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState } from 'react';
import { Brain, Zap, MessageSquare, AlertCircle, Info } from 'lucide-react';
import type { ChannelInstanceConfig } from '@/types/channels';

// =====================================================
// TYPES
// =====================================================

interface AIConfigSectionProps {
  /** Current configuration */
  config: Partial<ChannelInstanceConfig>;
  /** Function to update configuration */
  onUpdate: (updates: Partial<ChannelInstanceConfig>) => void;
  /** Validation errors */
  errors: Record<string, string>;
}

// =====================================================
// CONSTANTS
// =====================================================

const AI_MODELS = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Rápido y eficiente para la mayoría de casos',
    maxTokens: 4096,
    cost: 'Bajo'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Más inteligente pero más lento y costoso',
    maxTokens: 8192,
    cost: 'Alto'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Balance entre inteligencia y velocidad',
    maxTokens: 128000,
    cost: 'Medio'
  }
];

const TEMPERATURE_PRESETS = [
  { value: 0.1, label: 'Muy Conservador', description: 'Respuestas muy predecibles y consistentes' },
  { value: 0.3, label: 'Conservador', description: 'Respuestas predecibles con poca variación' },
  { value: 0.7, label: 'Balanceado', description: 'Balance entre creatividad y consistencia' },
  { value: 1.0, label: 'Creativo', description: 'Respuestas más variadas y creativas' },
  { value: 1.5, label: 'Muy Creativo', description: 'Máxima creatividad, puede ser impredecible' }
];

// =====================================================
// COMPONENT
// =====================================================

/**
 * AIConfigSection Component
 * 
 * @description Configuration section for AI assistant settings
 * including model selection, parameters, and behavior customization.
 */
export const AIConfigSection: React.FC<AIConfigSectionProps> = ({
  config,
  onUpdate,
  errors
}) => {
  // =====================================================
  // STATE
  // =====================================================

  const [showAdvanced, setShowAdvanced] = useState(false);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle AI enabled toggle
   */
  const handleEnabledChange = (enabled: boolean) => {
    onUpdate({
      ai_config: {
        ...config.ai_config,
        enabled
      }
    });
  };

  /**
   * Handle AI configuration update
   */
  const handleAIConfigUpdate = (field: string, value: any) => {
    onUpdate({
      ai_config: {
        ...config.ai_config,
        [field]: value
      }
    });
  };

  /**
   * Handle temperature preset selection
   */
  const handleTemperaturePreset = (temperature: number) => {
    handleAIConfigUpdate('temperature', temperature);
  };

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const selectedModel = AI_MODELS.find(m => m.id === config.ai_config?.model);
  const maxTokensLimit = selectedModel?.maxTokens || 4096;

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
        <h4 className="text-lg font-medium text-gray-900">Configuración de IA</h4>
        <p className="text-sm text-gray-500">
          Configura el comportamiento del asistente de inteligencia artificial.
        </p>
      </div>

      {/* AI Enable/Disable */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
        <div className="flex items-center">
          <Brain className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h5 className="text-sm font-medium text-gray-900">
              Asistente de IA
            </h5>
            <p className="text-sm text-gray-500">
              Habilita el procesamiento automático de mensajes con IA
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.ai_config?.enabled || false}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* AI Configuration (only if enabled) */}
      {config.ai_config?.enabled && (
        <>
          {/* Model Selection */}
          <div className="space-y-4">
            <h5 className="text-md font-medium text-gray-900">Modelo de IA</h5>
            
            <div className="grid grid-cols-1 gap-3">
              {AI_MODELS.map((model) => (
                <div
                  key={model.id}
                  className={`
                    p-4 border rounded-md cursor-pointer transition-colors
                    ${config.ai_config?.model === model.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => handleAIConfigUpdate('model', model.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-sm font-medium text-gray-900">
                        {model.name}
                      </h6>
                      <p className="text-sm text-gray-500">
                        {model.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        Máx. tokens: {model.maxTokens.toLocaleString()} • Costo: {model.cost}
                      </p>
                    </div>
                    <input
                      type="radio"
                      checked={config.ai_config?.model === model.id}
                      onChange={() => handleAIConfigUpdate('model', model.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Basic Parameters */}
          <div className="space-y-4">
            <h5 className="text-md font-medium text-gray-900">Parámetros Básicos</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField(
                'Máximo de Tokens',
                <input
                  type="number"
                  min={50}
                  max={maxTokensLimit}
                  value={config.ai_config?.max_tokens || 500}
                  onChange={(e) => handleAIConfigUpdate('max_tokens', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />,
                errors['ai_config.max_tokens'],
                `Máximo de tokens por respuesta (límite: ${maxTokensLimit.toLocaleString()})`
              )}

              {renderField(
                'Timeout (segundos)',
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={config.ai_config?.timeout_seconds || 30}
                  onChange={(e) => handleAIConfigUpdate('timeout_seconds', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />,
                errors['ai_config.timeout_seconds'],
                'Tiempo máximo de espera para respuesta de IA'
              )}
            </div>
          </div>

          {/* Temperature Configuration */}
          <div className="space-y-4">
            <h5 className="text-md font-medium text-gray-900">Creatividad de Respuestas</h5>
            
            <div className="space-y-3">
              {TEMPERATURE_PRESETS.map((preset) => (
                <div
                  key={preset.value}
                  className={`
                    p-3 border rounded-md cursor-pointer transition-colors
                    ${Math.abs((config.ai_config?.temperature || 0.7) - preset.value) < 0.1
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => handleTemperaturePreset(preset.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-sm font-medium text-gray-900">
                        {preset.label} ({preset.value})
                      </h6>
                      <p className="text-sm text-gray-500">
                        {preset.description}
                      </p>
                    </div>
                    <input
                      type="radio"
                      checked={Math.abs((config.ai_config?.temperature || 0.7) - preset.value) < 0.1}
                      onChange={() => handleTemperaturePreset(preset.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Configuration */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Zap className="h-4 w-4 mr-1" />
              {showAdvanced ? 'Ocultar' : 'Mostrar'} Configuración Avanzada
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                {renderField(
                  'Prompt Personalizado (Opcional)',
                  <textarea
                    rows={4}
                    value={config.ai_config?.custom_prompt || ''}
                    onChange={(e) => handleAIConfigUpdate('custom_prompt', e.target.value)}
                    placeholder="Instrucciones adicionales para el asistente de IA..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />,
                  errors['ai_config.custom_prompt'],
                  'Instrucciones específicas que se añadirán al prompt base del asistente'
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-blue-800">Información Importante</h5>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• La IA procesa mensajes automáticamente cuando está habilitada</li>
              <li>• Modelos más avanzados ofrecen mejor comprensión pero mayor costo</li>
              <li>• La temperatura controla qué tan creativas son las respuestas</li>
              <li>• El timeout evita esperas excesivas en respuestas de IA</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfigSection;
