'use client';

/**
 * useBreadcrumbs Hook
 * Custom hook for managing breadcrumb state and navigation
 * 
 * @description Provides utilities for breadcrumb management, custom overrides,
 * and integration with Next.js routing
 */

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { BreadcrumbItem } from '@/components/navigation/Breadcrumbs';
import { 
  Home, 
  Building2, 
  Users, 
  Calendar, 
  Settings, 
  UserPlus,
  Edit,
  Eye,
  BarChart3,
  Shield,
  Clock,
  Stethoscope,
  FileText
} from 'lucide-react';

interface BreadcrumbConfig {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  dynamic?: boolean;
  resolver?: (params: any) => Promise<string> | string;
}

interface UseBreadcrumbsOptions {
  maxItems?: number;
  showHome?: boolean;
  customItems?: BreadcrumbItem[];
  enableDynamicResolution?: boolean;
}

interface UseBreadcrumbsReturn {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  addBreadcrumb: (item: BreadcrumbItem, position?: number) => void;
  removeBreadcrumb: (index: number) => void;
  resetBreadcrumbs: () => void;
  isLoading: boolean;
}

/**
 * Enhanced route configuration with dynamic resolution
 */
const routeConfig: Record<string, BreadcrumbConfig> = {
  '/': { label: 'Dashboard', icon: Home },
  '/dashboard': { label: 'Dashboard', icon: Home },
  '/appointments': { label: 'Citas', icon: Calendar },
  '/appointments/new': { label: 'Nueva Cita', icon: UserPlus },
  '/appointments/[id]': { 
    label: 'Detalles de Cita', 
    icon: Eye, 
    dynamic: true,
    resolver: async (params) => {
      try {
        const response = await fetch(`/api/appointments/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          const appointment = data.data;
          return `Cita - ${appointment.patient_name || 'Paciente'} (${appointment.appointment_date})`;
        }
      } catch (error) {
        console.error('Error resolving appointment breadcrumb:', error);
      }
      return 'Detalles de Cita';
    }
  },
  '/appointments/[id]/edit': { label: 'Editar Cita', icon: Edit },
  '/patients': { label: 'Pacientes', icon: Users },
  '/patients/new': { label: 'Nuevo Paciente', icon: UserPlus },
  '/patients/[id]': { 
    label: 'Detalles del Paciente', 
    icon: Eye, 
    dynamic: true,
    resolver: async (params) => {
      try {
        const response = await fetch(`/api/patients/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          const patient = data.data;
          return `${patient.first_name} ${patient.last_name}`;
        }
      } catch (error) {
        console.error('Error resolving patient breadcrumb:', error);
      }
      return 'Detalles del Paciente';
    }
  },
  '/patients/[id]/edit': { label: 'Editar Paciente', icon: Edit },
  '/doctors': { label: 'Doctores', icon: Stethoscope },
  '/doctors/[id]': { 
    label: 'Detalles del Doctor', 
    icon: Eye, 
    dynamic: true,
    resolver: async (params) => {
      try {
        const response = await fetch(`/api/doctors/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          const doctor = data.data;
          return `Dr. ${doctor.first_name} ${doctor.last_name}`;
        }
      } catch (error) {
        console.error('Error resolving doctor breadcrumb:', error);
      }
      return 'Detalles del Doctor';
    }
  },
  '/doctors/[id]/schedule': { label: 'Horarios', icon: Clock },
  '/users': { label: 'Usuarios', icon: Users },
  '/users/new': { label: 'Nuevo Usuario', icon: UserPlus },
  '/users/[id]': { 
    label: 'Detalles del Usuario', 
    icon: Eye, 
    dynamic: true,
    resolver: async (params) => {
      try {
        const response = await fetch(`/api/users/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          const user = data.data;
          return `${user.first_name} ${user.last_name}`;
        }
      } catch (error) {
        console.error('Error resolving user breadcrumb:', error);
      }
      return 'Detalles del Usuario';
    }
  },
  '/users/[id]/edit': { label: 'Editar Usuario', icon: Edit },
  '/services': { label: 'Servicios', icon: FileText },
  '/services/new': { label: 'Nuevo Servicio', icon: UserPlus },
  '/settings': { label: 'Configuración', icon: Settings },
  '/profile': { label: 'Perfil', icon: Users },
  '/reports': { label: 'Reportes', icon: BarChart3 },
  '/superadmin': { label: 'SuperAdmin', icon: Shield },
  '/superadmin/organizations': { label: 'Organizaciones', icon: Building2 },
  '/superadmin/organizations/new': { label: 'Nueva Organización', icon: UserPlus },
  '/superadmin/organizations/[id]': { 
    label: 'Detalles de Organización', 
    icon: Eye, 
    dynamic: true,
    resolver: async (params) => {
      try {
        const response = await fetch(`/api/superadmin/organizations/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          const org = data.data;
          return org.name;
        }
      } catch (error) {
        console.error('Error resolving organization breadcrumb:', error);
      }
      return 'Detalles de Organización';
    }
  },
  '/superadmin/organizations/[id]/edit': { label: 'Editar Organización', icon: Edit },
  '/superadmin/users': { label: 'Usuarios del Sistema', icon: Users },
  '/superadmin/system': { label: 'Sistema', icon: Settings },
  '/superadmin/reports': { label: 'Reportes del Sistema', icon: BarChart3 },
  '/api-docs': { label: 'Documentación API', icon: FileText }
};

/**
 * useBreadcrumbs Hook
 * 
 * @param options - Configuration options for breadcrumbs
 * @returns Breadcrumb utilities and state
 */
export function useBreadcrumbs(options: UseBreadcrumbsOptions = {}): UseBreadcrumbsReturn {
  const {
    maxItems,
    showHome = true,
    customItems,
    enableDynamicResolution = true
  } = options;

  const pathname = usePathname();
  const params = useParams();
  
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedLabels, setResolvedLabels] = useState<Record<string, string>>({});

  /**
   * Generate breadcrumbs from current path
   */
  const generateBreadcrumbs = useMemo(async () => {
    if (customItems) {
      return customItems;
    }

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home/dashboard if showHome is true
    if (showHome) {
      breadcrumbs.push({
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home
      });
    }

    // Build breadcrumbs from path segments
    let currentPath = '';
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      currentPath += `/${segment}`;
      
      // Check if this is a dynamic route
      const isDynamicSegment = /^[0-9a-f-]+$/i.test(segment);
      
      let routeKey = currentPath;
      if (isDynamicSegment) {
        const pathParts = currentPath.split('/');
        pathParts[pathParts.length - 1] = '[id]';
        routeKey = pathParts.join('/');
      }

      const routeInfo = routeConfig[routeKey];
      
      if (routeInfo) {
        const isLast = index === segments.length - 1;
        let label = routeInfo.label;

        // Resolve dynamic labels
        if (routeInfo.dynamic && enableDynamicResolution && routeInfo.resolver) {
          const cacheKey = `${routeKey}-${segment}`;
          if (resolvedLabels[cacheKey]) {
            label = resolvedLabels[cacheKey];
          } else if (isDynamicSegment) {
            // Resolve label asynchronously
            setIsLoading(true);
            try {
              const resolvedLabel = await routeInfo.resolver({ id: segment, ...params });
              setResolvedLabels(prev => ({ ...prev, [cacheKey]: resolvedLabel }));
              label = resolvedLabel;
            } catch (error) {
              console.error('Error resolving breadcrumb label:', error);
            } finally {
              setIsLoading(false);
            }
          }
        }

        breadcrumbs.push({
          label,
          href: isLast ? undefined : currentPath,
          icon: routeInfo.icon,
          current: isLast
        });
      } else if (!isDynamicSegment) {
        // Fallback for unknown routes
        const isLast = index === segments.length - 1;
        breadcrumbs.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          href: isLast ? undefined : currentPath,
          current: isLast
        });
      }
    }

    return breadcrumbs;
  }, [pathname, params, customItems, showHome, enableDynamicResolution, resolvedLabels]);

  /**
   * Get final breadcrumbs with custom overrides
   */
  const breadcrumbs = useMemo(() => {
    const baseBreadcrumbs = customBreadcrumbs.length > 0 ? customBreadcrumbs : generateBreadcrumbs;
    
    // Apply maxItems limit if specified
    if (maxItems && Array.isArray(baseBreadcrumbs) && baseBreadcrumbs.length > maxItems) {
      return [
        ...baseBreadcrumbs.slice(0, 1), // Keep first item
        { label: '...', href: undefined },
        ...baseBreadcrumbs.slice(-(maxItems - 2)) // Keep last items
      ];
    }
    
    return Array.isArray(baseBreadcrumbs) ? baseBreadcrumbs : [];
  }, [generateBreadcrumbs, customBreadcrumbs, maxItems]);

  /**
   * Set custom breadcrumbs
   */
  const setBreadcrumbs = (items: BreadcrumbItem[]) => {
    setCustomBreadcrumbs(items);
  };

  /**
   * Add a breadcrumb at specific position
   */
  const addBreadcrumb = (item: BreadcrumbItem, position?: number) => {
    setCustomBreadcrumbs(prev => {
      const newItems = [...prev];
      if (position !== undefined) {
        newItems.splice(position, 0, item);
      } else {
        newItems.push(item);
      }
      return newItems;
    });
  };

  /**
   * Remove breadcrumb at specific index
   */
  const removeBreadcrumb = (index: number) => {
    setCustomBreadcrumbs(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Reset to automatic breadcrumbs
   */
  const resetBreadcrumbs = () => {
    setCustomBreadcrumbs([]);
  };

  return {
    breadcrumbs: Array.isArray(breadcrumbs) ? breadcrumbs : [],
    setBreadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    resetBreadcrumbs,
    isLoading
  };
}
