'use client';

/**
 * AppointmentStatsCards Component
 * 
 * Unified statistics cards system for appointment pages
 * Provides role-specific metrics with consistent visual design
 * 
 * Features:
 * - Role-based metric calculation
 * - Responsive grid layout (2 cols mobile → 4 cols desktop)
 * - Real-time data updates
 * - Consistent with DashboardLayout design
 * - Healthcare-specific iconography
 * 
 * @version 1.0.0 - Unified stats implementation
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React, { useMemo } from 'react';
import StatsCard, { StatsGrid, StatsCardSkeleton } from '@/components/dashboard/StatsCard';
import type { AppointmentData } from '@/components/appointments/AppointmentCard';
import type { UserRole } from '@/types/database';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  UserCheck,
  Stethoscope,
  FileText,
  BarChart3
} from 'lucide-react';

/**
 * Props for AppointmentStatsCards component
 */
interface AppointmentStatsCardsProps {
  /** Array of appointments for metric calculation */
  appointments: AppointmentData[];
  /** User role for determining which metrics to show */
  userRole: UserRole;
  /** Loading state */
  loading?: boolean;
  /** Organization name for context */
  organizationName?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Interface for calculated statistics
 */
interface AppointmentStats {
  // Common metrics
  total: number;
  upcoming: number;
  today: number;
  thisWeek: number;
  completed: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  
  // Role-specific metrics
  critical?: number; // Appointments needing immediate attention
  revenue?: number; // Financial metrics
  uniquePatients?: number; // For doctors/admin
  averageDuration?: number; // For doctors
  noShow?: number; // For admin/staff
  
  // Time-based metrics
  nextAppointmentHours?: number; // Hours until next appointment
  completionRate?: number; // Percentage of completed vs total
}

/**
 * Calculate comprehensive appointment statistics
 */
const calculateStats = (appointments: AppointmentData[], userRole: UserRole): AppointmentStats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const stats: AppointmentStats = {
    total: appointments.length,
    upcoming: 0,
    today: 0,
    thisWeek: 0,
    completed: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    critical: 0,
    revenue: 0,
    uniquePatients: 0,
    noShow: 0,
    nextAppointmentHours: undefined,
    completionRate: 0
  };

  const uniquePatientIds = new Set<string>();
  let totalDuration = 0;
  let nextAppointment: Date | null = null;

  appointments.forEach(appointment => {
    const appointmentDate = new Date(appointment.appointment_date);
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    
    // Basic counts
    switch (appointment.status.toLowerCase()) {
      case 'completed':
        stats.completed++;
        break;
      case 'pending':
        stats.pending++;
        break;
      case 'confirmed':
        stats.confirmed++;
        break;
      case 'cancelled':
      case 'cancelada':
      case 'cancelada_paciente':
      case 'cancelada_clinica':
        stats.cancelled++;
        break;
      case 'no_show':
        stats.noShow++;
        break;
    }

    // Time-based calculations
    if (appointmentDateTime > now) {
      stats.upcoming++;
      
      // Find next appointment
      if (!nextAppointment || appointmentDateTime < nextAppointment) {
        nextAppointment = appointmentDateTime;
      }
    }

    if (appointmentDate.toDateString() === today.toDateString()) {
      stats.today++;
    }

    if (appointmentDateTime <= weekFromNow && appointmentDateTime > now) {
      stats.thisWeek++;
    }

    // Critical appointments (within 2 hours and pending/confirmed)
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil <= 2 && hoursUntil > 0 && ['pending', 'confirmed'].includes(appointment.status)) {
      stats.critical!++;
    }

    // Financial calculations
    const price = appointment.service?.[0]?.price;
    if (price && appointment.status === 'completed') {
      stats.revenue! += price;
    }

    // Unique patients (for doctor/admin roles)
    if (appointment.patient?.[0]?.id) {
      uniquePatientIds.add(appointment.patient[0].id);
    }

    // Duration tracking
    if (appointment.duration_minutes) {
      totalDuration += appointment.duration_minutes;
    }
  });

  // Calculate derived metrics
  stats.uniquePatients = uniquePatientIds.size;
  stats.averageDuration = appointments.length > 0 ? Math.round(totalDuration / appointments.length) : 0;
  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  if (nextAppointment) {
    stats.nextAppointmentHours = Math.round((nextAppointment.getTime() - now.getTime()) / (1000 * 60 * 60));
  }

  return stats;
};

/**
 * Get role-specific metrics configuration
 */
const getRoleMetrics = (stats: AppointmentStats, userRole: UserRole) => {
  switch (userRole) {
    case 'patient':
      return [
        {
          title: 'Próximas Citas',
          value: stats.upcoming,
          subtitle: stats.upcoming === 0 ? 'No tienes citas programadas' : 'Citas programadas',
          icon: Calendar,
          color: 'blue' as const,
          trend: stats.nextAppointmentHours ? {
            value: stats.nextAppointmentHours,
            label: `en ${stats.nextAppointmentHours}h`,
            direction: 'neutral' as const
          } : undefined,
          action: {
            label: stats.upcoming > 0 ? 'Ver próximas' : 'Agendar cita',
            onClick: () => window.location.href = stats.upcoming > 0 ? '/appointments' : '/appointments/book'
          }
        },
        {
          title: 'Citas Completadas',
          value: stats.completed,
          subtitle: 'Último mes',
          icon: CheckCircle,
          color: 'green' as const,
          trend: stats.completionRate > 0 ? {
            value: stats.completionRate,
            label: `${stats.completionRate}% completadas`,
            direction: 'up' as const
          } : undefined
        }
      ];

    case 'doctor':
      return [
        {
          title: 'Citas Hoy',
          value: stats.today,
          subtitle: 'Programadas para hoy',
          icon: Calendar,
          color: 'blue' as const,
          action: {
            label: 'Ver agenda del día',
            onClick: () => window.location.href = '/appointments?date=today'
          }
        },
        {
          title: 'Esta Semana',
          value: stats.thisWeek,
          subtitle: 'Citas programadas',
          icon: Clock,
          color: 'green' as const
        },
        {
          title: 'Pacientes Únicos',
          value: stats.uniquePatients,
          subtitle: 'En el período',
          icon: Users,
          color: 'purple' as const
        },
        {
          title: 'Duración Promedio',
          value: `${stats.averageDuration}min`,
          subtitle: 'Por consulta',
          icon: Stethoscope,
          color: 'indigo' as const
        }
      ];

    case 'staff':
    case 'admin':
      return [
        {
          title: 'Pendientes',
          value: stats.pending,
          subtitle: 'Requieren confirmación',
          icon: AlertCircle,
          color: 'yellow' as const,
          action: {
            label: 'Revisar pendientes',
            onClick: () => window.location.href = '/appointments?status=pending'
          }
        },
        {
          title: 'Confirmadas Hoy',
          value: stats.today,
          subtitle: 'Citas de hoy',
          icon: CheckCircle,
          color: 'green' as const
        },
        {
          title: 'Críticas',
          value: stats.critical,
          subtitle: 'Próximas 2 horas',
          icon: Activity,
          color: 'red' as const
        },
        {
          title: 'Ingresos',
          value: new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(stats.revenue || 0),
          subtitle: 'Completadas',
          icon: DollarSign,
          color: 'green' as const
        }
      ];

    case 'superadmin':
      return [
        {
          title: 'Total Citas',
          value: stats.total,
          subtitle: 'En el sistema',
          icon: BarChart3,
          color: 'blue' as const
        },
        {
          title: 'Tasa Completadas',
          value: `${stats.completionRate}%`,
          subtitle: 'Eficiencia general',
          icon: TrendingUp,
          color: 'green' as const
        },
        {
          title: 'Pacientes Únicos',
          value: stats.uniquePatients,
          subtitle: 'Usuarios activos',
          icon: UserCheck,
          color: 'purple' as const
        },
        {
          title: 'No Asistieron',
          value: stats.noShow,
          subtitle: 'Seguimiento requerido',
          icon: AlertCircle,
          color: 'red' as const
        }
      ];

    default:
      return [];
  }
};

/**
 * AppointmentStatsCards Component
 */
export default function AppointmentStatsCards({
  appointments,
  userRole,
  loading = false,
  organizationName,
  className = ''
}: AppointmentStatsCardsProps) {
  
  const stats = useMemo(() => calculateStats(appointments, userRole), [appointments, userRole]);
  const metrics = useMemo(() => getRoleMetrics(stats, userRole), [stats, userRole]);

  // Determine grid columns based on role
  const getGridColumns = (): number => {
    switch (userRole) {
      case 'patient':
        return 2;
      case 'doctor':
      case 'staff':
      case 'admin':
      case 'superadmin':
        return 4;
      default:
        return 2;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas de Citas</h3>
        <StatsGrid columns={getGridColumns()}>
          {Array.from({ length: getGridColumns() }).map((_, index) => (
            <StatsCardSkeleton key={index} />
          ))}
        </StatsGrid>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Estadísticas de Citas</h3>
        {organizationName && (
          <span className="text-sm text-gray-500">{organizationName}</span>
        )}
      </div>
      
      <StatsGrid columns={getGridColumns()}>
        {metrics.map((metric, index) => (
          <StatsCard
            key={index}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            icon={metric.icon}
            color={metric.color}
            trend={metric.trend}
            action={metric.action}
          />
        ))}
      </StatsGrid>
    </div>
  );
}
