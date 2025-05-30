'use client';

/**
 * PatientDashboard Component
 * Personal dashboard for patients showing their appointments, history, and AI booking
 * Integrates with the AI ChatBot for easy appointment booking
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useNotificationHelpers } from '@/components/ui/NotificationSystem';
import { ErrorAlert, NetworkError } from '@/components/ui/ErrorStates';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import DashboardLayout from './DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from './StatsCard';
import ChatBotLazy from '@/components/ai/ChatBotLazy';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Plus,
  MessageCircle,
  History,
  Eye,
  RefreshCw
} from 'lucide-react';

interface PatientStats {
  upcomingAppointments: number;
  totalAppointments: number;
  lastAppointment?: {
    doctor_name: string;
    service_name: string;
    appointment_date: string;
  };
  nextAppointment?: {
    doctor_name: string;
    service_name: string;
    appointment_date: string;
    start_time: string;
  };
}

interface PatientAppointment {
  id: string;
  doctor_name: string;
  service_name: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  location_name?: string;
}

export default function PatientDashboard() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const { showSuccess, showError, showNetworkError, showAppointmentSuccess } = useNotificationHelpers();
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<PatientAppointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChatBot, setShowChatBot] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);

  useEffect(() => {
    if (profile?.id && organization?.id) {
      fetchDashboardData();
    }
  }, [profile?.id, organization?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsNetworkError(false);

      // Fetch patient statistics
      console.log('🔍 PATIENT DASHBOARD DEBUG: Fetching patient stats');
      const statsResponse = await fetch(`/api/dashboard/patient/stats?patientId=${profile?.id}&organizationId=${organization?.id}`);
      if (!statsResponse.ok) {
        console.log('🔍 PATIENT DASHBOARD DEBUG: Stats fetch failed', {
          status: statsResponse.status,
          statusText: statsResponse.statusText
        });
        if (statsResponse.status >= 500) {
          throw new Error('SERVER_ERROR');
        } else if (statsResponse.status === 404) {
          throw new Error('STATS_NOT_FOUND');
        } else {
          throw new Error('FETCH_STATS_FAILED');
        }
      }
      const statsData = await statsResponse.json();
      console.log('🔍 PATIENT DASHBOARD DEBUG: Stats data received', {
        success: statsData.success,
        hasData: !!statsData.data,
        stats: statsData.data
      });
      setStats(statsData.data);

      // Fetch upcoming appointments
      const upcomingResponse = await fetch(`/api/appointments?patientId=${profile?.id}&status=upcoming&limit=5`);
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        setUpcomingAppointments(upcomingData.data || []);
      } else {
        console.warn('Failed to fetch upcoming appointments');
      }

      // Fetch recent appointments
      const recentResponse = await fetch(`/api/appointments?patientId=${profile?.id}&status=completed&limit=5`);
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentAppointments(recentData.data || []);
      } else {
        console.warn('Failed to fetch recent appointments');
      }

      // Show success notification on first load
      if (stats === null) {
        showSuccess('Dashboard cargado', 'Información actualizada correctamente');
      }

    } catch (err) {
      console.error('Error fetching patient dashboard data:', err);

      const errorMessage = err instanceof Error ? err.message : 'UNKNOWN_ERROR';

      if (errorMessage === 'Failed to fetch' || errorMessage.includes('NetworkError')) {
        setIsNetworkError(true);
        showNetworkError();
      } else if (errorMessage === 'SERVER_ERROR') {
        setError('Error del servidor. Intenta nuevamente en unos minutos.');
        showError('Error del servidor', 'Hay un problema temporal con nuestros servicios');
      } else if (errorMessage === 'STATS_NOT_FOUND') {
        setError('No se encontraron datos para tu perfil.');
        showError('Datos no encontrados', 'No se encontró información para tu perfil');
      } else {
        setError('Error al cargar los datos del dashboard');
        showError('Error de carga', 'No se pudieron cargar los datos del dashboard');
      }
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const isUpcoming = (dateString: string) => {
    const appointmentDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointmentDate >= today;
  };

  const handleAIBooking = () => {
    setShowChatBot(true);
    showSuccess('Asistente IA activado', 'Puedes comenzar a describir tu necesidad médica');
  };

  const handleManualBooking = () => {
    window.location.href = '/appointments/book';
  };

  const handleRefreshData = async () => {
    await fetchDashboardData();
  };

  const actions = (
    <>
      <button
        type="button"
        onClick={handleRefreshData}
        disabled={loading}
        className="
          bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium
          flex items-center disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200 touch-manipulation
        "
        aria-label="Actualizar datos del dashboard"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Actualizar
      </button>
      <button
        type="button"
        onClick={handleAIBooking}
        className="
          bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium
          flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200 touch-manipulation
        "
        aria-label="Abrir asistente de IA para agendar cita"
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Agendar con IA
      </button>
      <button
        type="button"
        onClick={handleManualBooking}
        className="
          bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium
          flex items-center focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
          transition-colors duration-200 touch-manipulation
        "
        aria-label="Ir a formulario de agendamiento manual"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agendar Manual
      </button>
    </>
  );

  return (
    <>
      <DashboardLayout
        title={`Bienvenido, ${profile?.first_name}`}
        subtitle="Tu portal de salud personal"
        actions={actions}
      >
        {/* Error States */}
        {isNetworkError ? (
          <div className="mb-6">
            <NetworkError
              onRetry={fetchDashboardData}
            />
          </div>
        ) : error ? (
          <div className="mb-6">
            <ErrorAlert
              title="Error al cargar dashboard"
              message={error}
              onRetry={fetchDashboardData}
              onDismiss={() => setError(null)}
            />
          </div>
        ) : null}

        {/* Statistics Cards - Optimized for Patient Focus (FASE 2 MVP) */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tu Estado de Citas</h2>
          <StatsGrid columns={2}>
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : stats ? (
              <>
                {/* Primary Card: Most Critical Information */}
                <StatsCard
                  title="Próximas Citas"
                  value={stats.upcomingAppointments}
                  subtitle={stats.upcomingAppointments === 0 ? "No tienes citas programadas" : "Citas programadas"}
                  icon={Calendar}
                  color="blue"
                  trend={stats.upcomingAppointments > 0 ? {
                    value: stats.upcomingAppointments,
                    label: "próximas",
                    direction: 'up' as const
                  } : undefined}
                  action={{
                    label: stats.upcomingAppointments > 0 ? "Ver próximas" : "Agendar cita",
                    onClick: () => window.location.href = stats.upcomingAppointments > 0 ? '/appointments' : '/appointments/book'
                  }}
                />

                {/* Secondary Card: Combined Historical Information */}
                <StatsCard
                  title="Historial Médico"
                  value={stats.totalAppointments}
                  subtitle={`Total de consultas${stats.lastAppointment ? ` • Última: ${formatShortDate(stats.lastAppointment.appointment_date)}` : ''}`}
                  icon={CheckCircle}
                  color="green"
                  trend={stats.totalAppointments > 0 ? {
                    value: stats.totalAppointments,
                    label: "consultas realizadas",
                    direction: 'neutral' as const
                  } : undefined}
                  action={{
                    label: "Ver historial completo",
                    onClick: () => window.location.href = '/appointments?view=history'
                  }}
                />
              </>
            ) : null}
          </StatsGrid>
        </div>

        {/* Next Appointment Alert */}
        {stats?.nextAppointment && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <Clock className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Tu Próxima Cita</h3>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>{formatDate(stats.nextAppointment.appointment_date)}</strong> a las{' '}
                  <strong>{formatTime(stats.nextAppointment.start_time)}</strong>
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Dr. {stats.nextAppointment.doctor_name} • {stats.nextAppointment.service_name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Booking Suggestion */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Agenda con Inteligencia Artificial</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Simplemente dinos qué necesitas y nuestro asistente IA te ayudará a encontrar el mejor horario
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowChatBot(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium flex items-center"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Probar Ahora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            Dr. {appointment.doctor_name}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="font-medium">{appointment.service_name}</p>
                        <p className="flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatShortDate(appointment.appointment_date)}
                        </p>
                        <p className="flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </p>
                        {appointment.location_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            📍 {appointment.location_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tienes citas próximas</p>
                  <button
                    type="button"
                    onClick={() => setShowChatBot(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Agendar una cita
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Appointments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Historial Reciente</h3>
              <button
                type="button"
                onClick={() => window.location.href = '/appointments?view=history'}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <History className="h-4 w-4 mr-1" />
                Ver historial
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
              ) : recentAppointments.length > 0 ? (
                <div className="space-y-4">
                  {recentAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            Dr. {appointment.doctor_name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatShortDate(appointment.appointment_date)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>{appointment.service_name}</p>
                        {appointment.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tienes historial de citas</p>
                  <p className="text-sm text-gray-400 mt-1">Tus consultas completadas aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* AI ChatBot */}
      {showChatBot && (
        <ChatBotLazy
          organizationId={organization?.id}
          userId={profile?.id}
          className="z-50"
        />
      )}
    </>
  );
}
