'use client';

/**
 * SuperAdmin Advanced Analytics Dashboard
 * Comprehensive reporting and analytics for system-wide insights
 * Provides detailed metrics, trends, and performance indicators
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Filter,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalOrganizations: number;
    totalUsers: number;
    totalAppointments: number;
    totalRevenue: number;
    activeUsers: number;
    systemUptime: number;
  };
  trends: {
    userGrowth: number;
    appointmentGrowth: number;
    revenueGrowth: number;
    organizationGrowth: number;
  };
  organizationMetrics: OrganizationMetric[];
  appointmentMetrics: AppointmentMetric[];
  userMetrics: UserMetric[];
  systemHealth: SystemHealth;
}

interface OrganizationMetric {
  id: string;
  name: string;
  userCount: number;
  appointmentCount: number;
  revenue: number;
  subscriptionPlan: string;
  status: 'active' | 'inactive' | 'suspended';
  lastActivity: string;
}

interface AppointmentMetric {
  date: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
}

interface UserMetric {
  role: string;
  count: number;
  activeCount: number;
  growthRate: number;
}

interface SystemHealth {
  apiResponseTime: number;
  databaseConnections: number;
  errorRate: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export default function SuperAdminAnalyticsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Check permissions - only SuperAdmin
  useEffect(() => {
    if (profile && profile.role !== 'superadmin') {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile && profile.role === 'superadmin') {
      fetchAnalyticsData();
    }
  }, [profile, selectedTimeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/superadmin/analytics?timeRange=${selectedTimeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const result = await response.json();
      setAnalyticsData(result.data);
    } catch (err) {
      setError('Error al cargar datos de análisis. Por favor intenta de nuevo.');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch(`/api/superadmin/analytics/export?timeRange=${selectedTimeRange}`);
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-report-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al exportar reporte');
      console.error('Error exporting report:', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getHealthStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return { color: 'text-green-600', bg: 'bg-green-100', status: 'Excelente' };
    if (value <= thresholds.warning) return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'Advertencia' };
    return { color: 'text-red-600', bg: 'bg-red-100', status: 'Crítico' };
  };

  const actions = (
    <>
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filtros
      </button>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        Actualizar
      </button>
      <button
        type="button"
        onClick={handleExportReport}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </button>
    </>
  );

  if (!profile || profile.role !== 'superadmin') {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">Solo los SuperAdministradores pueden acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Analytics y Reportes Avanzados"
      subtitle={`Panel de Control SuperAdmin • Período: ${selectedTimeRange}`}
      actions={actions}
    >
      {/* Error Message */}
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

      {/* Time Range Filters */}
      {showFilters && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Tiempo</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '7d', label: 'Últimos 7 días' },
              { value: '30d', label: 'Últimos 30 días' },
              { value: '90d', label: 'Últimos 3 meses' },
              { value: '1y', label: 'Último año' }
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedTimeRange(option.value)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  selectedTimeRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white shadow rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded mb-4 w-1/4"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-20 bg-gray-300 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : analyticsData ? (
        <div className="space-y-6">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Organizaciones</dt>
                      <dd className="flex items-center">
                        <div className="text-lg font-medium text-gray-900">
                          {formatNumber(analyticsData.overview.totalOrganizations)}
                        </div>
                        <div className={`ml-2 flex items-center text-sm ${getTrendColor(analyticsData.trends.organizationGrowth)}`}>
                          {getTrendIcon(analyticsData.trends.organizationGrowth)}
                          <span className="ml-1">{formatPercentage(analyticsData.trends.organizationGrowth)}</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Usuarios Totales</dt>
                      <dd className="flex items-center">
                        <div className="text-lg font-medium text-gray-900">
                          {formatNumber(analyticsData.overview.totalUsers)}
                        </div>
                        <div className={`ml-2 flex items-center text-sm ${getTrendColor(analyticsData.trends.userGrowth)}`}>
                          {getTrendIcon(analyticsData.trends.userGrowth)}
                          <span className="ml-1">{formatPercentage(analyticsData.trends.userGrowth)}</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Citas Totales</dt>
                      <dd className="flex items-center">
                        <div className="text-lg font-medium text-gray-900">
                          {formatNumber(analyticsData.overview.totalAppointments)}
                        </div>
                        <div className={`ml-2 flex items-center text-sm ${getTrendColor(analyticsData.trends.appointmentGrowth)}`}>
                          {getTrendIcon(analyticsData.trends.appointmentGrowth)}
                          <span className="ml-1">{formatPercentage(analyticsData.trends.appointmentGrowth)}</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Ingresos Totales</dt>
                      <dd className="flex items-center">
                        <div className="text-lg font-medium text-gray-900">
                          {formatCurrency(analyticsData.overview.totalRevenue)}
                        </div>
                        <div className={`ml-2 flex items-center text-sm ${getTrendColor(analyticsData.trends.revenueGrowth)}`}>
                          {getTrendIcon(analyticsData.trends.revenueGrowth)}
                          <span className="ml-1">{formatPercentage(analyticsData.trends.revenueGrowth)}</span>
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Estado del Sistema
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    getHealthStatus(analyticsData.systemHealth.apiResponseTime, { good: 200, warning: 500 }).bg
                  } ${getHealthStatus(analyticsData.systemHealth.apiResponseTime, { good: 200, warning: 500 }).color}`}>
                    <Clock className="h-4 w-4 mr-1" />
                    API Response: {analyticsData.systemHealth.apiResponseTime}ms
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getHealthStatus(analyticsData.systemHealth.apiResponseTime, { good: 200, warning: 500 }).status}
                  </p>
                </div>

                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    getHealthStatus(analyticsData.systemHealth.errorRate, { good: 1, warning: 5 }).bg
                  } ${getHealthStatus(analyticsData.systemHealth.errorRate, { good: 1, warning: 5 }).color}`}>
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Error Rate: {analyticsData.systemHealth.errorRate}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getHealthStatus(analyticsData.systemHealth.errorRate, { good: 1, warning: 5 }).status}
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Uptime: {analyticsData.systemHealth.uptime}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Excelente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
          <p className="text-gray-600">No se pudieron cargar los datos de análisis.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
