/**
 * PatientAppointmentCard Component Tests
 * 
 * Test suite for patient-specific appointment card functionality
 * 
 * @version 1.0.0 - Patient card tests
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientAppointmentCard, { PatientDashboardCard, PatientCompactCard } from '@/components/appointments/cards/PatientAppointmentCard';
import type { AppointmentData } from '@/components/appointments/AppointmentCard';

const mockAppointmentData: AppointmentData = {
  id: 'patient-appointment-1',
  appointment_date: '2025-01-29',
  start_time: '14:30:00',
  duration_minutes: 45,
  status: 'confirmed',
  reason: 'Consulta de rutina',
  notes: null,
  doctor: [{
    id: 'doctor-1',
    specialization: 'Medicina General',
    profiles: [{
      first_name: 'Ana',
      last_name: 'Rodríguez'
    }]
  }],
  patient: [{
    id: 'patient-1',
    first_name: 'Carlos',
    last_name: 'Martínez'
  }],
  location: [{
    id: 'location-1',
    name: 'Consultorio Principal',
    address: 'Av. Principal 123'
  }],
  service: [{
    id: 'service-1',
    name: 'Consulta General',
    duration_minutes: 45,
    price: 80000
  }]
};

const mockProps = {
  appointment: mockAppointmentData,
  onReschedule: jest.fn(),
  onCancel: jest.fn(),
  onStatusChange: jest.fn(),
  onViewDetails: jest.fn()
};

describe('PatientAppointmentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Patient Functionality', () => {
    it('renders patient-specific information', () => {
      render(<PatientAppointmentCard {...mockProps} />);
      
      expect(screen.getByText('Consulta General')).toBeInTheDocument();
      expect(screen.getByText('Dr. Ana Rodríguez')).toBeInTheDocument();
      expect(screen.getByText('Medicina General')).toBeInTheDocument();
      expect(screen.getByText('Confirmada')).toBeInTheDocument();
    });

    it('does not show patient name (since it\'s the patient\'s own card)', () => {
      render(<PatientAppointmentCard {...mockProps} />);
      
      expect(screen.queryByText('Carlos Martínez')).not.toBeInTheDocument();
    });

    it('shows doctor information by default', () => {
      render(<PatientAppointmentCard {...mockProps} />);
      
      expect(screen.getByText('Dr. Ana Rodríguez')).toBeInTheDocument();
    });

    it('enables reschedule and cancel by default', () => {
      render(<PatientAppointmentCard {...mockProps} />);
      
      expect(screen.getByTitle('Reagendar cita')).toBeInTheDocument();
      expect(screen.getByTitle('Cancelar cita')).toBeInTheDocument();
    });
  });

  describe('Upcoming Appointment Priority', () => {
    it('shows priority styling for upcoming appointments', () => {
      // Create appointment for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const upcomingAppointment = {
        ...mockAppointmentData,
        appointment_date: tomorrow.toISOString().split('T')[0],
        start_time: '10:00:00'
      };

      const { container } = render(
        <PatientAppointmentCard 
          {...mockProps} 
          appointment={upcomingAppointment}
          showUpcomingPriority={true}
        />
      );
      
      expect(container.querySelector('.ring-2.ring-blue-200')).toBeInTheDocument();
    });

    it('uses detailed variant for upcoming appointments', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const upcomingAppointment = {
        ...mockAppointmentData,
        appointment_date: tomorrow.toISOString().split('T')[0],
        start_time: '10:00:00'
      };

      const { container } = render(
        <PatientAppointmentCard 
          {...mockProps} 
          appointment={upcomingAppointment}
          showUpcomingPriority={true}
        />
      );
      
      expect(container.querySelector('.min-h-\\[100px\\]')).toBeInTheDocument();
    });
  });

  describe('Historical Appointments', () => {
    it('disables actions for completed appointments', () => {
      const completedAppointment = {
        ...mockAppointmentData,
        status: 'completed',
        appointment_date: '2025-01-20' // Past date
      };

      render(<PatientAppointmentCard {...mockProps} appointment={completedAppointment} />);
      
      expect(screen.queryByTitle('Reagendar cita')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Cancelar cita')).not.toBeInTheDocument();
    });

    it('applies history styling for past appointments', () => {
      const pastAppointment = {
        ...mockAppointmentData,
        status: 'completed',
        appointment_date: '2025-01-20'
      };

      const { container } = render(
        <PatientAppointmentCard 
          {...mockProps} 
          appointment={pastAppointment}
          showHistoryContext={true}
        />
      );
      
      expect(container.querySelector('.opacity-75')).toBeInTheDocument();
    });

    it('uses compact variant for historical appointments', () => {
      const pastAppointment = {
        ...mockAppointmentData,
        status: 'completed',
        appointment_date: '2025-01-20'
      };

      const { container } = render(
        <PatientAppointmentCard 
          {...mockProps} 
          appointment={pastAppointment}
          showHistoryContext={true}
        />
      );
      
      expect(container.querySelector('.min-h-\\[60px\\]')).toBeInTheDocument();
    });
  });

  describe('Action Handling', () => {
    it('calls onReschedule with correct appointment ID', () => {
      render(<PatientAppointmentCard {...mockProps} />);
      
      fireEvent.click(screen.getByTitle('Reagendar cita'));
      expect(mockProps.onReschedule).toHaveBeenCalledWith('patient-appointment-1');
    });

    it('calls onCancel with correct appointment ID', () => {
      render(<PatientAppointmentCard {...mockProps} />);
      
      fireEvent.click(screen.getByTitle('Cancelar cita'));
      expect(mockProps.onCancel).toHaveBeenCalledWith('patient-appointment-1');
    });
  });
});

describe('PatientDashboardCard', () => {
  it('enables all dashboard features', () => {
    render(<PatientDashboardCard {...mockProps} />);
    
    expect(screen.getByText('Consulta General')).toBeInTheDocument();
    expect(screen.getByTitle('Ver detalles')).toBeInTheDocument();
  });

  it('shows upcoming priority by default', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcomingAppointment = {
      ...mockAppointmentData,
      appointment_date: tomorrow.toISOString().split('T')[0]
    };

    const { container } = render(
      <PatientDashboardCard {...mockProps} appointment={upcomingAppointment} />
    );
    
    expect(container.querySelector('.ring-2.ring-blue-200')).toBeInTheDocument();
  });
});

describe('PatientCompactCard', () => {
  it('uses compact variant', () => {
    const { container } = render(<PatientCompactCard {...mockProps} />);
    
    expect(container.querySelector('.min-h-\\[60px\\]')).toBeInTheDocument();
  });

  it('hides location and duration in compact mode', () => {
    render(<PatientCompactCard {...mockProps} />);
    
    expect(screen.queryByText('Consultorio Principal')).not.toBeInTheDocument();
    expect(screen.queryByText('• 45min')).not.toBeInTheDocument();
  });

  it('disables priority indicators in compact mode', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcomingAppointment = {
      ...mockAppointmentData,
      appointment_date: tomorrow.toISOString().split('T')[0]
    };

    const { container } = render(
      <PatientCompactCard {...mockProps} appointment={upcomingAppointment} />
    );
    
    expect(container.querySelector('.ring-2.ring-blue-200')).not.toBeInTheDocument();
  });
});

describe('Edge Cases', () => {
  it('handles appointments without doctor gracefully', () => {
    const appointmentWithoutDoctor = { ...mockAppointmentData, doctor: null };
    render(<PatientAppointmentCard {...mockProps} appointment={appointmentWithoutDoctor} />);
    
    expect(screen.getByText('Dr. [No asignado]')).toBeInTheDocument();
  });

  it('handles appointments without service gracefully', () => {
    const appointmentWithoutService = { ...mockAppointmentData, service: null };
    render(<PatientAppointmentCard {...mockProps} appointment={appointmentWithoutService} />);
    
    expect(screen.getByText('Consulta General')).toBeInTheDocument();
  });

  it('handles cancelled appointments correctly', () => {
    const cancelledAppointment = { ...mockAppointmentData, status: 'cancelled' };
    render(<PatientAppointmentCard {...mockProps} appointment={cancelledAppointment} />);
    
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    expect(screen.queryByTitle('Reagendar cita')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Cancelar cita')).not.toBeInTheDocument();
  });
});
