/**
 * AppointmentStatsCards Component Tests
 * 
 * Tests for unified appointment statistics cards with focus on:
 * - Role-specific metrics calculation
 * - Responsive grid layout
 * - Real-time data accuracy
 * - Healthcare-specific functionality
 * 
 * @version 1.0.0 - Stats cards testing
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppointmentStatsCards from '@/components/appointments/AppointmentStatsCards';
import type { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock appointment data for testing
const createMockAppointment = (overrides: Partial<AppointmentData> = {}): AppointmentData => ({
  id: `appointment-${Math.random()}`,
  appointment_date: '2025-01-29',
  start_time: '10:30:00',
  duration_minutes: 30,
  status: 'confirmed',
  reason: 'Consulta general',
  notes: null,
  patient: [{
    id: 'patient-1',
    first_name: 'María',
    last_name: 'González'
  }],
  doctor: [{
    id: 'doctor-1',
    specialization: 'Medicina General',
    profiles: [{
      first_name: 'Dr. Juan',
      last_name: 'Pérez'
    }]
  }],
  service: [{
    id: 'service-1',
    name: 'Consulta General',
    duration_minutes: 30,
    price: 100000
  }],
  location: [{
    id: 'location-1',
    name: 'Consultorio 1',
    address: 'Calle 123'
  }],
  ...overrides
});

const mockAppointments: AppointmentData[] = [
  createMockAppointment({ status: 'confirmed' }),
  createMockAppointment({ status: 'pending' }),
  createMockAppointment({ status: 'completed' }),
  createMockAppointment({ 
    status: 'confirmed',
    appointment_date: new Date().toISOString().split('T')[0], // Today
    start_time: '14:00:00'
  }),
  createMockAppointment({ 
    status: 'pending',
    appointment_date: new Date().toISOString().split('T')[0], // Today
    start_time: '16:00:00'
  })
];

describe('AppointmentStatsCards', () => {
  describe('Patient Role Metrics', () => {
    it('shows patient-specific metrics', () => {
      render(
        <AppointmentStatsCards
          appointments={mockAppointments}
          userRole="patient"
          organizationName="Clínica Test"
        />
      );

      // Should show patient-focused metrics
      expect(screen.getByText('Próximas Citas')).toBeInTheDocument();
      expect(screen.getByText('Citas Completadas')).toBeInTheDocument();
      expect(screen.getByText('Clínica Test')).toBeInTheDocument();
    });

    it('calculates upcoming appointments correctly for patients', () => {
      const futureAppointments = [
        createMockAppointment({ 
          appointment_date: '2025-02-01',
          status: 'confirmed'
        }),
        createMockAppointment({ 
          appointment_date: '2025-02-02',
          status: 'confirmed'
        })
      ];

      render(
        <AppointmentStatsCards
          appointments={futureAppointments}
          userRole="patient"
        />
      );

      // Should show 2 upcoming appointments
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows appropriate message when no upcoming appointments', () => {
      const pastAppointments = [
        createMockAppointment({ 
          appointment_date: '2025-01-01',
          status: 'completed'
        })
      ];

      render(
        <AppointmentStatsCards
          appointments={pastAppointments}
          userRole="patient"
        />
      );

      expect(screen.getByText('No tienes citas programadas')).toBeInTheDocument();
    });
  });

  describe('Doctor Role Metrics', () => {
    it('shows doctor-specific metrics', () => {
      render(
        <AppointmentStatsCards
          appointments={mockAppointments}
          userRole="doctor"
        />
      );

      // Should show doctor-focused metrics
      expect(screen.getByText('Citas Hoy')).toBeInTheDocument();
      expect(screen.getByText('Esta Semana')).toBeInTheDocument();
      expect(screen.getByText('Pacientes Únicos')).toBeInTheDocument();
      expect(screen.getByText('Duración Promedio')).toBeInTheDocument();
    });

    it('calculates unique patients correctly', () => {
      const appointmentsWithDifferentPatients = [
        createMockAppointment({ 
          patient: [{ id: 'patient-1', first_name: 'María', last_name: 'González' }]
        }),
        createMockAppointment({ 
          patient: [{ id: 'patient-2', first_name: 'Juan', last_name: 'Pérez' }]
        }),
        createMockAppointment({ 
          patient: [{ id: 'patient-1', first_name: 'María', last_name: 'González' }]
        })
      ];

      render(
        <AppointmentStatsCards
          appointments={appointmentsWithDifferentPatients}
          userRole="doctor"
        />
      );

      // Should show 2 unique patients (patient-1 and patient-2)
      const uniquePatientsCard = screen.getByText('Pacientes Únicos').closest('div');
      expect(uniquePatientsCard).toContainHTML('2');
    });

    it('calculates average duration correctly', () => {
      const appointmentsWithDuration = [
        createMockAppointment({ duration_minutes: 30 }),
        createMockAppointment({ duration_minutes: 60 }),
        createMockAppointment({ duration_minutes: 45 })
      ];

      render(
        <AppointmentStatsCards
          appointments={appointmentsWithDuration}
          userRole="doctor"
        />
      );

      // Average should be 45 minutes
      expect(screen.getByText('45min')).toBeInTheDocument();
    });
  });

  describe('Admin/Staff Role Metrics', () => {
    it('shows admin-specific metrics', () => {
      render(
        <AppointmentStatsCards
          appointments={mockAppointments}
          userRole="admin"
        />
      );

      // Should show admin-focused metrics
      expect(screen.getByText('Pendientes')).toBeInTheDocument();
      expect(screen.getByText('Confirmadas Hoy')).toBeInTheDocument();
      expect(screen.getByText('Críticas')).toBeInTheDocument();
      expect(screen.getByText('Ingresos')).toBeInTheDocument();
    });

    it('calculates revenue correctly', () => {
      const completedAppointments = [
        createMockAppointment({ 
          status: 'completed',
          service: [{ id: 'service-1', name: 'Consulta', duration_minutes: 30, price: 100000 }]
        }),
        createMockAppointment({ 
          status: 'completed',
          service: [{ id: 'service-2', name: 'Consulta', duration_minutes: 30, price: 150000 }]
        })
      ];

      render(
        <AppointmentStatsCards
          appointments={completedAppointments}
          userRole="admin"
        />
      );

      // Should show total revenue of 250,000 COP
      expect(screen.getByText('$250.000')).toBeInTheDocument();
    });

    it('identifies critical appointments correctly', () => {
      const now = new Date();
      const criticalTime = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
      
      const criticalAppointments = [
        createMockAppointment({ 
          appointment_date: criticalTime.toISOString().split('T')[0],
          start_time: criticalTime.toTimeString().split(' ')[0],
          status: 'confirmed'
        })
      ];

      render(
        <AppointmentStatsCards
          appointments={criticalAppointments}
          userRole="admin"
        />
      );

      // Should identify 1 critical appointment
      const criticalCard = screen.getByText('Críticas').closest('div');
      expect(criticalCard).toContainHTML('1');
    });
  });

  describe('SuperAdmin Role Metrics', () => {
    it('shows superadmin-specific metrics', () => {
      render(
        <AppointmentStatsCards
          appointments={mockAppointments}
          userRole="superadmin"
        />
      );

      // Should show superadmin-focused metrics
      expect(screen.getByText('Total Citas')).toBeInTheDocument();
      expect(screen.getByText('Tasa Completadas')).toBeInTheDocument();
      expect(screen.getByText('Pacientes Únicos')).toBeInTheDocument();
      expect(screen.getByText('No Asistieron')).toBeInTheDocument();
    });

    it('calculates completion rate correctly', () => {
      const mixedStatusAppointments = [
        createMockAppointment({ status: 'completed' }),
        createMockAppointment({ status: 'completed' }),
        createMockAppointment({ status: 'pending' }),
        createMockAppointment({ status: 'confirmed' })
      ];

      render(
        <AppointmentStatsCards
          appointments={mixedStatusAppointments}
          userRole="superadmin"
        />
      );

      // Should show 50% completion rate (2 completed out of 4 total)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when loading', () => {
      render(
        <AppointmentStatsCards
          appointments={[]}
          userRole="patient"
          loading={true}
        />
      );

      expect(screen.getByText('Estadísticas de Citas')).toBeInTheDocument();
      // Should show skeleton loaders
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(2); // 2 cards for patient
    });
  });

  describe('Responsive Grid Layout', () => {
    it('uses correct grid columns for different roles', () => {
      const { rerender } = render(
        <AppointmentStatsCards
          appointments={mockAppointments}
          userRole="patient"
        />
      );

      // Patient should have 2 columns
      let grid = document.querySelector('[class*="grid-cols"]');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2');

      // Doctor should have 4 columns
      rerender(
        <AppointmentStatsCards
          appointments={mockAppointments}
          userRole="doctor"
        />
      );

      grid = document.querySelector('[class*="grid-cols"]');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    });
  });

  describe('Action Buttons', () => {
    it('provides working action buttons for patient role', () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(
        <AppointmentStatsCards
          appointments={[]}
          userRole="patient"
        />
      );

      const agendarButton = screen.getByText('Agendar cita');
      fireEvent.click(agendarButton);

      expect(window.location.href).toBe('/appointments/book');
    });
  });
});
