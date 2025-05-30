'use client';

/**
 * AdminDashboard Component
 * Comprehensive dashboard for organization administrators
 * Shows overview, statistics, recent activity, and management tools
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from './DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from './StatsCard';
import AdminStaffChatBot from '@/components/ai/AdminStaffChatBot';
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Plus,
  Eye,
  Settings,
  BarChart3,
  MessageCircle
} from 'lucide-react';

interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  totalPatients: number;
  totalDoctors: number;
  appointmentsTrend: number;
  patientsTrend: number;
  pendingAppointments: number;
  completedAppointments: number;
}

interface RecentActivity {
  id: string;
  type: 'appointment_created' | 'appointment_cancelled' | 'user_registered' | 'schedule_updated';
  description: string;
  timestamp: string;
  user?: string;
}

interface UpcomingAppointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  service_name: string;
  appointment_date: string;
  start_time: string;
  status: string;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIChatBot, setShowAIChatBot] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      fetchDashboardData();
    }
  }, [organization?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard statistics
      const statsResponse = await fetch(`/api/dashboard/admin/stats?organizationId=${organization?.id}`);
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch recent activity
      console.log('🔍 ADMIN DASHBOARD DEBUG: Fetching recent activity');
      const activityResponse = await fetch(`/api/dashboard/admin/activity?organizationId=${organization?.id}&limit=10`);
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        console.log('🔍 ADMIN DASHBOARD DEBUG: Activity data received', {
          success: activityData.success,
          dataCount: activityData.data?.length || 0,
          firstActivity: activityData.data?.[0] || 'No activities',
          allActivities: activityData.data
        });
        setRecentActivity(activityData.data || []);
      } else {
        console.log('🔍 ADMIN DASHBOARD DEBUG: Activity fetch failed', {
          status: activityResponse.status,
          statusText: activityResponse.statusText
        });
      }

      // Fetch upcoming appointments
      console.log('🔍 ADMIN DASHBOARD DEBUG: Fetching upcoming appointments');
      const appointmentsResponse = await fetch(`/api/dashboard/admin/upcoming?organizationId=${organization?.id}&limit=5`);
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        console.log('🔍 ADMIN DASHBOARD DEBUG: Appointments data received', {
          success: appointmentsData.success,
          dataCount: appointmentsData.data?.length || 0,
          firstAppointment: appointmentsData.data?.[0] || 'No appointments',
          allAppointments: appointmentsData.data
        });
        setUpcomingAppointments(appointmentsData.data || []);
      } else {
        console.log('🔍 ADMIN DASHBOARD DEBUG: Appointments fetch failed', {
          status: appointmentsResponse.status,
          statusText: appointmentsResponse.statusText
        });
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const parts = timeString.split(':');
      const hours = parts[0] || '0';
      const minutes = parts[1] || '00';
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString; // Return original string if parsing fails
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'appointment_created':
        return <Calendar className="h-4 w-4 text-green-500" />;
      case 'appointment_cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'user_registered':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'schedule_updated':
        return <Clock className="h-4 w-4 text-purple-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const actions = (
    <>
      <button
        type="button"
        onClick={() => setShowAIChatBot(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Asistente IA
      </button>
      <button
        type="button"
        onClick={() => window.location.href = '/appointments/book'}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nueva Cita
      </button>
      <button
        type="button"
        onClick={() => window.location.href = '/settings'}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Settings className="h-4 w-4 mr-2" />
        Configuración
      </button>
    </>
  );

  return (
    <DashboardLayout
      title="Dashboard Administrativo"
      subtitle={`Gestión de ${organization?.name || 'Organización'}`}
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

      {/* Statistics Cards - Hierarchical Layout (FASE 2 MVP) */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Panel de Control Administrativo</h2>

        {/* Primary Metrics - Critical Information */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">Métricas Críticas</h3>
          <StatsGrid columns={2}>
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : stats ? (
              <>
                <StatsCard
                  title="Citas Hoy"
                  value={stats.todayAppointments}
                  subtitle="Requieren atención inmediata"
                  icon={Clock}
                  color="blue"
                  trend={stats.todayAppointments > 0 ? {
                    value: stats.todayAppointments,
                    label: "programadas hoy",
                    direction: 'up' as const
                  } : undefined}
                  action={{
                    label: "Gestionar agenda del día",
                    onClick: () => window.location.href = '/appointments?date=today'
                  }}
                />
                <StatsCard
                  title="Citas Totales"
                  value={stats.totalAppointments}
                  subtitle="Este mes"
                  icon={Calendar}
                  color="green"
                  trend={{
                    value: stats.appointmentsTrend,
                    label: "vs mes anterior",
                    direction: stats.appointmentsTrend > 0 ? 'up' : stats.appointmentsTrend < 0 ? 'down' : 'neutral'
                  }}
                  action={{
                    label: "Ver todas las citas",
                    onClick: () => window.location.href = '/appointments'
                  }}
                />
              </>
            ) : null}
          </StatsGrid>
        </div>

        {/* Secondary Metrics - Operational Information */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Información Operativa</h3>
          <StatsGrid columns={2}>
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : stats ? (
              <>
                <StatsCard
                  title="Pacientes Activos"
                  value={stats.totalPatients}
                  subtitle="Registrados en el sistema"
                  icon={Users}
                  color="purple"
                  trend={{
                    value: stats.patientsTrend,
                    label: "nuevos este mes",
                    direction: stats.patientsTrend > 0 ? 'up' : 'neutral'
                  }}
                  action={{
                    label: "Gestionar pacientes",
                    onClick: () => window.location.href = '/patients'
                  }}
                />
                <StatsCard
                  title="Equipo Médico"
                  value={stats.totalDoctors}
                  subtitle="Doctores activos"
                  icon={UserCheck}
                  color="indigo"
                  action={{
                    label: "Gestionar doctores",
                    onClick: () => window.location.href = '/users?role=doctor'
                  }}
                />
              </>
            ) : null}
          </StatsGrid>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
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
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Próximas Citas</h3>
            <button
              type="button"
              onClick={() => window.location.href = '/appointments'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver todas
            </button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.patient_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Dr. {appointment.doctor_name} • {appointment.service_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(appointment.appointment_date)} a las {formatTime(appointment.start_time)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay citas próximas</p>
            )}
          </div>
        </div>
      </div>

      {/* AI ChatBot for Admin - FASE 2 MVP */}
      {showAIChatBot && (
        <AdminStaffChatBot
          organizationId={organization?.id}
          userId={profile?.id}
          userRole="admin"
          onClose={() => setShowAIChatBot(false)}
        />
      )}
    </DashboardLayout>
  );
}
