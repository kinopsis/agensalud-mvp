'use client';

/**
 * StaffDashboard Component
 * Dashboard for staff members to manage appointments, patients, and daily operations
 * Provides tools for appointment management and patient coordination
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
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Phone,
  UserPlus,
  UserCheck,
  ClipboardList,
  MessageCircle
} from 'lucide-react';

interface StaffStats {
  todayAppointments: number;
  pendingAppointments: number;
  totalPatients: number;
  totalDoctors: number;
  availableDoctors: number;
  completedToday: number;
  upcomingToday: number;
}

interface TodayAppointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  patient_phone?: string;
  notes?: string;
}

interface PendingTask {
  id: string;
  type: 'confirmation' | 'reminder' | 'follow_up' | 'reschedule';
  description: string;
  patient_name: string;
  appointment_id?: string;
  priority: 'high' | 'medium' | 'low';
  due_time?: string;
}

export default function StaffDashboard() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
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

      // Fetch staff statistics
      const statsResponse = await fetch(`/api/dashboard/staff/stats?organizationId=${organization?.id}`);
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch staff stats');
      }
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0];
      const appointmentsResponse = await fetch(`/api/appointments?organizationId=${organization?.id}&date=${today}&limit=10`);
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        setTodayAppointments(appointmentsData.data || []);
      }

      // Fetch pending tasks
      const tasksResponse = await fetch(`/api/dashboard/staff/tasks?organizationId=${organization?.id}&limit=10`);
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setPendingTasks(tasksData.data || []);
      }

    } catch (err) {
      console.error('Error fetching staff dashboard data:', err);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'confirmation':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'reminder':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'follow_up':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'reschedule':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      default:
        return <ClipboardList className="h-4 w-4 text-gray-500" />;
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
        onClick={() => window.location.href = '/patients/register'}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Nuevo Paciente
      </button>
    </>
  );

  return (
    <DashboardLayout
      title={`Dashboard Staff - ${profile?.first_name}`}
      subtitle={`Gestión operativa • ${getCurrentTime()}`}
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

      {/* Quick Actions - Staff Shortcuts (FASE 2 MVP) */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            type="button"
            onClick={() => window.location.href = '/appointments/book'}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-colors"
          >
            <Plus className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Nueva Cita</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/appointments?status=pending'}
            className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg text-center transition-colors"
          >
            <Clock className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Confirmar Citas</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/patients'}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-colors"
          >
            <UserPlus className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Nuevo Paciente</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/appointments?date=today'}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-colors"
          >
            <ClipboardList className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Agenda Hoy</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards - Optimized for Staff Operations */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Estado Operativo</h2>
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
                title="Citas Pendientes"
                value={stats.pendingAppointments}
                subtitle="Requieren confirmación urgente"
                icon={AlertCircle}
                color="yellow"
                trend={stats.pendingAppointments > 0 ? {
                  value: stats.pendingAppointments,
                  label: "pendientes",
                  direction: 'up' as const
                } : undefined}
                action={{
                  label: "Gestionar ahora",
                  onClick: () => window.location.href = '/appointments?status=pending'
                }}
              />
              <StatsCard
                title="Citas de Hoy"
                value={stats.todayAppointments}
                subtitle="Total programadas para hoy"
                icon={Calendar}
                color="blue"
                action={{
                  label: "Ver agenda completa",
                  onClick: () => window.location.href = '/appointments?date=today'
                }}
              />
              <StatsCard
                title="Doctores Disponibles"
                value={stats.availableDoctors}
                subtitle={`De ${stats.totalDoctors} doctores totales`}
                icon={UserCheck}
                color="green"
                action={{
                  label: "Gestionar disponibilidad",
                  onClick: () => window.location.href = '/staff/doctors'
                }}
              />
            </>
          ) : null}
        </StatsGrid>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Agenda de Hoy</h3>
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
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {appointment.patient_name}
                        </span>
                        {appointment.patient_phone && (
                          <button
                            type="button"
                            onClick={() => window.open(`tel:${appointment.patient_phone}`)}
                            className="ml-2 text-blue-600 hover:text-blue-700"
                            title="Llamar paciente"
                          >
                            <Phone className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Dr. {appointment.doctor_name} • {appointment.service_name}</p>
                      <p className="flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </p>
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
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay citas programadas para hoy</p>
                <button
                  type="button"
                  onClick={() => window.location.href = '/appointments/book'}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Agendar nueva cita
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Tareas Pendientes</h3>
            <span className="text-sm text-gray-500">
              {pendingTasks.length} pendiente{pendingTasks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded"></div>
                      <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingTasks.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0 mt-1">
                      {getTaskIcon(task.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {task.patient_name}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.description}
                      </p>
                      {task.due_time && (
                        <p className="text-xs text-gray-500 mt-1">
                          Vence: {formatTime(task.due_time)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay tareas pendientes</p>
                <p className="text-sm text-gray-400 mt-1">¡Excelente trabajo!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI ChatBot for Staff - FASE 2 MVP */}
      {showAIChatBot && (
        <AdminStaffChatBot
          organizationId={organization?.id}
          userId={profile?.id}
          userRole="staff"
          onClose={() => setShowAIChatBot(false)}
        />
      )}
    </DashboardLayout>
  );
}
