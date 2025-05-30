'use client';

/**
 * Breadcrumbs Component
 * Provides navigation breadcrumbs for better user orientation
 * Supports dynamic breadcrumb generation based on current route
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export default function Breadcrumbs({
  items,
  className = '',
  showHome = true
}: BreadcrumbsProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { organization } = useTenant();

  // Generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname, profile?.role || undefined, organization);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm text-gray-500 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {showHome && (
          <li>
            <Link
              href="/dashboard"
              className="flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </li>
        )}

        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {(showHome || index > 0) && (
              <ChevronRight className="h-4 w-4 text-gray-300 mx-1" />
            )}

            {item.href && !item.isActive ? (
              <Link
                href={item.href}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.label}
              </Link>
            ) : (
              <span className={`flex items-center ${
                item.isActive ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}>
                {item.icon && <item.icon className="h-4 w-4 mr-1" />}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function generateBreadcrumbsFromPath(
  pathname: string,
  userRole?: string,
  organization?: any
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Skip if on dashboard root
  if (segments.length === 1 && segments[0] === 'dashboard') {
    return [];
  }

  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Skip dashboard segment as it's handled by home icon
    if (segment === 'dashboard') {
      return;
    }

    const breadcrumbItem = getBreadcrumbForSegment(
      segment,
      currentPath,
      isLast,
      userRole,
      organization,
      segments
    );

    if (breadcrumbItem) {
      breadcrumbs.push(breadcrumbItem);
    }
  });

  return breadcrumbs;
}

function getBreadcrumbForSegment(
  segment: string,
  currentPath: string,
  isLast: boolean,
  userRole?: string,
  organization?: any,
  allSegments?: string[]
): BreadcrumbItem | null {
  const breadcrumbMap: Record<string, BreadcrumbItem> = {
    // SuperAdmin routes
    'superadmin': {
      label: 'SuperAdmin',
      href: isLast ? undefined : '/superadmin',
      isActive: isLast
    },
    'organizations': {
      label: allSegments?.[0] === 'superadmin' ? 'Organizaciones' : 'Organización',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },
    'users': {
      label: allSegments?.[0] === 'superadmin' ? 'Usuarios del Sistema' : 'Usuarios',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },
    'system': {
      label: 'Sistema',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },

    // General routes
    'appointments': {
      label: 'Citas',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },
    'patients': {
      label: 'Pacientes',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },
    'doctors': {
      label: 'Doctores',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },
    'schedule': {
      label: 'Horarios',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },
    'settings': {
      label: 'Configuración',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },
    'profile': {
      label: 'Perfil',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    },

    // Action routes
    'new': {
      label: 'Nuevo',
      isActive: true
    },
    'edit': {
      label: 'Editar',
      isActive: true
    },
    'book': {
      label: 'Agendar',
      isActive: true
    },

    // Doctor specific routes
    'doctor': {
      label: 'Doctor',
      href: isLast ? undefined : currentPath,
      isActive: isLast
    }
  };

  // Handle dynamic segments (IDs)
  if (segment.match(/^[a-f0-9-]{36}$/i) || segment.match(/^\d+$/)) {
    // This looks like an ID, try to get a meaningful label
    const parentSegment = allSegments?.[allSegments.indexOf(segment) - 1];

    switch (parentSegment) {
      case 'organizations':
        return {
          label: organization?.name || 'Organización',
          isActive: isLast
        };
      case 'users':
        return {
          label: 'Usuario',
          isActive: isLast
        };
      case 'appointments':
        return {
          label: 'Cita',
          isActive: isLast
        };
      case 'patients':
        return {
          label: 'Paciente',
          isActive: isLast
        };
      default:
        return {
          label: 'Detalle',
          isActive: isLast
        };
    }
  }

  return breadcrumbMap[segment] || {
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    href: isLast ? undefined : currentPath,
    isActive: isLast
  };
}

// Hook for custom breadcrumbs
export function useBreadcrumbs(customItems?: BreadcrumbItem[]) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { organization } = useTenant();

  const breadcrumbs = React.useMemo(() => {
    if (customItems) {
      return customItems;
    }
    return generateBreadcrumbsFromPath(pathname, profile?.role || undefined, organization);
  }, [pathname, profile?.role, organization, customItems]);

  return breadcrumbs;
}

// Breadcrumb context for complex scenarios
interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  addBreadcrumb: (item: BreadcrumbItem) => void;
  removeBreadcrumb: (index: number) => void;
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = React.useState<BreadcrumbItem[]>([]);

  const addBreadcrumb = React.useCallback((item: BreadcrumbItem) => {
    setBreadcrumbs(prev => [...prev, item]);
  }, []);

  const removeBreadcrumb = React.useCallback((index: number) => {
    setBreadcrumbs(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <BreadcrumbContext.Provider value={{
      breadcrumbs,
      setBreadcrumbs,
      addBreadcrumb,
      removeBreadcrumb
    }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const context = React.useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbContext must be used within a BreadcrumbProvider');
  }
  return context;
}
