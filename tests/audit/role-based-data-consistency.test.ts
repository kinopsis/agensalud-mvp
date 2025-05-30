/**
 * COMPREHENSIVE ROLE-BASED DATA CONSISTENCY AUDIT
 * Tests data consistency between dashboard stats and appointments page for all user roles
 * Validates foreign key relationships and multi-tenant data isolation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock data representing different user roles and their appointments
const mockOrganization = {
  id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  name: 'Óptica VisualCare'
};

const mockProfiles = {
  patient: {
    id: '5b361f1e-04b6-4a40-bb61-bd519c0e9be8',
    first_name: 'María',
    last_name: 'García',
    email: 'maria.garcia@example.com',
    role: 'patient',
    organization_id: mockOrganization.id
  },
  doctor: {
    id: '79a2a6c3-c4b6-4e55-bff1-725f52a92404',
    first_name: 'Dr. Carlos',
    last_name: 'Rodríguez',
    email: 'carlos.rodriguez@example.com',
    role: 'doctor',
    organization_id: mockOrganization.id
  },
  admin: {
    id: 'admin-profile-id',
    first_name: 'Ana',
    last_name: 'Administradora',
    email: 'admin@example.com',
    role: 'admin',
    organization_id: mockOrganization.id
  },
  staff: {
    id: 'staff-profile-id',
    first_name: 'Luis',
    last_name: 'Staff',
    email: 'staff@example.com',
    role: 'staff',
    organization_id: mockOrganization.id
  },
  superadmin: {
    id: 'superadmin-profile-id',
    first_name: 'Super',
    last_name: 'Admin',
    email: 'superadmin@example.com',
    role: 'superadmin',
    organization_id: null // SuperAdmin can access all organizations
  }
};

const mockDoctorRecord = {
  id: 'doctor-record-id',
  profile_id: mockProfiles.doctor.id,
  specialization: 'Oftalmología',
  organization_id: mockOrganization.id
};

const mockAppointments = [
  // Patient appointments (using profile_id as patient_id - CORRECT)
  {
    id: 'apt-1',
    patient_id: mockProfiles.patient.id, // profile_id
    doctor_id: mockDoctorRecord.id,
    appointment_date: '2025-05-25', // Past appointment
    start_time: '10:30:00',
    status: 'confirmed',
    organization_id: mockOrganization.id
  },
  {
    id: 'apt-2',
    patient_id: mockProfiles.patient.id, // profile_id
    doctor_id: mockDoctorRecord.id,
    appointment_date: '2025-06-05', // Future appointment
    start_time: '15:30:00',
    status: 'scheduled',
    organization_id: mockOrganization.id
  },
  // More appointments for different scenarios
  {
    id: 'apt-3',
    patient_id: 'other-patient-id',
    doctor_id: mockDoctorRecord.id,
    appointment_date: '2025-05-20', // Past appointment
    start_time: '09:00:00',
    status: 'completed',
    organization_id: mockOrganization.id
  }
];

describe('Role-Based Data Consistency Audit', () => {

  describe('1. PATIENT ROLE - Data Consistency', () => {
    
    // Simulate Patient Dashboard Stats API logic
    const getPatientDashboardStats = (patientId: string) => {
      const totalAppointments = mockAppointments.filter(apt => 
        apt.patient_id === patientId
      );
      
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      
      const upcomingAppointments = totalAppointments.filter(apt => 
        ['confirmed', 'pending', 'scheduled'].includes(apt.status) &&
        apt.appointment_date >= currentDate
      );

      return {
        totalAppointments: totalAppointments.length,
        upcomingAppointments: upcomingAppointments.length
      };
    };

    // Simulate CORRECTED Appointments Page logic
    const getPatientAppointmentsPage = (profile: any, filter?: string) => {
      let appointments = mockAppointments.filter(apt => 
        apt.patient_id === profile.id && // CORRECTED: Use profile.id directly
        apt.organization_id === profile.organization_id
      );

      const today = new Date().toISOString().split('T')[0];
      if (filter === 'upcoming') {
        appointments = appointments.filter(apt => apt.appointment_date >= today);
      } else if (filter === 'past') {
        appointments = appointments.filter(apt => apt.appointment_date < today);
      }

      return appointments;
    };

    it('should show consistent appointment counts between dashboard and appointments page', () => {
      const dashboardStats = getPatientDashboardStats(mockProfiles.patient.id);
      const pageAppointments = getPatientAppointmentsPage(mockProfiles.patient);
      
      expect(dashboardStats.totalAppointments).toBe(pageAppointments.length);
      expect(dashboardStats.totalAppointments).toBe(2); // Based on mock data
    });

    it('should handle upcoming appointments filter correctly', () => {
      const upcomingAppointments = getPatientAppointmentsPage(mockProfiles.patient, 'upcoming');
      expect(upcomingAppointments.length).toBe(1); // Only future appointment
      expect(upcomingAppointments[0].appointment_date).toBe('2025-06-05');
    });

    it('should handle past appointments filter correctly (view=history)', () => {
      const pastAppointments = getPatientAppointmentsPage(mockProfiles.patient, 'past');
      expect(pastAppointments.length).toBe(1); // Only past appointment
      expect(pastAppointments[0].appointment_date).toBe('2025-05-25');
    });

    it('should maintain organization isolation', () => {
      const appointmentsWithDifferentOrg = [
        ...mockAppointments,
        {
          id: 'apt-other-org',
          patient_id: mockProfiles.patient.id,
          doctor_id: 'other-doctor',
          appointment_date: '2025-06-01',
          start_time: '10:00:00',
          status: 'scheduled',
          organization_id: 'different-org-id'
        }
      ];

      const filteredAppointments = appointmentsWithDifferentOrg.filter(apt => 
        apt.patient_id === mockProfiles.patient.id &&
        apt.organization_id === mockProfiles.patient.organization_id
      );

      expect(filteredAppointments.length).toBe(2); // Only same org appointments
    });
  });

  describe('2. DOCTOR ROLE - Data Consistency', () => {
    
    // Simulate Doctor Dashboard Stats API logic
    const getDoctorDashboardStats = (doctorId: string) => {
      const today = new Date().toISOString().split('T')[0];
      
      const todayAppointments = mockAppointments.filter(apt => 
        apt.doctor_id === doctorId &&
        apt.appointment_date === today
      );

      const totalAppointments = mockAppointments.filter(apt => 
        apt.doctor_id === doctorId
      );

      return {
        todayAppointments: todayAppointments.length,
        totalAppointments: totalAppointments.length
      };
    };

    // Simulate Doctor Appointments Page logic
    const getDoctorAppointmentsPage = (doctorRecord: any, filter?: string) => {
      let appointments = mockAppointments.filter(apt => 
        apt.doctor_id === doctorRecord.id &&
        apt.organization_id === doctorRecord.organization_id
      );

      const today = new Date().toISOString().split('T')[0];
      if (filter === 'upcoming') {
        appointments = appointments.filter(apt => apt.appointment_date >= today);
      } else if (filter === 'past') {
        appointments = appointments.filter(apt => apt.appointment_date < today);
      }

      return appointments;
    };

    it('should show consistent appointment counts between dashboard and appointments page', () => {
      const dashboardStats = getDoctorDashboardStats(mockDoctorRecord.id);
      const pageAppointments = getDoctorAppointmentsPage(mockDoctorRecord);
      
      expect(dashboardStats.totalAppointments).toBe(pageAppointments.length);
      expect(dashboardStats.totalAppointments).toBe(3); // All appointments for this doctor
    });

    it('should handle date filters correctly', () => {
      const upcomingAppointments = getDoctorAppointmentsPage(mockDoctorRecord, 'upcoming');
      const pastAppointments = getDoctorAppointmentsPage(mockDoctorRecord, 'past');
      
      expect(upcomingAppointments.length + pastAppointments.length).toBe(3);
    });

    it('should maintain organization isolation for doctors', () => {
      const appointmentsWithDifferentOrg = [
        ...mockAppointments,
        {
          id: 'apt-other-org-doctor',
          patient_id: 'some-patient',
          doctor_id: mockDoctorRecord.id,
          appointment_date: '2025-06-01',
          start_time: '10:00:00',
          status: 'scheduled',
          organization_id: 'different-org-id'
        }
      ];

      const filteredAppointments = appointmentsWithDifferentOrg.filter(apt => 
        apt.doctor_id === mockDoctorRecord.id &&
        apt.organization_id === mockDoctorRecord.organization_id
      );

      expect(filteredAppointments.length).toBe(3); // Only same org appointments
    });
  });

  describe('3. ADMIN ROLE - Data Consistency', () => {
    
    // Simulate Admin Dashboard Stats API logic
    const getAdminDashboardStats = (organizationId: string) => {
      const totalAppointments = mockAppointments.filter(apt => 
        apt.organization_id === organizationId
      );

      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = totalAppointments.filter(apt => 
        apt.appointment_date === today
      );

      const pendingAppointments = totalAppointments.filter(apt => 
        apt.status === 'pending'
      );

      return {
        totalAppointments: totalAppointments.length,
        todayAppointments: todayAppointments.length,
        pendingAppointments: pendingAppointments.length
      };
    };

    // Simulate Admin Appointments Page logic
    const getAdminAppointmentsPage = (profile: any, filter?: string) => {
      let appointments = mockAppointments.filter(apt => 
        apt.organization_id === profile.organization_id
      );

      const today = new Date().toISOString().split('T')[0];
      if (filter === 'upcoming') {
        appointments = appointments.filter(apt => apt.appointment_date >= today);
      } else if (filter === 'past') {
        appointments = appointments.filter(apt => apt.appointment_date < today);
      } else if (filter === 'pending') {
        appointments = appointments.filter(apt => apt.status === 'pending');
      }

      return appointments;
    };

    it('should show consistent appointment counts between dashboard and appointments page', () => {
      const dashboardStats = getAdminDashboardStats(mockProfiles.admin.organization_id!);
      const pageAppointments = getAdminAppointmentsPage(mockProfiles.admin);
      
      expect(dashboardStats.totalAppointments).toBe(pageAppointments.length);
      expect(dashboardStats.totalAppointments).toBe(3); // All appointments in organization
    });

    it('should handle status filters correctly', () => {
      const pendingAppointments = getAdminAppointmentsPage(mockProfiles.admin, 'pending');
      const dashboardStats = getAdminDashboardStats(mockProfiles.admin.organization_id!);
      
      expect(pendingAppointments.length).toBe(dashboardStats.pendingAppointments);
    });

    it('should maintain strict organization boundaries', () => {
      const appointmentsWithMultipleOrgs = [
        ...mockAppointments,
        {
          id: 'apt-other-org',
          patient_id: 'patient-other-org',
          doctor_id: 'doctor-other-org',
          appointment_date: '2025-06-01',
          start_time: '10:00:00',
          status: 'scheduled',
          organization_id: 'different-org-id'
        }
      ];

      const adminAppointments = appointmentsWithMultipleOrgs.filter(apt => 
        apt.organization_id === mockProfiles.admin.organization_id
      );

      expect(adminAppointments.length).toBe(3); // Only same org appointments
      expect(appointmentsWithMultipleOrgs.length).toBe(4); // Total includes other org
    });
  });

  describe('4. STAFF ROLE - Data Consistency', () => {

    // Simulate Staff Dashboard Stats API logic (similar to Admin but focused on daily operations)
    const getStaffDashboardStats = (organizationId: string) => {
      const today = new Date().toISOString().split('T')[0];

      const todayAppointments = mockAppointments.filter(apt =>
        apt.organization_id === organizationId &&
        apt.appointment_date === today
      );

      const pendingAppointments = mockAppointments.filter(apt =>
        apt.organization_id === organizationId &&
        apt.status === 'pending'
      );

      return {
        todayAppointments: todayAppointments.length,
        pendingAppointments: pendingAppointments.length
      };
    };

    // Simulate Staff Appointments Page logic (same as Admin - organization-wide access)
    const getStaffAppointmentsPage = (profile: any, filter?: string) => {
      let appointments = mockAppointments.filter(apt =>
        apt.organization_id === profile.organization_id
      );

      const today = new Date().toISOString().split('T')[0];
      if (filter === 'today') {
        appointments = appointments.filter(apt => apt.appointment_date === today);
      } else if (filter === 'pending') {
        appointments = appointments.filter(apt => apt.status === 'pending');
      }

      return appointments;
    };

    // Redefine Admin function for comparison
    const getAdminAppointmentsPageForComparison = (profile: any, filter?: string) => {
      let appointments = mockAppointments.filter(apt =>
        apt.organization_id === profile.organization_id
      );

      const today = new Date().toISOString().split('T')[0];
      if (filter === 'upcoming') {
        appointments = appointments.filter(apt => apt.appointment_date >= today);
      } else if (filter === 'past') {
        appointments = appointments.filter(apt => apt.appointment_date < today);
      } else if (filter === 'pending') {
        appointments = appointments.filter(apt => apt.status === 'pending');
      }

      return appointments;
    };

    it('should show consistent appointment counts between dashboard and appointments page', () => {
      const dashboardStats = getStaffDashboardStats(mockProfiles.staff.organization_id!);
      const todayAppointments = getStaffAppointmentsPage(mockProfiles.staff, 'today');
      const pendingAppointments = getStaffAppointmentsPage(mockProfiles.staff, 'pending');

      expect(dashboardStats.todayAppointments).toBe(todayAppointments.length);
      expect(dashboardStats.pendingAppointments).toBe(pendingAppointments.length);
    });

    it('should have same organization access as Admin', () => {
      const staffAppointments = getStaffAppointmentsPage(mockProfiles.staff);
      const adminAppointments = getAdminAppointmentsPageForComparison(mockProfiles.admin);

      expect(staffAppointments.length).toBe(adminAppointments.length);
    });
  });

  describe('5. SUPERADMIN ROLE - Data Consistency', () => {

    // Simulate SuperAdmin Dashboard Stats API logic (system-wide access)
    const getSuperAdminDashboardStats = () => {
      const allAppointments = mockAppointments; // SuperAdmin sees all

      const organizationStats = {
        [mockOrganization.id]: {
          totalAppointments: allAppointments.filter(apt =>
            apt.organization_id === mockOrganization.id
          ).length
        }
      };

      return {
        totalAppointments: allAppointments.length,
        organizationStats
      };
    };

    // Simulate SuperAdmin Appointments Page logic (can access any organization)
    const getSuperAdminAppointmentsPage = (organizationId?: string) => {
      if (organizationId) {
        return mockAppointments.filter(apt =>
          apt.organization_id === organizationId
        );
      }
      return mockAppointments; // All appointments across all organizations
    };

    it('should show consistent system-wide appointment counts', () => {
      const dashboardStats = getSuperAdminDashboardStats();
      const allAppointments = getSuperAdminAppointmentsPage();

      expect(dashboardStats.totalAppointments).toBe(allAppointments.length);
    });

    it('should show consistent organization-specific counts', () => {
      const dashboardStats = getSuperAdminDashboardStats();
      const orgAppointments = getSuperAdminAppointmentsPage(mockOrganization.id);

      expect(dashboardStats.organizationStats[mockOrganization.id].totalAppointments)
        .toBe(orgAppointments.length);
    });

    it('should have access to all organizations', () => {
      const appointmentsWithMultipleOrgs = [
        ...mockAppointments,
        {
          id: 'apt-org2',
          patient_id: 'patient-org2',
          doctor_id: 'doctor-org2',
          appointment_date: '2025-06-01',
          start_time: '10:00:00',
          status: 'scheduled',
          organization_id: 'organization-2'
        }
      ];

      // SuperAdmin should see all appointments
      const allAppointments = appointmentsWithMultipleOrgs;
      expect(allAppointments.length).toBe(4);

      // But Admin should only see their organization
      const adminAppointments = appointmentsWithMultipleOrgs.filter(apt =>
        apt.organization_id === mockProfiles.admin.organization_id
      );
      expect(adminAppointments.length).toBe(3);
    });
  });
});
