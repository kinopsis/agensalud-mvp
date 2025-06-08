/**
 * Channel Instance Card Component
 *
 * Generic reusable component for displaying channel instances (WhatsApp, Telegram, Voice)
 * with unified interface and actions.
 *
 * **Config Structure Handling:**
 * This component safely handles the unified config structure where channel-specific configs
 * are nested under their channel type:
 * ```
 * config: {
 *   auto_reply: boolean,
 *   business_hours: {...},
 *   ai_config: {...},
 *   webhook: {...},
 *   limits: {...},
 *   whatsapp?: { phone_number: string, ... },
 *   telegram?: { bot_token: string, ... },
 *   voice?: { provider: string, ... }
 * }
 * ```
 *
 * **Defensive Programming:**
 * - Safely accesses nested config properties with null checks
 * - Provides fallback values for missing or malformed data
 * - Handles different channel types with appropriate display logic
 *
 * @author AgentSalud Development Team
 * @date 2025-01-28
 * @updated 2025-01-28 - Fixed config access pattern for simplified WhatsApp creation
 */

'use client';

import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  Phone,
  Send,
  Settings,
  Power,
  PowerOff,
  Trash2,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  QrCode,
  Wifi,
  Loader2
} from 'lucide-react';
import type { ChannelInstance, ChannelType, ChannelStatus } from '@/types/channels';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';

// =====================================================
// TYPES
// =====================================================

interface ChannelInstanceCardProps {
  /** Channel instance data */
  instance: ChannelInstance;
  /** Callback for instance actions */
  onAction: (instanceId: string, action: 'connect' | 'disconnect' | 'delete' | 'configure') => void;
  /** Whether actions are currently being processed */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const CHANNEL_ICONS = {
  whatsapp: MessageSquare,
  telegram: Send,
  voice: Phone,
  sms: MessageSquare,
  email: MessageSquare
} as const;

const CHANNEL_COLORS = {
  whatsapp: 'text-green-600',
  telegram: 'text-blue-600',
  voice: 'text-purple-600',
  sms: 'text-orange-600',
  email: 'text-red-600'
} as const;

const STATUS_CONFIG = {
  connected: {
    label: 'Conectado',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  disconnected: {
    label: 'Desconectado',
    color: 'bg-gray-100 text-gray-800',
    icon: XCircle,
    iconColor: 'text-gray-600'
  },
  connecting: {
    label: 'Conectando',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  error: {
    label: 'Error',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle,
    iconColor: 'text-red-600'
  },
  suspended: {
    label: 'Suspendido',
    color: 'bg-orange-100 text-orange-800',
    icon: AlertCircle,
    iconColor: 'text-orange-600'
  },
  maintenance: {
    label: 'Mantenimiento',
    color: 'bg-blue-100 text-blue-800',
    icon: Settings,
    iconColor: 'text-blue-600'
  }
} as const;

// =====================================================
// COMPONENT
// =====================================================

/**
 * ChannelInstanceCard Component
 * 
 * @description Generic card component for displaying channel instances
 * with unified interface, metrics, and actions.
 */
export const ChannelInstanceCard: React.FC<ChannelInstanceCardProps> = ({
  instance,
  onAction,
  loading = false,
  className = ''
}) => {
  // =====================================================
  // STATE
  // =====================================================

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Rate limiting for debug logs to prevent infinite console spam
  const logRateLimit = useRef<Map<string, number>>(new Map());

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const ChannelIcon = CHANNEL_ICONS[instance.channel_type] || MessageSquare;
  const channelColor = CHANNEL_COLORS[instance.channel_type] || 'text-gray-600';
  const statusConfig = STATUS_CONFIG[instance.status];
  const StatusIcon = statusConfig.icon;

  // Get channel-specific configuration with defensive programming
  const getChannelConfig = () => {
    if (!instance.config) {
      return null;
    }

    switch (instance.channel_type) {
      case 'whatsapp':
        return instance.config.whatsapp || null;
      case 'telegram':
        return instance.config.telegram || null;
      case 'voice':
        return instance.config.voice || null;
      default:
        return null;
    }
  };

  const channelConfig = getChannelConfig();

  // Enhanced phone number extraction with debugging
  let phoneNumber = 'N/A';
  if (instance.channel_type === 'whatsapp') {
    // Try multiple possible locations for phone number
    phoneNumber = channelConfig?.phone_number ||
                  instance.config?.whatsapp?.phone_number ||
                  instance.config?.phone_number ||
                  'N/A';

    // Debug logging for phone number extraction with rate limiting
    if (process.env.NODE_ENV === 'development') {
      const lastLog = logRateLimit.current.get(instance.id) || 0;
      const now = Date.now();

      // Only log every 5 seconds per instance to prevent infinite console spam
      if (now - lastLog > 5000) {
        console.log('📱 Phone number extraction debug:', {
          instanceId: instance.id,
          instanceName: instance.instance_name,
          extractedPhone: phoneNumber,
          rateLimited: true,
          lastLoggedAt: new Date(lastLog).toISOString()
        });
        logRateLimit.current.set(instance.id, now);
      }
    }
  }

  const instanceName = instance.instance_name || 'Sin nombre';

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle instance action with loading state
   */
  const handleAction = async (action: 'connect' | 'disconnect' | 'delete' | 'configure') => {
    if (loading || actionLoading) return;

    try {
      setActionLoading(action);

      // For WhatsApp connect action, handle simple vs complex instances differently
      if (action === 'connect' && instance.channel_type === 'whatsapp') {
        console.log(`🔄 Initiating connection for instance ${instance.id}...`);

        // Check if this is a simple instance
        const isSimpleInstance = (instance as any)._isSimpleInstance === true;

        if (isSimpleInstance) {
          // For simple instances, just show QR code directly
          console.log('📱 Simple instance detected, showing QR code...');
          setShowQRCode(true);
        } else {
          // Use dedicated connection endpoint for complex instances
          const connectResponse = await fetch(`/api/channels/whatsapp/instances/${instance.id}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'connect' })
          });

          if (connectResponse.ok) {
            const result = await connectResponse.json();
            console.log(`✅ Connection initiated successfully:`, result);

            // Show QR code immediately after successful connection initiation
            setShowQRCode(true);

            // Optionally refresh the instance data to reflect status change
            // This will be handled by the parent component's refresh mechanism
          } else {
            const errorData = await connectResponse.json().catch(() => ({ error: { message: 'Unknown error' } }));
            console.error(`❌ Failed to initiate connection:`, errorData);
            throw new Error(`Failed to initiate connection: ${errorData.error?.message || connectResponse.statusText}`);
          }
        }
      } else {
        // For other actions, use the normal flow
        await onAction(instance.id, action);
      }
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Handle WhatsApp instance connection (two-step workflow)
   */
  const handleConnectInstance = async (instanceId: string) => {
    if (isConnecting) return;

    try {
      setIsConnecting(true);
      console.log(`🔄 Initiating connection for instance ${instanceId}...`);

      const response = await fetch(`/api/whatsapp/instances/${instanceId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Connection initiated successfully:`, result);

        // Show QR code display
        setShowQRCode(true);

        // Trigger parent refresh to update instance status
        onAction(instanceId, 'configure');
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error(`❌ Failed to initiate connection:`, errorData);
        throw new Error(`Failed to initiate connection: ${errorData.error?.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error connecting instance:', error);
      // You could add a toast notification here
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Handle QR code connection success
   */
  const handleQRConnected = () => {
    setShowQRCode(false);
    // Refresh instance data
    onAction(instance.id, 'configure'); // This will trigger a refresh
  };

  /**
   * Get action button configuration
   */
  const getActionButton = () => {
    if (instance.status === 'connected') {
      return {
        action: 'disconnect' as const,
        label: 'Desconectar',
        icon: PowerOff,
        className: 'border-red-300 text-red-700 hover:bg-red-50'
      };
    } else {
      return {
        action: 'connect' as const,
        label: 'Conectar',
        icon: Power,
        className: 'border-green-300 text-green-700 hover:bg-green-50'
      };
    }
  };

  const actionButton = getActionButton();

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Render instance metrics with defensive programming
   */
  const renderMetrics = () => {
    // Get additional channel-specific info for display
    const getChannelSpecificInfo = () => {
      if (!channelConfig) {
        return { label: 'Configuración:', value: 'No configurado' };
      }

      switch (instance.channel_type) {
        case 'whatsapp':
          return {
            label: 'Teléfono:',
            value: phoneNumber,
            className: 'text-xs'
          };
        case 'telegram':
          return {
            label: 'Bot Token:',
            value: channelConfig.bot_token ? '••••••••' : 'No configurado',
            className: 'text-xs'
          };
        case 'voice':
          return {
            label: 'Proveedor:',
            value: channelConfig.provider || 'No configurado',
            className: 'text-xs'
          };
        default:
          return { label: 'Estado:', value: 'Configurado' };
      }
    };

    const channelInfo = getChannelSpecificInfo();

    return (
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-500">Mensajes 24h:</span>
          <span className="ml-2 font-medium">{instance.metrics?.messages_24h || 0}</span>
        </div>
        <div>
          <span className="text-gray-500">Citas creadas:</span>
          <span className="ml-2 font-medium">{instance.metrics?.appointments_24h || 0}</span>
        </div>
        <div>
          <span className="text-gray-500">Conversaciones:</span>
          <span className="ml-2 font-medium">{instance.metrics?.conversations_24h || 0}</span>
        </div>
        <div>
          <span className="text-gray-500">{channelInfo.label}</span>
          <span className={`ml-2 font-medium ${channelInfo.className || ''}`}>
            {channelInfo.value}
          </span>
        </div>
      </div>
    );
  };

  /**
   * Render error message if present
   */
  const renderError = () => {
    if (!instance.error_message) return null;

    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
          <p className="text-sm text-red-700">{instance.error_message}</p>
        </div>
      </div>
    );
  };

  /**
   * Render action buttons
   */
  const renderActions = () => {
    const isDisabled = loading || !!actionLoading;

    return (
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => handleAction('configure')}
          disabled={isDisabled}
          className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === 'configure' ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            </div>
          ) : (
            <>
              <Settings className="h-4 w-4 inline mr-1" />
              Configurar
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleAction(actionButton.action)}
          disabled={isDisabled}
          className={`
            flex-1 border rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed
            ${actionButton.className}
          `}
        >
          {actionLoading === actionButton.action ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            </div>
          ) : (
            <>
              <actionButton.icon className="h-4 w-4 inline mr-1" />
              {actionButton.label}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleAction('delete')}
          disabled={isDisabled}
          aria-label="Eliminar instancia"
          title="Eliminar instancia"
          className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === 'delete' ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ChannelIcon className={`h-8 w-8 ${channelColor}`} />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">{instanceName}</h3>
            <p className="text-sm text-gray-500 capitalize">{instance.channel_type}</p>
          </div>
        </div>
        
        {/* Real-time Connection Status */}
        {instance.channel_type === 'whatsapp' ? (
          <ConnectionStatusIndicator
            instanceId={instance.id}
            instanceName={instance.instance_name}
            enabled={instance.status !== 'error'}
            checkInterval={60}
            compact={true}
            isSimpleInstance={(instance as any)._isSimpleInstance === true}
            onStatusChange={(status) => {
              // Optional: Handle status changes for UI updates
              console.log(`Status changed for ${instance.id}:`, status);
            }}
          />
        ) : (
          <div className="flex items-center">
            <StatusIcon className={`h-4 w-4 mr-2 ${statusConfig.iconColor}`} />
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${statusConfig.color}
            `}>
              {statusConfig.label}
            </span>
          </div>
        )}
      </div>

      {/* Metrics */}
      {renderMetrics()}

      {/* Error Message */}
      {renderError()}

      {/* REMOVED: Detailed Connection Status for WhatsApp - was causing infinite loop */}
      {/* Only one ConnectionStatusIndicator per instance to prevent monitoring conflicts */}

      {/* Actions */}
      {renderActions()}

      {/* Connect Button for Disconnected WhatsApp Instances (Two-Step Workflow) */}
      {instance.channel_type === 'whatsapp' &&
       instance.status === 'disconnected' &&
       instance.id && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <button
              type="button"
              onClick={() => handleConnectInstance(instance.id)}
              disabled={isConnecting}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Haz clic para generar el código QR y conectar tu WhatsApp
            </p>
          </div>
        </div>
      )}

      {/* QR Code Display for WhatsApp connecting */}
      {showQRCode &&
       instance.channel_type === 'whatsapp' &&
       instance.status === 'connecting' &&
       instance.id &&
       instance.instance_name && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <QRCodeDisplay
            instanceId={instance.id}
            instanceName={instance.instance_name}
            status={instance.status}
            onConnected={handleQRConnected}
            onError={(error) => console.error('QR Code error:', error)}
            isSimpleInstance={(instance as any)._isSimpleInstance === true}
          />
        </div>
      )}
    </div>
  );
};

export default ChannelInstanceCard;
