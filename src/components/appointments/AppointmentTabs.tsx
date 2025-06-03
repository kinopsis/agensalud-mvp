'use client';

/**
 * AppointmentTabs Component
 *
 * Sistema de pestañas para organizar citas por rol con categorías específicas:
 * - Patient: Vigentes/Historial (citas futuras vs pasadas)
 * - Doctor: Hoy/Semana/Historial (vista temporal para agenda médica)
 * - Admin/Staff: Pendientes/Confirmadas/Completadas/Todas (gestión operativa)
 *
 * Características:
 * - Diseño responsive y accesible (WCAG 2.1)
 * - Contadores dinámicos por pestaña
 * - Transiciones suaves entre pestañas
 * - Filtrado inteligente por estado, fecha y rol
 * - Integración con arquitectura multi-tenant
 *
 * @author AgentSalud MVP Team
 * @version 2.0.0 - Multi-role support
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Calendar, History, Clock, CheckCircle, AlertCircle, Users, Activity } from 'lucide-react';
import { AppointmentData } from './AppointmentCard';

/**
 * Tipos de pestañas disponibles por rol
 */
export type TabType =
  // Patient tabs
  | 'vigentes' | 'historial'
  // Doctor tabs
  | 'hoy' | 'semana'
  // Admin/Staff tabs
  | 'pendientes' | 'confirmadas' | 'completadas' | 'todas';

/**
 * Información de configuración para cada pestaña
 */
interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  emptyMessage: string;
  emptyDescription: string;
}

/**
 * Props del componente AppointmentTabs
 */
interface AppointmentTabsProps {
  /** Lista completa de citas */
  appointments: AppointmentData[];
  /** Pestaña actualmente activa */
  activeTab: TabType;
  /** Callback cuando cambia la pestaña activa */
  onTabChange: (tab: TabType) => void;
  /** Rol del usuario para determinar pestañas disponibles */
  userRole?: string;
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Si está en modo de carga */
  loading?: boolean;
}

/**
 * Configuración completa de pestañas por tipo
 */
const TAB_CONFIG: Record<TabType, TabConfig> = {
  // Patient tabs
  vigentes: {
    id: 'vigentes',
    label: 'Vigentes',
    icon: Calendar,
    description: 'Citas confirmadas y pendientes',
    emptyMessage: 'No tienes citas vigentes',
    emptyDescription: 'No hay citas confirmadas o pendientes programadas.'
  },
  historial: {
    id: 'historial',
    label: 'Historial',
    icon: History,
    description: 'Citas completadas y canceladas',
    emptyMessage: 'No hay historial de citas',
    emptyDescription: 'No tienes citas completadas o canceladas anteriores.'
  },
  // Doctor tabs
  hoy: {
    id: 'hoy',
    label: 'Hoy',
    icon: Clock,
    description: 'Citas programadas para hoy',
    emptyMessage: 'No hay citas para hoy',
    emptyDescription: 'No tienes citas programadas para el día de hoy.'
  },
  semana: {
    id: 'semana',
    label: 'Esta Semana',
    icon: Calendar,
    description: 'Citas de esta semana',
    emptyMessage: 'No hay citas esta semana',
    emptyDescription: 'No tienes citas programadas para esta semana.'
  },
  // Admin/Staff tabs
  pendientes: {
    id: 'pendientes',
    label: 'Pendientes',
    icon: AlertCircle,
    description: 'Citas que requieren confirmación',
    emptyMessage: 'No hay citas pendientes',
    emptyDescription: 'No hay citas que requieran confirmación.'
  },
  confirmadas: {
    id: 'confirmadas',
    label: 'Confirmadas',
    icon: CheckCircle,
    description: 'Citas confirmadas y programadas',
    emptyMessage: 'No hay citas confirmadas',
    emptyDescription: 'No hay citas confirmadas en el sistema.'
  },
  completadas: {
    id: 'completadas',
    label: 'Completadas',
    icon: Activity,
    description: 'Citas finalizadas',
    emptyMessage: 'No hay citas completadas',
    emptyDescription: 'No hay citas completadas en el sistema.'
  },
  todas: {
    id: 'todas',
    label: 'Todas',
    icon: Users,
    description: 'Todas las citas del sistema',
    emptyMessage: 'No hay citas registradas',
    emptyDescription: 'No hay citas registradas en el sistema.'
  }
};

/**
 * Obtiene las pestañas disponibles para un rol específico
 *
 * @param userRole - Rol del usuario
 * @returns Array de tipos de pestañas disponibles para el rol
 */
export const getTabsForRole = (userRole?: string): TabType[] => {
  switch (userRole) {
    case 'patient':
      return ['vigentes', 'historial'];
    case 'doctor':
      return ['hoy', 'semana', 'historial'];
    case 'admin':
    case 'staff':
    case 'superadmin':
      return ['pendientes', 'confirmadas', 'completadas', 'todas'];
    default:
      return ['vigentes', 'historial']; // Default to patient view
  }
};

/**
 * Determina si una cita pertenece a la categoría "Vigentes"
 *
 * @param appointment - Datos de la cita
 * @returns true si la cita es vigente (confirmed/pending y futura)
 */
export const isVigenteAppointment = (appointment: AppointmentData): boolean => {
  const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const now = new Date();
  const isFuture = appointmentDate > now;
  const isActiveStatus = ['confirmed', 'pending'].includes(appointment.status);

  return isFuture && isActiveStatus;
};

/**
 * Determina si una cita pertenece a la categoría "Historial"
 *
 * @param appointment - Datos de la cita
 * @returns true si la cita es historial (completed/cancelled o pasada)
 */
export const isHistorialAppointment = (appointment: AppointmentData): boolean => {
  const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
  const now = new Date();
  const isPast = appointmentDate <= now;
  const isHistoryStatus = ['completed', 'cancelled'].includes(appointment.status);

  return isPast || isHistoryStatus;
};

/**
 * Determina si una cita es para hoy
 *
 * @param appointment - Datos de la cita
 * @returns true si la cita es para hoy
 */
export const isHoyAppointment = (appointment: AppointmentData): boolean => {
  const appointmentDate = new Date(appointment.appointment_date);
  const today = new Date();

  return appointmentDate.toDateString() === today.toDateString();
};

/**
 * Determina si una cita es para esta semana
 *
 * @param appointment - Datos de la cita
 * @returns true si la cita es para esta semana
 */
export const isSemanaAppointment = (appointment: AppointmentData): boolean => {
  const appointmentDate = new Date(appointment.appointment_date);
  const today = new Date();

  // Calculate start of week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate end of week (Saturday)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() - today.getDay() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
};

/**
 * Filtra citas por tipo de pestaña
 *
 * @param appointments - Lista de citas
 * @param tabType - Tipo de pestaña
 * @returns Citas filtradas para la pestaña especificada
 */
export const filterAppointmentsByTab = (
  appointments: AppointmentData[],
  tabType: TabType
): AppointmentData[] => {
  return appointments.filter(appointment => {
    switch (tabType) {
      // Patient tabs
      case 'vigentes':
        return isVigenteAppointment(appointment);
      case 'historial':
        return isHistorialAppointment(appointment);

      // Doctor tabs
      case 'hoy':
        return isHoyAppointment(appointment);
      case 'semana':
        return isSemanaAppointment(appointment);

      // Admin/Staff tabs
      case 'pendientes':
        return appointment.status === 'pending';
      case 'confirmadas':
        return appointment.status === 'confirmed';
      case 'completadas':
        return appointment.status === 'completed';
      case 'todas':
        return true; // Show all appointments

      default:
        return false;
    }
  });
};

/**
 * Hook para calcular contadores de citas por pestaña
 *
 * @param appointments - Lista completa de citas
 * @param userRole - Rol del usuario para determinar pestañas relevantes
 * @returns Objeto con contadores por pestaña
 */
export const useAppointmentCounts = (appointments: AppointmentData[], userRole?: string) => {
  return useMemo(() => {
    const availableTabs = getTabsForRole(userRole);
    const counts: Record<string, number> = {};

    // Calculate counts for all available tabs for this role
    availableTabs.forEach(tabType => {
      counts[tabType] = filterAppointmentsByTab(appointments, tabType).length;
    });

    return {
      ...counts,
      total: appointments.length
    };
  }, [appointments, userRole]);
};

/**
 * Componente de contador para pestañas
 */
interface TabCounterProps {
  count: number;
  loading?: boolean;
}

const TabCounter: React.FC<TabCounterProps> = ({ count, loading }) => {
  if (loading) {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 ml-2 bg-gray-200 rounded-full animate-pulse">
        <span className="sr-only">Cargando...</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 ml-2 text-xs font-medium text-white bg-gray-400 rounded-full group-hover:bg-gray-500 transition-colors duration-200">
      {count}
    </span>
  );
};

/**
 * Componente principal AppointmentTabs
 */
const AppointmentTabs: React.FC<AppointmentTabsProps> = ({
  appointments,
  activeTab,
  onTabChange,
  userRole,
  className = '',
  loading = false
}) => {
  const counts = useAppointmentCounts(appointments, userRole);
  const availableTabs = getTabsForRole(userRole);

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8 px-6" role="tablist" aria-label="Pestañas de citas">
        {availableTabs.map((tabType) => {
          const tab = TAB_CONFIG[tabType];
          const isActive = activeTab === tab.id;
          const count = counts[tab.id] || 0;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`group whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={isActive ? 'true' : 'false'}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              <Icon className={`h-4 w-4 mr-2 transition-colors duration-200 ${
                isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
              }`} />
              <span>{tab.label}</span>
              <TabCounter count={count} loading={loading} />
            </button>
          );
        })}
      </nav>
    </div>
  );
};

/**
 * Componente de mensaje vacío para pestañas sin citas
 */
interface EmptyTabMessageProps {
  tabType: TabType;
  onCreateAppointment?: () => void;
}

export const EmptyTabMessage: React.FC<EmptyTabMessageProps> = ({
  tabType,
  onCreateAppointment
}) => {
  const config = TAB_CONFIG[tabType];
  const Icon = tabType === 'vigentes' ? Clock : CheckCircle;

  return (
    <div className="bg-white shadow rounded-lg px-6 py-12 text-center">
      <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {config.emptyMessage}
      </h3>
      <p className="text-gray-500 mb-4">
        {config.emptyDescription}
      </p>
      {tabType === 'vigentes' && onCreateAppointment && (
        <button
          type="button"
          onClick={onCreateAppointment}
          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Agendar Primera Cita
        </button>
      )}
    </div>
  );
};

/**
 * Hook para gestionar el estado de las pestañas
 *
 * @param initialTab - Pestaña inicial
 * @param userRole - Rol del usuario para determinar pestaña por defecto
 * @returns Estado y funciones para manejar las pestañas
 */
export const useAppointmentTabs = (initialTab?: TabType, userRole?: string) => {
  // Determine default tab based on user role if no initial tab provided
  const getDefaultTab = (): TabType => {
    if (initialTab) return initialTab;

    const availableTabs = getTabsForRole(userRole);
    return availableTabs[0]; // Return first available tab for the role
  };

  const [activeTab, setActiveTab] = useState<TabType>(getDefaultTab());

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    setActiveTab,
    handleTabChange
  };
};

/**
 * Obtiene la configuración de una pestaña específica
 *
 * @param tabType - Tipo de pestaña
 * @returns Configuración de la pestaña
 */
export const getTabConfig = (tabType: TabType): TabConfig => {
  return TAB_CONFIG[tabType];
};

/**
 * Valida si un tipo de pestaña es válido
 *
 * @param tabType - Tipo de pestaña a validar
 * @returns true si el tipo es válido
 */
export const isValidTabType = (tabType: string): tabType is TabType => {
  return Object.keys(TAB_CONFIG).includes(tabType);
};

export default AppointmentTabs;
