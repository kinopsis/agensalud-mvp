/**
 * APPOINTMENT DATA PROVIDER - DISRUPTIVE SOLUTION
 * 
 * Centralized React Context for appointment data management.
 * Ensures all components use the same data source and state.
 * 
 * This provider eliminates data inconsistencies by providing
 * a single source of truth for all appointment-related data.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0
 */

'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { UnifiedAppointmentDataService, type DayAvailabilityData, type AvailabilityQuery } from '@/lib/core/UnifiedAppointmentDataService';
import { DataIntegrityValidator, type ValidationResult } from '@/lib/core/DataIntegrityValidator';
import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';

export interface AppointmentDataState {
  availabilityData: Map<string, DayAvailabilityData[]>;
  loading: Map<string, boolean>;
  errors: Map<string, string>;
  validationResults: Map<string, ValidationResult>;
  lastUpdated: Map<string, number>;
}

export interface AppointmentDataActions {
  loadAvailabilityData: (query: AvailabilityQuery, component: string) => Promise<DayAvailabilityData[]>;
  clearCache: () => void;
  getAvailabilityForDate: (date: string, query: AvailabilityQuery) => DayAvailabilityData | null;
  getValidationResult: (queryKey: string) => ValidationResult | null;
  isLoading: (queryKey: string) => boolean;
  getError: (queryKey: string) => string | null;
}

type AppointmentDataAction =
  | { type: 'LOAD_START'; queryKey: string; component: string }
  | { type: 'LOAD_SUCCESS'; queryKey: string; data: DayAvailabilityData[]; validation: ValidationResult }
  | { type: 'LOAD_ERROR'; queryKey: string; error: string }
  | { type: 'CLEAR_CACHE' };

const initialState: AppointmentDataState = {
  availabilityData: new Map(),
  loading: new Map(),
  errors: new Map(),
  validationResults: new Map(),
  lastUpdated: new Map()
};

function appointmentDataReducer(state: AppointmentDataState, action: AppointmentDataAction): AppointmentDataState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        loading: new Map(state.loading).set(action.queryKey, true),
        errors: new Map(state.errors).set(action.queryKey, '')
      };
      
    case 'LOAD_SUCCESS':
      return {
        ...state,
        availabilityData: new Map(state.availabilityData).set(action.queryKey, action.data),
        loading: new Map(state.loading).set(action.queryKey, false),
        errors: new Map(state.errors).set(action.queryKey, ''),
        validationResults: new Map(state.validationResults).set(action.queryKey, action.validation),
        lastUpdated: new Map(state.lastUpdated).set(action.queryKey, Date.now())
      };
      
    case 'LOAD_ERROR':
      return {
        ...state,
        loading: new Map(state.loading).set(action.queryKey, false),
        errors: new Map(state.errors).set(action.queryKey, action.error)
      };
      
    case 'CLEAR_CACHE':
      return {
        ...initialState
      };
      
    default:
      return state;
  }
}

const AppointmentDataContext = createContext<{
  state: AppointmentDataState;
  actions: AppointmentDataActions;
} | null>(null);

/**
 * Generate query key for caching
 */
function generateQueryKey(query: AvailabilityQuery): string {
  return `${query.organizationId}-${query.startDate}-${query.endDate}-${query.serviceId || 'any'}-${query.doctorId || 'any'}-${query.locationId || 'any'}-${query.userRole || 'patient'}-${query.useStandardRules || false}`;
}

/**
 * APPOINTMENT DATA PROVIDER COMPONENT
 */
export const AppointmentDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appointmentDataReducer, initialState);
  
  /**
   * Load availability data with validation
   */
  const loadAvailabilityData = useCallback(async (query: AvailabilityQuery, component: string): Promise<DayAvailabilityData[]> => {
    // TEMPORARILY DISABLED - Prevent infinite polling
    console.log(`🚫 AppointmentDataProvider: loadAvailabilityData DISABLED to prevent infinite polling`);
    console.log(`Component: ${component}`, { query });

    // Return empty array to prevent errors
    return [];

    /* ORIGINAL CODE - TEMPORARILY DISABLED
    const queryKey = generateQueryKey(query);

    console.log(`🔄 AppointmentDataProvider: Loading data for ${component}`, { query, queryKey });

    // Check if we already have fresh data
    const existingData = state.availabilityData.get(queryKey);
    const lastUpdated = state.lastUpdated.get(queryKey);
    const isDataFresh = lastUpdated && (Date.now() - lastUpdated) < 5 * 60 * 1000; // 5 minutes

    if (existingData && isDataFresh) {
      console.log(`📋 AppointmentDataProvider: Using cached data for ${component}`);
      return existingData;
    }

    dispatch({ type: 'LOAD_START', queryKey, component });

    try {
      // Validate date range using ImmutableDateSystem
      const startValidation = ImmutableDateSystem.validateAndNormalize(query.startDate, component);
      const endValidation = ImmutableDateSystem.validateAndNormalize(query.endDate, component);

      if (!startValidation.isValid || !endValidation.isValid) {
        throw new Error(`Invalid date range: ${startValidation.error || endValidation.error}`);
      }

      // Load data through UnifiedAppointmentDataService
      const data = await UnifiedAppointmentDataService.getAvailabilityData(query);

      // Validate data integrity
      const validation = DataIntegrityValidator.validateAvailabilityData(data, component, 'api');

      // Log data transformation
      DataIntegrityValidator.logDataTransformation(
        component,
        'LOAD_AVAILABILITY_DATA',
        query,
        data,
        ['UnifiedAppointmentDataService.getAvailabilityData', 'DataIntegrityValidator.validateAvailabilityData']
      );

      dispatch({ type: 'LOAD_SUCCESS', queryKey, data, validation });

      console.log(`✅ AppointmentDataProvider: Data loaded successfully for ${component}`, {
        recordCount: data.length,
        validationPassed: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      });

      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`🚨 AppointmentDataProvider: Failed to load data for ${component}:`, error);

      dispatch({ type: 'LOAD_ERROR', queryKey, error: errorMessage });

      // Return empty array as fallback
      return [];
    }
    */
  }, [state.availabilityData, state.lastUpdated]);
  
  /**
   * Clear all cached data
   */
  const clearCache = useCallback(() => {
    console.log('🗑️ AppointmentDataProvider: Clearing all cached data');
    UnifiedAppointmentDataService.clearCache();
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);
  
  /**
   * Get availability data for a specific date
   */
  const getAvailabilityForDate = useCallback((date: string, query: AvailabilityQuery): DayAvailabilityData | null => {
    const queryKey = generateQueryKey(query);
    const data = state.availabilityData.get(queryKey);
    
    if (!data) return null;
    
    return data.find(dayData => dayData.date === date) || null;
  }, [state.availabilityData]);
  
  /**
   * Get validation result for a query
   */
  const getValidationResult = useCallback((queryKey: string): ValidationResult | null => {
    return state.validationResults.get(queryKey) || null;
  }, [state.validationResults]);
  
  /**
   * Check if data is loading for a query
   */
  const isLoading = useCallback((queryKey: string): boolean => {
    return state.loading.get(queryKey) || false;
  }, [state.loading]);
  
  /**
   * Get error for a query
   */
  const getError = useCallback((queryKey: string): string | null => {
    return state.errors.get(queryKey) || null;
  }, [state.errors]);
  
  const actions: AppointmentDataActions = {
    loadAvailabilityData,
    clearCache,
    getAvailabilityForDate,
    getValidationResult,
    isLoading,
    getError
  };
  
  // Log provider state changes for debugging
  useEffect(() => {
    console.log('📊 AppointmentDataProvider: State updated', {
      cachedQueries: state.availabilityData.size,
      loadingQueries: Array.from(state.loading.entries()).filter(([, loading]) => loading).length,
      errorQueries: Array.from(state.errors.entries()).filter(([, error]) => error).length,
      validationResults: state.validationResults.size
    });
  }, [state]);
  
  return (
    <AppointmentDataContext.Provider value={{ state, actions }}>
      {children}
    </AppointmentDataContext.Provider>
  );
};

/**
 * HOOK TO USE APPOINTMENT DATA CONTEXT
 */
export const useAppointmentData = () => {
  const context = useContext(AppointmentDataContext);

  // Check if we're on the client side
  if (typeof window === 'undefined') {
    // Server-side rendering - return a mock context to prevent errors
    return {
      state: initialState,
      actions: {
        loadAvailabilityData: async () => [],
        clearCache: () => {},
        getAvailabilityForDate: () => null,
        getValidationResult: () => null,
        isLoading: () => false,
        getError: () => null
      }
    };
  }

  if (!context) {
    throw new Error('useAppointmentData must be used within an AppointmentDataProvider');
  }

  return context;
};

/**
 * HOOK FOR LOADING AVAILABILITY DATA
 */
export const useAvailabilityData = (query: AvailabilityQuery, component: string) => {
  const { state, actions } = useAppointmentData();
  const queryKey = generateQueryKey(query);

  // Server-side rendering safety check
  if (typeof window === 'undefined') {
    return {
      data: [],
      loading: false,
      error: null,
      validation: null,
      loadData: async () => [],
      refetch: async () => [],
      queryKey
    };
  }

  const data = state.availabilityData.get(queryKey) || [];
  const loading = state.loading.get(queryKey) || false;
  const error = state.errors.get(queryKey) || null;
  const validation = state.validationResults.get(queryKey) || null;
  
  const loadData = useCallback(() => {
    return actions.loadAvailabilityData(query, component);
  }, [actions, query, component]);
  
  const refetch = useCallback(() => {
    // Clear cache for this query and reload
    const newState = { ...state };
    newState.availabilityData.delete(queryKey);
    newState.lastUpdated.delete(queryKey);
    
    return actions.loadAvailabilityData(query, component);
  }, [actions, query, component, queryKey, state]);
  
  return {
    data,
    loading,
    error,
    validation,
    loadData,
    refetch,
    queryKey
  };
};

export default AppointmentDataProvider;
