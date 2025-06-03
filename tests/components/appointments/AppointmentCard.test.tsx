/**
 * AppointmentCard Component Tests
 * 
 * Comprehensive test suite for the enhanced AppointmentCard components
 * Tests base functionality, role-specific behavior, and edge cases
 * 
 * @version 1.0.0 - Enhanced appointment card tests
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppointmentCardBase, AppointmentCard } from '@/components/appointments/AppointmentCard';
import type { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock data for testing
const mockAppointmentData: AppointmentData = {
  id: 'test-appointment-1',
  appointment_date: '2025-01-29',
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

const mockProps = {
  appointment: mockAppointmentData,
  userRole: 'patient' as const,
  onReschedule: jest.fn(),
  onCancel: jest.fn(),
  onStatusChange: jest.fn(),
  onViewDetails: jest.fn()
};

describe('AppointmentCardBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders appointment information correctly', () => {
      render(<AppointmentCardBase {...mockProps} />);
      
      expect(screen.getByText('Mañana')).toBeInTheDocument(); // Relative date
      expect(screen.getByText('10:30 AM')).toBeInTheDocument(); // Formatted time
      expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Confirmada')).toBeInTheDocument();
    });

    it('displays status badge with correct styling', () => {
      render(<AppointmentCardBase {...mockProps} />);
      
      const statusBadge = screen.getByText('Confirmada');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('shows duration when enabled', () => {
      render(<AppointmentCardBase {...mockProps} showDuration={true} />);
      
      expect(screen.getByText('• 30min')).toBeInTheDocument();
    });

    it('hides duration when disabled', () => {
      render(<AppointmentCardBase {...mockProps} showDuration={false} />);
      
      expect(screen.queryByText('• 30min')).not.toBeInTheDocument();
    });
  });

  describe('Role-specific Display', () => {
    it('shows doctor information for patient role', () => {
      render(<AppointmentCardBase {...mockProps} userRole="patient" />);
      
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      expect(screen.queryByText('María González')).not.toBeInTheDocument();
    });

    it('shows patient information for doctor role', () => {
      render(<AppointmentCardBase {...mockProps} userRole="doctor" showPatient={true} showDoctor={false} />);
      
      expect(screen.getByText('María González')).toBeInTheDocument();
      expect(screen.queryByText('Dr. Juan Pérez')).not.toBeInTheDocument();
    });

    it('shows both patient and doctor for admin role', () => {
      render(<AppointmentCardBase {...mockProps} userRole="admin" showPatient={true} showDoctor={true} />);
      
      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('María González')).toBeInTheDocument();
    });
  });

  describe('Enhanced Status System', () => {
    const statusTests = [
      { status: 'pending', expectedText: 'Pendiente', expectedClass: 'bg-amber-100' },
      { status: 'confirmed', expectedText: 'Confirmada', expectedClass: 'bg-green-100' },
      { status: 'in_progress', expectedText: 'En Curso', expectedClass: 'bg-blue-100' },
      { status: 'completed', expectedText: 'Completada', expectedClass: 'bg-gray-100' },
      { status: 'cancelled', expectedText: 'Cancelada', expectedClass: 'bg-red-100' },
      { status: 'no_show', expectedText: 'No Asistió', expectedClass: 'bg-orange-100' }
    ];

    statusTests.forEach(({ status, expectedText, expectedClass }) => {
      it(`displays ${status} status correctly`, () => {
        const appointmentWithStatus = { ...mockAppointmentData, status };
        render(<AppointmentCardBase {...mockProps} appointment={appointmentWithStatus} />);
        
        const statusElement = screen.getByText(expectedText);
        expect(statusElement).toBeInTheDocument();
        expect(statusElement).toHaveClass(expectedClass);
      });
    });
  });

  describe('Action Buttons', () => {
    it('shows reschedule button when enabled', () => {
      render(<AppointmentCardBase {...mockProps} canReschedule={true} />);
      
      expect(screen.getByTitle('Reagendar cita')).toBeInTheDocument();
    });

    it('shows cancel button when enabled', () => {
      render(<AppointmentCardBase {...mockProps} canCancel={true} />);
      
      expect(screen.getByTitle('Cancelar cita')).toBeInTheDocument();
    });

    it('shows view details button when enabled', () => {
      render(<AppointmentCardBase {...mockProps} canViewDetails={true} />);
      
      expect(screen.getByTitle('Ver detalles')).toBeInTheDocument();
    });

    it('calls onReschedule when reschedule button is clicked', () => {
      render(<AppointmentCardBase {...mockProps} canReschedule={true} />);
      
      fireEvent.click(screen.getByTitle('Reagendar cita'));
      expect(mockProps.onReschedule).toHaveBeenCalledWith('test-appointment-1');
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(<AppointmentCardBase {...mockProps} canCancel={true} />);
      
      fireEvent.click(screen.getByTitle('Cancelar cita'));
      expect(mockProps.onCancel).toHaveBeenCalledWith('test-appointment-1');
    });

    it('calls onViewDetails when view details button is clicked', () => {
      render(<AppointmentCardBase {...mockProps} canViewDetails={true} />);
      
      fireEvent.click(screen.getByTitle('Ver detalles'));
      expect(mockProps.onViewDetails).toHaveBeenCalledWith('test-appointment-1');
    });
  });

  describe('Variants', () => {
    it('applies compact variant styling', () => {
      const { container } = render(<AppointmentCardBase {...mockProps} variant="compact" />);
      
      expect(container.querySelector('.min-h-\\[60px\\]')).toBeInTheDocument();
    });

    it('applies detailed variant styling', () => {
      const { container } = render(<AppointmentCardBase {...mockProps} variant="detailed" />);
      
      expect(container.querySelector('.min-h-\\[100px\\]')).toBeInTheDocument();
    });
  });

  describe('Priority Indicators', () => {
    it('shows high priority indicator for urgent appointments', () => {
      // Create appointment for 1 hour from now
      const urgentDate = new Date();
      urgentDate.setHours(urgentDate.getHours() + 1);
      
      const urgentAppointment = {
        ...mockAppointmentData,
        appointment_date: urgentDate.toISOString().split('T')[0],
        start_time: urgentDate.toTimeString().split(' ')[0]
      };

      render(<AppointmentCardBase {...mockProps} appointment={urgentAppointment} showPriority={true} />);
      
      // Should show priority styling
      expect(document.querySelector('.border-l-amber-500')).toBeInTheDocument();
    });
  });
});

describe('AppointmentCard (Legacy)', () => {
  it('renders using AppointmentCardBase', () => {
    render(<AppointmentCard {...mockProps} />);
    
    expect(screen.getByText('Consulta Cardiológica')).toBeInTheDocument();
    expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
  });
});

describe('Edge Cases', () => {
  it('handles missing doctor data gracefully', () => {
    const appointmentWithoutDoctor = { ...mockAppointmentData, doctor: null };
    render(<AppointmentCardBase {...mockProps} appointment={appointmentWithoutDoctor} />);
    
    expect(screen.getByText('Dr. [No asignado]')).toBeInTheDocument();
  });

  it('handles missing patient data gracefully', () => {
    const appointmentWithoutPatient = { ...mockAppointmentData, patient: null };
    render(<AppointmentCardBase {...mockProps} appointment={appointmentWithoutPatient} showPatient={true} />);
    
    expect(screen.getByText('[Paciente no asignado]')).toBeInTheDocument();
  });

  it('handles missing service data gracefully', () => {
    const appointmentWithoutService = { ...mockAppointmentData, service: null };
    render(<AppointmentCardBase {...mockProps} appointment={appointmentWithoutService} />);
    
    expect(screen.getByText('Consulta General')).toBeInTheDocument();
  });

  it('handles unknown status gracefully', () => {
    const appointmentWithUnknownStatus = { ...mockAppointmentData, status: 'unknown_status' };
    render(<AppointmentCardBase {...mockProps} appointment={appointmentWithUnknownStatus} />);
    
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});
