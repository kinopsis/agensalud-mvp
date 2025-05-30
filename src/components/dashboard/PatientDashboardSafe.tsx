'use client';

/**
 * PatientDashboardSafe Component
 * Safe version of PatientDashboard without AI dependencies
 * Personal dashboard for patients showing their appointments and history
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from './DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from './StatsCard';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Plus,
  MessageCircle,
  History,
  Eye
} from 'lucide-react';

interface PatientStats {
  upcomingAppointments: number;
  totalAppointments: number;
  completedAppointments: number;
  nextAppointmentDate?: string;
}

interface PatientAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  doctor_name: string;
  service_name: string;
  location_name?: string;
  notes?: string;
}

export default function PatientDashboardSafe() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<PatientAppointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id && organization?.id) {
      fetchDashboardData();
    }
  }, [profile?.id, organization?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch patient statistics
      const statsResponse = await fetch(`/api/dashboard/patient/stats?patientId=${profile?.id}&organizationId=${organization?.id}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Fetch upcoming appointments
      const upcomingResponse = await fetch(`/api/appointments?patientId=${profile?.id}&status=scheduled&limit=5`);
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        setUpcomingAppointments(upcomingData.data || []);
      }

      // Fetch recent appointments
      const recentResponse = await fetch(`/api/appointments?patientId=${profile?.id}&status=completed&limit=5`);
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentAppointments(recentData.data || []);
      }

    } catch (err) {
      console.error('Error fetching patient dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeString;
    }
  };

  const actions = (
    <>
      <button
        type="button"
        onClick={() => window.location.href = '/appointments/book'}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agendar Cita
      </button>
      <button
        type="button"
        onClick={() => window.location.href = '/appointments'}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Calendar className="h-4 w-4 mr-2" />
        Ver Todas
      </button>
    </>
  );

  return (
    <>
      <DashboardLayout
        title="Mi Dashboard"
        subtitle={`Bienvenido, ${profile?.first_name} ${profile?.last_name}`}
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

        {/* Statistics Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Resumen de Citas</h2>
          <StatsGrid columns={3}>
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : stats ? (
              <>
                <StatsCard
                  title="Próximas Citas"
                  value={stats.upcomingAppointments}
                  subtitle="Programadas"
                  icon={Calendar}
                  color="blue"
                  action={{
                    label: "Ver todas",
                    onClick: () => window.location.href = '/appointments'
                  }}
                />
                <StatsCard
                  title="Total de Citas"
                  value={stats.totalAppointments}
                  subtitle="Historial completo"
                  icon={CheckCircle}
                  color="green"
                  action={{
                    label: "Ver historial",
                    onClick: () => window.location.href = '/appointments?view=history'
                  }}
                />
                <StatsCard
                  title="Completadas"
                  value={stats.completedAppointments}
                  subtitle="Consultas finalizadas"
                  icon={User}
                  color="purple"
                />
              </>
            ) : null}
          </StatsGrid>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Próximas Citas</h3>
              <button
                type="button"
                onClick={() => window.location.href = '/appointments/book'}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agendar
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
                          <Clock className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            Dr. {appointment.doctor_name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.location.href = `/appointments/${appointment.id}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
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
                    onClick={() => window.location.href = '/appointments/book'}
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

        {/* Quick Actions */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => window.location.href = '/appointments/book'}
              className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium">Agendar Cita</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/appointments'}
              className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium">Ver Citas</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/profile'}
              className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <User className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium">Mi Perfil</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.href = '/settings'}
              className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="h-5 w-5 text-orange-600 mr-2" />
              <span className="text-sm font-medium">Contacto</span>
            </button>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
