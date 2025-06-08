/**
 * Tenant Admin WhatsApp Dashboard Component
 * 
 * Simplified dashboard for tenant admin users with minimal permissions.
 * Hides all technical complexity and Evolution API details.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Phone, 
  Trash2, 
  Power, 
  PowerOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  shouldShowUIElement,
  getErrorMessage,
  type WhatsAppUserRole
} from '@/lib/rbac/whatsapp-permissions';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'suspended';
  config: {
    whatsapp?: {
      phone_number?: string;
    };
  };
  created_at: string;
  updated_at: string;
}

interface TenantAdminDashboardProps {
  userRole: WhatsAppUserRole;
  organizationId: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function TenantAdminWhatsAppDashboard({ userRole, organizationId }: TenantAdminDashboardProps) {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // PERMISSION CHECKS
  // =====================================================

  const canConnect = shouldShowUIElement(userRole, 'showConnectButton');
  const canDisconnect = shouldShowUIElement(userRole, 'showDisconnectButton');
  const canDelete = shouldShowUIElement(userRole, 'showDeleteInstanceButton');
  const useSimplifiedErrors = shouldShowUIElement(userRole, 'useSimplifiedErrorMessages');

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchInstance = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/channels/whatsapp/instances');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al cargar la instancia');
      }

      const data = await response.json();
      
      // Tenant admin should only see one instance
      const instances = data.data?.instances || [];
      setInstance(instances.length > 0 ? instances[0] : null);

    } catch (error) {
      console.error('Error fetching instance:', error);
      const errorMessage = getErrorMessage(
        userRole,
        error instanceof Error ? error.message : 'Unknown error',
        'No se pudo cargar la información de WhatsApp. Intenta nuevamente.'
      );
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EFFECTS
  // =====================================================

  useEffect(() => {
    fetchInstance();
  }, []);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleConnect = async () => {
    if (!instance || !canConnect) return;

    try {
      setActionLoading('connect');
      
      const response = await fetch(`/api/channels/whatsapp/instances/${instance.id}/connect`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al conectar');
      }

      toast.success('WhatsApp conectado exitosamente');
      await fetchInstance(); // Refresh data

    } catch (error) {
      console.error('Error connecting instance:', error);
      const errorMessage = getErrorMessage(
        userRole,
        error instanceof Error ? error.message : 'Unknown error',
        'No se pudo conectar WhatsApp. Verifica tu conexión e intenta nuevamente.'
      );
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async () => {
    if (!instance || !canDisconnect) return;

    try {
      setActionLoading('disconnect');
      
      const response = await fetch(`/api/channels/whatsapp/instances/${instance.id}/disconnect`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al desconectar');
      }

      toast.success('WhatsApp desconectado exitosamente');
      await fetchInstance(); // Refresh data

    } catch (error) {
      console.error('Error disconnecting instance:', error);
      const errorMessage = getErrorMessage(
        userRole,
        error instanceof Error ? error.message : 'Unknown error',
        'No se pudo desconectar WhatsApp. Intenta nuevamente.'
      );
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!instance || !canDelete) return;

    const confirmed = window.confirm(
      '¿Estás seguro de que quieres eliminar la instancia de WhatsApp? Esta acción no se puede deshacer.'
    );

    if (!confirmed) return;

    try {
      setActionLoading('delete');
      
      const response = await fetch(`/api/channels/whatsapp/instances/${instance.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al eliminar');
      }

      toast.success('Instancia de WhatsApp eliminada exitosamente');
      setInstance(null); // Clear instance

    } catch (error) {
      console.error('Error deleting instance:', error);
      const errorMessage = getErrorMessage(
        userRole,
        error instanceof Error ? error.message : 'Unknown error',
        'No se pudo eliminar la instancia. Intenta nuevamente.'
      );
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = () => {
    fetchInstance();
  };

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      connecting: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      disconnected: 'bg-gray-100 text-gray-800',
      suspended: 'bg-orange-100 text-orange-800'
    };

    const labels = {
      connected: 'Conectado',
      connecting: 'Conectando',
      error: 'Error',
      disconnected: 'Desconectado',
      suspended: 'Suspendido'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.disconnected}>
        {labels[status as keyof typeof labels] || 'Desconocido'}
      </Badge>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Cargando información de WhatsApp...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              Intentar nuevamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!instance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay instancia de WhatsApp
            </h3>
            <p className="text-gray-500 mb-4">
              Crea una instancia de WhatsApp para comenzar a recibir mensajes de tus pacientes.
            </p>
            <Button
              onClick={() => window.location.href = '/admin/channels'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Crear Instancia de WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground">
            Gestiona la conexión de WhatsApp para tu organización
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Instance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              {instance.instance_name}
            </div>
            {getStatusBadge(instance.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Information */}
            <div className="flex items-center space-x-3">
              {getStatusIcon(instance.status)}
              <div>
                <p className="font-medium">Estado de conexión</p>
                <p className="text-sm text-muted-foreground">
                  {instance.status === 'connected' && 'WhatsApp está conectado y funcionando correctamente'}
                  {instance.status === 'connecting' && 'Conectando a WhatsApp...'}
                  {instance.status === 'disconnected' && 'WhatsApp está desconectado'}
                  {instance.status === 'error' && 'Hay un problema con la conexión de WhatsApp'}
                  {instance.status === 'suspended' && 'La instancia está temporalmente suspendida'}
                </p>
              </div>
            </div>

            {/* Phone Number */}
            {instance.config.whatsapp?.phone_number && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Número de teléfono</p>
                  <p className="text-sm text-muted-foreground">
                    {instance.config.whatsapp.phone_number}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              {canConnect && instance.status !== 'connected' && (
                <Button
                  onClick={handleConnect}
                  disabled={actionLoading === 'connect'}
                  className="flex items-center"
                >
                  {actionLoading === 'connect' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4 mr-2" />
                  )}
                  Conectar
                </Button>
              )}

              {canDisconnect && instance.status === 'connected' && (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={actionLoading === 'disconnect'}
                  className="flex items-center"
                >
                  {actionLoading === 'disconnect' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PowerOff className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={actionLoading === 'delete'}
                  className="flex items-center"
                >
                  {actionLoading === 'delete' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TenantAdminWhatsAppDashboard;
