'use client';

/**
 * AppointmentTabs Component
 * 
 * Sistema de pestañas para organizar citas del paciente en categorías intuitivas:
 * - Vigentes: Citas confirmadas y pendientes (futuras)
 * - Historial: Citas completadas, canceladas y pasadas
 * 
 * Características:
 * - Diseño responsive y accesible (WCAG 2.1)
 * - Contadores dinámicos por pestaña
 * - Transiciones suaves entre pestañas
 * - Filtrado inteligente por estado y fecha
 * - Integración con arquitectura multi-tenant
 * 
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { Calendar, History, Clock, CheckCircle } from 'lucide-react';
import { AppointmentData } from './AppointmentCard';

/**
 * Tipos de pestañas disponibles
 */
export type TabType = 'vigentes' | 'historial';

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
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Si está en modo de carga */
  loading?: boolean;
}

/**
 * Configuración de las pestañas
 */
const TAB_CONFIG: Record<TabType, TabConfig> = {
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
      case 'vigentes':
        return isVigenteAppointment(appointment);
      case 'historial':
        return isHistorialAppointment(appointment);
      default:
        return false;
    }
  });
};

/**
 * Hook para calcular contadores de citas por pestaña
 * 
 * @param appointments - Lista completa de citas
 * @returns Objeto con contadores por pestaña
 */
export const useAppointmentCounts = (appointments: AppointmentData[]) => {
  return useMemo(() => {
    const vigentesCount = filterAppointmentsByTab(appointments, 'vigentes').length;
    const historialCount = filterAppointmentsByTab(appointments, 'historial').length;
    
    return {
      vigentes: vigentesCount,
      historial: historialCount,
      total: appointments.length
    };
  }, [appointments]);
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
  className = '',
  loading = false
}) => {
  const counts = useAppointmentCounts(appointments);

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Pestañas de citas">
        {Object.values(TAB_CONFIG).map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={isActive}
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
 * @param initialTab - Pestaña inicial (por defecto 'vigentes')
 * @returns Estado y funciones para manejar las pestañas
 */
export const useAppointmentTabs = (initialTab: TabType = 'vigentes') => {
  const [activeTab, setActiveTab] = React.useState<TabType>(initialTab);

  const handleTabChange = React.useCallback((tab: TabType) => {
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
