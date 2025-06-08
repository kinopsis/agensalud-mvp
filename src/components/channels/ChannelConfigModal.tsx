/**
 * Channel Configuration Modal Component
 * 
 * Generic modal for configuring channel instances (WhatsApp, Telegram, Voice)
 * with unified interface and channel-specific forms.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import type { ChannelInstance, ChannelType, ChannelInstanceConfig } from '@/types/channels';
import { shouldShowUIElement, type WhatsAppUserRole } from '@/lib/rbac/whatsapp-permissions';
import { useAuth } from '@/contexts/auth-context';

// =====================================================
// TYPES
// =====================================================

interface ChannelConfigModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Channel instance to configure */
  instance: ChannelInstance | null;
  /** Callback when configuration is saved */
  onSave: (instanceId: string, config: Partial<ChannelInstanceConfig>) => Promise<void>;
  /** Whether save operation is in progress */
  saving?: boolean;
}

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * ChannelConfigModal Component
 * 
 * @description Generic modal for configuring channel instances with
 * tabbed interface for different configuration sections.
 */
export const ChannelConfigModal: React.FC<ChannelConfigModalProps> = ({
  isOpen,
  onClose,
  instance,
  onSave,
  saving = false
}) => {
  // =====================================================
  // HOOKS & AUTH
  // =====================================================

  const { user } = useAuth();
  const userRole = (user?.role || 'patient') as WhatsAppUserRole;

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [activeSection, setActiveSection] = useState<string>('general');
  const [config, setConfig] = useState<Partial<ChannelInstanceConfig>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // =====================================================
  // EFFECTS
  // =====================================================

  /**
   * Initialize configuration when instance changes
   */
  useEffect(() => {
    if (instance) {
      setConfig(instance.config || {});
      setErrors({});
      setHasChanges(false);
      // Set initial section based on user role
      setActiveSection(userRole === 'admin' ? 'basic' : 'general');
    }
  }, [instance, userRole]);

  /**
   * Handle escape key to close modal
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Handle modal close with unsaved changes check
   */
  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres cerrar? Los cambios no guardados se perderán.'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  /**
   * Handle configuration update
   */
  const handleConfigUpdate = (updates: Partial<ChannelInstanceConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
    setHasChanges(true);

    // Clear errors for updated fields
    const updatedFields = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => {
        delete newErrors[field];
      });
      return newErrors;
    });
  };

  /**
   * Validate configuration
   */
  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!config.webhook?.url) {
      newErrors['webhook.url'] = 'URL del webhook es requerida';
    }

    if (config.ai_config?.enabled && !config.ai_config?.model) {
      newErrors['ai_config.model'] = 'Modelo de IA es requerido cuando está habilitado';
    }

    // Channel-specific validation
    if (instance?.channel_type === 'whatsapp') {
      if (!config.whatsapp?.phone_number) {
        newErrors['whatsapp.phone_number'] = 'Número de teléfono es requerido';
      }
      if (!config.whatsapp?.evolution_api?.base_url) {
        newErrors['whatsapp.evolution_api.base_url'] = 'URL de Evolution API es requerida';
      }
      if (!config.whatsapp?.evolution_api?.api_key) {
        newErrors['whatsapp.evolution_api.api_key'] = 'API Key de Evolution API es requerida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save configuration
   */
  const handleSave = async () => {
    if (!instance || !validateConfig()) return;

    try {
      await onSave(instance.id, config);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving configuration:', error);
      setErrors(prev => ({
        ...prev,
        general: error instanceof Error ? error.message : 'Error al guardar la configuración'
      }));
    }
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  /**
   * Get configuration sections based on channel type and user permissions
   */
  const getConfigSections = (): ConfigSection[] => {
    // For tenant admin users, show only basic connection controls
    if (userRole === 'admin') {
      return [
        {
          id: 'basic',
          title: 'Conexión',
          description: 'Estado de conexión y controles básicos',
          icon: Settings,
          component: () => null // Rendered inline in switch statement
        }
      ];
    }

    // For superadmin, show all configuration sections
    const baseSections: ConfigSection[] = [];

    // Only show advanced sections for superadmin
    if (shouldShowUIElement(userRole, 'showAdvancedSettings')) {
      baseSections.push(
        {
          id: 'general',
          title: 'General',
          description: 'Configuración básica de la instancia',
          icon: Settings,
          component: React.lazy(() => import('./config-sections/GeneralConfigSection').then(m => ({ default: m.GeneralConfigSection })))
        },
        {
          id: 'webhook',
          title: 'Webhook',
          description: 'Configuración de webhooks y eventos',
          icon: Settings,
          component: React.lazy(() => import('./config-sections/WebhookConfigSection').then(m => ({ default: m.WebhookConfigSection })))
        },
        {
          id: 'ai',
          title: 'Inteligencia Artificial',
          description: 'Configuración del asistente IA',
          icon: Settings,
          component: React.lazy(() => import('./config-sections/AIConfigSection').then(m => ({ default: m.AIConfigSection })))
        }
      );
    }

    // Add channel-specific sections for superadmin only
    if (instance?.channel_type === 'whatsapp' && shouldShowUIElement(userRole, 'showEvolutionApiFields')) {
      baseSections.push({
        id: 'whatsapp',
        title: 'WhatsApp',
        description: 'Configuración específica de WhatsApp',
        icon: Settings,
        component: React.lazy(() => import('./config-sections/WhatsAppConfigSection').then(m => ({ default: m.WhatsAppConfigSection })))
      });
    }

    return baseSections;
  };

  /**
   * Render section tabs
   */
  const renderSectionTabs = () => {
    const sections = getConfigSections();

    return (
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeSection === section.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <section.icon className="h-4 w-4 inline mr-2" />
              {section.title}
            </button>
          ))}
        </nav>
      </div>
    );
  };

  /**
   * Render error message
   */
  const renderError = () => {
    if (!errors.general) return null;

    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      </div>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  if (!isOpen || !instance) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Configurar {instance.instance_name}
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {instance.channel_type} • {instance.status}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                title="Cerrar modal"
                aria-label="Cerrar modal de configuración"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4">
            {renderSectionTabs()}
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-96 overflow-y-auto">
            {renderError()}

            {/* Dynamic section content */}
            <React.Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-500">Cargando configuración...</span>
              </div>
            }>
              {(() => {
                const sections = getConfigSections();
                const currentSection = sections.find(s => s.id === activeSection);

                if (!currentSection) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Sección no encontrada</p>
                    </div>
                  );
                }

                const SectionComponent = currentSection.component;

                // Render section based on type
                switch (activeSection) {
                  case 'basic':
                    return (
                      <div className="space-y-6">
                        <div className="text-center">
                          <Settings className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            Estado de Conexión
                          </h4>
                          <p className="text-sm text-gray-500">
                            Información básica sobre el estado de tu instancia de WhatsApp.
                          </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Estado:</span>
                              <span className={`ml-2 font-medium ${
                                instance.status === 'connected' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Teléfono:</span>
                              <span className="ml-2 font-medium">
                                {instance.config?.whatsapp?.phone_number || 'No configurado'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Última conexión:</span>
                              <span className="ml-2 font-medium">
                                {instance.last_seen ? new Date(instance.last_seen).toLocaleString() : 'Nunca'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Mensajes hoy:</span>
                              <span className="ml-2 font-medium">
                                {instance.metrics?.messages_24h || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <h5 className="text-sm font-medium text-blue-900 mb-2">
                            ℹ️ Información para Administradores
                          </h5>
                          <ul className="text-xs text-blue-700 space-y-1">
                            <li>• La configuración avanzada está gestionada por el equipo técnico</li>
                            <li>• Para cambios en la configuración, contacta al soporte</li>
                            <li>• Puedes conectar/desconectar la instancia desde el dashboard</li>
                          </ul>
                        </div>
                      </div>
                    );
                  case 'general':
                    return (
                      <SectionComponent
                        config={config}
                        onUpdate={handleConfigUpdate}
                        errors={errors}
                        instanceName={instance?.instance_name || ''}
                      />
                    );
                  case 'webhook':
                    return (
                      <SectionComponent
                        config={config}
                        onUpdate={handleConfigUpdate}
                        errors={errors}
                      />
                    );
                  case 'ai':
                    return (
                      <SectionComponent
                        config={config}
                        onUpdate={handleConfigUpdate}
                        errors={errors}
                      />
                    );
                  case 'whatsapp':
                    return (
                      <SectionComponent
                        config={config}
                        onUpdate={handleConfigUpdate}
                        errors={errors}
                      />
                    );
                  default:
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          Sección de configuración "{activeSection}" en desarrollo...
                        </p>
                      </div>
                    );
                }
              })()}
            </React.Suspense>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500">
              {hasChanges && (
                <>
                  <AlertCircle className="h-4 w-4 mr-1 text-yellow-500" />
                  Cambios sin guardar
                </>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {userRole === 'admin' ? 'Cerrar' : 'Cancelar'}
              </button>
              {/* Only show save button for superadmin */}
              {userRole !== 'admin' && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 inline mr-2" />
                      Guardar Cambios
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

export default ChannelConfigModal;
