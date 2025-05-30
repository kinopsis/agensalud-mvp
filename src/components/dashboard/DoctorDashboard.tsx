'use client';

/**
 * DoctorDashboard Component
 * Personal dashboard for doctors showing their schedule, appointments, and availability
 * Integrates with the AI booking system and schedule management
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from './DashboardLayout';
import StatsCard, { StatsGrid, StatsCardSkeleton } from './StatsCard';
import Calendar from '@/components/calendar/Calendar';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  Eye,
  User,
  CalendarDays,
  Grid3X3
} from 'lucide-react';

interface DoctorStats {
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  totalPatients: number;
  nextAppointment?: {
    patient_name: string;
    start_time: string;
    service_name: string;
  };
  availableHours: number;
}

interface TodayAppointment {
  id: string;
  patient_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
}

interface AvailabilitySlot {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [weekAvailability, setWeekAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (profile?.id && organization?.id) {
      fetchDashboardData();
    }
  }, [profile?.id, organization?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch doctor statistics
      const statsResponse = await fetch(`/api/dashboard/doctor/stats?doctorId=${profile?.id}&organizationId=${organization?.id}`);
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch doctor stats');
      }
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0];
      const appointmentsResponse = await fetch(`/api/appointments?doctorId=${profile?.id}&date=${today}`);
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        setTodayAppointments(appointmentsData.data || []);
      }

      // Fetch week availability
      const availabilityResponse = await fetch(`/api/doctors/availability?doctorId=${profile?.id}&days=7`);
      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        setWeekAvailability(availabilityData.data || []);
      }

    } catch (err) {
      console.error('Error fetching doctor dashboard data:', err);
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
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
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
      case 'in_progress':
        return 'En Progreso';
      default:
        return status;
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const actions = (
    <>
      {/* Calendar View Toggle */}
      <div className="flex items-center bg-white border border-gray-300 rounded-md">
        <button
          type="button"
          onClick={() => setCalendarView('week')}
          className={`px-3 py-2 text-sm font-medium rounded-l-md flex items-center ${
            calendarView === 'week'
              ? 'bg-blue-100 text-blue-700 border-blue-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Grid3X3 className="h-4 w-4 mr-1" />
          Semana
        </button>
        <button
          type="button"
          onClick={() => setCalendarView('month')}
          className={`px-3 py-2 text-sm font-medium rounded-r-md border-l border-gray-300 flex items-center ${
            calendarView === 'month'
              ? 'bg-blue-100 text-blue-700 border-blue-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          Mes
        </button>
      </div>

      <button
        type="button"
        onClick={() => window.location.href = '/doctor/schedule'}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Settings className="h-4 w-4 mr-2" />
        Configurar Horarios
      </button>
      <button
        type="button"
        onClick={() => window.location.href = '/appointments'}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Eye className="h-4 w-4 mr-2" />
        Ver Todas las Citas
      </button>
    </>
  );

  return (
    <DashboardLayout
      title={`Dashboard - Dr. ${profile?.first_name} ${profile?.last_name}`}
      subtitle={`Agenda personal • ${getCurrentTime()}`}
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
        <h2 className="text-lg font-medium text-gray-900 mb-4">Resumen de Actividad</h2>
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
                title="Citas Hoy"
                value={stats.todayAppointments}
                subtitle="Programadas para hoy"
                icon={CalendarIcon}
                color="blue"
                action={{
                  label: "Ver agenda del día",
                  onClick: () => window.location.href = '/appointments?date=today'
                }}
              />
              <StatsCard
                title="Esta Semana"
                value={stats.weekAppointments}
                subtitle="Citas programadas"
                icon={Clock}
                color="green"
                action={{
                  label: "Ver agenda semanal",
                  onClick: () => window.location.href = '/appointments?view=week'
                }}
              />
              <StatsCard
                title="Este Mes"
                value={stats.monthAppointments}
                subtitle="Total de citas"
                icon={CheckCircle}
                color="purple"
                action={{
                  label: "Ver estadísticas",
                  onClick: () => window.location.href = '/reports'
                }}
              />
              <StatsCard
                title="Pacientes"
                value={stats.totalPatients}
                subtitle="Atendidos este mes"
                icon={Users}
                color="indigo"
                action={{
                  label: "Ver pacientes",
                  onClick: () => window.location.href = '/patients'
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
              <h3 className="text-sm font-medium text-blue-800">Próxima Cita</h3>
              <p className="text-sm text-blue-700 mt-1">
                <strong>{stats.nextAppointment.patient_name}</strong> a las{' '}
                <strong>{formatTime(stats.nextAppointment.start_time)}</strong>
                {' '}• {stats.nextAppointment.service_name}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Citas de Hoy</h3>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </span>
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
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {appointment.patient_name}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{appointment.service_name}</p>
                      <p className="flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </p>
                      {appointment.notes && (
                        <p className="mt-2 text-xs text-gray-500 italic">
                          Notas: {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tienes citas programadas para hoy</p>
                <p className="text-sm text-gray-400 mt-1">¡Disfruta tu día libre!</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Availability Overview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Disponibilidad Semanal</h3>
            <button
              type="button"
              onClick={() => window.location.href = '/doctor/schedule'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              <Settings className="h-4 w-4 mr-1" />
              Configurar
            </button>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : weekAvailability.length > 0 ? (
              <div className="space-y-3">
                {weekAvailability.slice(0, 7).map((slot, index) => {
                  const date = new Date(slot.date);
                  const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                  const dayNumber = date.getDate();

                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 w-12">
                          {dayName}
                        </div>
                        <div className="text-sm text-gray-500 w-8">
                          {dayNumber}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {slot.is_available ? (
                          <div className="text-sm text-gray-600">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            No disponible
                          </div>
                        )}
                        <div className={`ml-3 h-2 w-2 rounded-full ${slot.is_available ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay horarios configurados</p>
                <button
                  type="button"
                  onClick={() => window.location.href = '/doctor/schedule'}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Configurar horarios
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Integrated Calendar View */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Vista de Calendario - {calendarView === 'week' ? 'Semanal' : 'Mensual'}
            </h3>
            <button
              type="button"
              onClick={() => window.location.href = '/calendar'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              Vista Completa
            </button>
          </div>
          <div className="p-6">
            <Calendar
              view={calendarView}
              selectedDate={new Date()}
              onDateSelect={(date) => {
                // Navigate to appointments page with selected date
                const dateStr = date.toISOString().split('T')[0];
                window.location.href = `/appointments?date=${dateStr}`;
              }}
              onAppointmentSelect={(appointment) => {
                // Navigate to appointment details or edit
                window.location.href = `/appointments?id=${appointment.id}`;
              }}
              doctorId={profile?.id}
              showAvailability={true}
              allowBooking={false}
              className="min-h-[400px]"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
