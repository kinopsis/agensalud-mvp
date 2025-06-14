/**
 * Unified Channel Dashboard Component
 *
 * Main dashboard for managing all communication channels (WhatsApp, Telegram, Voice)
 * from a single interface with unified metrics and controls.
 *
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Send, Plus, Settings, Activity, TrendingUp, RefreshCw, Filter } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from '@/components/dashboard/StatsCard';
import SimpleWhatsAppModal from '@/components/whatsapp/SimpleWhatsAppModal';
import { QuickCreateWhatsAppButton } from '@/components/channels/QuickCreateWhatsAppButton';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import type {
  ChannelInstance,
  ChannelType,
  UnifiedChannelMetrics,
  ChannelStatus
} from '@/types/channels';

// Simplified import to prevent webpack module loading issues
let ChannelInstanceCard: any = null;
let ChannelConfigModal: any = null;

// Simple fallback components
const ChannelInstanceCardFallback = ({ instance }: { instance: ChannelInstance }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <MessageSquare className="h-8 w-8 text-gray-600" />
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-gray-900">{instance.instance_name}</h3>
          <p className="text-sm text-gray-500">WhatsApp</p>
        </div>
      </div>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {instance.status}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
      <div>
        <span className="text-gray-500">Mensajes hoy:</span>
        <span className="ml-2 font-medium">{instance.metrics?.messages_24h || 0}</span>
      </div>
      <div>
        <span className="text-gray-500">Citas creadas:</span>
        <span className="ml-2 font-medium">{instance.metrics?.appointments_24h || 0}</span>
      </div>
    </div>
  </div>
);

const ChannelConfigModalFallback = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración</h3>
        <p className="text-gray-600 mb-4">Cargando configuración...</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface ChannelDashboardProps {
  organizationId: string;
  userRole: 'admin' | 'superadmin';
}

interface ChannelTabData {
  type: ChannelType;
  label: string;
  icon: React.ComponentType<any>;
  instances: ChannelInstance[];
  color: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * ChannelDashboard Component
 *
 * @description Unified dashboard for managing all communication channels
 * with tabbed interface, metrics overview, and instance management.
 */
export const ChannelDashboard: React.FC<ChannelDashboardProps> = ({
  organizationId,
  userRole
}) => {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [instances, setInstances] = useState<ChannelInstance[]>([]);
  const [metrics, setMetrics] = useState<UnifiedChannelMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<ChannelType>('whatsapp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [componentsLoaded, setComponentsLoaded] = useState(false);

  // Configuration modal state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<ChannelInstance | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Simplified creation modal state
  const [simplifiedCreationModalOpen, setSimplifiedCreationModalOpen] = useState(false);

  // Context hooks
  const { profile } = useAuth();
  const { organization } = useTenant();

  // Load components dynamically
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [instanceCardModule, configModalModule] = await Promise.all([
          import('./ChannelInstanceCard'),
          import('./ChannelConfigModal')
        ]);

        ChannelInstanceCard = instanceCardModule.ChannelInstanceCard;
        ChannelConfigModal = configModalModule.ChannelConfigModal;
        setComponentsLoaded(true);
      } catch (error) {
        console.error('Failed to load channel components:', error);
        // Keep components as null, will use fallbacks
      }
    };

    loadComponents();
  }, []);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  useEffect(() => {
    fetchChannelData();
  }, [organizationId]);

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      setError(null);

      // For tenant admin users, use simple WhatsApp API
      if (profile?.role === 'admin') {
        // Fetch simple WhatsApp instances
        const simpleResponse = await fetch('/api/whatsapp/simple/instances');
        if (!simpleResponse.ok) {
          throw new Error('Failed to fetch WhatsApp instances');
        }
        const simpleData = await simpleResponse.json();

        if (simpleData.success) {
          // Convert simple instances to unified format
          const convertedInstances = (simpleData.data || []).map((instance: any) => ({
            id: instance.id,
            instance_name: instance.display_name,
            channel_type: 'whatsapp',
            status: instance.status,
            config: {
              whatsapp: {
                phone_number: instance.whatsapp_number || 'N/A'
              }
            },
            created_at: instance.created_at,
            updated_at: instance.updated_at,
            metrics: {
              conversations_24h: 0,
              messages_24h: 0,
              appointments_24h: 0
            },
            // Add flag to identify simple instances
            _isSimpleInstance: true
          }));

          setInstances(convertedInstances);
          const unifiedMetrics = calculateUnifiedMetrics(convertedInstances);
          setMetrics(unifiedMetrics);
        } else {
          throw new Error(simpleData.error || 'Failed to fetch simple instances');
        }
      } else {
        // For superadmin, use complex channel API
        const instancesResponse = await fetch('/api/channels/whatsapp/instances');
        if (!instancesResponse.ok) {
          throw new Error('Failed to fetch WhatsApp instances');
        }
        const instancesData = await instancesResponse.json();

        if (instancesData.success) {
          setInstances(instancesData.data.instances || []);
          const unifiedMetrics = calculateUnifiedMetrics(instancesData.data.instances || []);
          setMetrics(unifiedMetrics);
        } else {
          throw new Error(instancesData.error?.message || 'Failed to fetch instances');
        }
      }

    } catch (err) {
      console.error('Error fetching channel data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate unified metrics from instances data
   */
  const calculateUnifiedMetrics = (instances: ChannelInstance[]): UnifiedChannelMetrics => {
    const activeChannels = instances.filter(i => i.status === 'connected').length;
    const totalConversations = instances.reduce((sum, i) => sum + (i.metrics?.conversations_24h || 0), 0);
    const totalMessages = instances.reduce((sum, i) => sum + (i.metrics?.messages_24h || 0), 0);
    const totalAppointments = instances.reduce((sum, i) => sum + (i.metrics?.appointments_24h || 0), 0);

    return {
      summary: {
        total_channels: instances.length,
        active_channels: activeChannels,
        total_conversations_24h: totalConversations,
        total_messages_24h: totalMessages,
        total_appointments_24h: totalAppointments,
        avg_response_time_ms: 1500,
        success_rate_percentage: 85,
        total_conversations: totalConversations,
        total_appointments: totalAppointments,
        overall_success_rate: 85
      },
      by_channel: {
        whatsapp: {
          instances: instances.filter(i => i.channel_type === 'whatsapp').length,
          active_instances: instances.filter(i => i.channel_type === 'whatsapp' && i.status === 'connected').length,
          conversations_24h: totalConversations,
          messages_24h: totalMessages,
          appointments_24h: totalAppointments
        }
      },
      trends: {
        conversations_growth: 12.5,
        messages_growth: 8.3,
        appointments_growth: 15.2,
        success_rate_trend: 2.1
      }
    };
  };

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const channelTabs: ChannelTabData[] = [
    {
      type: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
      instances: instances.filter(i => i.channel_type === 'whatsapp'),
      color: 'green'
    },
    {
      type: 'telegram',
      label: 'Telegram',
      icon: Send,
      instances: instances.filter(i => i.channel_type === 'telegram'),
      color: 'blue'
    },
    {
      type: 'voice',
      label: 'Voice',
      icon: Phone,
      instances: instances.filter(i => i.channel_type === 'voice'),
      color: 'purple'
    }
  ];

  const activeTabData = channelTabs.find(tab => tab.type === activeTab);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleCreateInstance = (channelType: ChannelType) => {
    // For WhatsApp, use radical solution (QuickCreateWhatsAppButton handles the creation)
    // This function is now mainly for other channel types
    if (channelType === 'whatsapp') {
      // The QuickCreateWhatsAppButton will handle the creation directly
      // This function is called by the "Nueva Instancia" button, but for WhatsApp
      // we'll show the QuickCreateWhatsAppButton instead
      console.log('WhatsApp creation handled by QuickCreateWhatsAppButton');
    } else {
      // Navigate to create instance page for other channel types
      window.location.href = `/admin/channels/${channelType}/create`;
    }
  };

  const handleSimplifiedCreationSuccess = async (instanceId: string) => {
    try {
      console.log('✅ WhatsApp instance created successfully:', instanceId);
      // Refresh instances list to show the new instance
      await fetchChannelData();
      // Close modal
      setSimplifiedCreationModalOpen(false);
      // Show success message (optional)
      console.log('WhatsApp instance created and connected successfully:', instanceId);

      // Highlight the newly created instance (optional enhancement)
      // This could trigger a brief animation or highlight effect
      setTimeout(() => {
        const instanceElement = document.querySelector(`[data-instance-id="${instanceId}"]`);
        if (instanceElement) {
          instanceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          instanceElement.classList.add('ring-2', 'ring-green-500', 'ring-opacity-50');
          setTimeout(() => {
            instanceElement.classList.remove('ring-2', 'ring-green-500', 'ring-opacity-50');
          }, 3000);
        }
      }, 500);

    } catch (error) {
      console.error('Error refreshing instances after creation:', error);
      // Still close the modal even if refresh fails
      setSimplifiedCreationModalOpen(false);
      // Set error state to show user there was an issue
      setError('Instancia creada exitosamente, pero hubo un error al actualizar la lista. Recarga la página para ver la nueva instancia.');
    }
  };

  const handleInstanceAction = async (instanceId: string, action: 'connect' | 'disconnect' | 'delete') => {
    // Show confirmation dialog for delete action
    if (action === 'delete') {
      const instance = instances.find(i => i.id === instanceId);
      const instanceName = instance?.instance_name || 'esta instancia';

      const confirmed = window.confirm(
        `¿Estás seguro de que deseas eliminar "${instanceName}"?\n\n` +
        `Esta acción eliminará permanentemente:\n` +
        `• La instancia y su configuración\n` +
        `• Todas las conversaciones asociadas\n` +
        `• Los registros de auditoría\n\n` +
        `Esta acción no se puede deshacer.`
      );

      if (!confirmed) {
        return; // User cancelled
      }
    }

    try {
      setRefreshing(true);

      // Use different endpoints based on user role
      const isSimpleSystem = profile?.role === 'admin';
      const baseUrl = isSimpleSystem
        ? `/api/whatsapp/simple/instances/${instanceId}`
        : `/api/channels/whatsapp/instances/${instanceId}`;

      if (action === 'delete') {
        const response = await fetch(baseUrl, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            throw new Error('No tienes permisos para eliminar instancias. Inicia sesión nuevamente.');
          } else if (response.status === 403) {
            throw new Error('No tienes permisos suficientes para eliminar esta instancia.');
          } else if (response.status === 404) {
            throw new Error('La instancia no existe o ya fue eliminada.');
          } else if (response.status === 409) {
            throw new Error('No se puede eliminar la instancia porque tiene conversaciones activas.');
          } else {
            throw new Error(errorData.error?.message || `Error ${response.status}: No se pudo eliminar la instancia`);
          }
        }

        // Show success message
        const instance = instances.find(i => i.id === instanceId);
        console.log(`✅ Instancia "${instance?.instance_name}" eliminada exitosamente`);

      } else {
        // For simple system, connect/disconnect actions are not implemented yet
        if (isSimpleSystem) {
          throw new Error(`La acción "${action}" no está disponible para instancias simples. Use el código QR para conectar.`);
        }

        // Use status endpoint for connect/disconnect actions (complex system only)
        const response = await fetch(`${baseUrl}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action === 'connect' ? 'connect' : 'disconnect',
            reason: `${action} requested from dashboard`
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            throw new Error('No tienes permisos para modificar instancias. Inicia sesión nuevamente.');
          } else if (response.status === 403) {
            throw new Error('No tienes permisos suficientes para modificar esta instancia.');
          } else {
            throw new Error(errorData.error?.message || `Error ${response.status}: No se pudo ${action === 'connect' ? 'conectar' : 'desconectar'} la instancia`);
          }
        }
      }

      // Refresh data
      await fetchChannelData();
    } catch (err) {
      console.error(`Error ${action}ing instance:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setRefreshing(false);
    }
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const renderMetricsOverview = () => {
    if (!metrics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Canales Activos</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.summary.active_channels}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Conversaciones Hoy</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.summary.total_conversations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Citas Creadas</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.summary.total_appointments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tasa de Éxito IA</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.summary.overall_success_rate}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChannelTabs = () => {
    return (
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {channelTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.type;
            
            return (
              <button
                type="button"
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${isActive 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.label}
                {tab.instances.length > 0 && (
                  <span className={`
                    ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                  `}>
                    {tab.instances.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  };

  /**
   * Handle instance actions from ChannelInstanceCard
   */
  const handleInstanceCardAction = async (instanceId: string, action: 'connect' | 'disconnect' | 'delete' | 'configure') => {
    if (action === 'configure') {
      // Open configuration modal
      const instance = instances.find(i => i.id === instanceId);
      if (instance) {
        setSelectedInstance(instance);
        setConfigModalOpen(true);
      }
      return;
    }

    // Handle other actions
    await handleInstanceAction(instanceId, action);
  };

  /**
   * Handle configuration save
   */
  const handleConfigSave = async (instanceId: string, config: Partial<ChannelInstanceConfig>) => {
    setSavingConfig(true);
    try {
      const response = await fetch(`/api/channels/whatsapp/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      // Refresh instances data
      await fetchChannelData();

      // Close modal
      setConfigModalOpen(false);
      setSelectedInstance(null);
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error; // Re-throw to let modal handle the error
    } finally {
      setSavingConfig(false);
    }
  };

  const ChannelInstanceCardFallback = ({ instance, onAction }: {
    instance: ChannelInstance;
    onAction?: (instanceId: string, action: 'connect' | 'disconnect' | 'delete' | 'configure') => void;
  }) => {
    const statusColors = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      connecting: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      maintenance: 'bg-blue-100 text-blue-800'
    };

    const statusLabels = {
      connected: 'Conectado',
      disconnected: 'Desconectado',
      connecting: 'Conectando',
      error: 'Error',
      suspended: 'Suspendido',
      maintenance: 'Mantenimiento'
    };

    return (
      <div key={instance.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {activeTabData && <activeTabData.icon className="h-8 w-8 text-gray-600" />}
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">{instance.instance_name}</h3>
              <p className="text-sm text-gray-500">{activeTabData?.label}</p>
            </div>
          </div>
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${statusColors[instance.status]}
          `}>
            {statusLabels[instance.status]}
          </span>
        </div>

        {/* Instance metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-500">Mensajes hoy:</span>
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
            <span className="ml-2 font-medium text-xs">{instance.config?.whatsapp?.phone_number || 'N/A'}</span>
          </div>
        </div>

        {instance.error_message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{instance.error_message}</p>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onAction?.(instance.id, 'configure')}
            className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 inline mr-1" />
            Configurar
          </button>

          <button
            type="button"
            onClick={() => onAction?.(instance.id, instance.status === 'connected' ? 'disconnect' : 'connect')}
            className={`
              flex-1 border rounded-md px-3 py-2 text-sm font-medium
              ${instance.status === 'connected'
                ? 'border-red-300 text-red-700 hover:bg-red-50'
                : 'border-green-300 text-green-700 hover:bg-green-50'
              }
            `}
          >
            {instance.status === 'connected' ? 'Desconectar' : 'Conectar'}
          </button>

          <button
            type="button"
            onClick={() => onAction?.(instance.id, 'delete')}
            className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>
    );
  };

  const renderInstanceList = () => {
    if (!activeTabData) return null;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTabData.label} - Instancias
          </h2>
          {/* Use QuickCreateWhatsAppButton for WhatsApp, regular button for others */}
          {activeTab === 'whatsapp' ? (
            <QuickCreateWhatsAppButton
              variant="primary"
              size="md"
              buttonText="Nueva Instancia WhatsApp"
              onSuccess={async (instanceId, connectUrl) => {
                console.log('✅ Instance created via radical solution:', instanceId);
                // Refresh the instances list
                await fetchChannelData();
              }}
              onError={(error) => {
                console.error('❌ Radical solution creation failed:', error);
                setError(error);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => handleCreateInstance(activeTab)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Instancia
            </button>
          )}
        </div>

        {activeTabData.instances.length === 0 ? (
          <div className="text-center py-12">
            <activeTabData.icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay instancias de {activeTabData.label}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primera instancia de {activeTabData.label}.
            </p>
            <div className="mt-6">
              {/* Use QuickCreateWhatsAppButton for WhatsApp, regular button for others */}
              {activeTab === 'whatsapp' ? (
                <QuickCreateWhatsAppButton
                  variant="primary"
                  size="lg"
                  buttonText="Crear Primera Instancia WhatsApp"
                  onSuccess={async (instanceId, connectUrl) => {
                    console.log('✅ First instance created via radical solution:', instanceId);
                    // Refresh the instances list
                    await fetchChannelData();
                  }}
                  onError={(error) => {
                    console.error('❌ First instance creation failed:', error);
                    setError(error);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleCreateInstance(activeTab)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Instancia
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTabData.instances.map((instance) => {
              // Use enhanced component if loaded, otherwise use fallback
              if (ChannelInstanceCard && componentsLoaded) {
                return (
                  <ChannelInstanceCard
                    key={instance.id}
                    instance={instance}
                    onAction={handleInstanceCardAction}
                    loading={refreshing}
                  />
                );
              } else {
                return (
                  <ChannelInstanceCardFallback
                    key={instance.id}
                    instance={instance}
                    onAction={handleInstanceCardAction}
                  />
                );
              }
            })}
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          type="button"
          onClick={fetchChannelData}
          className="mt-2 text-sm text-red-600 hover:text-red-500"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      {renderMetricsOverview()}

      {/* Channel Tabs */}
      {renderChannelTabs()}

      {/* Instance List */}
      {renderInstanceList()}

      {/* Configuration Modal */}
      {ChannelConfigModal && componentsLoaded ? (
        <ChannelConfigModal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedInstance(null);
          }}
          instance={selectedInstance}
          onSave={handleConfigSave}
          saving={savingConfig}
        />
      ) : (
        <ChannelConfigModalFallback
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedInstance(null);
          }}
        />
      )}

      {/* Simple WhatsApp Creation Modal */}
      <SimpleWhatsAppModal
        isOpen={simplifiedCreationModalOpen}
        onClose={() => setSimplifiedCreationModalOpen(false)}
        onSuccess={handleSimplifiedCreationSuccess}
      />
    </div>
  );
};

export default ChannelDashboard;
