/**
 * Hydration-Safe Utilities
 * 
 * Provides utilities to prevent hydration mismatches in Next.js applications
 * Ensures consistent behavior between server and client rendering
 */

import React, { useEffect, useState } from 'react';

/**
 * Hook to safely detect if we're on the client side
 * Prevents hydration mismatches by ensuring consistent initial state
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Hook for hydration-safe date operations
 * Returns null during SSR, actual date after hydration
 */
export function useClientDate(): Date | null {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const isClient = useIsClient();

  useEffect(() => {
    if (isClient) {
      setCurrentDate(new Date());
      
      // Optional: Update every minute for real-time apps
      const interval = setInterval(() => {
        setCurrentDate(new Date());
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [isClient]);

  return currentDate;
}

/**
 * Hydration-safe navigation function
 * Uses Next.js router when available, falls back to window.location
 */
export function useHydrationSafeNavigation() {
  const isClient = useIsClient();

  const navigateTo = (url: string) => {
    if (!isClient) return;

    // Try to use Next.js router first
    if (typeof window !== 'undefined' && window.next?.router) {
      window.next.router.push(url);
    } else if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  };

  return { navigateTo, isClient };
}

/**
 * Hydration-safe time calculation
 * Returns consistent results between server and client
 */
export function useTimeCalculation(
  targetDate: string,
  targetTime: string,
  unit: 'days' | 'hours' | 'minutes' = 'days'
): number | null {
  const [timeDiff, setTimeDiff] = useState<number | null>(null);
  const currentDate = useClientDate();

  useEffect(() => {
    if (currentDate && targetDate && targetTime) {
      const target = new Date(`${targetDate}T${targetTime}`);
      const now = currentDate;
      const diffMs = now.getTime() - target.getTime();
      
      let result: number;
      switch (unit) {
        case 'days':
          result = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          break;
        case 'hours':
          result = Math.floor(diffMs / (1000 * 60 * 60));
          break;
        case 'minutes':
          result = Math.floor(diffMs / (1000 * 60));
          break;
        default:
          result = diffMs;
      }
      
      setTimeDiff(result);
    }
  }, [currentDate, targetDate, targetTime, unit]);

  return timeDiff;
}

/**
 * Hydration-safe appointment status checker
 * Ensures consistent status calculations between server and client
 */
export function useAppointmentStatus(
  appointmentDate: string,
  appointmentTime: string
): {
  isFuture: boolean | null;
  isPast: boolean | null;
  isToday: boolean | null;
  isLoading: boolean;
} {
  const [status, setStatus] = useState({
    isFuture: null as boolean | null,
    isPast: null as boolean | null,
    isToday: null as boolean | null,
    isLoading: true
  });
  
  const currentDate = useClientDate();

  useEffect(() => {
    if (currentDate && appointmentDate && appointmentTime) {
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const now = currentDate;
      
      // Reset time to start of day for "today" comparison
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const appointmentDateOnly = new Date(appointmentDate);
      appointmentDateOnly.setHours(0, 0, 0, 0);
      
      setStatus({
        isFuture: appointmentDateTime > now,
        isPast: appointmentDateTime <= now,
        isToday: appointmentDateOnly.getTime() === todayStart.getTime(),
        isLoading: false
      });
    }
  }, [currentDate, appointmentDate, appointmentTime]);

  return status;
}

/**
 * Component wrapper that prevents hydration mismatches
 * Renders children only after client-side hydration
 */
export function HydrationSafe({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}): React.ReactElement {
  const isClient = useIsClient();

  if (!isClient) {
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(React.Fragment, null, children);
}

/**
 * Higher-order component for hydration-safe components
 */
export function withHydrationSafe<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function HydrationSafeComponent(props: P) {
    return React.createElement(
      HydrationSafe,
      { fallback },
      React.createElement(Component, props)
    );
  };
}

/**
 * Hydration-safe localStorage hook
 */
export function useHydrationSafeLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  const isClient = useIsClient();

  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setValue(JSON.parse(stored));
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
      }
    }
  }, [key, isClient]);

  const setStoredValue = (newValue: T) => {
    setValue(newValue);
    
    if (isClient && typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }
  };

  return [value, setStoredValue];
}

/**
 * Utility to create hydration-safe inline styles
 * Prevents style mismatches between server and client
 */
export function createHydrationSafeStyles(
  clientOnlyStyles: React.CSSProperties,
  serverStyles: React.CSSProperties = {}
): React.CSSProperties {
  const isClient = useIsClient();
  return isClient ? { ...serverStyles, ...clientOnlyStyles } : serverStyles;
}

export default {
  useIsClient,
  useClientDate,
  useHydrationSafeNavigation,
  useTimeCalculation,
  useAppointmentStatus,
  HydrationSafe,
  withHydrationSafe,
  useHydrationSafeLocalStorage,
  createHydrationSafeStyles
};
