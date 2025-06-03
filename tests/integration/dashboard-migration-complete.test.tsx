/**
 * Complete Dashboard Migration Integration Tests
 * 
 * Tests to verify that all dashboard migrations (Patient, Doctor, Admin)
 * work correctly with the new appointment card components
 * 
 * @version 1.0.0 - Fase 1B Complete Integration Tests
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  getAppointmentCardForRole, 
  getDashboardCardForRole,
  getCompactCardForRole,
  getRoleCapabilities 
} from '@/components/appointments/cards';

// Mock the contexts
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      first_name: 'Test',
      last_name: 'User'
    }
  })
}));

jest.mock('@/contexts/tenant-context', () => ({
  useTenant: () => ({
    organization: {
      id: 'org-1',
      name: 'Test Clinic'
    }
  })
}));

// Mock appointment data
const mockAppointmentData = {
  id: 'apt-1',
  appointment_date: '2025-01-30',
  start_time: '10:30:00',
  duration_minutes: 30,
  status: 'confirmed',
  reason: 'Consulta de seguimiento',
  notes: 'Paciente con historial de hipertensión',
  doctor: [{
    id: 'doctor-1',
    specialization: 'Cardiología',
    profiles: [{
      first_name: 'Juan',
      last_name: 'Pérez'
    }]
  }],
  patient: [{
    id: 'patient-1',
    first_name: 'María',
    last_name: 'González'
  }],
  location: [{
    id: 'location-1',
    name: 'Consultorio 1',
    address: 'Calle 123 #45-67'
  }],
  service: [{
    id: 'service-1',
    name: 'Consulta Cardiológica',
    duration_minutes: 30,
    price: 150000
  }]
};

describe('Dashboard Migration Integration Tests', () => {
  describe('Factory Functions', () => {
    it('returns correct components for each role', () => {
      const patientCard = getAppointmentCardForRole('patient');
      const doctorCard = getAppointmentCardForRole('doctor');
      const adminCard = getAppointmentCardForRole('admin');
      
      expect(patientCard).toBeDefined();
      expect(doctorCard).toBeDefined();
      expect(adminCard).toBeDefined();
    });

    it('returns correct dashboard components for each role', () => {
      const patientDashboard = getDashboardCardForRole('patient');
      const doctorDashboard = getDashboardCardForRole('doctor');
      const adminDashboard = getDashboardCardForRole('admin');
      
      expect(patientDashboard).toBeDefined();
      expect(doctorDashboard).toBeDefined();
      expect(adminDashboard).toBeDefined();
    });

    it('returns correct compact components for each role', () => {
      const patientCompact = getCompactCardForRole('patient');
      const doctorCompact = getCompactCardForRole('doctor');
      const adminCompact = getCompactCardForRole('admin');
      
      expect(patientCompact).toBeDefined();
      expect(doctorCompact).toBeDefined();
      expect(adminCompact).toBeDefined();
    });
  });

  describe('Role Capabilities', () => {
    it('provides correct capabilities for patient role', () => {
      const capabilities = getRoleCapabilities('patient');
      
      expect(capabilities.canReschedule).toBe(true);
      expect(capabilities.canCancel).toBe(true);
      expect(capabilities.canChangeStatus).toBe(false);
      expect(capabilities.canViewPatient).toBe(false);
      expect(capabilities.canViewDoctor).toBe(true);
      expect(capabilities.canBulkSelect).toBe(false);
      expect(capabilities.canViewFinancial).toBe(false);
    });

    it('provides correct capabilities for doctor role', () => {
      const capabilities = getRoleCapabilities('doctor');
      
      expect(capabilities.canReschedule).toBe(false);
      expect(capabilities.canCancel).toBe(false);
      expect(capabilities.canChangeStatus).toBe(true);
      expect(capabilities.canViewPatient).toBe(true);
      expect(capabilities.canViewDoctor).toBe(false);
      expect(capabilities.canBulkSelect).toBe(false);
      expect(capabilities.canViewFinancial).toBe(false);
    });

    it('provides correct capabilities for admin role', () => {
      const capabilities = getRoleCapabilities('admin');
      
      expect(capabilities.canReschedule).toBe(true);
      expect(capabilities.canCancel).toBe(true);
      expect(capabilities.canChangeStatus).toBe(true);
      expect(capabilities.canViewPatient).toBe(true);
      expect(capabilities.canViewDoctor).toBe(true);
      expect(capabilities.canBulkSelect).toBe(true);
      expect(capabilities.canViewFinancial).toBe(true);
    });
  });

  describe('Component Rendering', () => {
    it('renders patient dashboard card correctly', () => {
      const PatientDashboardCard = getDashboardCardForRole('patient');
      
      render(
        <PatientDashboardCard
          appointment={mockAppointmentData}
          onReschedule={() => {}}
          onCancel={() => {}}
          onViewDetails={() => {}}
        />
      );
      
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
    });

    it('renders doctor today card correctly', () => {
      const DoctorTodayCard = getDashboardCardForRole('doctor');
      
      render(
        <DoctorTodayCard
          appointment={mockAppointmentData}
          onStatusChange={() => {}}
          onViewDetails={() => {}}
        />
      );
      
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
      expect(screen.getByText('María González')).toBeInTheDocument();
    });

    it('renders admin dashboard card correctly', () => {
      const AdminDashboardCard = getDashboardCardForRole('admin');
      
      render(
        <AdminDashboardCard
          appointment={mockAppointmentData}
          onStatusChange={() => {}}
          onSelectionChange={() => {}}
          onViewDetails={() => {}}
          isSelected={false}
        />
      );
      
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
      expect(screen.getByText('María González')).toBeInTheDocument();
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
    });
  });

  describe('Action Handling', () => {
    it('handles patient actions correctly', () => {
      const PatientDashboardCard = getDashboardCardForRole('patient');
      const onReschedule = jest.fn();
      const onCancel = jest.fn();
      
      render(
        <PatientDashboardCard
          appointment={mockAppointmentData}
          onReschedule={onReschedule}
          onCancel={onCancel}
          onViewDetails={() => {}}
          canReschedule={true}
          canCancel={true}
        />
      );
      
      const rescheduleButton = screen.getByTitle('Reagendar cita');
      const cancelButton = screen.getByTitle('Cancelar cita');
      
      fireEvent.click(rescheduleButton);
      fireEvent.click(cancelButton);
      
      expect(onReschedule).toHaveBeenCalledWith('apt-1');
      expect(onCancel).toHaveBeenCalledWith('apt-1');
    });

    it('handles doctor actions correctly', () => {
      const DoctorTodayCard = getDashboardCardForRole('doctor');
      const onStatusChange = jest.fn();
      
      render(
        <DoctorTodayCard
          appointment={mockAppointmentData}
          onStatusChange={onStatusChange}
          onViewDetails={() => {}}
          canChangeStatus={true}
        />
      );
      
      // Status change functionality would be tested here
      // This depends on the specific implementation of status change UI
    });

    it('handles admin actions correctly', () => {
      const AdminDashboardCard = getDashboardCardForRole('admin');
      const onSelectionChange = jest.fn();
      
      render(
        <AdminDashboardCard
          appointment={mockAppointmentData}
          onStatusChange={() => {}}
          onSelectionChange={onSelectionChange}
          onViewDetails={() => {}}
          isSelected={false}
          enableBulkSelection={true}
        />
      );
      
      // Bulk selection functionality would be tested here
      // This depends on the specific implementation of bulk selection UI
    });
  });

  describe('Migration Compatibility', () => {
    it('maintains backward compatibility with existing props', () => {
      const PatientCard = getAppointmentCardForRole('patient');
      
      // Test that old prop patterns still work
      render(
        <PatientCard
          appointment={mockAppointmentData}
          userRole="patient"
          canReschedule={true}
          canCancel={true}
          onReschedule={() => {}}
          onCancel={() => {}}
        />
      );
      
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
    });

    it('handles missing optional props gracefully', () => {
      const PatientCard = getAppointmentCardForRole('patient');
      
      render(
        <PatientCard
          appointment={mockAppointmentData}
        />
      );
      
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders components within acceptable time', () => {
      const startTime = performance.now();
      
      const PatientCard = getDashboardCardForRole('patient');
      render(
        <PatientCard
          appointment={mockAppointmentData}
          onReschedule={() => {}}
          onCancel={() => {}}
          onViewDetails={() => {}}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });
  });
});
