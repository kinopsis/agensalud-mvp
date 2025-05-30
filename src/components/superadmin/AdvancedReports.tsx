'use client';

/**
 * AdvancedReports Component
 * Advanced reporting and analytics for SuperAdmin dashboard
 * 
 * @description Comprehensive reporting with charts, metrics, and data export
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  PieChart,
  Activity,
  Users,
  Building2,
  AlertCircle
} from 'lucide-react';

interface ReportMetrics {
  overview: {
    totalUsers: number;
    totalOrganizations: number;
    totalAppointments: number;
    systemUptime: number;
    activeUsers24h: number;
    newUsersThisMonth: number;
  };
  trends: {
    userGrowth: Array<{ date: string; value: number }>;
    appointmentVolume: Array<{ date: string; value: number }>;
    organizationGrowth: Array<{ date: string; value: number }>;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
    availability: number;
  };
  usage: {
    topOrganizations: Array<{ name: string; users: number; appointments: number }>;
    roleDistribution: Array<{ role: string; count: number; percentage: number }>;
    featureUsage: Array<{ feature: string; usage: number; trend: number }>;
  };
}

interface AdvancedReportsProps {
  className?: string;
}

/**
 * AdvancedReports Component
 * 
 * @param className - Additional CSS classes
 */
export default function AdvancedReports({ className = '' }: AdvancedReportsProps) {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch report metrics from API
   */
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/superadmin/reports/metrics?dateRange=${dateRange}&metric=${selectedMetric}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Error loading metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle data refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
  };

  /**
   * Handle data export
   */
  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/superadmin/reports/export?format=${format}&dateRange=${dateRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superadmin-report-${dateRange}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Error al exportar datos');
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [dateRange, selectedMetric]);

  if (loading && !metrics) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Reportes Avanzados
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <Download className="h-4 w-4 mr-1" />
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-800"
            >
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
          </div>

          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-400 mr-2" />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Todas las métricas</option>
              <option value="users">Usuarios</option>
              <option value="organizations">Organizaciones</option>
              <option value="appointments">Citas</option>
              <option value="performance">Rendimiento</option>
            </select>
          </div>
        </div>
      </div>

      {metrics && (
        <>
          {/* Overview Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen General</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.overview.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Usuarios Totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.overview.totalOrganizations.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Organizaciones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.overview.totalAppointments.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Citas Totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{metrics.overview.systemUptime}%</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{metrics.overview.activeUsers24h.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Activos 24h</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">{metrics.overview.newUsersThisMonth.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Nuevos este mes</div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Métricas de Rendimiento
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{metrics.performance.avgResponseTime}ms</div>
                <div className="text-sm text-gray-600">Tiempo de Respuesta</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{metrics.performance.errorRate}%</div>
                <div className="text-sm text-gray-600">Tasa de Error</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{metrics.performance.throughput}</div>
                <div className="text-sm text-gray-600">Throughput/min</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{metrics.performance.availability}%</div>
                <div className="text-sm text-gray-600">Disponibilidad</div>
              </div>
            </div>
          </div>

          {/* Top Organizations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Organizaciones Principales
            </h3>
            <div className="space-y-3">
              {metrics.usage.topOrganizations.map((org, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{org.name}</div>
                      <div className="text-sm text-gray-600">{org.users} usuarios • {org.appointments} citas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{((org.users / metrics.overview.totalUsers) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">del total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Role Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Distribución de Roles
            </h3>
            <div className="space-y-3">
              {metrics.usage.roleDistribution.map((role, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                    <span className="font-medium text-gray-900 capitalize">{role.role}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">{role.count.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">({role.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
