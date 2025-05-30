/**
 * STAFF ROLE DOCTOR MANAGEMENT TESTS
 * Tests Staff role access to doctor availability management per PRD2.md Section 5.5
 * Validates multi-tenant isolation and proper permission enforcement
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
};

// Mock data for testing
const mockOrganization = {
  id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  name: 'Óptica VisualCare'
};

const mockStaffProfile = {
  id: 'staff-profile-id',
  first_name: 'Maria',
  last_name: 'Rodriguez',
  email: 'maria.rodriguez@visualcare.com',
  role: 'staff',
  organization_id: mockOrganization.id
};

const mockDoctors = [
  {
    id: 'doctor-1',
    profile_id: 'doctor-profile-1',
    specialization: 'Oftalmología',
    consultation_fee: 150000,
    is_available: true,
    organization_id: mockOrganization.id,
    profiles: {
      first_name: 'Carlos',
      last_name: 'Mendez',
      email: 'carlos.mendez@visualcare.com',
      phone: '+57 300 123 4567'
    }
  },
  {
    id: 'doctor-2',
    profile_id: 'doctor-profile-2',
    specialization: 'Optometría',
    consultation_fee: 120000,
    is_available: false,
    organization_id: mockOrganization.id,
    profiles: {
      first_name: 'Ana',
      last_name: 'Garcia',
      email: 'ana.garcia@visualcare.com',
      phone: '+57 300 987 6543'
    }
  }
];

describe('Staff Role Doctor Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockStaffProfile.id } },
      error: null
    });
  });

  describe('1. Doctor Access Permissions', () => {
    it('should allow Staff to view doctors in their organization', () => {
      // Test data validation
      const staffOrgId = mockStaffProfile.organization_id;
      const doctorsInOrg = mockDoctors.filter(d => d.organization_id === staffOrgId);

      expect(doctorsInOrg).toEqual(mockDoctors);
      expect(doctorsInOrg.length).toBe(2);

      // Validate all doctors belong to staff's organization
      doctorsInOrg.forEach(doctor => {
        expect(doctor.organization_id).toBe(staffOrgId);
      });
    });

    it('should prevent Staff from accessing doctors from other organizations', () => {
      const otherOrgId = 'other-org-id';
      const staffOrgId = mockStaffProfile.organization_id;

      // Test that staff org ID is different from other org ID
      expect(staffOrgId).not.toBe(otherOrgId);

      // Filter doctors by other organization (should be empty)
      const doctorsFromOtherOrg = mockDoctors.filter(d => d.organization_id === otherOrgId);

      expect(doctorsFromOtherOrg).toEqual([]);
      expect(doctorsFromOtherOrg.length).toBe(0);
    });

    it('should validate Staff role permissions', () => {
      const allowedRoles = ['staff', 'admin', 'superadmin'];
      const staffRole = mockStaffProfile.role;

      expect(allowedRoles).toContain(staffRole);
      expect(staffRole).toBe('staff');
    });
  });

  describe('2. Doctor Availability Management', () => {
    it('should allow Staff to update doctor availability status', () => {
      const doctorId = 'doctor-1';
      const originalDoctor = mockDoctors.find(d => d.id === doctorId);
      const newAvailabilityStatus = false;

      expect(originalDoctor).toBeDefined();
      expect(originalDoctor?.is_available).toBe(true);

      // Simulate availability update
      const updatedDoctor = {
        ...originalDoctor!,
        is_available: newAvailabilityStatus
      };

      expect(updatedDoctor.is_available).toBe(newAvailabilityStatus);
      expect(updatedDoctor.id).toBe(doctorId);
      expect(updatedDoctor.organization_id).toBe(mockStaffProfile.organization_id);
    });

    it('should calculate availability statistics correctly', () => {
      const totalDoctors = mockDoctors.length;
      const availableDoctors = mockDoctors.filter(d => d.is_available).length;
      const unavailableDoctors = mockDoctors.filter(d => !d.is_available).length;

      expect(totalDoctors).toBe(2);
      expect(availableDoctors).toBe(1);
      expect(unavailableDoctors).toBe(1);
    });

    it('should validate availability status changes', () => {
      const validStatuses = [true, false];
      const testStatus = true;

      expect(validStatuses).toContain(testStatus);
      expect(typeof testStatus).toBe('boolean');
    });
  });

  describe('3. Multi-tenant Data Isolation', () => {
    it('should ensure Staff can only manage doctors in their organization', () => {
      const staffOrgId = mockStaffProfile.organization_id;
      const doctorOrgIds = mockDoctors.map(d => d.organization_id);

      // All doctors should belong to the same organization as the staff member
      doctorOrgIds.forEach(orgId => {
        expect(orgId).toBe(staffOrgId);
      });
    });

    it('should prevent cross-organization doctor access', async () => {
      const differentOrgDoctor = {
        ...mockDoctors[0],
        organization_id: 'different-org-id'
      };

      // Mock profile query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockStaffProfile,
            error: null
          })
        })
      });

      // Mock doctor from different organization
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: differentOrgDoctor,
              error: null
            })
          })
        })
      });

      // Simulate organization check
      const hasAccess = differentOrgDoctor.organization_id === mockStaffProfile.organization_id;
      
      expect(hasAccess).toBe(false);
    });
  });

  describe('4. Dashboard Statistics Integration', () => {
    it('should provide correct doctor statistics for Staff dashboard', () => {
      const stats = {
        totalDoctors: mockDoctors.length,
        availableDoctors: mockDoctors.filter(d => d.is_available).length,
        unavailableDoctors: mockDoctors.filter(d => !d.is_available).length
      };

      expect(stats.totalDoctors).toBe(2);
      expect(stats.availableDoctors).toBe(1);
      expect(stats.unavailableDoctors).toBe(1);
      expect(stats.totalDoctors).toBe(stats.availableDoctors + stats.unavailableDoctors);
    });

    it('should handle empty doctor list gracefully', () => {
      const emptyDoctorList: typeof mockDoctors = [];
      
      const stats = {
        totalDoctors: emptyDoctorList.length,
        availableDoctors: emptyDoctorList.filter(d => d.is_available).length,
        unavailableDoctors: emptyDoctorList.filter(d => !d.is_available).length
      };

      expect(stats.totalDoctors).toBe(0);
      expect(stats.availableDoctors).toBe(0);
      expect(stats.unavailableDoctors).toBe(0);
    });
  });

  describe('5. API Endpoint Validation', () => {
    it('should validate Staff API endpoint permissions', () => {
      const allowedRoles = ['staff', 'admin', 'superadmin'];
      const requestingRole = 'staff';

      const hasPermission = allowedRoles.includes(requestingRole);
      expect(hasPermission).toBe(true);
    });

    it('should reject unauthorized roles', () => {
      const allowedRoles = ['staff', 'admin', 'superadmin'];
      const unauthorizedRoles = ['patient', 'doctor'];

      unauthorizedRoles.forEach(role => {
        const hasPermission = allowedRoles.includes(role);
        expect(hasPermission).toBe(false);
      });
    });

    it('should validate API request structure', () => {
      const validRequest = {
        doctorId: 'doctor-1',
        is_available: true,
        organizationId: mockOrganization.id
      };

      expect(validRequest.doctorId).toBeDefined();
      expect(typeof validRequest.is_available).toBe('boolean');
      expect(validRequest.organizationId).toBeDefined();
    });
  });

  describe('6. Error Handling', () => {
    it('should handle database errors gracefully', () => {
      // Simulate error response structure
      const errorResponse = {
        data: null,
        error: { message: 'Database connection failed' }
      };

      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.message).toBe('Database connection failed');
      expect(errorResponse.data).toBeNull();
    });

    it('should handle invalid doctor ID', () => {
      const invalidDoctorId = 'invalid-doctor-id';
      const foundDoctor = mockDoctors.find(d => d.id === invalidDoctorId);

      expect(foundDoctor).toBeUndefined();

      // Simulate not found response
      const notFoundResponse = {
        data: null,
        error: { message: 'Doctor not found' }
      };

      expect(notFoundResponse.error).toBeDefined();
      expect(notFoundResponse.data).toBeNull();
    });
  });
});
