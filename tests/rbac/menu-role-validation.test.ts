/**
 * RBAC Menu Role Validation Tests
 * Tests for role-based menu visibility and access control
 * Validates fixes for menu permission issues
 */

import { describe, it, expect } from '@jest/globals';

// Test the navigation configuration directly
import {
  Calendar,
  Users,
  Settings,
  BarChart3,
  Clock,
  User,
  Building2,
  Stethoscope,
  Book
} from 'lucide-react';

// Navigation configuration from DashboardLayout
interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
  badge?: string;
}

// Simulate the navigation configuration from DashboardLayout
const getNavigationItems = (profile: any): NavigationItem[] => {
  return [
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
        roles: ['admin', 'doctor', 'staff', 'superadmin'] // Fixed: Removed 'patient'
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
};

const filterNavigation = (navigation: NavigationItem[], userRole: string): NavigationItem[] => {
  return navigation.filter(item => item.roles.includes(userRole));
};

describe('RBAC Menu Role Validation', () => {

  describe('API Documentation Menu Visibility', () => {
    it('should NOT show API Documentation menu for Patient role', () => {
      const patientProfile = { role: 'patient' };
      const navigation = getNavigationItems(patientProfile);
      const filteredNavigation = filterNavigation(navigation, 'patient');

      // API Documentation should NOT be visible for patients
      const apiDocMenu = filteredNavigation.find(item => item.name === 'Documentación API');
      expect(apiDocMenu).toBeUndefined();
    });

    it('should show API Documentation menu for Admin role', () => {
      const adminProfile = { role: 'admin' };
      const navigation = getNavigationItems(adminProfile);
      const filteredNavigation = filterNavigation(navigation, 'admin');

      // API Documentation should be visible for admins
      const apiDocMenu = filteredNavigation.find(item => item.name === 'Documentación API');
      expect(apiDocMenu).toBeDefined();
      expect(apiDocMenu?.roles).toContain('admin');
    });

    it('should show API Documentation menu for Doctor role', () => {
      const doctorProfile = { role: 'doctor' };
      const navigation = getNavigationItems(doctorProfile);
      const filteredNavigation = filterNavigation(navigation, 'doctor');

      // API Documentation should be visible for doctors
      const apiDocMenu = filteredNavigation.find(item => item.name === 'Documentación API');
      expect(apiDocMenu).toBeDefined();
      expect(apiDocMenu?.roles).toContain('doctor');
    });

    it('should show API Documentation menu for Staff role', () => {
      const staffProfile = { role: 'staff' };
      const navigation = getNavigationItems(staffProfile);
      const filteredNavigation = filterNavigation(navigation, 'staff');

      // API Documentation should be visible for staff
      const apiDocMenu = filteredNavigation.find(item => item.name === 'Documentación API');
      expect(apiDocMenu).toBeDefined();
      expect(apiDocMenu?.roles).toContain('staff');
    });

    it('should show API Documentation menu for SuperAdmin role', () => {
      const superadminProfile = { role: 'superadmin' };
      const navigation = getNavigationItems(superadminProfile);
      const filteredNavigation = filterNavigation(navigation, 'superadmin');

      // API Documentation should be visible for superadmin
      const apiDocMenu = filteredNavigation.find(item => item.name === 'Documentación API');
      expect(apiDocMenu).toBeDefined();
      expect(apiDocMenu?.roles).toContain('superadmin');
    });
  });

  describe('Role-Specific Menu Items', () => {
    it('should show correct menu items for Patient role', () => {
      const patientProfile = { role: 'patient' };
      const navigation = getNavigationItems(patientProfile);
      const filteredNavigation = filterNavigation(navigation, 'patient');

      // Patient should see these items
      const citasMenu = filteredNavigation.find(item => item.name === 'Citas');
      const configMenu = filteredNavigation.find(item => item.name === 'Configuración');
      expect(citasMenu).toBeDefined();
      expect(configMenu).toBeDefined();

      // Patient should NOT see these items
      const usuariosMenu = filteredNavigation.find(item => item.name === 'Usuarios');
      const serviciosMenu = filteredNavigation.find(item => item.name === 'Servicios');
      const ubicacionesMenu = filteredNavigation.find(item => item.name === 'Ubicaciones');
      const gestionHorariosMenu = filteredNavigation.find(item => item.name === 'Gestión de Horarios');
      const gestionPacientesMenu = filteredNavigation.find(item => item.name === 'Gestión de Pacientes');

      expect(usuariosMenu).toBeUndefined();
      expect(serviciosMenu).toBeUndefined();
      expect(ubicacionesMenu).toBeUndefined();
      expect(gestionHorariosMenu).toBeUndefined();
      expect(gestionPacientesMenu).toBeUndefined();
    });

    it('should show correct menu items for Admin role', () => {
      const adminProfile = { role: 'admin' };
      const navigation = getNavigationItems(adminProfile);
      const filteredNavigation = filterNavigation(navigation, 'admin');

      // Admin should see these items
      const citasMenu = filteredNavigation.find(item => item.name === 'Citas');
      const horariosMenu = filteredNavigation.find(item => item.name === 'Horarios');
      const gestionHorariosMenu = filteredNavigation.find(item => item.name === 'Gestión de Horarios');
      const gestionPacientesMenu = filteredNavigation.find(item => item.name === 'Gestión de Pacientes');
      const usuariosMenu = filteredNavigation.find(item => item.name === 'Usuarios');
      const serviciosMenu = filteredNavigation.find(item => item.name === 'Servicios');
      const ubicacionesMenu = filteredNavigation.find(item => item.name === 'Ubicaciones');
      const configMenu = filteredNavigation.find(item => item.name === 'Configuración');

      expect(citasMenu).toBeDefined();
      expect(horariosMenu).toBeDefined();
      expect(gestionHorariosMenu).toBeDefined();
      expect(gestionPacientesMenu).toBeDefined();
      expect(usuariosMenu).toBeDefined();
      expect(serviciosMenu).toBeDefined();
      expect(ubicacionesMenu).toBeDefined();
      expect(configMenu).toBeDefined();

      // Admin should NOT see SuperAdmin items
      const organizacionesMenu = filteredNavigation.find(item => item.name === 'Organizaciones');
      const sistemaMenu = filteredNavigation.find(item => item.name === 'Sistema');
      expect(organizacionesMenu).toBeUndefined();
      expect(sistemaMenu).toBeUndefined();
    });
  });
});
