/**
 * Channel Instance Card Component
 * 
 * Generic reusable component for displaying channel instances (WhatsApp, Telegram, Voice)
 * with unified interface and actions.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState } from 'react';
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
  QrCode
} from 'lucide-react';
import type { ChannelInstance, ChannelType, ChannelStatus } from '@/types/channels';
import { QRCodeDisplay } from './QRCodeDisplay';

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

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const ChannelIcon = CHANNEL_ICONS[instance.channel_type] || MessageSquare;
  const channelColor = CHANNEL_COLORS[instance.channel_type] || 'text-gray-600';
  const statusConfig = STATUS_CONFIG[instance.status];
  const StatusIcon = statusConfig.icon;

  // Get channel-specific configuration
  const channelConfig = instance.config[instance.channel_type];
  const phoneNumber = channelConfig?.phone_number || 'N/A';
  const instanceName = instance.instance_name;

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
      await onAction(instance.id, action);

      // Show QR code when connecting WhatsApp
      if (action === 'connect' && instance.channel_type === 'whatsapp') {
        setShowQRCode(true);
      }
    } finally {
      setActionLoading(null);
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
   * Render instance metrics
   */
  const renderMetrics = () => (
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
        <span className="text-gray-500">Teléfono:</span>
        <span className="ml-2 font-medium text-xs">{phoneNumber}</span>
      </div>
    </div>
  );

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
        
        <div className="flex items-center">
          <StatusIcon className={`h-4 w-4 mr-2 ${statusConfig.iconColor}`} />
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${statusConfig.color}
          `}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Metrics */}
      {renderMetrics()}

      {/* Error Message */}
      {renderError()}

      {/* Actions */}
      {renderActions()}

      {/* QR Code Display for WhatsApp connecting */}
      {showQRCode && instance.channel_type === 'whatsapp' && instance.status === 'connecting' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <QRCodeDisplay
            instanceId={instance.id}
            instanceName={instance.instance_name}
            status={instance.status}
            onConnected={handleQRConnected}
            onError={(error) => console.error('QR Code error:', error)}
          />
        </div>
      )}
    </div>
  );
};

export default ChannelInstanceCard;
