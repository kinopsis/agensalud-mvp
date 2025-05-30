'use client';

/**
 * SuperAdminDashboard Component
 * System-wide dashboard for super administrators
 * Provides multi-tenant oversight, organization management, and global statistics
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from './DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from './StatsCard';
import AdvancedReports from '@/components/superadmin/AdvancedReports';
import OrganizationManagement from '@/components/superadmin/OrganizationManagement';
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  Eye,
  Settings,
  BarChart3,
  Globe,
  Shield,
  Database,
  Activity,
  Bell,
  RefreshCw
} from 'lucide-react';

interface SystemStats {
  totalOrganizations: number;
  totalUsers: number;
  totalAppointments: number;
  activeOrganizations: number;
  organizationsTrend: number;
  usersTrend: number;
  appointmentsTrend: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

interface OrganizationOverview {
  id: string;
  name: string;
  slug: string;
  users_count: number;
  appointments_count: number;
  last_activity: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

interface SystemActivity {
  id: string;
  type: 'organization_created' | 'user_registered' | 'appointment_created' | 'system_event';
  description: string;
  organization_name?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
}

export default function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationOverview[]>([]);
  const [systemActivity, setSystemActivity] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'organizations' | 'system'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch system statistics
      const statsResponse = await fetch('/api/dashboard/superadmin/stats');
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch system stats');
      }
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch organizations overview
      const orgsResponse = await fetch('/api/dashboard/superadmin/organizations?limit=10');
      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json();
        setOrganizations(orgsData.data || []);
      }

      // Fetch system activity
      const activityResponse = await fetch('/api/dashboard/superadmin/activity?limit=10');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setSystemActivity(activityData.data || []);
      }

    } catch (err) {
      console.error('Error fetching SuperAdmin dashboard data:', err);
      setError('Error al cargar los datos del sistema');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'inactive':
        return 'Inactiva';
      case 'suspended':
        return 'Suspendida';
      default:
        return status;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'text-blue-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'organization_created':
        return <Building2 className="h-4 w-4 text-green-500" />;
      case 'user_registered':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'appointment_created':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'system_event':
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string): 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' => {
    switch (health) {
      case 'excellent':
        return 'green';
      case 'good':
        return 'blue';
      case 'warning':
        return 'yellow';
      case 'critical':
        return 'red';
      default:
        return 'blue'; // Changed from 'gray' to 'blue'
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const actions = (
    <>
      <button
        type="button"
        onClick={() => window.location.href = '/superadmin/organizations/new'}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nueva Organización
      </button>
      <button
        type="button"
        onClick={() => window.location.href = '/superadmin/system'}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Settings className="h-4 w-4 mr-2" />
        Sistema
      </button>
    </>
  );

  return (
    <DashboardLayout
      title="SuperAdmin Dashboard"
      subtitle="Gestión del sistema completo"
      actions={actions}
    >
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Reportes Avanzados
            </button>
            <button
              onClick={() => setActiveTab('organizations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'organizations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-4 w-4 inline mr-2" />
              Gestión de Organizaciones
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              Monitoreo del Sistema
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* System Statistics */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Estadísticas del Sistema</h2>
        <StatsGrid columns={4}>
          {loading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : stats ? (
            <>
              <StatsCard
                title="Organizaciones"
                value={stats.totalOrganizations}
                subtitle={`${stats.activeOrganizations} activas`}
                icon={Building2}
                color="blue"
                trend={{
                  value: stats.organizationsTrend,
                  label: "vs mes anterior",
                  direction: stats.organizationsTrend > 0 ? 'up' : stats.organizationsTrend < 0 ? 'down' : 'neutral'
                }}
                action={{
                  label: "Gestionar organizaciones",
                  onClick: () => window.location.href = '/superadmin/organizations'
                }}
              />
              <StatsCard
                title="Usuarios Totales"
                value={stats.totalUsers}
                subtitle="En todo el sistema"
                icon={Users}
                color="green"
                trend={{
                  value: stats.usersTrend,
                  label: "nuevos este mes",
                  direction: stats.usersTrend > 0 ? 'up' : 'neutral'
                }}
                action={{
                  label: "Ver usuarios",
                  onClick: () => window.location.href = '/superadmin/users'
                }}
              />
              <StatsCard
                title="Citas Totales"
                value={stats.totalAppointments}
                subtitle="Sistema completo"
                icon={Calendar}
                color="purple"
                trend={{
                  value: stats.appointmentsTrend,
                  label: "vs mes anterior",
                  direction: stats.appointmentsTrend > 0 ? 'up' : stats.appointmentsTrend < 0 ? 'down' : 'neutral'
                }}
                action={{
                  label: "Ver reportes",
                  onClick: () => window.location.href = '/superadmin/reports'
                }}
              />
              <StatsCard
                title="Estado del Sistema"
                value={stats.systemHealth.charAt(0).toUpperCase() + stats.systemHealth.slice(1)}
                subtitle="Salud general"
                icon={Shield}
                color={getHealthColor(stats.systemHealth)}
                action={{
                  label: "Ver detalles",
                  onClick: () => window.location.href = '/superadmin/health'
                }}
              />
            </>
          ) : null}
        </StatsGrid>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Organizations Overview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Organizaciones Recientes</h3>
            <button
              type="button"
              onClick={() => window.location.href = '/superadmin/organizations'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver todas
            </button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : organizations.length > 0 ? (
              <div className="space-y-4">
                {organizations.map((org) => (
                  <div key={org.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{org.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {org.users_count} usuarios • {org.appointments_count} citas
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Creada: {formatDate(org.created_at)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(org.status)}`}>
                        {getStatusLabel(org.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay organizaciones registradas</p>
            )}
          </div>
        </div>

        {/* System Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Actividad del Sistema</h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded animate-pulse w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : systemActivity.length > 0 ? (
              <div className="space-y-4">
                {systemActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString('es-ES')}
                        </p>
                        {activity.organization_name && (
                          <span className="ml-2 text-xs text-gray-400">
                            • {activity.organization_name}
                          </span>
                        )}
                        <span className={`ml-2 text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                          {activity.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <AdvancedReports />
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <OrganizationManagement />
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Monitoreo del Sistema en Tiempo Real
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">99.8%</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">45ms</div>
                <div className="text-sm text-gray-600">Latencia Promedio</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">1,247</div>
                <div className="text-sm text-gray-600">Requests/min</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Alertas del Sistema
            </h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <div className="font-medium text-yellow-800">Uso de memoria alto</div>
                  <div className="text-sm text-yellow-700">Servidor principal al 85% de capacidad</div>
                </div>
              </div>
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <div className="font-medium text-green-800">Backup completado</div>
                  <div className="text-sm text-green-700">Respaldo automático ejecutado exitosamente</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Estado de la Base de Datos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conexiones activas</span>
                  <span className="text-sm font-medium">23/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Uso de almacenamiento</span>
                  <span className="text-sm font-medium">67/100 GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
