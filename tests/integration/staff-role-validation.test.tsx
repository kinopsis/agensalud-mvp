/**
 * Staff Role Validation Tests
 * 
 * Specific tests to validate that the 'staff' role has access to all
 * enhanced dashboard features and factory functions work correctly
 * 
 * @version 1.0.0 - Staff role validation
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import { 
  getDashboardCardForRole,
  getAppointmentCardForRole,
  getCompactCardForRole,
  getRoleCapabilities,
  isAdministrativeRole,
  isClinicalRole,
  isPatientRole
} from '@/components/appointments/cards';

describe('Staff Role Validation', () => {
  describe('Factory Functions for Staff Role', () => {
    it('returns AdminDashboardCard for staff role', () => {
      const StaffDashboardCard = getDashboardCardForRole('staff');
      const AdminDashboardCard = getDashboardCardForRole('admin');
      
      // Staff should get the same component as admin
      expect(StaffDashboardCard).toBe(AdminDashboardCard);
      expect(StaffDashboardCard).toBeDefined();
    });

    it('returns AdminAppointmentCard for staff role', () => {
      const StaffAppointmentCard = getAppointmentCardForRole('staff');
      const AdminAppointmentCard = getAppointmentCardForRole('admin');
      
      // Staff should get the same component as admin
      expect(StaffAppointmentCard).toBe(AdminAppointmentCard);
      expect(StaffAppointmentCard).toBeDefined();
    });

    it('returns AdminBulkCard for staff role in compact mode', () => {
      const StaffCompactCard = getCompactCardForRole('staff');
      const AdminCompactCard = getCompactCardForRole('admin');
      
      // Staff should get the same component as admin
      expect(StaffCompactCard).toBe(AdminCompactCard);
      expect(StaffCompactCard).toBeDefined();
    });
  });

  describe('Staff Role Capabilities', () => {
    it('provides administrative capabilities for staff role', () => {
      const staffCapabilities = getRoleCapabilities('staff');
      const adminCapabilities = getRoleCapabilities('admin');
      
      // Staff should have the same capabilities as admin
      expect(staffCapabilities).toEqual(adminCapabilities);
      
      // Verify specific capabilities
      expect(staffCapabilities.canReschedule).toBe(true);
      expect(staffCapabilities.canCancel).toBe(true);
      expect(staffCapabilities.canChangeStatus).toBe(true);
      expect(staffCapabilities.canViewPatient).toBe(true);
      expect(staffCapabilities.canViewDoctor).toBe(true);
      expect(staffCapabilities.canBulkSelect).toBe(true);
      expect(staffCapabilities.canViewFinancial).toBe(true);
      expect(staffCapabilities.canManageSchedule).toBe(true);
    });

    it('correctly identifies staff as administrative role', () => {
      expect(isAdministrativeRole('staff')).toBe(true);
      expect(isClinicalRole('staff')).toBe(false);
      expect(isPatientRole('staff')).toBe(false);
    });
  });

  describe('Role Comparison', () => {
    it('staff and admin roles have identical capabilities', () => {
      const staffCapabilities = getRoleCapabilities('staff');
      const adminCapabilities = getRoleCapabilities('admin');
      
      expect(staffCapabilities).toEqual(adminCapabilities);
    });

    it('staff and admin roles get same components', () => {
      // Dashboard components
      expect(getDashboardCardForRole('staff')).toBe(getDashboardCardForRole('admin'));
      
      // Base components
      expect(getAppointmentCardForRole('staff')).toBe(getAppointmentCardForRole('admin'));
      
      // Compact components
      expect(getCompactCardForRole('staff')).toBe(getCompactCardForRole('admin'));
    });

    it('staff role is different from patient and doctor roles', () => {
      // Different from patient
      expect(getDashboardCardForRole('staff')).not.toBe(getDashboardCardForRole('patient'));
      expect(getAppointmentCardForRole('staff')).not.toBe(getAppointmentCardForRole('patient'));
      
      // Different from doctor
      expect(getDashboardCardForRole('staff')).not.toBe(getDashboardCardForRole('doctor'));
      expect(getAppointmentCardForRole('staff')).not.toBe(getAppointmentCardForRole('doctor'));
    });
  });

  describe('SuperAdmin Role Validation', () => {
    it('superadmin has same capabilities as admin and staff', () => {
      const superadminCapabilities = getRoleCapabilities('superadmin');
      const adminCapabilities = getRoleCapabilities('admin');
      const staffCapabilities = getRoleCapabilities('staff');
      
      expect(superadminCapabilities).toEqual(adminCapabilities);
      expect(superadminCapabilities).toEqual(staffCapabilities);
    });

    it('superadmin gets same components as admin and staff', () => {
      // Dashboard components
      expect(getDashboardCardForRole('superadmin')).toBe(getDashboardCardForRole('admin'));
      expect(getDashboardCardForRole('superadmin')).toBe(getDashboardCardForRole('staff'));
      
      // Base components
      expect(getAppointmentCardForRole('superadmin')).toBe(getAppointmentCardForRole('admin'));
      expect(getAppointmentCardForRole('superadmin')).toBe(getAppointmentCardForRole('staff'));
      
      // Compact components
      expect(getCompactCardForRole('superadmin')).toBe(getCompactCardForRole('admin'));
      expect(getCompactCardForRole('superadmin')).toBe(getCompactCardForRole('staff'));
    });
  });

  describe('All Administrative Roles', () => {
    const administrativeRoles = ['admin', 'staff', 'superadmin'];

    it('all administrative roles are identified correctly', () => {
      administrativeRoles.forEach(role => {
        expect(isAdministrativeRole(role)).toBe(true);
        expect(isClinicalRole(role)).toBe(false);
        expect(isPatientRole(role)).toBe(false);
      });
    });

    it('all administrative roles have identical capabilities', () => {
      const baseCapabilities = getRoleCapabilities('admin');
      
      administrativeRoles.forEach(role => {
        expect(getRoleCapabilities(role)).toEqual(baseCapabilities);
      });
    });

    it('all administrative roles get identical components', () => {
      const baseDashboardCard = getDashboardCardForRole('admin');
      const baseAppointmentCard = getAppointmentCardForRole('admin');
      const baseCompactCard = getCompactCardForRole('admin');
      
      administrativeRoles.forEach(role => {
        expect(getDashboardCardForRole(role)).toBe(baseDashboardCard);
        expect(getAppointmentCardForRole(role)).toBe(baseAppointmentCard);
        expect(getCompactCardForRole(role)).toBe(baseCompactCard);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles unknown roles gracefully', () => {
      const unknownDashboard = getDashboardCardForRole('unknown');
      const unknownAppointment = getAppointmentCardForRole('unknown');
      const unknownCompact = getCompactCardForRole('unknown');
      
      expect(unknownDashboard).toBeDefined();
      expect(unknownAppointment).toBeDefined();
      expect(unknownCompact).toBeDefined();
    });

    it('handles empty string role gracefully', () => {
      const emptyDashboard = getDashboardCardForRole('');
      const emptyAppointment = getAppointmentCardForRole('');
      const emptyCompact = getCompactCardForRole('');
      
      expect(emptyDashboard).toBeDefined();
      expect(emptyAppointment).toBeDefined();
      expect(emptyCompact).toBeDefined();
    });

    it('handles null/undefined roles gracefully', () => {
      const nullDashboard = getDashboardCardForRole(null as any);
      const undefinedAppointment = getAppointmentCardForRole(undefined as any);
      
      expect(nullDashboard).toBeDefined();
      expect(undefinedAppointment).toBeDefined();
    });
  });
});

describe('Factory Functions Validation', () => {
  describe('All Roles Coverage', () => {
    const allRoles = ['patient', 'doctor', 'admin', 'staff', 'superadmin'];

    it('all roles return valid dashboard components', () => {
      allRoles.forEach(role => {
        const component = getDashboardCardForRole(role);
        expect(component).toBeDefined();
        expect(typeof component).toBe('function');
      });
    });

    it('all roles return valid appointment components', () => {
      allRoles.forEach(role => {
        const component = getAppointmentCardForRole(role);
        expect(component).toBeDefined();
        expect(typeof component).toBe('function');
      });
    });

    it('all roles return valid compact components', () => {
      allRoles.forEach(role => {
        const component = getCompactCardForRole(role);
        expect(component).toBeDefined();
        expect(typeof component).toBe('function');
      });
    });

    it('all roles return valid capabilities', () => {
      allRoles.forEach(role => {
        const capabilities = getRoleCapabilities(role);
        expect(capabilities).toBeDefined();
        expect(typeof capabilities).toBe('object');
        
        // Check that all expected properties exist
        expect(capabilities).toHaveProperty('canReschedule');
        expect(capabilities).toHaveProperty('canCancel');
        expect(capabilities).toHaveProperty('canChangeStatus');
        expect(capabilities).toHaveProperty('canViewPatient');
        expect(capabilities).toHaveProperty('canViewDoctor');
        expect(capabilities).toHaveProperty('canBulkSelect');
        expect(capabilities).toHaveProperty('canViewFinancial');
        expect(capabilities).toHaveProperty('canManageSchedule');
      });
    });
  });

  describe('Role Classification', () => {
    it('correctly classifies patient role', () => {
      expect(isPatientRole('patient')).toBe(true);
      expect(isClinicalRole('patient')).toBe(false);
      expect(isAdministrativeRole('patient')).toBe(false);
    });

    it('correctly classifies doctor role', () => {
      expect(isPatientRole('doctor')).toBe(false);
      expect(isClinicalRole('doctor')).toBe(true);
      expect(isAdministrativeRole('doctor')).toBe(false);
    });

    it('correctly classifies administrative roles', () => {
      ['admin', 'staff', 'superadmin'].forEach(role => {
        expect(isPatientRole(role)).toBe(false);
        expect(isClinicalRole(role)).toBe(false);
        expect(isAdministrativeRole(role)).toBe(true);
      });
    });
  });
});
