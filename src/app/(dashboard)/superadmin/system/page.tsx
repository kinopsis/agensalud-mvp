'use client';

/**
 * System Management Page
 * SuperAdmin page for system configuration and monitoring
 * Includes system health, configuration, and maintenance tools
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from '@/components/dashboard/StatsCard';
import {
  Server,
  Database,
  Shield,
  Activity,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  ArrowLeft
} from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  database_status: 'connected' | 'disconnected' | 'slow';
  api_response_time: number;
  active_connections: number;
  last_backup: string;
  version: string;
}

interface SystemConfig {
  maintenance_mode: boolean;
  registration_enabled: boolean;
  email_notifications: boolean;
  backup_frequency: string;
  max_organizations: number;
  max_users_per_org: number;
  session_timeout: number;
}

export default function SystemPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Check SuperAdmin permissions
  useEffect(() => {
    if (profile && profile.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [profile, router]);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      
      const [healthResponse, configResponse] = await Promise.all([
        fetch('/api/superadmin/system/health'),
        fetch('/api/superadmin/system/config')
      ]);

      if (!healthResponse.ok || !configResponse.ok) {
        throw new Error('Error al cargar datos del sistema');
      }

      const healthData = await healthResponse.json();
      const configData = await configResponse.json();

      setHealth(healthData.data);
      setConfig(configData.data);
    } catch (err) {
      console.error('Error loading system data:', err);
      setError('Error al cargar los datos del sistema');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<SystemConfig>) => {
    try {
      setUpdating(true);
      
      const response = await fetch('/api/superadmin/system/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar configuración');
      }

      const result = await response.json();
      setConfig(result.data);
    } catch (err) {
      console.error('Error updating config:', err);
      setError('Error al actualizar la configuración');
    } finally {
      setUpdating(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  const actions = (
    <>
      <button
        type="button"
        onClick={loadSystemData}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => router.back()}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </button>
    </>
  );

  return (
    <DashboardLayout
      title="Sistema"
      subtitle="Configuración y monitoreo del sistema"
      actions={actions}
    >
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* System Health */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Estado del Sistema</h2>
        <StatsGrid columns={4}>
          {loading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : health ? (
            <>
              <StatsCard
                title="Estado General"
                value={health.status === 'healthy' ? 'Saludable' : health.status === 'warning' ? 'Advertencia' : 'Crítico'}
                subtitle={`Uptime: ${health.uptime}`}
                icon={getHealthIcon(health.status)}
                color={getHealthColor(health.status) as any}
              />
              <StatsCard
                title="CPU"
                value={`${health.cpu_usage}%`}
                subtitle="Uso del procesador"
                icon={Cpu}
                color={health.cpu_usage > 80 ? 'red' : health.cpu_usage > 60 ? 'yellow' : 'green'}
              />
              <StatsCard
                title="Memoria"
                value={`${health.memory_usage}%`}
                subtitle="Uso de memoria RAM"
                icon={MemoryStick}
                color={health.memory_usage > 80 ? 'red' : health.memory_usage > 60 ? 'yellow' : 'green'}
              />
              <StatsCard
                title="Disco"
                value={`${health.disk_usage}%`}
                subtitle="Uso del disco"
                icon={HardDrive}
                color={health.disk_usage > 80 ? 'red' : health.disk_usage > 60 ? 'yellow' : 'green'}
              />
            </>
          ) : null}
        </StatsGrid>
      </div>

      {/* Database & API Status */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Servicios</h2>
        <StatsGrid columns={3}>
          {loading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : health ? (
            <>
              <StatsCard
                title="Base de Datos"
                value={health.database_status === 'connected' ? 'Conectada' : health.database_status === 'slow' ? 'Lenta' : 'Desconectada'}
                subtitle="Estado de conexión"
                icon={Database}
                color={health.database_status === 'connected' ? 'green' : health.database_status === 'slow' ? 'yellow' : 'red'}
              />
              <StatsCard
                title="API Response"
                value={`${health.api_response_time}ms`}
                subtitle="Tiempo de respuesta"
                icon={Activity}
                color={health.api_response_time < 200 ? 'green' : health.api_response_time < 500 ? 'yellow' : 'red'}
              />
              <StatsCard
                title="Conexiones Activas"
                value={health.active_connections}
                subtitle="Usuarios conectados"
                icon={Server}
                color="blue"
              />
            </>
          ) : null}
        </StatsGrid>
      </div>

      {/* System Configuration */}
      {config && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Configuración del Sistema</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Modo Mantenimiento</label>
                  <p className="text-xs text-gray-500">Deshabilita el acceso al sistema</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig({ maintenance_mode: !config.maintenance_mode })}
                  disabled={updating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.maintenance_mode ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.maintenance_mode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Registro Habilitado</label>
                  <p className="text-xs text-gray-500">Permite nuevos registros</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig({ registration_enabled: !config.registration_enabled })}
                  disabled={updating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.registration_enabled ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.registration_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Notificaciones Email</label>
                  <p className="text-xs text-gray-500">Envío automático de emails</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig({ email_notifications: !config.email_notifications })}
                  disabled={updating}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.email_notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Organizaciones
                </label>
                <input
                  type="number"
                  value={config.max_organizations}
                  onChange={(e) => updateConfig({ max_organizations: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuarios por Organización
                </label>
                <input
                  type="number"
                  value={config.max_users_per_org}
                  onChange={(e) => updateConfig({ max_users_per_org: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout de Sesión (minutos)
                </label>
                <input
                  type="number"
                  value={config.session_timeout}
                  onChange={(e) => updateConfig({ session_timeout: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  min="5"
                />
              </div>
            </div>
          </div>

          {health && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Versión del Sistema: {health.version}</span>
                <span>Último Backup: {new Date(health.last_backup).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
