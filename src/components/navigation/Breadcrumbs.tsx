'use client';

/**
 * Breadcrumbs Component
 * Navigation breadcrumbs for improved UX/UI across the dashboard
 * 
 * @description Provides hierarchical navigation with automatic route detection
 * and manual override capabilities
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronRight, 
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

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  maxItems?: number;
}

/**
 * Route configuration for automatic breadcrumb generation
 */
const routeConfig: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  '/': { label: 'Dashboard', icon: Home },
  '/dashboard': { label: 'Dashboard', icon: Home },
  '/appointments': { label: 'Citas', icon: Calendar },
  '/appointments/new': { label: 'Nueva Cita', icon: UserPlus },
  '/patients': { label: 'Pacientes', icon: Users },
  '/patients/new': { label: 'Nuevo Paciente', icon: UserPlus },
  '/patients/[id]': { label: 'Detalles del Paciente', icon: Eye },
  '/patients/[id]/edit': { label: 'Editar Paciente', icon: Edit },
  '/doctors': { label: 'Doctores', icon: Stethoscope },
  '/doctors/[id]': { label: 'Detalles del Doctor', icon: Eye },
  '/doctors/[id]/schedule': { label: 'Horarios', icon: Clock },
  '/users': { label: 'Usuarios', icon: Users },
  '/users/new': { label: 'Nuevo Usuario', icon: UserPlus },
  '/users/[id]': { label: 'Detalles del Usuario', icon: Eye },
  '/users/[id]/edit': { label: 'Editar Usuario', icon: Edit },
  '/services': { label: 'Servicios', icon: FileText },
  '/services/new': { label: 'Nuevo Servicio', icon: UserPlus },
  '/settings': { label: 'Configuración', icon: Settings },
  '/profile': { label: 'Perfil', icon: Users },
  '/reports': { label: 'Reportes', icon: BarChart3 },
  '/superadmin': { label: 'SuperAdmin', icon: Shield },
  '/superadmin/organizations': { label: 'Organizaciones', icon: Building2 },
  '/superadmin/organizations/new': { label: 'Nueva Organización', icon: UserPlus },
  '/superadmin/organizations/[id]': { label: 'Detalles de Organización', icon: Eye },
  '/superadmin/organizations/[id]/edit': { label: 'Editar Organización', icon: Edit },
  '/superadmin/users': { label: 'Usuarios del Sistema', icon: Users },
  '/superadmin/system': { label: 'Sistema', icon: Settings },
  '/superadmin/reports': { label: 'Reportes del Sistema', icon: BarChart3 },
  '/api-docs': { label: 'Documentación API', icon: FileText }
};

/**
 * Generate breadcrumb items from current pathname
 */
const generateBreadcrumbsFromPath = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Add home/dashboard
  breadcrumbs.push({
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home
  });

  // Build breadcrumbs from path segments
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Check if this is a dynamic route (contains numbers or UUIDs)
    const isDynamicSegment = /^[0-9a-f-]+$/i.test(segment);
    
    let routeKey = currentPath;
    if (isDynamicSegment) {
      // Replace dynamic segment with placeholder
      const pathParts = currentPath.split('/');
      pathParts[pathParts.length - 1] = '[id]';
      routeKey = pathParts.join('/');
    }

    const routeInfo = routeConfig[routeKey];
    
    if (routeInfo) {
      const isLast = index === segments.length - 1;
      breadcrumbs.push({
        label: routeInfo.label,
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
  });

  return breadcrumbs;
};

/**
 * Breadcrumbs Component
 * 
 * @param items - Manual breadcrumb items (overrides automatic generation)
 * @param className - Additional CSS classes
 * @param showHome - Whether to show home icon (default: true)
 * @param maxItems - Maximum number of items to show (default: unlimited)
 */
export default function Breadcrumbs({ 
  items, 
  className = '', 
  showHome = true,
  maxItems 
}: BreadcrumbsProps) {
  const pathname = usePathname();
  
  // Use provided items or generate from pathname
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);
  
  // Apply maxItems limit if specified
  const displayItems = maxItems && breadcrumbItems.length > maxItems
    ? [
        ...breadcrumbItems.slice(0, 1), // Keep first item (home)
        { label: '...', href: undefined },
        ...breadcrumbItems.slice(-(maxItems - 2)) // Keep last items
      ]
    : breadcrumbItems;

  // Don't render if only one item (home) or no items
  if (displayItems.length <= 1) {
    return null;
  }

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="inline-flex items-center">
              {/* Separator */}
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
              )}

              {/* Breadcrumb Item */}
              <div className="flex items-center">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    {Icon && (
                      <Icon className={`w-4 h-4 ${index === 0 && showHome ? 'mr-2' : 'mr-1'}`} />
                    )}
                    {!(index === 0 && showHome && Icon) && item.label}
                  </Link>
                ) : (
                  <span
                    className={`inline-flex items-center text-sm font-medium ${
                      isLast 
                        ? 'text-gray-500 cursor-default' 
                        : 'text-gray-700'
                    }`}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {Icon && (
                      <Icon className={`w-4 h-4 ${index === 0 && showHome ? 'mr-2' : 'mr-1'}`} />
                    )}
                    {!(index === 0 && showHome && Icon) && item.label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Breadcrumb Separator Component
 * Standalone separator for custom breadcrumb layouts
 */
export function BreadcrumbSeparator({ className = '' }: { className?: string }) {
  return <ChevronRight className={`w-4 h-4 text-gray-400 ${className}`} />;
}

/**
 * Breadcrumb Item Component
 * Standalone breadcrumb item for custom layouts
 */
export function BreadcrumbItem({ 
  children, 
  href, 
  current = false, 
  className = '' 
}: { 
  children: React.ReactNode;
  href?: string;
  current?: boolean;
  className?: string;
}) {
  const baseClasses = `inline-flex items-center text-sm font-medium transition-colors ${className}`;
  
  if (href && !current) {
    return (
      <Link href={href} className={`${baseClasses} text-gray-700 hover:text-blue-600`}>
        {children}
      </Link>
    );
  }
  
  return (
    <span 
      className={`${baseClasses} ${current ? 'text-gray-500 cursor-default' : 'text-gray-700'}`}
      aria-current={current ? 'page' : undefined}
    >
      {children}
    </span>
  );
}
