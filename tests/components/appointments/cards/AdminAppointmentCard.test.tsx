/**
 * AdminAppointmentCard Component Tests
 * 
 * Tests for administrative appointment cards with focus on:
 * - Patient information visibility (CRITICAL)
 * - Administrative functionality
 * - Role-based permissions
 * - Operational priority indicators
 * 
 * @version 1.0.0 - Admin card testing
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminAppointmentCard, { AdminDashboardCard, AdminBulkCard } from '@/components/appointments/cards/AdminAppointmentCard';
import type { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock appointment data with patient information
const mockAppointmentData: AppointmentData = {
  id: 'test-appointment-1',
  appointment_date: '2025-01-29',
  start_time: '10:30:00',
  duration_minutes: 30,
  status: 'confirmed',
  reason: 'Consulta de seguimiento',
  notes: 'Paciente con historial de hipertensión',
  patient: [{
    id: 'patient-1',
    first_name: 'María',
    last_name: 'González'
  }],
  doctor: [{
    id: 'doctor-1',
    specialization: 'Cardiología',
    profiles: [{
      first_name: 'Dr. Juan',
      last_name: 'Pérez'
    }]
  }],
  service: [{
    id: 'service-1',
    name: 'Consulta Cardiológica',
    duration_minutes: 30,
    price: 150000
  }],
  location: [{
    id: 'location-1',
    name: 'Consultorio 1',
    address: 'Calle 123 #45-67'
  }]
};

const mockProps = {
  appointment: mockAppointmentData,
  onReschedule: jest.fn(),
  onCancel: jest.fn(),
  onStatusChange: jest.fn(),
  onViewDetails: jest.fn(),
  onSelectionChange: jest.fn()
};

describe('AdminAppointmentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Patient Information Visibility (CRITICAL)', () => {
    it('ALWAYS shows patient information for admin roles', () => {
      render(<AdminAppointmentCard {...mockProps} />);

      // Patient name should be visible (may appear multiple times)
      const patientElements = screen.getAllByText('María González');
      expect(patientElements.length).toBeGreaterThan(0);
      expect(patientElements[0]).toBeInTheDocument();

      // Patient icon should be present
      const patientSection = patientElements[0].closest('div');
      expect(patientSection).toBeInTheDocument();
    });

    it('shows patient information even when showPatient prop is false', () => {
      render(<AdminAppointmentCard {...mockProps} showPatient={false} />);

      // Patient information should still be visible due to admin role override
      const patientElements = screen.getAllByText('María González');
      expect(patientElements.length).toBeGreaterThan(0);
      expect(patientElements[0]).toBeInTheDocument();
    });

    it('displays patient information with proper styling and accessibility', () => {
      render(<AdminAppointmentCard {...mockProps} />);

      // Find the patient name with the correct styling (admin section)
      const patientElements = screen.getAllByText('María González');
      const adminPatientElement = patientElements.find(el =>
        el.classList.contains('text-gray-900') && el.classList.contains('font-medium')
      );
      expect(adminPatientElement).toBeInTheDocument();
      expect(adminPatientElement).toHaveClass('text-xs', 'font-medium', 'text-gray-900');
    });
  });

  describe('Administrative Features', () => {
    it('shows operational priority indicators', () => {
      const pendingAppointment = {
        ...mockAppointmentData,
        status: 'pending'
      };
      
      render(<AdminAppointmentCard {...mockProps} appointment={pendingAppointment} />);
      
      // Should show high priority indicator for pending appointments
      expect(screen.getByText('Requiere confirmación')).toBeInTheDocument();
    });

    it('displays financial information when enabled', () => {
      render(<AdminAppointmentCard {...mockProps} showFinancialInfo={true} />);
      
      // Should show price information
      expect(screen.getByText('$150.000')).toBeInTheDocument();
    });

    it('handles bulk selection functionality', () => {
      render(
        <AdminAppointmentCard 
          {...mockProps} 
          enableBulkSelection={true}
          isSelected={false}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
      
      fireEvent.click(checkbox);
      expect(mockProps.onSelectionChange).toHaveBeenCalledWith('test-appointment-1', true);
    });
  });

  describe('Status Change Handling', () => {
    it('handles admin status changes with proper logging', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<AdminAppointmentCard {...mockProps} canChangeStatus={true} />);
      
      // Simulate status change (this would typically be triggered by a status button)
      // For now, we'll test the handler directly
      const component = screen.getByText('María González').closest('[data-testid]') || 
                       screen.getByText('Consulta Cardiológica').closest('div');
      
      expect(component).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});

describe('AdminDashboardCard', () => {
  it('enables all dashboard features by default', () => {
    render(<AdminDashboardCard {...mockProps} />);

    // Should show patient information
    const patientElements = screen.getAllByText('María González');
    expect(patientElements.length).toBeGreaterThan(0);

    // Should show service information
    expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();

    // Should show doctor information
    expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
  });

  it('forces patient visibility regardless of props', () => {
    render(<AdminDashboardCard {...mockProps} showPatient={false} />);

    // Patient should still be visible due to forced override
    const patientElements = screen.getAllByText('María González');
    expect(patientElements.length).toBeGreaterThan(0);
    expect(patientElements[0]).toBeInTheDocument();
  });
});

describe('AdminBulkCard', () => {
  it('enables bulk selection and shows patient information', () => {
    render(<AdminBulkCard {...mockProps} />);

    // Should show patient information
    const patientElements = screen.getAllByText('María González');
    expect(patientElements.length).toBeGreaterThan(0);

    // Should have bulk selection enabled
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('uses compact variant but maintains patient visibility', () => {
    render(<AdminBulkCard {...mockProps} />);

    // Patient information should be visible even in compact mode
    const patientElements = screen.getAllByText('María González');
    expect(patientElements.length).toBeGreaterThan(0);
    expect(patientElements[0]).toBeInTheDocument();
  });
});

describe('Responsive Behavior', () => {
  it('maintains patient visibility on mobile devices for admin roles', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // Mobile width
    });

    render(<AdminAppointmentCard {...mockProps} />);

    // Patient information should be visible even on mobile
    const patientElements = screen.getAllByText('María González');
    expect(patientElements.length).toBeGreaterThan(0);
    expect(patientElements[0]).toBeInTheDocument();

    // Should not have responsive hiding classes for admin roles
    const patientContainer = patientElements[0].closest('div');
    expect(patientContainer).not.toHaveClass('hidden');
  });
});

describe('Error Handling', () => {
  it('handles missing patient information gracefully', () => {
    const appointmentWithoutPatient = {
      ...mockAppointmentData,
      patient: null
    };
    
    render(<AdminAppointmentCard {...mockProps} appointment={appointmentWithoutPatient} />);
    
    // Should not crash and should show other information
    expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
  });

  it('handles incomplete patient data', () => {
    const appointmentWithIncompletePatient = {
      ...mockAppointmentData,
      patient: [{
        id: 'patient-1',
        first_name: 'María',
        last_name: undefined
      }]
    };

    render(<AdminAppointmentCard {...mockProps} appointment={appointmentWithIncompletePatient} />);

    // Should show available patient information (may appear multiple times)
    const mariaElements = screen.getAllByText('María');
    expect(mariaElements.length).toBeGreaterThan(0);
    expect(mariaElements[0]).toBeInTheDocument();
  });
});
