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

import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';
import { DataIntegrityValidator } from '@/lib/core/DataIntegrityValidator';

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
  slots?: Array<{
    id: string;
    time: string;
    doctorId: string;
    doctorName: string;
    available: boolean;
    specialization?: string;
    consultationFee?: number;
    price?: number;
  }>;
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
  /** Rol del usuario para validación basada en roles (MVP) */
  userRole?: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin';
  /** Forzar reglas estándar incluso para usuarios privilegiados */
  useStandardRules?: boolean;
}

/**
 * ENHANCED Hook using Unified Architecture - DISRUPTIVE SOLUTION
 * Uses the new centralized data management system to eliminate inconsistencies
 */
const useWeeklyAvailabilityData = (
  startDate: Date,
  organizationId: string,
  serviceId?: string,
  doctorId?: string,
  locationId?: string,
  onLoadAvailability?: WeeklyAvailabilitySelectorProps['onLoadAvailability'],
  userRole?: 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin',
  useStandardRules?: boolean
) => {
  // DISRUPTIVE CHANGE: Use ImmutableDateSystem for all date operations
  const startDateStr = useMemo(() => {
    const inputDateStr = startDate.toISOString().split('T')[0];
    console.log('🔍 WEEKLY DATA: useWeeklyAvailabilityData called with startDate:', startDate);
    console.log('🔍 WEEKLY DATA: Converted to string:', inputDateStr);

    const validation = ImmutableDateSystem.validateAndNormalize(
      inputDateStr,
      'WeeklyAvailabilitySelector'
    );

    if (!validation.isValid) {
      console.error('🚨 Invalid start date in WeeklyAvailabilitySelector:', validation.error);
      return ImmutableDateSystem.getTodayString();
    }

    console.log('🔍 WEEKLY DATA: Validated start date:', validation.normalizedDate);

    // CRITICAL FIX: Always use the actual start of the week for calendar grid consistency
    const actualStartOfWeek = ImmutableDateSystem.getStartOfWeek(validation.normalizedDate!);
    console.log('🔍 WEEKLY DATA: Actual start of week for calendar grid:', actualStartOfWeek);
    console.log('🚨 WEEKLY DATA: CONSISTENCY FIX:', {
      inputDate: validation.normalizedDate,
      startOfWeek: actualStartOfWeek,
      wasFixed: validation.normalizedDate !== actualStartOfWeek
    });

    // FIXED: Return the actual start of week to ensure calendar grid consistency
    return actualStartOfWeek;
  }, [startDate]);

  const endDateStr = useMemo(() => {
    return ImmutableDateSystem.addDays(startDateStr, 6);
  }, [startDateStr]);

  // DISRUPTIVE CHANGE: Use unified data service through context
  const query = useMemo(() => ({
    organizationId,
    startDate: startDateStr,
    endDate: endDateStr,
    serviceId,
    doctorId,
    locationId,
    userRole: userRole || 'patient',
    useStandardRules: useStandardRules || false
  }), [organizationId, startDateStr, endDateStr, serviceId, doctorId, locationId, userRole, useStandardRules]);

  // FIXED: Direct API implementation using the same approach as daily calendar
  const [weekData, setWeekData] = useState<DayAvailabilityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to determine availability level
  const getAvailabilityLevel = (slotsCount: number): 'none' | 'low' | 'medium' | 'high' => {
    if (slotsCount === 0) return 'none';
    if (slotsCount <= 2) return 'low';
    if (slotsCount <= 5) return 'medium';
    return 'high';
  };

  // FIXED: Direct API call using the working /api/doctors/availability endpoint
  const fetchWeeklyAvailability = useCallback(async () => {
    console.log('🔄 WEEKLY CALENDAR: Fetching availability data:', {
      organizationId,
      startDate: startDateStr,
      endDate: endDateStr,
      serviceId: serviceId || 'all',
      doctorId: doctorId || 'all',
      userRole,
      useStandardRules
    });

    setLoading(true);
    setError(null);

    try {
      // Generate array of dates for the week
      const weekDates: string[] = [];
      console.log('🔍 WEEKLY CALENDAR: Generating week dates from:', startDateStr);

      for (let i = 0; i < 7; i++) {
        const date = ImmutableDateSystem.addDays(startDateStr, i);
        const dayName = ImmutableDateSystem.getDayName(date, 'es-ES');
        weekDates.push(date);

        console.log(`📅 WEEKLY CALENDAR: Day ${i}: ${date} → ${dayName}`);
      }

      console.log('✅ WEEKLY CALENDAR: Generated week dates:', weekDates);

      // Fetch availability for each day using the working /api/doctors/availability endpoint
      const weeklyData: DayAvailabilityData[] = [];

      for (const date of weekDates) {
        try {
          const params = new URLSearchParams({
            organizationId,
            date,
            duration: '30'
          });

          // Add optional parameters
          if (serviceId) params.append('serviceId', serviceId);
          if (doctorId) params.append('doctorId', doctorId);

          // Apply role-based rules
          const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole || 'patient');
          if (!isPrivilegedUser || useStandardRules) {
            params.append('useStandardRules', 'true');
          }

          const response = await fetch(`/api/doctors/availability?${params}`);

          if (!response.ok) {
            throw new Error(`Failed to fetch availability for ${date}`);
          }

          const data = await response.json();
          const slots = data.data || [];

          // Convert to DayAvailabilityData format
          const safeDayName = ImmutableDateSystem.getDayName(date, 'es-ES');
          console.log(`🔍 WEEKLY CALENDAR: Processing ${date} → dayName: ${safeDayName}`);

          const dayData: DayAvailabilityData = {
            date,
            dayName: safeDayName,
            slotsCount: slots.length,
            availabilityLevel: getAvailabilityLevel(slots.length),
            isToday: date === ImmutableDateSystem.getTodayString(),
            isTomorrow: date === ImmutableDateSystem.addDays(ImmutableDateSystem.getTodayString(), 1),
            isWeekend: new Date(date).getDay() === 0 || new Date(date).getDay() === 6,
            slots: slots.map((slot: any) => ({
              id: `${slot.doctor_id}-${slot.start_time}`,
              time: slot.start_time,
              doctorId: slot.doctor_id,
              doctorName: slot.doctor_name,
              available: slot.available,
              specialization: slot.specialization,
              consultationFee: slot.consultation_fee
            }))
          };

          weeklyData.push(dayData);

          console.log(`✅ WEEKLY CALENDAR: Fetched ${slots.length} slots for ${date}`);

        } catch (dayError) {
          console.error(`❌ WEEKLY CALENDAR: Error fetching ${date}:`, dayError);

          // Add empty day data to maintain week structure
          weeklyData.push({
            date,
            dayName: ImmutableDateSystem.getDayName(date, 'es-ES'),
            slotsCount: 0,
            availabilityLevel: 'none' as const,
            isToday: date === ImmutableDateSystem.getTodayString(),
            isTomorrow: date === ImmutableDateSystem.addDays(ImmutableDateSystem.getTodayString(), 1),
            isWeekend: new Date(date).getDay() === 0 || new Date(date).getDay() === 6,
            slots: []
          });
        }
      }

      console.log('✅ WEEKLY CALENDAR: All data fetched successfully:', {
        daysCount: weeklyData.length,
        totalSlots: weeklyData.reduce((sum, day) => sum + day.slotsCount, 0),
        dateRange: `${startDateStr} to ${endDateStr}`
      });

      setWeekData(weeklyData);
      setError(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ WEEKLY CALENDAR: Error loading weekly data:', errorMessage);
      setError(errorMessage);
      setWeekData([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, startDateStr, endDateStr, serviceId, doctorId, userRole, useStandardRules]);

  const refetch = useCallback(async () => {
    await fetchWeeklyAvailability();
  }, [fetchWeeklyAvailability]);

  // Load data when parameters change
  useEffect(() => {
    if (organizationId) {
      fetchWeeklyAvailability();
    }
  }, [organizationId, fetchWeeklyAvailability]);

  // Return hook interface compatible with existing component
  return {
    weekData,
    loading,
    error: error || null,
    refetch
  };
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
  className = '',
  userRole = 'patient',
  useStandardRules = false
}) => {
  const [currentWeek, setCurrentWeek] = useState(() => {
    // DISRUPTIVE CHANGE: Use ImmutableDateSystem for all date operations
    const todayStr = ImmutableDateSystem.getTodayString();
    const startOfWeekStr = ImmutableDateSystem.getStartOfWeek(todayStr);

    console.log('🔧 WeeklyAvailabilitySelector: Using ImmutableDateSystem for initialization', {
      today: todayStr,
      startOfWeek: startOfWeekStr
    });

    // Convert back to Date object for compatibility with existing code
    const components = ImmutableDateSystem.parseDate(startOfWeekStr);
    return new Date(components.year, components.month - 1, components.day);
  });

  const { weekData, loading: dataLoading, error, refetch } = useWeeklyAvailabilityData(
    currentWeek,
    organizationId,
    serviceId,
    doctorId,
    locationId,
    onLoadAvailability,
    userRole as 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin',
    useStandardRules
  );

  // Smart Suggestions state
  const [smartSuggestions, setSmartSuggestions] = useState<SuggestionsResult | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);

  const isLoading = externalLoading || dataLoading;

  /**
   * ROLE-BASED DATE VALIDATION (MVP SIMPLIFIED)
   * Standard users (patients): 24-hour advance booking rule
   * Privileged users (admin/staff): Real-time booking allowed
   */
  const dateValidationResults = useMemo(() => {
    if (weekData.length === 0) return {};

    console.log('=== ROLE-BASED DATE VALIDATION (MVP) ===');
    console.log(`User Role: ${userRole}, Use Standard Rules: ${useStandardRules}`);

    const validationResults: Record<string, DateValidationResult> = {};
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
    const applyPrivilegedRules = isPrivilegedUser && !useStandardRules;

    weekData.forEach(day => {
      // Parse date components safely to avoid timezone issues
      const [year, month, dayNum] = day.date.split('-').map(Number);
      const dayDateObj = new Date(year, month - 1, dayNum);

      // Get today's date normalized to midnight for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dayDateObj.setHours(0, 0, 0, 0);

      // Check if it's actually a past date
      const isPastDate = dayDateObj.getTime() < today.getTime();
      const isToday = dayDateObj.getTime() === today.getTime();

      let isBlocked = false;
      let reason: string | undefined = undefined;

      if (isPastDate) {
        // Past dates are always blocked for everyone
        isBlocked = true;
        reason = 'Fecha pasada - No se pueden agendar citas en fechas anteriores';
        console.log(`🔍 ${day.date}: FECHA PASADA - bloqueada para todos los roles`);
      } else if (applyPrivilegedRules) {
        // PRIVILEGED USERS: Can book same-day, only check availability
        isBlocked = day.availabilityLevel === 'none';
        if (isBlocked) {
          reason = 'No hay horarios disponibles para esta fecha';
        }
        console.log(`🔐 ${day.date}: PRIVILEGED USER - isBlocked=${isBlocked}, availabilityLevel=${day.availabilityLevel}`);
      } else {
        // STANDARD USERS (PATIENTS): 24-hour advance booking rule
        if (isToday) {
          isBlocked = true;
          reason = 'Los pacientes deben reservar citas con al menos 24 horas de anticipación';
          console.log(`🔒 ${day.date}: STANDARD USER - bloqueado por regla 24h`);
        } else {
          // Future dates: check availability
          isBlocked = day.availabilityLevel === 'none';
          if (isBlocked) {
            reason = 'No hay horarios disponibles para esta fecha';
          }
          console.log(`📅 ${day.date}: STANDARD USER - isBlocked=${isBlocked}, availabilityLevel=${day.availabilityLevel}`);
        }
      }

      validationResults[day.date] = {
        isValid: !isBlocked,
        reason,
        userRole,
        appliedRule: applyPrivilegedRules ? 'privileged' : 'standard'
      };

      console.log(`📅 ${day.date}: isValid=${!isBlocked}, reason="${reason}", appliedRule=${applyPrivilegedRules ? 'privileged' : 'standard'}`);
    });

    console.log('Role-based validation results:', validationResults);
    console.log('==========================================');

    return validationResults;
  }, [weekData, userRole, useStandardRules]);

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
   * DISRUPTIVE NAVIGATION - Uses ImmutableDateSystem for displacement-safe navigation
   */
  const navigateWeek = (direction: 'prev' | 'next') => {
    console.log('=== DISRUPTIVE NAVIGATION (ImmutableDateSystem) ===');
    console.log('Direction:', direction);

    // Convert current week to string for ImmutableDateSystem operations
    const currentWeekStr = currentWeek.toISOString().split('T')[0];
    console.log('Current week string:', currentWeekStr);

    // Use ImmutableDateSystem for displacement-safe navigation
    const daysToAdd = direction === 'next' ? 7 : -7;
    const newWeekStr = ImmutableDateSystem.addDays(currentWeekStr, daysToAdd);
    console.log('🔧 WeeklyAvailabilitySelector: Using ImmutableDateSystem.addDays for navigation');
    console.log('New week string:', newWeekStr);

    // Validate minimum date constraint
    if (minDate && direction === 'prev') {
      const comparison = ImmutableDateSystem.compareDates(newWeekStr, minDate);
      console.log('MinDate comparison:', { newWeekStr, minDate, comparison });

      if (comparison < 0) {
        console.log('BLOCKED by minDate - navigation not allowed before minimum date');
        return;
      }
    }

    // Validate that we don't navigate to completely past weeks
    if (direction === 'prev') {
      const todayStr = ImmutableDateSystem.getTodayString();
      const endOfNewWeekStr = ImmutableDateSystem.addDays(newWeekStr, 6);
      const comparison = ImmutableDateSystem.compareDates(endOfNewWeekStr, todayStr);

      console.log('Past week validation:', {
        todayStr,
        endOfNewWeekStr,
        comparison,
        isWeekInPast: comparison < 0
      });

      if (comparison < 0) {
        console.log('BLOCKED by past week - entire week is in the past');
        return;
      }
    }

    // Convert back to Date object for state update
    const components = ImmutableDateSystem.parseDate(newWeekStr);
    const newWeekDate = new Date(components.year, components.month - 1, components.day);

    console.log('NAVIGATION ALLOWED - updating currentWeek');
    console.log('New week date object:', newWeekDate);
    console.log('================================================');

    setCurrentWeek(newWeekDate);
  };

  /**
   * Formatear rango de semana - FIXED to ensure consistency with calendar grid
   */
  const formatWeekRange = (startDate: Date) => {
    // CRITICAL FIX: Always use the actual start of week to match calendar grid
    const inputDateStr = startDate.toISOString().split('T')[0];
    const actualStartOfWeek = ImmutableDateSystem.getStartOfWeek(inputDateStr);
    const endDateStr = ImmutableDateSystem.addDays(actualStartOfWeek, 6);

    console.log('🔍 WEEK RANGE CALCULATION: formatWeekRange called');
    console.log('📅 WEEK RANGE: Input startDate (Date object):', startDate);
    console.log('📅 WEEK RANGE: Input converted to string:', inputDateStr);
    console.log('🔧 WEEK RANGE: FIXED - Using actual start of week:', actualStartOfWeek);
    console.log('📅 WEEK RANGE: Calculated end date:', endDateStr);

    // Parse the actual start and end dates for display
    const startComponents = ImmutableDateSystem.parseDate(actualStartOfWeek);
    const endComponents = ImmutableDateSystem.parseDate(endDateStr);

    console.log('🚨 WEEK RANGE: CONSISTENCY CHECK:', {
      originalInput: inputDateStr,
      actualStartOfWeek: actualStartOfWeek,
      wasFixed: inputDateStr !== actualStartOfWeek,
      startDay: startComponents.day,
      endDay: endComponents.day
    });

    // Use the actual start of week for month/year display
    const startDateObj = new Date(startComponents.year, startComponents.month - 1, startComponents.day);
    const month = startDateObj.toLocaleDateString('es-ES', { month: 'long' });
    const year = startComponents.year;

    const weekRangeText = `${startComponents.day}-${endComponents.day} ${month} ${year}`;
    console.log('📅 WEEK RANGE: Final range text (FIXED):', weekRangeText);
    console.log('🔧 WeeklyAvailabilitySelector: Using ImmutableDateSystem for consistent week range');

    return weekRangeText;
  };

  /**
   * DISRUPTIVE DATE SELECTION - Uses ImmutableDateSystem for comprehensive validation
   */
  const handleDateSelect = (date: string) => {
    console.log('🔍 WEEKLY SELECTOR: handleDateSelect called with:', date);
    console.log('🔧 WEEKLY SELECTOR: Using ImmutableDateSystem for validation');

    // STEP 1: Comprehensive date validation using ImmutableDateSystem
    const validation = ImmutableDateSystem.validateAndNormalize(date, 'WeeklyAvailabilitySelector');

    if (!validation.isValid) {
      console.error('❌ WEEKLY SELECTOR: Date validation failed:', validation.error);
      alert(`Fecha inválida: ${validation.error}`);

      // Track validation failure
      DataIntegrityValidator.logDataTransformation(
        'WeeklyAvailabilitySelector',
        'DATE_VALIDATION_FAILED',
        { originalDate: date },
        { error: validation.error },
        ['ImmutableDateSystem.validateAndNormalize']
      );
      return false;
    }

    // STEP 2: Check for date displacement
    if (validation.displacement?.detected) {
      console.error('🚨 WEEKLY SELECTOR: DATE DISPLACEMENT DETECTED!', {
        originalDate: date,
        normalizedDate: validation.normalizedDate,
        daysDifference: validation.displacement.daysDifference
      });

      // Track displacement event
      DataIntegrityValidator.logDataTransformation(
        'WeeklyAvailabilitySelector',
        'DATE_DISPLACEMENT_DETECTED',
        { originalDate: date },
        {
          normalizedDate: validation.normalizedDate,
          daysDifference: validation.displacement.daysDifference
        },
        ['ImmutableDateSystem.validateAndNormalize']
      );

      alert(`Advertencia: Se detectó un desplazamiento de fecha. Usando fecha corregida: ${validation.normalizedDate}`);
    }

    const validatedDate = validation.normalizedDate || date;
    console.log('✅ WEEKLY SELECTOR: Using validated date:', validatedDate);

    // STEP 3: Business rule validation (role-based blocking)
    const roleValidation = dateValidationResults[validatedDate];
    const isBlocked = roleValidation && !roleValidation.isValid;

    if (isBlocked) {
      console.log('🚫 WEEKLY SELECTOR: Date blocked by business rules');
      console.log('Razón:', roleValidation?.reason);

      // Track business rule blocking
      if (window.trackDateEvent) {
        window.trackDateEvent('DATE_BLOCKED_BY_BUSINESS_RULES', {
          date: validatedDate,
          reason: roleValidation?.reason,
          userRole,
          appliedRule: roleValidation?.appliedRule
        }, 'WeeklyAvailabilitySelector');
      }

      alert(`Esta fecha no está disponible: ${roleValidation?.reason}`);
      return false;
    }

    // STEP 4: Additional validation (minDate) using ImmutableDateSystem
    if (minDate) {
      const comparison = ImmutableDateSystem.compareDates(validatedDate, minDate);
      if (comparison < 0) {
        console.log('🚫 WEEKLY SELECTOR: Date blocked by minDate constraint');

        DataIntegrityValidator.logDataTransformation(
          'WeeklyAvailabilitySelector',
          'DATE_BLOCKED_BY_MIN_DATE',
          { date: validatedDate, minDate },
          { blocked: true, reason: 'Date before minimum allowed' },
          ['ImmutableDateSystem.compareDates']
        );

        alert('Esta fecha no está disponible: Fecha anterior al mínimo permitido');
        return false;
      }
    }

    console.log('✅ WEEKLY SELECTOR: All validations passed, calling onDateSelect');

    // STEP 5: Track successful date selection
    DataIntegrityValidator.logDataTransformation(
      'WeeklyAvailabilitySelector',
      'DATE_SELECTION_SUCCESS',
      { originalInput: date },
      {
        validatedDate: validatedDate,
        displacement: validation.displacement?.detected || false,
        businessRulesApplied: true
      },
      ['ImmutableDateSystem.validateAndNormalize', 'Role-based validation', 'MinDate validation']
    );

    // STEP 6: Call parent callback with validated date
    onDateSelect(validatedDate);
    console.log('🎯 WEEKLY SELECTOR: Date selection completed successfully');
    return true;
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

        <div className="flex items-center space-x-4">
          <h4 className="text-lg font-semibold text-gray-900">
            {formatWeekRange(currentWeek)}
          </h4>

          {/* Manual Load Button - Temporary fix for infinite polling */}
          <button
            type="button"
            onClick={() => {
              console.log('🔄 Manual load triggered from WeeklyAvailabilitySelector');
              refetch();
            }}
            disabled={isLoading}
            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Cargando...' : 'Cargar Datos'}
          </button>
        </div>

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
