'use client';

/**
 * DashboardLayout Component
 * Common layout wrapper for all role-specific dashboards
 * Provides navigation, header, and consistent structure
 */

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import {
  Calendar,
  Users,
  Settings,
  BarChart3,
  Clock,
  User,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Building2,
  Stethoscope,
  Book
} from 'lucide-react';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import LogoutConfirmationDialog from '@/components/common/LogoutConfirmationDialog';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: string;
}

export default function DashboardLayout({
  children,
  title,
  subtitle,
  actions
}: DashboardLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const { organization } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Cargando...</h2>
          <p className="text-gray-600">Obteniendo información del usuario</p>
        </div>
      </div>
    );
  }

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      roles: ['admin', 'doctor', 'staff', 'patient', 'superadmin']
    },
    // SuperAdmin specific navigation
    ...(profile.role === 'superadmin' ? [
      {
        name: 'Organizaciones',
        href: '/superadmin/organizations',
        icon: Building2,
        roles: ['superadmin']
      },
      {
        name: 'Usuarios',
        href: '/superadmin/users',
        icon: Users,
        roles: ['superadmin']
      },
      {
        name: 'Sistema',
        href: '/superadmin/system',
        icon: Settings,
        roles: ['superadmin']
      },
      {
        name: 'Documentación API',
        href: '/api-docs',
        icon: Book,
        roles: ['superadmin']
      }
    ] : [
      // Regular navigation for other roles
      {
        name: 'Citas',
        href: '/appointments',
        icon: Calendar,
        roles: ['admin', 'doctor', 'staff', 'patient']
      },
      {
        name: 'Horarios',
        href: '/doctor/schedule',
        icon: Clock,
        roles: ['doctor', 'admin']
      },
      {
        name: 'Gestión de Horarios',
        href: '/staff/schedules',
        icon: Calendar,
        roles: ['staff', 'admin']
      },
      {
        name: 'Gestión de Pacientes',
        href: '/staff/patients',
        icon: Users,
        roles: ['staff', 'admin']
      },
      {
        name: 'Documentación API',
        href: '/api-docs',
        icon: Book,
        roles: ['admin', 'doctor', 'staff', 'superadmin'] // Removed 'patient' for security
      },
      {
        name: 'Analytics Avanzados',
        href: '/superadmin/analytics',
        icon: BarChart3,
        roles: ['superadmin']
      },
      {
        name: 'Usuarios',
        href: '/users',
        icon: Users,
        roles: ['admin']
      },
      {
        name: 'Servicios',
        href: '/services',
        icon: Stethoscope,
        roles: ['admin']
      },
      {
        name: 'Ubicaciones',
        href: '/locations',
        icon: Building2,
        roles: ['admin']
      },
      {
        name: 'Configuración',
        href: '/settings',
        icon: Settings,
        roles: ['admin', 'doctor', 'staff', 'patient']
      }
    ])
  ];

  const filteredNavigation = navigation.filter(item =>
    profile.role && item.roles.includes(profile.role)
  );

  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirmation(false);
    await signOut();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirmation(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={sidebarOpen ? 'false' : 'true'}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú de navegación"
        />
        <div
          id="mobile-sidebar"
          className={`fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
        >
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div
                className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="text-white font-bold text-sm">AS</span>
              </div>
              <span
                id="mobile-menu-title"
                className="ml-2 text-lg font-semibold text-gray-900"
              >
                AgentSalud
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="
                text-gray-400 hover:text-gray-600 p-2 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition-colors duration-200
              "
              aria-label="Cerrar menú de navegación"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <nav
            className="flex-1 px-4 py-4 overflow-y-auto"
            aria-label="Navegación principal móvil"
          >
            <ul className="space-y-2" role="list">
              {filteredNavigation.map((item) => (
                <li key={item.name} role="listitem">
                  <Link
                    href={item.href}
                    className="
                      flex items-center px-3 py-3 text-sm font-medium text-gray-700
                      rounded-md hover:bg-gray-100 hover:text-gray-900
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                      transition-colors duration-200 touch-manipulation
                    "
                    onClick={() => setSidebarOpen(false)}
                    aria-label={`Ir a ${item.name}`}
                  >
                    <item.icon className="h-5 w-5 mr-3 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span
                        className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex-shrink-0"
                        aria-label={`${item.badge} elementos`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile user info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div
                className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">{profile.role}</p>
                {organization && (
                  <p className="text-xs text-gray-400 truncate">{organization.name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="
                  text-gray-400 hover:text-gray-600 p-2 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  transition-colors duration-200 touch-manipulation
                "
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AS</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900">AgentSalud</span>
          </div>
          <nav className="flex-1 px-4 py-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                    {item.badge && (
                      <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
                {organization && (
                  <p className="text-xs text-gray-400">{organization.name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="text-gray-400 hover:text-gray-600"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="
                  lg:hidden text-gray-400 hover:text-gray-600 p-2 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  transition-colors duration-200 touch-manipulation
                "
                aria-label="Abrir menú de navegación"
                {...(sidebarOpen ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
                aria-controls="mobile-sidebar"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>

              <div className="lg:ml-0 ml-4 min-w-0 flex-1">
                <div className="flex items-center space-x-4">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                      {title}
                    </h1>
                    {subtitle && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {/* Breadcrumbs */}
                <div className="mt-1 hidden sm:block">
                  <Breadcrumbs />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <label htmlFor="global-search" className="sr-only">
                    Buscar en el sistema
                  </label>
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="global-search"
                    type="text"
                    placeholder="Buscar..."
                    className="
                      pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-colors duration-200 w-64
                    "
                    aria-label="Buscar en el sistema"
                  />
                </div>
              </div>

              {/* Notifications */}
              <button
                type="button"
                className="
                  relative p-2 text-gray-400 hover:text-gray-600 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  transition-colors duration-200 touch-manipulation
                "
                aria-label="Ver notificaciones (1 nueva)"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span
                  className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"
                  aria-hidden="true"
                ></span>
              </button>

              {/* Actions */}
              {actions && (
                <div className="flex items-center space-x-2">
                  {actions}
                </div>
              )}

              {/* Mobile user menu - visible on small screens */}
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="
                    p-2 text-gray-400 hover:text-gray-600 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    transition-colors duration-200 touch-manipulation
                  "
                  aria-label="Opciones de usuario"
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Enhanced Logout Confirmation Dialog */}
      <LogoutConfirmationDialog
        isOpen={showLogoutConfirmation}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
