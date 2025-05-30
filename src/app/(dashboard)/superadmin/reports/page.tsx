'use client';

/**
 * SuperAdmin Reports Page
 * System analytics and reporting for SuperAdmin users
 * Provides comprehensive system insights and performance metrics
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  Users,
  Building2,
  Activity,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  RefreshCw,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react';

interface SystemMetrics {
  overview: {
    totalUsers: number;
    totalOrganizations: number;
    totalAppointments: number;
    systemUptime: number;
    activeUsers24h: number;
    newUsersThisMonth: number;
  };
  trends: {
    userGrowth: { period: string; value: number; change: number }[];
    appointmentVolume: { period: string; value: number; change: number }[];
    organizationGrowth: { period: string; value: number; change: number }[];
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    peakConcurrentUsers: number;
  };
  usage: {
    topOrganizations: { name: string; users: number; appointments: number }[];
    roleDistribution: { role: string; count: number; percentage: number }[];
    featureUsage: { feature: string; usage: number; trend: number }[];
  };
}

interface ReportFilters {
  dateRange: string;
  organization: string;
  metric: string;
}

export default function SuperAdminReportsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: '30d',
    organization: '',
    metric: 'all'
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Check SuperAdmin permissions
  useEffect(() => {
    if (profile && profile.role && profile.role !== 'superadmin') {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      fetchMetrics();
    }
  }, [profile, filters]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('dateRange', filters.dateRange);
      if (filters.organization) params.append('organizationId', filters.organization);
      if (filters.metric) params.append('metric', filters.metric);

      const response = await fetch(`/api/superadmin/reports/metrics?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const result = await response.json();
      setMetrics(result.data);
    } catch (err) {
      setError('Error al cargar métricas. Por favor intenta de nuevo.');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  const handleExportReport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('dateRange', filters.dateRange);
      if (filters.organization) params.append('organizationId', filters.organization);

      const response = await fetch(`/api/superadmin/reports/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Error al exportar reporte. Por favor intenta de nuevo.');
      console.error('Error exporting report:', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const tabs = [
    { id: 'overview', name: 'Resumen', icon: BarChart3 },
    { id: 'trends', name: 'Tendencias', icon: TrendingUp },
    { id: 'performance', name: 'Rendimiento', icon: Activity },
    { id: 'usage', name: 'Uso', icon: PieChart }
  ];

  const actions = (
    <>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        Actualizar
      </button>
      <div className="relative">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          onClick={() => handleExportReport('pdf')}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </button>
      </div>
    </>
  );

  if (!profile || !profile.role || profile.role !== 'superadmin') {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">Solo los SuperAdmins pueden acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Reportes del Sistema"
      subtitle="Análisis y métricas del sistema completo"
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

      {/* Filters */}
      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Reporte</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
              <option value="all">Todo el tiempo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Métrica</label>
            <select
              value={filters.metric}
              onChange={(e) => setFilters({ ...filters, metric: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Todas las métricas</option>
              <option value="users">Usuarios</option>
              <option value="appointments">Citas</option>
              <option value="organizations">Organizaciones</option>
              <option value="performance">Rendimiento</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exportar como</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleExportReport('pdf')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleExportReport('csv')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => handleExportReport('excel')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
              >
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando métricas...</p>
            </div>
          ) : !metrics ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
              <p className="text-gray-600">No se pudieron cargar las métricas del sistema.</p>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">Total Usuarios</p>
                          <p className="text-2xl font-bold text-blue-900">{formatNumber(metrics.overview.totalUsers)}</p>
                          <p className="text-sm text-blue-700">+{metrics.overview.newUsersThisMonth} este mes</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Building2 className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-green-600">Organizaciones</p>
                          <p className="text-2xl font-bold text-green-900">{formatNumber(metrics.overview.totalOrganizations)}</p>
                          <p className="text-sm text-green-700">Activas en el sistema</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-purple-600">Total Citas</p>
                          <p className="text-2xl font-bold text-purple-900">{formatNumber(metrics.overview.totalAppointments)}</p>
                          <p className="text-sm text-purple-700">Procesadas en total</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Actividad Reciente</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Usuarios activos (24h)</span>
                          <span className="text-sm font-medium text-gray-900">{metrics.overview.activeUsers24h}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Tiempo de actividad</span>
                          <span className="text-sm font-medium text-green-600">{metrics.overview.systemUptime}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Estado del Sistema</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm text-gray-600">Todos los servicios operativos</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm text-gray-600">Base de datos saludable</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm text-gray-600">API funcionando correctamente</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Crecimiento de Usuarios</h4>
                      <div className="space-y-3">
                        {metrics.trends.userGrowth.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.period}</span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-2">{formatNumber(item.value)}</span>
                              {getTrendIcon(item.change)}
                              <span className={`text-xs ml-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(item.change)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Volumen de Citas</h4>
                      <div className="space-y-3">
                        {metrics.trends.appointmentVolume.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.period}</span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-2">{formatNumber(item.value)}</span>
                              {getTrendIcon(item.change)}
                              <span className={`text-xs ml-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(item.change)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Nuevas Organizaciones</h4>
                      <div className="space-y-3">
                        {metrics.trends.organizationGrowth.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.period}</span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-2">{formatNumber(item.value)}</span>
                              {getTrendIcon(item.change)}
                              <span className={`text-xs ml-1 ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(item.change)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg text-center">
                      <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-600">Tiempo de Respuesta</p>
                      <p className="text-2xl font-bold text-blue-900">{metrics.performance.averageResponseTime}ms</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-lg text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-600">Tiempo de Actividad</p>
                      <p className="text-2xl font-bold text-green-900">{metrics.performance.uptime}%</p>
                    </div>
                    <div className="bg-red-50 p-6 rounded-lg text-center">
                      <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-red-600">Tasa de Error</p>
                      <p className="text-2xl font-bold text-red-900">{metrics.performance.errorRate}%</p>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-lg text-center">
                      <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-purple-600">Usuarios Pico</p>
                      <p className="text-2xl font-bold text-purple-900">{metrics.performance.peakConcurrentUsers}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Tab */}
              {activeTab === 'usage' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Top Organizaciones</h4>
                      <div className="space-y-3">
                        {metrics.usage.topOrganizations.map((org, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{org.name}</p>
                              <p className="text-xs text-gray-500">{org.users} usuarios • {org.appointments} citas</p>
                            </div>
                            <span className="text-sm text-gray-600">#{index + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Distribución de Roles</h4>
                      <div className="space-y-3">
                        {metrics.usage.roleDistribution.map((role, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">{role.role}</span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-2">{role.count}</span>
                              <span className="text-xs text-gray-500">({role.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
