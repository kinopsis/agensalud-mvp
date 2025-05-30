'use client';

/**
 * WeeklyAvailabilitySelector Component
 * 
 * Componente avanzado para selección de fechas con vista semanal,
 * indicadores de densidad de disponibilidad y navegación intuitiva.
 * Reemplaza al DateSelector tradicional en UnifiedAppointmentFlow.
 * 
 * Características principales:
 * - Vista semanal con indicadores de densidad visual
 * - Navegación fluida entre semanas
 * - Colores semafóricos para disponibilidad (verde/amarillo/rojo/gris)
 * - Integración con sugerencias de IA
 * - Soporte para flujos Express y Personalized
 * - Arquitectura multi-tenant
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 1
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Zap, AlertCircle } from 'lucide-react';
import AvailabilityIndicator, { WeeklyAvailability } from './AvailabilityIndicator';
import SmartSuggestionsDisplay from '@/components/ai/SmartSuggestionsDisplay';
import { SmartSuggestionsEngine, type SmartSuggestion, type SuggestionsResult } from '@/lib/ai/SmartSuggestionsEngine';
import { validateMultipleDates, type DateValidationResult } from '@/lib/utils/dateValidation';

/**
 * Tipos de disponibilidad para indicadores visuales
 */
export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Datos de disponibilidad por día
 */
interface DayAvailabilityData {
  date: string;
  dayName: string;
  slotsCount: number;
  availabilityLevel: AvailabilityLevel;
  isToday?: boolean;
  isTomorrow?: boolean;
  isWeekend?: boolean;
}

/**
 * Contexto de IA para pre-cargar sugerencias
 */
interface AIContext {
  suggestedDates?: string[];
  preferredTimeRange?: 'morning' | 'afternoon' | 'evening';
  urgencyLevel?: 'low' | 'medium' | 'high';
  flexibilityLevel?: 'rigid' | 'flexible' | 'very-flexible';
  extractedPreferences?: {
    preferredDays?: string[];
    avoidedDays?: string[];
    timePreferences?: string[];
  };
}

/**
 * Props del componente WeeklyAvailabilitySelector
 */
interface WeeklyAvailabilitySelectorProps {
  /** Título del selector */
  title: string;
  /** Subtítulo descriptivo */
  subtitle: string;
  /** Fecha seleccionada actualmente */
  selectedDate?: string;
  /** Callback cuando se selecciona una fecha */
  onDateSelect: (date: string) => void;
  /** ID de la organización (multi-tenant) */
  organizationId: string;
  /** ID del servicio seleccionado */
  serviceId?: string;
  /** ID del doctor seleccionado (opcional) */
  doctorId?: string;
  /** ID de la ubicación seleccionada (opcional) */
  locationId?: string;
  /** Fecha mínima seleccionable */
  minDate?: string;
  /** Mostrar indicadores de densidad */
  showDensityIndicators?: boolean;
  /** Habilitar sugerencias inteligentes */
  enableSmartSuggestions?: boolean;
  /** Contexto de IA para sugerencias */
  aiContext?: AIContext;
  /** Modo de entrada (AI vs manual) */
  entryMode?: 'ai' | 'manual';
  /** Usar sugerencias compactas */
  compactSuggestions?: boolean;
  /** Callback para cargar disponibilidad */
  onLoadAvailability?: (params: {
    organizationId: string;
    serviceId?: string;
    doctorId?: string;
    locationId?: string;
    startDate: string;
    endDate: string;
  }) => Promise<DayAvailabilityData[]>;
  /** Estado de carga */
  loading?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Hook para generar datos de disponibilidad semanal
 */
const useWeeklyAvailabilityData = (
  startDate: Date,
  organizationId: string,
  serviceId?: string,
  doctorId?: string,
  locationId?: string,
  onLoadAvailability?: WeeklyAvailabilitySelectorProps['onLoadAvailability']
) => {
  const [weekData, setWeekData] = useState<DayAvailabilityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeekData = useCallback(async () => {
    if (!onLoadAvailability) {
      // Generar datos de ejemplo si no hay función de carga
      const mockData: DayAvailabilityData[] = [];
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      // DEBUG: Log inicial para investigar problema de fechas
      console.log('=== DEBUG FECHA GENERACIÓN ===');
      console.log('startDate original:', startDate);
      console.log('startDate ISO:', startDate.toISOString());
      console.log('startDate timezone offset:', startDate.getTimezoneOffset());

      for (let i = 0; i < 7; i++) {
        // CRITICAL FIX: Use timezone-safe date calculation
        // Instead of setDate() which can cause timezone issues, use direct date arithmetic
        const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);

        // DEBUG: Log antes de cálculo
        console.log(`Día ${i} (antes cálculo):`, {
          startDateYear: startDate.getFullYear(),
          startDateMonth: startDate.getMonth(),
          startDateDate: startDate.getDate(),
          indexI: i,
          calculation: startDate.getDate() + i
        });

        // DEBUG: Log después de cálculo timezone-safe
        console.log(`Día ${i} (después cálculo timezone-safe):`, {
          newDate: date.toISOString(),
          getDate: date.getDate(),
          getDay: date.getDay(),
          dayName: dayNames[date.getDay()],
          localDateString: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación
        date.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación

        const isToday = date.getTime() === today.getTime();
        const isPastDate = date.getTime() < today.getTime();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const isTomorrow = date.getTime() === tomorrow.getTime();

        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        // CRITICAL FIX: Use timezone-safe date formatting (moved up to be available for logging)
        const finalDateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // CRITICAL FIX: Apply 4-hour rule validation during weekData generation
        // This ensures that dates that don't meet the 4-hour rule are marked as 'none' from the start
        let slotsCount = 0;
        let availabilityLevel: AvailabilityLevel = 'none';

        if (isPastDate) {
          availabilityLevel = 'none'; // Fechas pasadas siempre sin disponibilidad
          slotsCount = 0;
        } else {
          // Generate initial slots count
          const initialSlotsCount = isWeekend ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10);

          // CRITICAL FIX: Apply 4-hour advance booking rule validation
          // Check if this date would have any valid slots after applying the 4-hour rule
          const MINIMUM_ADVANCE_HOURS = 4;
          const MINIMUM_ADVANCE_MINUTES = MINIMUM_ADVANCE_HOURS * 60;
          const now = new Date();

          // Generate typical business hours for this date
          const businessHours = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

          // Count how many slots would be valid after 4-hour rule
          let validSlotsCount = 0;
          if (initialSlotsCount > 0) {
            businessHours.forEach(timeSlot => {
              const [hours, minutes] = timeSlot.split(':').map(Number);
              const slotDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);

              const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
              const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));

              if (timeDifferenceMinutes >= MINIMUM_ADVANCE_MINUTES) {
                validSlotsCount++;
              }
            });

            // Only count slots that would actually be available after 4-hour rule
            slotsCount = Math.min(initialSlotsCount, validSlotsCount);
          }

          // Set availability level based on valid slots count
          if (slotsCount === 0) {
            availabilityLevel = 'none';
          } else if (slotsCount <= 2) {
            availabilityLevel = 'low';
          } else if (slotsCount <= 5) {
            availabilityLevel = 'medium';
          } else {
            availabilityLevel = 'high';
          }

          console.log(`🔍 VALIDACIÓN 4H INTEGRADA - ${finalDateString}:`, {
            initialSlotsCount,
            validSlotsCount,
            finalSlotsCount: slotsCount,
            availabilityLevel,
            isWeekend,
            timeDifferenceToFirstSlot: businessHours.length > 0 ? Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0).getTime() - now.getTime()) / (1000 * 60)) : 'N/A'
          });
        }

        // DEBUG: Log datos finales con comparación
        console.log(`Día ${i} (datos finales):`, {
          date: finalDateString,
          dateISO: date.toISOString().split('T')[0],
          dateLocal: finalDateString,
          dayName: dayNames[date.getDay()],
          slotsCount,
          availabilityLevel,
          isToday,
          isTomorrow,
          isWeekend,
          timezoneComparison: {
            iso: date.toISOString().split('T')[0],
            local: finalDateString,
            match: date.toISOString().split('T')[0] === finalDateString
          }
        });

        mockData.push({
          date: finalDateString, // Use timezone-safe formatting
          dayName: dayNames[date.getDay()],
          slotsCount,
          availabilityLevel,
          isToday,
          isTomorrow,
          isWeekend
        });
      }

      console.log('=== DEBUG MOCK DATA FINAL ===');
      console.log('mockData completo:', mockData);
      console.log('================================');
      
      setWeekData(mockData);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const data = await onLoadAvailability({
        organizationId,
        serviceId,
        doctorId,
        locationId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      // CRITICAL FIX: Apply 4-hour validation to real API data
      // The API returns data with availabilityLevel, but we need to validate it against 4-hour rule
      console.log('=== APLICANDO VALIDACIÓN 4H A DATOS REALES ===');
      console.log('Datos originales del API:', data);

      const processedData = data.map(day => {
        console.log(`🔍 VALIDACIÓN 4H REAL - ${day.date}:`, {
          originalAvailabilityLevel: day.availabilityLevel,
          originalSlotsCount: day.slotsCount
        });

        // Apply 4-hour rule validation to real data
        const MINIMUM_ADVANCE_HOURS = 4;
        const MINIMUM_ADVANCE_MINUTES = MINIMUM_ADVANCE_HOURS * 60;
        const now = new Date();

        // Parse date components safely
        const [year, month, dayNum] = day.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, dayNum);

        // Check if it's a past date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateObj.setHours(0, 0, 0, 0);
        const isPastDate = dateObj.getTime() < today.getTime();

        if (isPastDate) {
          console.log(`📅 ${day.date}: FECHA PASADA - forzando availabilityLevel = 'none'`);
          return {
            ...day,
            availabilityLevel: 'none' as const,
            slotsCount: 0
          };
        }

        // For current and future dates, check 4-hour rule
        if (day.availabilityLevel !== 'none' && day.slotsCount > 0) {
          // Generate typical business hours to validate against 4-hour rule
          const businessHours = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

          let validSlotsCount = 0;
          businessHours.forEach(timeSlot => {
            const [hours, minutes] = timeSlot.split(':').map(Number);
            const slotDateTime = new Date(year, month - 1, dayNum, hours, minutes);

            const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
            const timeDifferenceMinutes = Math.floor(timeDifferenceMs / (1000 * 60));

            if (timeDifferenceMinutes >= MINIMUM_ADVANCE_MINUTES) {
              validSlotsCount++;
            }
          });

          // If no slots meet the 4-hour rule, override the API data
          if (validSlotsCount === 0) {
            console.log(`📅 ${day.date}: SIN SLOTS VÁLIDOS (4H) - forzando availabilityLevel = 'none'`);
            return {
              ...day,
              availabilityLevel: 'none' as const,
              slotsCount: 0
            };
          } else {
            // Adjust slots count based on valid slots
            const adjustedSlotsCount = Math.min(day.slotsCount, validSlotsCount);
            let adjustedAvailabilityLevel = day.availabilityLevel;

            // Recalculate availability level based on valid slots
            if (adjustedSlotsCount <= 2) {
              adjustedAvailabilityLevel = 'low';
            } else if (adjustedSlotsCount <= 5) {
              adjustedAvailabilityLevel = 'medium';
            } else {
              adjustedAvailabilityLevel = 'high';
            }

            console.log(`📅 ${day.date}: SLOTS AJUSTADOS (4H) - original: ${day.slotsCount}, válidos: ${validSlotsCount}, final: ${adjustedSlotsCount}, level: ${adjustedAvailabilityLevel}`);

            return {
              ...day,
              availabilityLevel: adjustedAvailabilityLevel,
              slotsCount: adjustedSlotsCount
            };
          }
        }

        // If already 'none' or 0 slots, keep as is
        console.log(`📅 ${day.date}: SIN CAMBIOS - ya era 'none' o 0 slots`);
        return day;
      });

      console.log('Datos procesados con validación 4H:', processedData);
      console.log('===============================================');

      setWeekData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando disponibilidad');
      console.error('Error loading availability data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, organizationId, serviceId, doctorId, locationId, onLoadAvailability]);

  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  return { weekData, loading, error, refetch: loadWeekData };
};

/**
 * Componente principal WeeklyAvailabilitySelector
 */
const WeeklyAvailabilitySelector: React.FC<WeeklyAvailabilitySelectorProps> = ({
  title,
  subtitle,
  selectedDate,
  onDateSelect,
  organizationId,
  serviceId,
  doctorId,
  locationId,
  minDate,
  showDensityIndicators = true,
  enableSmartSuggestions = false,
  aiContext,
  entryMode = 'manual',
  compactSuggestions = false,
  onLoadAvailability,
  loading: externalLoading = false,
  className = ''
}) => {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo como inicio de semana
    return startOfWeek;
  });

  const { weekData, loading: dataLoading, error, refetch } = useWeeklyAvailabilityData(
    currentWeek,
    organizationId,
    serviceId,
    doctorId,
    locationId,
    onLoadAvailability
  );

  // Smart Suggestions state
  const [smartSuggestions, setSmartSuggestions] = useState<SuggestionsResult | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);

  const isLoading = externalLoading || dataLoading;

  /**
   * CRITICAL FEATURE: UI-level date blocking validation
   * SIMPLIFIED: Now that 4-hour rule is integrated into weekData generation,
   * we primarily use availabilityLevel to determine blocking state
   */
  const dateValidationResults = useMemo(() => {
    if (weekData.length === 0) return {};

    console.log('=== DEBUG DATE BLOCKING VALIDATION (SIMPLIFIED) ===');

    const validationResults: Record<string, DateValidationResult> = {};

    weekData.forEach(day => {
      const isBlocked = day.availabilityLevel === 'none';

      // CRITICAL FIX: Proper date comparison logic to distinguish between past dates and 4-hour rule blocks
      let reason: string | undefined = undefined;

      if (isBlocked) {
        // Parse date components safely to avoid timezone issues
        const [year, month, dayNum] = day.date.split('-').map(Number);
        const dayDateObj = new Date(year, month - 1, dayNum);

        // Get today's date normalized to midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dayDateObj.setHours(0, 0, 0, 0);

        // Check if it's actually a past date
        const isPastDate = dayDateObj.getTime() < today.getTime();

        if (isPastDate) {
          reason = 'Fecha pasada - No se pueden agendar citas en fechas anteriores';
          console.log(`🔍 REASON LOGIC - ${day.date}: FECHA PASADA detectada (${dayDateObj.toDateString()} < ${today.toDateString()})`);
        } else {
          // It's a current or future date blocked by 4-hour rule
          reason = 'Reserva con mínimo 4 horas de anticipación requerida';
          console.log(`🔍 REASON LOGIC - ${day.date}: REGLA 4H detectada (${dayDateObj.toDateString()} >= ${today.toDateString()})`);
        }
      }

      validationResults[day.date] = {
        isValid: !isBlocked,
        reason
      };

      console.log(`📅 ${day.date}: availabilityLevel=${day.availabilityLevel}, isBlocked=${isBlocked}, reason="${reason}"`);
    });

    console.log('Simplified validation results:', validationResults);
    console.log('=============================================');

    return validationResults;
  }, [weekData]);

  /**
   * Enhanced week data with blocking information
   */
  const enhancedWeekData = useMemo(() => {
    return weekData.map(day => {
      const validation = dateValidationResults[day.date];
      const isBlocked = validation && !validation.isValid;

      return {
        ...day,
        isBlocked,
        blockReason: validation?.reason,
        validationResult: validation
      };
    });
  }, [weekData, dateValidationResults]);

  /**
   * Navegar entre semanas
   */
  const navigateWeek = (direction: 'prev' | 'next') => {
    // DEBUG: Log navegación semanal
    console.log('=== DEBUG NAVEGACIÓN SEMANAL ===');
    console.log('Dirección:', direction);
    console.log('currentWeek actual:', currentWeek);
    console.log('currentWeek ISO:', currentWeek.toISOString());
    console.log('minDate prop:', minDate);

    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));

    console.log('newWeek calculada:', newWeek);
    console.log('newWeek ISO:', newWeek.toISOString());

    // Validar fecha mínima
    if (minDate && direction === 'prev') {
      const minDateObj = new Date(minDate);
      console.log('minDateObj:', minDateObj);
      console.log('Comparación newWeek < minDateObj:', newWeek < minDateObj);

      if (newWeek < minDateObj) {
        console.log('BLOQUEADO por minDate - no se permite navegar antes de fecha mínima');
        console.log('================================');
        return; // No permitir navegar antes de la fecha mínima
      }
    }

    // Validar que no se navegue a semanas completamente en el pasado
    if (direction === 'prev') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log('today normalizado:', today);

      // Calcular el último día de la nueva semana
      const endOfNewWeek = new Date(newWeek);
      endOfNewWeek.setDate(newWeek.getDate() + 6);
      endOfNewWeek.setHours(0, 0, 0, 0);
      console.log('endOfNewWeek:', endOfNewWeek);
      console.log('Comparación endOfNewWeek < today:', endOfNewWeek.getTime() < today.getTime());

      // Si toda la semana está en el pasado, no permitir navegación
      if (endOfNewWeek.getTime() < today.getTime()) {
        console.log('BLOQUEADO por semana en el pasado');
        console.log('================================');
        return;
      }
    }

    console.log('NAVEGACIÓN PERMITIDA - actualizando currentWeek');
    console.log('================================');
    setCurrentWeek(newWeek);
  };

  /**
   * Formatear rango de semana
   */
  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const month = startDate.toLocaleDateString('es-ES', { month: 'long' });
    const year = startDate.getFullYear();
    
    return `${startDay}-${endDay} ${month} ${year}`;
  };

  /**
   * Manejar selección de fecha con validación de bloqueo
   */
  const handleDateSelect = (date: string) => {
    // DEBUG: Log selección de fecha con análisis timezone
    console.log('=== DEBUG SELECCIÓN FECHA (TIMEZONE-SAFE + BLOCKING) ===');
    console.log('Fecha seleccionada (string):', date);

    // CRITICAL FEATURE: Check if date is blocked by UI validation
    const validation = dateValidationResults[date];
    const isBlocked = validation && !validation.isValid;

    console.log('Validación de bloqueo:');
    console.log('  - validation:', validation);
    console.log('  - isBlocked:', isBlocked);
    console.log('  - blockReason:', validation?.reason);

    if (isBlocked) {
      console.log('🚫 FECHA BLOQUEADA - No se permite selección');
      console.log('Razón:', validation?.reason);
      console.log('=======================================');

      // Show user feedback (could be enhanced with toast notification)
      alert(`Esta fecha no está disponible: ${validation?.reason}`);
      return;
    }

    // CRITICAL FIX: Create timezone-safe Date object
    // Problem: new Date("2025-05-29") creates May 28 in GMT-0500
    // Solution: Parse date components manually to avoid UTC interpretation
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    const localDateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

    // Also create UTC version for comparison
    const dateObjUTC = new Date(date); // This creates the problematic UTC interpretation

    console.log('Date object creado (timezone-safe):', dateObj);
    console.log('Date object creado (UTC interpretation):', dateObjUTC);
    console.log('Date object ISO (UTC):', dateObjUTC.toISOString());
    console.log('Date object local string (timezone-safe):', localDateString);
    console.log('Timezone offset (minutes):', dateObj.getTimezoneOffset());

    // CRITICAL FIX: Correct timezone desfase detection logic using timezone-safe objects
    const utcDateStringFromUTC = dateObjUTC.toISOString().split('T')[0];
    const utcDateStringFromLocal = dateObj.toISOString().split('T')[0];
    const hasTimezoneDesfase = date !== utcDateStringFromUTC;

    console.log('Comparación timezone (CORREGIDA):');
    console.log('  - date (input):', date);
    console.log('  - utcDateString (from UTC obj):', utcDateStringFromUTC);
    console.log('  - utcDateString (from local obj):', utcDateStringFromLocal);
    console.log('  - localDateString (timezone-safe):', localDateString);
    console.log('¿Hay desfase timezone?:', hasTimezoneDesfase);
    console.log('¿Date objects son consistentes?:', localDateString === date);

    console.log('minDate:', minDate);
    console.log('Comparación date < minDate:', date < minDate);

    // Validar fecha mínima
    if (minDate && date < minDate) {
      console.log('BLOQUEADO por minDate');
      console.log('=======================================');
      return;
    }

    console.log('✅ FECHA VÁLIDA - LLAMANDO onDateSelect con fecha timezone-safe:', date);
    onDateSelect(date);
    console.log('=======================================');
  };

  /**
   * Generar sugerencias inteligentes usando SmartSuggestionsEngine
   */
  const generateSmartSuggestions = useCallback(async () => {
    if (!enableSmartSuggestions || !aiContext || weekData.length === 0) {
      return;
    }

    setLoadingSuggestions(true);

    try {
      const suggestionsEngine = new SmartSuggestionsEngine(organizationId);

      // Convertir weekData a formato de opciones disponibles
      const availableOptions = weekData
        .filter(day => day.availabilityLevel !== 'none')
        .flatMap(day =>
          day.slots?.map(slot => ({
            date: day.date,
            time: slot.time,
            doctorId: slot.doctorId,
            doctorName: slot.doctorName,
            available: slot.available,
            price: slot.price
          })) || [{
            date: day.date,
            time: '09:00', // Tiempo por defecto
            available: true
          }]
        );

      if (availableOptions.length === 0) {
        setSmartSuggestions(null);
        return;
      }

      const result = await suggestionsEngine.generateSuggestions(
        aiContext,
        availableOptions
      );

      setSmartSuggestions(result);
      setShowSmartSuggestions(true);
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      setSmartSuggestions(null);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [enableSmartSuggestions, aiContext, weekData, organizationId]);

  /**
   * Obtener sugerencias de IA básicas (fallback)
   */
  const getAISuggestions = () => {
    if (!enableSmartSuggestions || !aiContext?.suggestedDates) {
      return [];
    }

    return weekData.filter(day =>
      aiContext.suggestedDates?.includes(day.date) &&
      day.availabilityLevel !== 'none'
    );
  };

  const aiSuggestions = getAISuggestions();

  // Generar sugerencias inteligentes cuando cambian los datos
  useEffect(() => {
    if (enableSmartSuggestions && aiContext && weekData.length > 0) {
      generateSmartSuggestions();
    }
  }, [generateSmartSuggestions]);

  /**
   * Manejar selección de sugerencia inteligente
   */
  const handleSmartSuggestionSelect = (suggestion: SmartSuggestion) => {
    if (suggestion.data.date) {
      handleDateSelect(suggestion.data.date);
    }
    setShowSmartSuggestions(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-600" />
          {title}
        </h3>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      {/* Smart AI Suggestions (Fase 3) */}
      {enableSmartSuggestions && showSmartSuggestions && smartSuggestions && (
        <div className="mb-6">
          <SmartSuggestionsDisplay
            suggestionsResult={smartSuggestions}
            onSuggestionSelect={handleSmartSuggestionSelect}
            loading={loadingSuggestions}
            showMetrics={false}
            compact={compactSuggestions}
          />
        </div>
      )}

      {/* AI Suggestions Fallback (Fase 2) */}
      {enableSmartSuggestions && !showSmartSuggestions && aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-2 text-purple-600" />
            Sugerencias inteligentes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiSuggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={suggestion.date}
                type="button"
                onClick={() => handleDateSelect(suggestion.date)}
                className="p-3 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors text-left"
              >
                <div className="text-sm font-medium text-gray-900">
                  {suggestion.isToday ? 'Hoy' : suggestion.isTomorrow ? 'Mañana' : suggestion.dayName}
                </div>
                <div className="text-xs text-gray-600">{suggestion.date}</div>
                <div className="text-xs text-purple-600 mt-1">
                  {index === 0 && '⭐ Recomendado'}
                  {index === 1 && '🕐 Flexible'}
                  {index === 2 && '🚀 Próximo'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Smart Suggestions */}
      {enableSmartSuggestions && loadingSuggestions && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span className="text-purple-800 font-medium">Generando sugerencias inteligentes...</span>
          </div>
        </div>
      )}

      {/* Weekly Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigateWeek('prev')}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </button>
        
        <h4 className="text-lg font-semibold text-gray-900">
          {formatWeekRange(currentWeek)}
        </h4>
        
        <button
          type="button"
          onClick={() => navigateWeek('next')}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Cargando disponibilidad...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700 font-medium">Error cargando disponibilidad</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Weekly Availability Indicators with Date Blocking */}
      {!isLoading && !error && enhancedWeekData.length > 0 && (
        <div className="mb-6">
          <WeeklyAvailability
            weekData={enhancedWeekData.map(day => ({
              date: day.date,
              dayName: day.dayName,
              slotsCount: day.slotsCount,
              isBlocked: day.isBlocked,
              blockReason: day.blockReason
            }))}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            size="lg"
          />
        </div>
      )}

      {/* Density Legend (si está habilitado) */}
      {showDensityIndicators && !isLoading && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Disponibilidad:</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Alta (6+ slots)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Media (3-5 slots)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Baja (1-2 slots)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
              <span className="text-gray-600">No disponible</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && weekData.length === 0 && (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Sin disponibilidad</h4>
          <p className="text-gray-600">No hay horarios disponibles para esta semana.</p>
          <button
            type="button"
            onClick={() => navigateWeek('next')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver próxima semana
          </button>
        </div>
      )}
    </div>
  );
};

export default WeeklyAvailabilitySelector;
