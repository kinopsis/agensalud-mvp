'use client';

/**
 * AdminDashboard Component
 * Comprehensive dashboard for organization administrators
 * Shows overview, statistics, recent activity, and management tools
 *
 * ENHANCED VERSION - Fase 1B Migration
 * - Migrated to use AdminDashboardCard components
 * - Enhanced operational view with financial and bulk management
 * - Maintains full backward compatibility with existing APIs
 * - Added support for bulk operations and financial tracking
 *
 * @version 2.0.0 - Enhanced with new appointment card components
 * @date 2025-01-28
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from './DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from './StatsCard';
import {
  useIsClient,
  useClientDate,
  useHydrationSafeNavigation,
  HydrationSafe
} from '@/utils/hydration-safe';
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

// Import types separately to avoid circular dependencies
import type { AppointmentData } from '@/components/appointments/AppointmentCard';

// Simplified import to prevent webpack module loading issues
let AdminStaffChatBot: any = null;
let AdminDashboardCard: any = null;

// Simple fallback components
const ChatBotFallback = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6">
      <p className="text-gray-600">Cargando Asistente IA...</p>
    </div>
  </div>
);

const AdminAppointmentCardFallback = ({ appointment }: { appointment: any }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white">
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-medium text-gray-900">
        {appointment.service?.[0]?.name || 'Consulta médica'}
      </h4>
      <span className="text-sm text-gray-500">
        {appointment.appointment_date}
      </span>
    </div>
    <p className="text-sm text-gray-600 mb-2">
      Paciente: {appointment.patient?.[0]?.profiles?.[0]?.first_name || 'Paciente'} {appointment.patient?.[0]?.profiles?.[0]?.last_name || ''}
    </p>
    <p className="text-sm text-gray-600 mb-2">
      Dr. {appointment.doctor?.[0]?.profiles?.[0]?.first_name || 'Doctor'} {appointment.doctor?.[0]?.profiles?.[0]?.last_name || ''}
    </p>
    <p className="text-sm text-gray-500">
      {appointment.start_time}
    </p>
  </div>
);

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
  const [componentsLoaded, setComponentsLoaded] = useState(false);

  // Hydration-safe hooks
  const isClient = useIsClient();
  const currentDate = useClientDate();
  const { navigateTo } = useHydrationSafeNavigation();

  // Load components dynamically
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [chatBotModule, cardModule] = await Promise.all([
          import('@/components/ai/AdminStaffChatBot'),
          import('@/components/appointments/cards/AdminAppointmentCard')
        ]);

        AdminStaffChatBot = chatBotModule.default;
        AdminDashboardCard = cardModule.AdminDashboardCard;
        setComponentsLoaded(true);
      } catch (error) {
        console.error('Failed to load admin dashboard components:', error);
        // Keep components as null, will use fallbacks
      }
    };

    loadComponents();
  }, []);

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
    if (!isClient || !currentDate) {
      return dateString; // Return raw string during SSR
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dateString; // Return original string if parsing fails
    }
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

  /**
   * Transform UpcomingAppointment to AppointmentData format for new components
   */
  const transformToAppointmentData = (appointment: UpcomingAppointment): AppointmentData => {
    return {
      id: appointment.id,
      appointment_date: appointment.appointment_date,
      start_time: appointment.start_time,
      duration_minutes: 30, // Default duration
      status: appointment.status,
      reason: null,
      notes: null,
      doctor: [{
        id: 'doctor-id',
        specialization: undefined,
        profiles: [{
          first_name: appointment.doctor_name.split(' ')[1] || appointment.doctor_name,
          last_name: appointment.doctor_name.split(' ')[2] || ''
        }]
      }],
      patient: [{
        id: 'patient-id',
        first_name: appointment.patient_name.split(' ')[0] || appointment.patient_name,
        last_name: appointment.patient_name.split(' ').slice(1).join(' ') || ''
      }],
      location: null,
      service: [{
        id: 'service-id',
        name: appointment.service_name,
        duration_minutes: 30,
        price: null
      }]
    };
  };

  /**
   * Enhanced administrative action handlers for new components
   */
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    console.log('🏢 Admin Dashboard: Changing appointment status', { appointmentId, newStatus });
    // TODO: Implement admin status change API call
    setUpcomingAppointments(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? { ...apt, status: newStatus }
          : apt
      )
    );
  };

  const handleBulkSelection = (appointmentId: string, selected: boolean) => {
    console.log('📋 Admin Dashboard: Bulk selection', { appointmentId, selected });
    setSelectedAppointments(prev =>
      selected
        ? [...prev, appointmentId]
        : prev.filter(id => id !== appointmentId)
    );
  };

  const handleViewAppointmentDetails = (appointmentId: string) => {
    console.log('👁️ Admin Dashboard: Viewing appointment details', appointmentId);
    navigateTo(`/appointments/${appointmentId}`);
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
        onClick={() => navigateTo('/appointments/book')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nueva Cita
      </button>
      <button
        type="button"
        onClick={() => navigateTo('/settings')}
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
                    onClick: () => navigateTo('/appointments?date=today')
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
                    onClick: () => navigateTo('/appointments')
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
                    onClick: () => navigateTo('/patients')
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
                    onClick: () => navigateTo('/users?role=doctor')
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
                        {isClient && currentDate
                          ? new Date(activity.timestamp).toLocaleString('es-ES')
                          : activity.timestamp
                        }
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

        {/* Upcoming Appointments - Enhanced with AdminDashboardCard */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Próximas Citas</h3>
            <div className="flex items-center space-x-2">
              {selectedAppointments.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedAppointments.length} seleccionadas
                </span>
              )}
              <button
                type="button"
                onClick={() => navigateTo('/appointments')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver todas
              </button>
            </div>
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
                {upcomingAppointments.map((appointment) => {
                  const appointmentData = transformToAppointmentData(appointment);

                  // Use enhanced component if loaded, otherwise use fallback
                  if (AdminDashboardCard && componentsLoaded) {
                    return (
                      <AdminDashboardCard
                        key={appointment.id}
                        appointment={appointmentData}
                        onStatusChange={handleStatusChange}
                        onSelectionChange={handleBulkSelection}
                        onViewDetails={handleViewAppointmentDetails}
                        isSelected={selectedAppointments.includes(appointment.id)}
                        showOperationalPriority={true}
                        showFinancialInfo={true}
                        enableBulkSelection={true}
                        canChangeStatus={true}
                        canViewDetails={true}
                        showPatient={true}
                        showDoctor={true}
                        showLocation={false}
                        variant="default"
                        className="transition-all duration-200 hover:shadow-md border-l-4 border-l-purple-500"
                      />
                    );
                  } else {
                    return (
                      <AdminAppointmentCardFallback
                        key={appointment.id}
                        appointment={appointmentData}
                      />
                    );
                  }
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay citas próximas</p>
            )}
          </div>
        </div>
      </div>

      {/* AI ChatBot for Admin - FASE 2 MVP */}
      {showAIChatBot && (
        AdminStaffChatBot && componentsLoaded ? (
          <AdminStaffChatBot
            organizationId={organization?.id}
            userId={profile?.id}
            userRole="admin"
            onClose={() => setShowAIChatBot(false)}
          />
        ) : (
          <ChatBotFallback />
        )
      )}
    </DashboardLayout>
  );
}
