/**
 * ClientHydrationWrapper Component
 * 
 * Prevents hydration mismatches by ensuring components only render on the client side
 * when they contain client-specific logic or state.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import { useEffect, useState, ReactNode } from 'react';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface ClientHydrationWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * ClientHydrationWrapper - Ensures client-side only rendering
 * 
 * @description Prevents hydration mismatches by only rendering children
 * after the component has mounted on the client side.
 * 
 * @param children - Components to render after hydration
 * @param fallback - Optional fallback to show during SSR
 * @param className - Optional CSS classes
 */
export function ClientHydrationWrapper({
  children,
  fallback = null,
  className
}: ClientHydrationWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // During SSR or before hydration, show fallback
  if (!isClient) {
    return fallback ? (
      <div className={className}>
        {fallback}
      </div>
    ) : null;
  }

  // After hydration, show actual content
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// =====================================================
// SPECIALIZED WRAPPERS
// =====================================================

/**
 * NoSSR - Simple wrapper that prevents server-side rendering
 */
interface NoSSRProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : <>{fallback}</>;
}

/**
 * LazyHydration - Delays hydration until component is in viewport
 */
interface LazyHydrationProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
}

export function LazyHydration({
  children,
  fallback = null,
  rootMargin = '50px'
}: LazyHydrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    const element = document.createElement('div');
    observer.observe(element);

    return () => observer.disconnect();
  }, [isClient, rootMargin]);

  if (!isClient || !isVisible) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * ConditionalHydration - Only hydrates based on a condition
 */
interface ConditionalHydrationProps {
  children: ReactNode;
  condition: boolean;
  fallback?: ReactNode;
}

export function ConditionalHydration({
  children,
  condition,
  fallback = null
}: ConditionalHydrationProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !condition) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// =====================================================
// HOOKS
// =====================================================

/**
 * useIsClient - Hook to check if code is running on client side
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * useHydrationSafe - Hook for hydration-safe state management
 */
export function useHydrationSafe<T>(
  initialValue: T,
  clientValue?: T
): [T, (value: T) => void] {
  const [isClient, setIsClient] = useState(false);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setIsClient(true);
    if (clientValue !== undefined) {
      setValue(clientValue);
    }
  }, [clientValue]);

  const safeSetValue = (newValue: T) => {
    if (isClient) {
      setValue(newValue);
    }
  };

  return [isClient ? value : initialValue, safeSetValue];
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * withClientHydration - HOC for wrapping components with hydration safety
 */
export function withClientHydration<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ClientHydrationWrapper fallback={fallback}>
        <Component {...props} />
      </ClientHydrationWrapper>
    );
  };
}

/**
 * createHydrationSafeComponent - Factory for creating hydration-safe components
 */
export function createHydrationSafeComponent<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: ReactNode;
    condition?: (props: P) => boolean;
    lazy?: boolean;
  } = {}
) {
  return function HydrationSafeComponent(props: P) {
    const { fallback, condition, lazy } = options;

    if (condition && !condition(props)) {
      return <>{fallback}</>;
    }

    if (lazy) {
      return (
        <LazyHydration fallback={fallback}>
          <Component {...props} />
        </LazyHydration>
      );
    }

    return (
      <ClientHydrationWrapper fallback={fallback}>
        <Component {...props} />
      </ClientHydrationWrapper>
    );
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default ClientHydrationWrapper;
