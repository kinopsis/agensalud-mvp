'use client';

/**
 * AvailabilityIndicator Component
 * 
 * Componente para mostrar indicadores visuales de disponibilidad
 * con colores semafóricos y información contextual
 * 
 * Características:
 * - Indicadores de densidad (Alta/Media/Baja/No disponible)
 * - Tooltips informativos con detalles
 * - Animaciones suaves para feedback visual
 * - Accesibilidad WCAG 2.1 completa
 * 
 * @author AgentSalud MVP Team - UX Enhancement
 * @version 1.0.0
 */

import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

/**
 * Tipos de disponibilidad
 */
export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Props del componente AvailabilityIndicator
 */
interface AvailabilityIndicatorProps {
  /** Número de slots disponibles */
  slotsCount: number;
  /** Fecha para la cual se muestra la disponibilidad */
  date: string;
  /** Nombre del día (opcional) */
  dayName?: string;
  /** Si el indicador está seleccionado */
  isSelected?: boolean;
  /** Callback cuando se hace clic */
  onClick?: () => void;
  /** Tamaño del componente */
  size?: 'sm' | 'md' | 'lg';
  /** Mostrar solo el indicador (sin texto) */
  compact?: boolean;
  /** Si la fecha está bloqueada por reglas de negocio */
  isBlocked?: boolean;
  /** Razón por la cual la fecha está bloqueada */
  blockReason?: string;
}

/**
 * Determina el nivel de disponibilidad basado en el número de slots
 */
const getAvailabilityLevel = (slotsCount: number): AvailabilityLevel => {
  if (slotsCount === 0) return 'none';
  if (slotsCount <= 2) return 'low';
  if (slotsCount <= 5) return 'medium';
  return 'high';
};

/**
 * Configuración de estilos por nivel de disponibilidad
 */
const availabilityConfig = {
  high: {
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    icon: CheckCircle,
    label: 'Alta disponibilidad',
    description: 'Muchos horarios disponibles'
  },
  medium: {
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    icon: Clock,
    label: 'Disponibilidad media',
    description: 'Algunos horarios disponibles'
  },
  low: {
    color: 'bg-red-500',
    lightColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    icon: AlertCircle,
    label: 'Baja disponibilidad',
    description: 'Pocos horarios disponibles'
  },
  none: {
    color: 'bg-gray-400',
    lightColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-300',
    icon: XCircle,
    label: 'No disponible',
    description: 'Sin horarios disponibles'
  },
  blocked: {
    color: 'bg-gray-500',
    lightColor: 'bg-gray-50',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-200',
    icon: XCircle,
    label: 'Bloqueado',
    description: 'No disponible por reglas de reserva'
  }
};

/**
 * Configuración de tamaños
 */
const sizeConfig = {
  sm: {
    container: 'w-16 h-16',
    indicator: 'w-3 h-3',
    text: 'text-xs',
    padding: 'p-2'
  },
  md: {
    container: 'w-20 h-20',
    indicator: 'w-4 h-4',
    text: 'text-sm',
    padding: 'p-3'
  },
  lg: {
    container: 'w-24 h-24',
    indicator: 'w-5 h-5',
    text: 'text-base',
    padding: 'p-4'
  }
};

/**
 * Componente principal AvailabilityIndicator
 */
const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({
  slotsCount,
  date,
  dayName,
  isSelected = false,
  onClick,
  size = 'md',
  compact = false,
  isBlocked = false,
  blockReason
}) => {
  // CRITICAL FEATURE: Use blocked state if date is blocked, otherwise use availability level
  const level = isBlocked ? 'blocked' : getAvailabilityLevel(slotsCount);
  const config = availabilityConfig[level as keyof typeof availabilityConfig];
  const sizeStyles = sizeConfig[size];
  const IconComponent = config.icon;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.getDate().toString();
  };

  const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleClick = () => {
    // CRITICAL FEATURE: Block click if date is blocked
    if (isBlocked) {
      console.log('🚫 CLICK BLOQUEADO - Fecha no disponible:', blockReason);
      return;
    }

    // Validar que no sea fecha pasada
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const isPastDate = dateObj.getTime() < today.getTime();

    if (onClick && level !== 'none' && level !== 'blocked' && !isPastDate) {
      onClick();
    }
  };

  // Verificar si es fecha pasada
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  const isPastDate = dateObj.getTime() < today.getTime();

  // CRITICAL FEATURE: Include blocked state in clickable logic
  const isClickable = onClick && level !== 'none' && level !== 'blocked' && !isPastDate && !isBlocked;

  return (
    <div className="relative group">
      {/* Indicador principal */}
      <div
        className={`
          ${sizeStyles.container} ${sizeStyles.padding}
          ${config.lightColor} ${config.borderColor}
          border-2 rounded-lg
          flex flex-col items-center justify-center
          transition-all duration-200 ease-in-out
          ${isClickable ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-default'}
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          ${level === 'none' || isPastDate ? 'opacity-60' : ''}
          ${isPastDate ? 'grayscale' : ''}
        `}
        onClick={handleClick}
        role={isClickable ? 'button' : 'presentation'}
        tabIndex={isClickable ? 0 : -1}
        aria-label={
          isBlocked
            ? `${formatFullDate(date)}, ${config.label}, ${blockReason || 'No disponible por reglas de reserva'}`
            : `${formatFullDate(date)}, ${config.label}, ${slotsCount} horarios disponibles`
        }
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Indicador de disponibilidad */}
        <div className="flex items-center justify-center mb-1">
          <div className={`${config.color} ${sizeStyles.indicator} rounded-full flex items-center justify-center`}>
            <IconComponent className="w-2 h-2 text-white" />
          </div>
        </div>

        {/* Fecha */}
        <div className={`${sizeStyles.text} font-semibold text-gray-900 text-center`}>
          {formatDate(date)}
        </div>

        {/* Día de la semana (si se proporciona) */}
        {dayName && !compact && (
          <div className={`${sizeStyles.text} text-gray-600 text-center leading-tight`}>
            {dayName.substring(0, 3)}
          </div>
        )}

        {/* Contador de slots (si no es compacto) */}
        {!compact && (
          <div className={`${sizeStyles.text} ${config.textColor} text-center font-medium`}>
            {slotsCount} slot{slotsCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Tooltip with blocking information */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
        <div className="font-medium">{formatFullDate(date)}</div>
        <div className="text-gray-300">
          {config.description}
        </div>
        {isBlocked ? (
          <div className="text-red-300 font-medium">
            {blockReason || 'No disponible por reglas de reserva'}
          </div>
        ) : (
          <div className="text-gray-300">
            {slotsCount} horario{slotsCount !== 1 ? 's' : ''} disponible{slotsCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Flecha del tooltip */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

/**
 * Componente para mostrar una fila de indicadores de disponibilidad semanal
 */
interface WeeklyAvailabilityProps {
  /** Array de fechas con su disponibilidad */
  weekData: Array<{
    date: string;
    dayName: string;
    slotsCount: number;
    isBlocked?: boolean;
    blockReason?: string;
  }>;
  /** Fecha seleccionada actualmente */
  selectedDate?: string;
  /** Callback cuando se selecciona una fecha */
  onDateSelect?: (date: string) => void;
  /** Tamaño de los indicadores */
  size?: 'sm' | 'md' | 'lg';
}

export const WeeklyAvailability: React.FC<WeeklyAvailabilityProps> = ({
  weekData,
  selectedDate,
  onDateSelect,
  size = 'md'
}) => {
  /**
   * CRITICAL FIX: Ensure timezone-safe date passing
   * The day.date should already be timezone-safe from WeeklyAvailabilitySelector,
   * but we add validation to ensure consistency
   */
  const handleDateClick = (dateString: string) => {
    // DEBUG: Log para verificar fecha antes de enviar
    console.log('=== DEBUG WEEKLY AVAILABILITY CLICK ===');
    console.log('day.date recibido:', dateString);

    // Verificar que la fecha esté en formato correcto YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      console.error('FORMATO DE FECHA INCORRECTO:', dateString);
      return;
    }

    // CRITICAL FIX: Verificar consistencia timezone usando parsing seguro
    // Problem: new Date("2025-05-29") creates May 28 in GMT-0500
    // Solution: Parse date components manually to avoid UTC interpretation
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObjSafe = new Date(year, month - 1, day); // month is 0-indexed
    const localDateString = `${dateObjSafe.getFullYear()}-${String(dateObjSafe.getMonth() + 1).padStart(2, '0')}-${String(dateObjSafe.getDate()).padStart(2, '0')}`;

    // Also create UTC version for comparison
    const dateObjUTC = new Date(dateString); // This creates the problematic UTC interpretation
    const utcLocalString = `${dateObjUTC.getFullYear()}-${String(dateObjUTC.getMonth() + 1).padStart(2, '0')}-${String(dateObjUTC.getDate()).padStart(2, '0')}`;

    console.log('Verificación timezone (CORREGIDA):');
    console.log('  - dateString original:', dateString);
    console.log('  - localDateString (timezone-safe):', localDateString);
    console.log('  - utcLocalString (problematic):', utcLocalString);
    console.log('  - ¿Son iguales? (safe):', dateString === localDateString);
    console.log('  - ¿Son iguales? (UTC):', dateString === utcLocalString);

    // CRITICAL FIX: Use timezone-safe comparison for decision
    if (dateString !== localDateString) {
      console.warn('DESFASE TIMEZONE DETECTADO - usando fecha local corregida');
      console.log('Enviando fecha corregida:', localDateString);
      onDateSelect?.(localDateString);
    } else {
      console.log('Fecha consistente (timezone-safe) - enviando original:', dateString);
      onDateSelect?.(dateString);
    }
    console.log('=========================================');
  };

  return (
    <div className="flex justify-center space-x-2">
      {weekData.map((day) => (
        <AvailabilityIndicator
          key={day.date}
          date={day.date}
          dayName={day.dayName}
          slotsCount={day.slotsCount}
          isSelected={selectedDate === day.date}
          onClick={() => handleDateClick(day.date)}
          size={size}
          isBlocked={day.isBlocked}
          blockReason={day.blockReason}
        />
      ))}
    </div>
  );
};

/**
 * Hook para generar datos de ejemplo de disponibilidad semanal
 */
export const useWeeklyAvailabilityData = (startDate: Date) => {
  const weekData = [];
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Simular disponibilidad variable
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const slotsCount = isWeekend ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10);
    
    weekData.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[date.getDay()],
      slotsCount
    });
  }
  
  return weekData;
};

export default AvailabilityIndicator;
