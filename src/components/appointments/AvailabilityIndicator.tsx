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
import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';

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
    // CRITICAL FIX: Use ImmutableDateSystem to avoid timezone displacement
    try {
      const components = ImmutableDateSystem.parseDate(dateString);
      const dayNumber = components.day.toString();

      // CRITICAL: Enhanced debugging for visual-to-data correlation
      console.log(`🔍 VISUAL DISPLAY: formatDate(${dateString}) → visual day: ${dayNumber}`);

      return dayNumber;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      // Fallback to safe parsing
      const [year, month, day] = dateString.split('-').map(Number);
      console.log(`🔍 VISUAL DISPLAY: formatDate(${dateString}) → fallback day: ${day}`);
      return day.toString();
    }
  };

  const formatFullDate = (dateString: string): string => {
    // CRITICAL FIX: Use ImmutableDateSystem to avoid timezone displacement
    return ImmutableDateSystem.formatForDisplay(dateString, 'es-ES');
  };

  const handleClick = () => {
    // CRITICAL: Enhanced debugging for visual-to-backend correlation
    const visualDay = formatDate(date);
    console.log('🔍 AVAILABILITY INDICATOR: Click initiated');
    console.log(`📅 VISUAL-TO-DATA: Visual day "${visualDay}" corresponds to date "${date}"`);
    console.log(`🔍 CLICK CORRELATION: User sees day ${visualDay}, system will process ${date}`);

    // CRITICAL FEATURE: Block click if date is blocked
    if (isBlocked) {
      console.log('🚫 CLICK BLOQUEADO - Fecha no disponible:', blockReason);
      return;
    }

    // Validar que no sea fecha pasada usando ImmutableDateSystem
    const isPastDate = ImmutableDateSystem.isPastDate(date);

    if (onClick && level !== 'none' && level !== 'blocked' && !isPastDate) {
      console.log(`✅ AVAILABILITY INDICATOR: Calling onClick for ${date} (visual day ${visualDay})`);
      onClick();
    } else {
      console.log(`🚫 AVAILABILITY INDICATOR: Click blocked for ${date} (visual day ${visualDay})`, {
        hasOnClick: !!onClick,
        level,
        isBlocked,
        isPastDate
      });
    }
  };

  // Verificar si es fecha pasada usando ImmutableDateSystem
  const isPastDate = ImmutableDateSystem.isPastDate(date);

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
   * CRITICAL ENHANCEMENT: Advanced date click tracking with displacement detection
   * Comprehensive logging and correlation checking for validation system
   */
  const handleDateClick = (dateString: string) => {
    // CRITICAL: Enhanced date click tracking for validation system
    const clickTimestamp = new Date().toISOString();
    const clickId = `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('=== ENHANCED WEEKLY AVAILABILITY CLICK TRACKING ===');
    console.log('🔍 Date clicked:', dateString);
    console.log('🆔 Click ID:', clickId);
    console.log('⏰ Timestamp:', clickTimestamp);

    // Track the exact clicked date for validation correlation
    if (window.trackDateEvent) {
      window.trackDateEvent('DATE_CLICK_INITIATED', {
        clickedDate: dateString,
        clickTimestamp,
        clickId,
        component: 'WeeklyAvailability',
        source: 'handleDateClick'
      }, 'WeeklyAvailability');
    }

    // CRITICAL: Store clicked date for correlation tracking
    if (typeof window !== 'undefined') {
      window.lastClickedDate = {
        date: dateString,
        timestamp: clickTimestamp,
        clickId,
        component: 'WeeklyAvailability'
      };
      console.log('💾 Stored clicked date for correlation:', window.lastClickedDate);
    }

    // SIMPLIFIED: Basic format validation only
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      console.error('❌ FORMATO DE FECHA INCORRECTO:', dateString);

      if (window.trackDateEvent) {
        window.trackDateEvent('DATE_CLICK_VALIDATION_FAILED', {
          clickedDate: dateString,
          clickId,
          error: 'Invalid date format'
        }, 'WeeklyAvailability');
      }
      return;
    }

    // DISRUPTIVE: Validate date using ImmutableDateSystem
    const validation = ImmutableDateSystem.validateAndNormalize(dateString, 'WeeklyAvailability');

    if (!validation.isValid) {
      console.error('❌ WEEKLY AVAILABILITY: Date validation failed:', validation.error);

      if (window.trackDateEvent) {
        window.trackDateEvent('DATE_CLICK_IMMUTABLE_VALIDATION_FAILED', {
          clickedDate: dateString,
          clickId,
          error: validation.error
        }, 'WeeklyAvailability');
      }
      return;
    }

    if (validation.displacement?.detected) {
      console.error('🚨 WEEKLY AVAILABILITY: DATE DISPLACEMENT DETECTED ON CLICK!', {
        clickedDate: dateString,
        normalizedDate: validation.normalizedDate,
        displacement: validation.displacement
      });

      if (window.trackDateEvent) {
        window.trackDateEvent('DATE_CLICK_DISPLACEMENT_DETECTED', {
          clickedDate: dateString,
          normalizedDate: validation.normalizedDate,
          displacement: validation.displacement,
          clickId
        }, 'WeeklyAvailability');
      }
    }

    console.log('✅ Passing date directly to parent (no timezone manipulation):', dateString);
    console.log('✅ Complex timezone logic removed to prevent displacement');

    // Track the callback invocation
    if (window.trackDateEvent) {
      window.trackDateEvent('DATE_CLICK_CALLBACK_INVOKED', {
        clickedDate: dateString,
        clickId,
        callbackTarget: 'onDateSelect'
      }, 'WeeklyAvailability');
    }

    // SIMPLIFIED: Direct date passing without any manipulation
    onDateSelect?.(dateString);

    console.log('🎯 Date click processing completed');
    console.log('=========================================');

    // Schedule correlation check after a short delay to allow time slot updates
    setTimeout(() => {
      checkDateCorrelation(dateString, clickId);
    }, 500);
  };

  /**
   * CRITICAL: Check correlation between clicked date and displayed time slot header
   */
  const checkDateCorrelation = (clickedDate: string, clickId: string) => {
    console.log('🔍 CORRELATION CHECK: Verifying clicked date vs displayed date');
    console.log('📊 Clicked date:', clickedDate);
    console.log('🆔 Click ID:', clickId);

    // Find time slot headers in the DOM
    const timeSlotHeaders = document.querySelectorAll('*');
    let foundHeaders: { element: Element; text: string; extractedDate: string | null }[] = [];

    timeSlotHeaders.forEach(element => {
      const text = element.textContent || '';
      if (text.includes('Horarios disponibles para')) {
        const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
        foundHeaders.push({
          element,
          text,
          extractedDate: dateMatch ? dateMatch[1] : null
        });
      }
    });

    console.log('📋 CORRELATION CHECK: Found time slot headers:', foundHeaders.length);
    foundHeaders.forEach((header, index) => {
      console.log(`  ${index + 1}. "${header.text}" → Date: ${header.extractedDate}`);
    });

    foundHeaders.forEach((header, index) => {
      const isCorrect = header.extractedDate === clickedDate;
      const isDisplacement = header.extractedDate && header.extractedDate !== clickedDate;

      if (window.trackDateEvent) {
        window.trackDateEvent('DATE_CORRELATION_CHECK', {
          clickedDate,
          displayedDate: header.extractedDate,
          headerText: header.text,
          isCorrect,
          isDisplacement,
          clickId,
          headerIndex: index
        }, 'WeeklyAvailability');
      }

      if (isDisplacement) {
        console.error('🚨 DATE DISPLACEMENT CONFIRMED!', {
          clickedDate,
          displayedDate: header.extractedDate,
          headerText: header.text,
          displacement: {
            detected: true,
            daysDifference: calculateDaysDifference(clickedDate, header.extractedDate)
          }
        });

        // Track critical displacement event
        if (window.trackDateEvent) {
          window.trackDateEvent('CRITICAL_DATE_DISPLACEMENT_CONFIRMED', {
            clickedDate,
            displayedDate: header.extractedDate,
            headerText: header.text,
            clickId,
            severity: 'CRITICAL'
          }, 'WeeklyAvailability');
        }

        // Alert user about displacement
        if (window.advancedDateTracker?.config?.alertOnDisplacement) {
          alert(`🚨 DATE DISPLACEMENT DETECTED!\n\nClicked: ${clickedDate}\nShowing: ${header.extractedDate}\n\nThis is the bug we're trying to fix!`);
        }
      } else if (isCorrect) {
        console.log('✅ DATE CORRELATION CORRECT:', {
          clickedDate,
          displayedDate: header.extractedDate
        });

        if (window.trackDateEvent) {
          window.trackDateEvent('DATE_CORRELATION_CORRECT', {
            clickedDate,
            displayedDate: header.extractedDate,
            clickId
          }, 'WeeklyAvailability');
        }
      }
    });

    // If no headers found, track that too
    if (foundHeaders.length === 0) {
      console.log('⚠️ No time slot headers found for correlation check');

      if (window.trackDateEvent) {
        window.trackDateEvent('NO_TIME_SLOT_HEADERS_FOUND', {
          clickedDate,
          clickId,
          searchPerformed: true
        }, 'WeeklyAvailability');
      }
    }
  };

  /**
   * Calculate difference in days between two dates
   */
  const calculateDaysDifference = (date1: string, date2: string): number => {
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
  };

  // CRITICAL: Enhanced logging for date transformation pipeline
  console.log('🔍 WEEKLY AVAILABILITY: Rendering week data:', weekData.map(day => ({
    date: day.date,
    dayName: day.dayName,
    isSelected: selectedDate === day.date
  })));

  return (
    <div className="flex justify-center space-x-2">
      {weekData.map((day) => {
        console.log(`🔍 WEEKLY AVAILABILITY: Rendering day ${day.date} (${day.dayName}) - selected: ${selectedDate === day.date}`);

        return (
          <AvailabilityIndicator
            key={day.date}
            date={day.date}
            dayName={day.dayName}
            slotsCount={day.slotsCount}
            isSelected={selectedDate === day.date}
            onClick={() => {
              console.log(`🔍 WEEKLY AVAILABILITY: Click initiated for ${day.date} (${day.dayName})`);
              handleDateClick(day.date);
            }}
            size={size}
            isBlocked={day.isBlocked}
            blockReason={day.blockReason}
          />
        );
      })}
    </div>
  );
};

/**
 * Hook para generar datos de ejemplo de disponibilidad semanal
 */
export const useWeeklyAvailabilityData = (startDate: Date) => {
  // DISRUPTIVE: Use ImmutableDateSystem for displacement-safe date operations

  const weekData = [];
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // DISRUPTIVE: Use ImmutableDateSystem for displacement-safe week generation
  const startDateStr = startDate.toISOString().split('T')[0];
  const weekDates = ImmutableDateSystem.generateWeekDates(startDateStr);
  console.log('🔧 AvailabilityIndicator: Using ImmutableDateSystem.generateWeekDates for weekly data');

  for (let i = 0; i < 7; i++) {
    const dateStr = weekDates[i];

    // DISPLACEMENT-SAFE: Parse date components safely
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // Simular disponibilidad variable
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const slotsCount = isWeekend ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10);

    weekData.push({
      date: dateStr, // Use the displacement-safe date string directly
      dayName: dayNames[date.getDay()],
      slotsCount
    });

    console.log(`📅 AvailabilityIndicator.weekData[${i}]: ${dateStr} (${dayNames[date.getDay()]})`);
  }

  return weekData;
};

export default AvailabilityIndicator;
