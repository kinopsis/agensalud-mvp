/**
 * Webhook Configuration Section Component
 * 
 * Handles webhook configuration settings for channel instances
 * including URL, secret, and event subscriptions.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState } from 'react';
import { Globe, Key, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import type { ChannelInstanceConfig } from '@/types/channels';

// =====================================================
// TYPES
// =====================================================

interface WebhookConfigSectionProps {
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

const WEBHOOK_EVENTS = [
  { id: 'MESSAGE_RECEIVED', label: 'Mensaje Recibido', description: 'Cuando se recibe un nuevo mensaje' },
  { id: 'MESSAGE_SENT', label: 'Mensaje Enviado', description: 'Cuando se envía un mensaje' },
  { id: 'CONNECTION_UPDATE', label: 'Actualización de Conexión', description: 'Cambios en el estado de conexión' },
  { id: 'QR_CODE_UPDATE', label: 'Actualización QR', description: 'Cuando se genera un nuevo código QR' },
  { id: 'APPOINTMENT_CREATED', label: 'Cita Creada', description: 'Cuando se crea una nueva cita' },
  { id: 'APPOINTMENT_UPDATED', label: 'Cita Actualizada', description: 'Cuando se modifica una cita' },
  { id: 'ERROR_OCCURRED', label: 'Error Ocurrido', description: 'Cuando ocurre un error en el sistema' }
];

// =====================================================
// COMPONENT
// =====================================================

/**
 * WebhookConfigSection Component
 * 
 * @description Configuration section for webhook settings
 * including URL, authentication, and event subscriptions.
 */
export const WebhookConfigSection: React.FC<WebhookConfigSectionProps> = ({
  config,
  onUpdate,
  errors
}) => {
  // =====================================================
  // STATE
  // =====================================================

  const [showSecret, setShowSecret] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle webhook URL change
   */
  const handleUrlChange = (url: string) => {
    onUpdate({
      webhook: {
        ...config.webhook,
        url
      }
    });
  };

  /**
   * Handle webhook secret change
   */
  const handleSecretChange = (secret: string) => {
    onUpdate({
      webhook: {
        ...config.webhook,
        secret
      }
    });
  };

  /**
   * Handle event selection change
   */
  const handleEventToggle = (eventId: string, enabled: boolean) => {
    const currentEvents = config.webhook?.events || [];
    const newEvents = enabled
      ? [...currentEvents, eventId]
      : currentEvents.filter(e => e !== eventId);

    onUpdate({
      webhook: {
        ...config.webhook,
        events: newEvents
      }
    });
  };

  /**
   * Generate random webhook secret
   */
  const generateSecret = () => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    handleSecretChange(secret);
  };

  /**
   * Copy webhook URL to clipboard
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  /**
   * Test webhook connection
   */
  const testWebhook = async () => {
    if (!config.webhook?.url) return;

    setTestingWebhook(true);
    try {
      const response = await fetch('/api/channels/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.webhook.url,
          secret: config.webhook.secret
        })
      });

      const result = await response.json();
      // Handle test result - could show toast or update UI
      console.log('Webhook test result:', result);
    } catch (error) {
      console.error('Webhook test failed:', error);
    } finally {
      setTestingWebhook(false);
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
        <h4 className="text-lg font-medium text-gray-900">Configuración de Webhook</h4>
        <p className="text-sm text-gray-500">
          Configura cómo tu aplicación recibirá notificaciones de eventos.
        </p>
      </div>

      {/* Webhook URL */}
      <div className="space-y-4">
        {renderField(
          'URL del Webhook',
          <div className="flex">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="url"
                value={config.webhook?.url || ''}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://tu-dominio.com/webhook"
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(config.webhook?.url || '')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={testWebhook}
              disabled={!config.webhook?.url || testingWebhook}
              className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {testingWebhook ? 'Probando...' : 'Probar'}
            </button>
          </div>,
          errors['webhook.url'],
          'URL donde se enviarán las notificaciones de eventos'
        )}
      </div>

      {/* Webhook Secret */}
      <div className="space-y-4">
        {renderField(
          'Secreto del Webhook (Opcional)',
          <div className="flex">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showSecret ? 'text' : 'password'}
                value={config.webhook?.secret || ''}
                onChange={(e) => handleSecretChange(e.target.value)}
                placeholder="Secreto para verificar la autenticidad"
                className="block w-full pl-10 pr-20 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showSecret ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <button
              type="button"
              onClick={generateSecret}
              className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Generar
            </button>
          </div>,
          errors['webhook.secret'],
          'Secreto usado para verificar que los webhooks provienen de AgentSalud'
        )}
      </div>

      {/* Event Subscriptions */}
      <div className="space-y-4">
        <h5 className="text-md font-medium text-gray-900">Eventos Suscritos</h5>
        <p className="text-sm text-gray-500">
          Selecciona qué eventos quieres recibir en tu webhook.
        </p>

        <div className="space-y-3">
          {WEBHOOK_EVENTS.map((event) => {
            const isSelected = config.webhook?.events?.includes(event.id) || false;
            
            return (
              <div
                key={event.id}
                className={`
                  p-4 border rounded-md cursor-pointer transition-colors
                  ${isSelected 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => handleEventToggle(event.id, !isSelected)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleEventToggle(event.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <h6 className="text-sm font-medium text-gray-900">
                          {event.label}
                        </h6>
                        <p className="text-sm text-gray-500">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Webhook Documentation */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h5 className="text-sm font-medium text-gray-900 mb-2">Documentación del Webhook</h5>
        <p className="text-sm text-gray-600 mb-2">
          Los webhooks se envían como POST requests con el siguiente formato:
        </p>
        <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto">
{`{
  "event": "MESSAGE_RECEIVED",
  "timestamp": "2025-01-28T10:00:00Z",
  "instance_id": "inst-123",
  "data": { ... }
}`}
        </pre>
      </div>
    </div>
  );
};

export default WebhookConfigSection;
