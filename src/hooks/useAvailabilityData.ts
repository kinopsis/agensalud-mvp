'use client';

/**
 * useAvailabilityData Hook
 * 
 * Hook personalizado para gestionar datos de disponibilidad de doctores
 * con soporte para caché, optimización de llamadas API y arquitectura multi-tenant.
 * 
 * Características:
 * - Caché inteligente de datos de disponibilidad
 * - Optimización de llamadas API con debouncing
 * - Soporte multi-tenant con organizationId
 * - Manejo de estados de carga y error
 * - Invalidación automática de caché
 * - Integración con WeeklyAvailabilitySelector
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 1
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Nivel de disponibilidad para indicadores visuales
 */
export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Datos de disponibilidad por día
 */
export interface DayAvailabilityData {
  date: string;
  dayName: string;
  slotsCount: number;
  availabilityLevel: AvailabilityLevel;
  isToday?: boolean;
  isTomorrow?: boolean;
  isWeekend?: boolean;
  slots?: TimeSlot[];
}

/**
 * Slot de tiempo individual
 */
export interface TimeSlot {
  id: string;
  time: string;
  doctorId?: string;
  doctorName?: string;
  available: boolean;
  price?: number;
  duration?: number;
}

/**
 * Parámetros para cargar disponibilidad
 */
export interface AvailabilityParams {
  organizationId: string;
  serviceId?: string;
  doctorId?: string;
  locationId?: string;
  startDate: string;
  endDate: string;
}

/**
 * Respuesta de la API de disponibilidad
 */
interface AvailabilityResponse {
  success: boolean;
  data: {
    [date: string]: {
      slots: TimeSlot[];
      totalSlots: number;
      availableSlots: number;
    };
  };
  error?: string;
}

/**
 * Configuración del caché
 */
interface CacheConfig {
  ttl: number; // Time to live en milisegundos
  maxSize: number; // Máximo número de entradas en caché
}

/**
 * Entrada del caché
 */
interface CacheEntry {
  data: DayAvailabilityData[];
  timestamp: number;
  params: AvailabilityParams;
}

/**
 * Configuración por defecto del caché
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutos
  maxSize: 50 // 50 entradas máximo
};

/**
 * Caché global para datos de disponibilidad
 */
const availabilityCache = new Map<string, CacheEntry>();

/**
 * Generar clave de caché basada en parámetros
 */
const generateCacheKey = (params: AvailabilityParams): string => {
  return `${params.organizationId}-${params.serviceId || 'any'}-${params.doctorId || 'any'}-${params.locationId || 'any'}-${params.startDate}-${params.endDate}`;
};

/**
 * Determinar nivel de disponibilidad basado en número de slots
 */
const getAvailabilityLevel = (availableSlots: number): AvailabilityLevel => {
  if (availableSlots === 0) return 'none';
  if (availableSlots <= 2) return 'low';
  if (availableSlots <= 5) return 'medium';
  return 'high';
};

/**
 * Limpiar caché expirado
 */
const cleanExpiredCache = (config: CacheConfig) => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  availabilityCache.forEach((entry, key) => {
    if (now - entry.timestamp > config.ttl) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => availabilityCache.delete(key));
  
  // Limpiar caché si excede el tamaño máximo
  if (availabilityCache.size > config.maxSize) {
    const entries = Array.from(availabilityCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = entries.slice(0, availabilityCache.size - config.maxSize);
    toDelete.forEach(([key]) => availabilityCache.delete(key));
  }
};

/**
 * Llamada a la API para obtener disponibilidad
 */
const fetchAvailabilityData = async (params: AvailabilityParams): Promise<DayAvailabilityData[]> => {
  try {
    const queryParams = new URLSearchParams({
      organizationId: params.organizationId,
      startDate: params.startDate,
      endDate: params.endDate,
      ...(params.serviceId && { serviceId: params.serviceId }),
      ...(params.doctorId && { doctorId: params.doctorId }),
      ...(params.locationId && { locationId: params.locationId })
    });

    const response = await fetch(`/api/appointments/availability?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result: AvailabilityResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error desconocido al cargar disponibilidad');
    }

    // Procesar datos de la API
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const processedData: DayAvailabilityData[] = [];
    
    // Generar datos para cada día en el rango
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      const dayData = result.data[dateString];
      
      const availableSlots = dayData?.availableSlots || 0;
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      processedData.push({
        date: dateString,
        dayName: dayNames[date.getDay()],
        slotsCount: availableSlots,
        availabilityLevel: getAvailabilityLevel(availableSlots),
        isToday,
        isTomorrow,
        isWeekend,
        slots: dayData?.slots || []
      });
    }

    return processedData;
  } catch (error) {
    console.error('Error fetching availability data:', error);
    throw error;
  }
};

/**
 * Hook principal useAvailabilityData
 */
export const useAvailabilityData = (
  params: AvailabilityParams | null,
  config: Partial<CacheConfig> = {}
) => {
  const [data, setData] = useState<DayAvailabilityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Cargar datos con caché y debouncing
   */
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!params) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const cacheKey = generateCacheKey(params);
    
    // Verificar caché si no es refresh forzado
    if (!forceRefresh) {
      cleanExpiredCache(cacheConfig);
      const cachedEntry = availabilityCache.get(cacheKey);
      
      if (cachedEntry && Date.now() - cachedEntry.timestamp < cacheConfig.ttl) {
        setData(cachedEntry.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    // Debouncing: esperar 300ms antes de hacer la petición
    timeoutRef.current = setTimeout(async () => {
      try {
        abortControllerRef.current = new AbortController();
        
        const result = await fetchAvailabilityData(params);
        
        // Guardar en caché
        availabilityCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          params
        });
        
        setData(result);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Petición cancelada, no actualizar estado
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }, 300);
  }, [params, cacheConfig]);

  /**
   * Refrescar datos forzando nueva petición
   */
  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  /**
   * Invalidar caché para parámetros específicos
   */
  const invalidateCache = useCallback((targetParams?: AvailabilityParams) => {
    if (targetParams) {
      const cacheKey = generateCacheKey(targetParams);
      availabilityCache.delete(cacheKey);
    } else {
      availabilityCache.clear();
    }
  }, []);

  /**
   * Obtener datos de un día específico
   */
  const getDayData = useCallback((date: string): DayAvailabilityData | undefined => {
    return data.find(day => day.date === date);
  }, [data]);

  /**
   * Obtener días con alta disponibilidad
   */
  const getHighAvailabilityDays = useCallback((): DayAvailabilityData[] => {
    return data.filter(day => day.availabilityLevel === 'high');
  }, [data]);

  /**
   * Obtener estadísticas de disponibilidad
   */
  const getAvailabilityStats = useCallback(() => {
    const total = data.length;
    const available = data.filter(day => day.availabilityLevel !== 'none').length;
    const high = data.filter(day => day.availabilityLevel === 'high').length;
    const medium = data.filter(day => day.availabilityLevel === 'medium').length;
    const low = data.filter(day => day.availabilityLevel === 'low').length;
    const none = data.filter(day => day.availabilityLevel === 'none').length;
    
    return {
      total,
      available,
      high,
      medium,
      low,
      none,
      availabilityRate: total > 0 ? (available / total) * 100 : 0
    };
  }, [data]);

  // Cargar datos cuando cambien los parámetros
  useEffect(() => {
    loadData();
    
    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidateCache,
    getDayData,
    getHighAvailabilityDays,
    getAvailabilityStats
  };
};

/**
 * Hook simplificado para uso en WeeklyAvailabilitySelector
 */
export const useWeeklyAvailability = (
  organizationId: string,
  startDate: Date,
  serviceId?: string,
  doctorId?: string,
  locationId?: string
) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const params: AvailabilityParams = {
    organizationId,
    serviceId,
    doctorId,
    locationId,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
  
  return useAvailabilityData(params);
};

export default useAvailabilityData;
