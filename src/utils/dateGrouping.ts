/**
 * Date Grouping Utilities
 * Functions for grouping appointments by temporal categories
 */

import { AppointmentData } from '@/components/appointments/AppointmentCard';

export interface GroupedAppointments {
  [groupKey: string]: {
    label: string;
    appointments: AppointmentData[];
    sortOrder: number;
  };
}

/**
 * Get the temporal group for a given date
 */
export function getTemporalGroup(appointmentDate: string): {
  key: string;
  label: string;
  sortOrder: number;
} {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const appointmentDateObj = new Date(appointmentDate);
  
  // Reset time to compare only dates
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  appointmentDateObj.setHours(0, 0, 0, 0);
  
  const diffTime = appointmentDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Today
  if (diffDays === 0) {
    return {
      key: 'today',
      label: 'Hoy',
      sortOrder: 1
    };
  }
  
  // Tomorrow
  if (diffDays === 1) {
    return {
      key: 'tomorrow',
      label: 'Mañana',
      sortOrder: 2
    };
  }
  
  // This week (next 7 days)
  if (diffDays > 1 && diffDays <= 7) {
    const dayName = appointmentDateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return {
      key: 'this-week',
      label: `Esta Semana - ${capitalizedDayName}`,
      sortOrder: 3
    };
  }
  
  // Next week (8-14 days)
  if (diffDays > 7 && diffDays <= 14) {
    const dayName = appointmentDateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return {
      key: 'next-week',
      label: `Próxima Semana - ${capitalizedDayName}`,
      sortOrder: 4
    };
  }
  
  // This month (current month)
  if (appointmentDateObj.getMonth() === today.getMonth() && 
      appointmentDateObj.getFullYear() === today.getFullYear()) {
    const formattedDate = appointmentDateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long'
    });
    return {
      key: 'this-month',
      label: `Este Mes - ${formattedDate}`,
      sortOrder: 5
    };
  }
  
  // Next month
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  if (appointmentDateObj.getMonth() === nextMonth.getMonth() && 
      appointmentDateObj.getFullYear() === nextMonth.getFullYear()) {
    const formattedDate = appointmentDateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long'
    });
    return {
      key: 'next-month',
      label: `Próximo Mes - ${formattedDate}`,
      sortOrder: 6
    };
  }
  
  // Future dates (beyond next month)
  if (diffDays > 0) {
    const formattedDate = appointmentDateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: appointmentDateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
    return {
      key: 'future',
      label: `Futuro - ${formattedDate}`,
      sortOrder: 7
    };
  }
  
  // Past dates
  if (diffDays < 0) {
    // Yesterday
    if (diffDays === -1) {
      return {
        key: 'yesterday',
        label: 'Ayer',
        sortOrder: -1
      };
    }
    
    // Last week
    if (diffDays >= -7) {
      const dayName = appointmentDateObj.toLocaleDateString('es-ES', { weekday: 'long' });
      const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return {
        key: 'last-week',
        label: `Semana Pasada - ${capitalizedDayName}`,
        sortOrder: -2
      };
    }
    
    // Last month
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    if (appointmentDateObj.getMonth() === lastMonth.getMonth() && 
        appointmentDateObj.getFullYear() === lastMonth.getFullYear()) {
      const formattedDate = appointmentDateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long'
      });
      return {
        key: 'last-month',
        label: `Mes Pasado - ${formattedDate}`,
        sortOrder: -3
      };
    }
    
    // Older dates
    const formattedDate = appointmentDateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: appointmentDateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
    return {
      key: 'past',
      label: `Anterior - ${formattedDate}`,
      sortOrder: -4
    };
  }
  
  // Fallback (should not reach here)
  return {
    key: 'other',
    label: 'Otras Fechas',
    sortOrder: 999
  };
}

/**
 * Group appointments by temporal categories
 */
export function groupAppointmentsByDate(appointments: AppointmentData[]): GroupedAppointments {
  const groups: GroupedAppointments = {};
  
  appointments.forEach(appointment => {
    const group = getTemporalGroup(appointment.appointment_date);
    
    if (!groups[group.key]) {
      groups[group.key] = {
        label: group.label,
        appointments: [],
        sortOrder: group.sortOrder
      };
    }
    
    groups[group.key].appointments.push(appointment);
  });
  
  // Sort appointments within each group by date and time
  Object.keys(groups).forEach(groupKey => {
    groups[groupKey].appointments.sort((a, b) => {
      const dateComparison = a.appointment_date.localeCompare(b.appointment_date);
      if (dateComparison !== 0) return dateComparison;
      return a.start_time.localeCompare(b.start_time);
    });
  });
  
  return groups;
}

/**
 * Get sorted group keys for display
 */
export function getSortedGroupKeys(groups: GroupedAppointments): string[] {
  return Object.keys(groups).sort((a, b) => {
    return groups[a].sortOrder - groups[b].sortOrder;
  });
}

/**
 * Get a formatted date header for display
 */
export function getDateHeader(groupKey: string, groupLabel: string): {
  title: string;
  subtitle?: string;
  icon: 'calendar' | 'clock' | 'history';
} {
  switch (groupKey) {
    case 'today':
      return {
        title: 'Hoy',
        subtitle: new Date().toLocaleDateString('es-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        }),
        icon: 'clock'
      };
    
    case 'tomorrow':
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        title: 'Mañana',
        subtitle: tomorrow.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        }),
        icon: 'calendar'
      };
    
    case 'yesterday':
      return {
        title: 'Ayer',
        icon: 'history'
      };
    
    case 'this-week':
    case 'next-week':
    case 'last-week':
      return {
        title: groupLabel,
        icon: 'calendar'
      };
    
    default:
      return {
        title: groupLabel,
        icon: 'calendar'
      };
  }
}
