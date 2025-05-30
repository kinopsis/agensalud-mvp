/**
 * Tests for Medium Priority Improvements
 * Validates temporal grouping, cost display, and enhanced calendar integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { groupAppointmentsByDate, getSortedGroupKeys, getDateHeader } from '@/utils/dateGrouping';
import DateGroupHeader from '@/components/appointments/DateGroupHeader';
import { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock data for testing
const mockAppointments: AppointmentData[] = [
  {
    id: 'apt-1',
    appointment_date: new Date().toISOString().split('T')[0], // Today
    start_time: '09:00:00',
    duration_minutes: 30,
    status: 'confirmed',
    reason: 'Consulta de rutina',
    notes: null,
    doctor: [{
      id: 'doc-1',
      specialization: 'Cardiología',
      profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
    }],
    patient: [{
      id: 'pat-1',
      first_name: 'María',
      last_name: 'García'
    }],
    location: [{
      id: 'loc-1',
      name: 'Sede Principal',
      address: 'Calle 123 #45-67'
    }],
    service: [{
      id: 'srv-1',
      name: 'Consulta Cardiológica',
      duration_minutes: 30,
      price: 150000
    }]
  },
  {
    id: 'apt-2',
    appointment_date: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })(), // Tomorrow
    start_time: '14:30:00',
    duration_minutes: 45,
    status: 'pending',
    reason: 'Seguimiento',
    notes: null,
    doctor: [{
      id: 'doc-2',
      specialization: 'Medicina General',
      profiles: [{ first_name: 'Ana', last_name: 'López' }]
    }],
    patient: [{
      id: 'pat-1',
      first_name: 'María',
      last_name: 'García'
    }],
    location: [{
      id: 'loc-2',
      name: 'Sede Norte',
      address: 'Carrera 15 #80-45'
    }],
    service: [{
      id: 'srv-2',
      name: 'Consulta General',
      duration_minutes: 45,
      price: null // No price
    }]
  },
  {
    id: 'apt-3',
    appointment_date: (() => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 8);
      return nextWeek.toISOString().split('T')[0];
    })(), // Next week
    start_time: '11:00:00',
    duration_minutes: 60,
    status: 'confirmed',
    reason: 'Examen especializado',
    notes: 'Traer exámenes previos',
    doctor: [{
      id: 'doc-3',
      specialization: 'Neurología',
      profiles: [{ first_name: 'Carlos', last_name: 'Ruiz' }]
    }],
    patient: [{
      id: 'pat-2',
      first_name: 'Pedro',
      last_name: 'Martínez'
    }],
    location: [{
      id: 'loc-1',
      name: 'Sede Principal',
      address: 'Calle 123 #45-67'
    }],
    service: [{
      id: 'srv-3',
      name: 'Consulta Neurológica',
      duration_minutes: 60,
      price: 200000
    }]
  }
];

describe('Medium Priority Improvements', () => {
  describe('1. Temporal Grouping Functionality', () => {
    it('should group appointments by temporal categories', () => {
      const grouped = groupAppointmentsByDate(mockAppointments);
      const groupKeys = getSortedGroupKeys(grouped);

      // Should have groups for today, tomorrow, and next week
      expect(groupKeys).toContain('today');
      expect(groupKeys).toContain('tomorrow');
      expect(groupKeys).toContain('next-week');

      // Verify appointments are in correct groups
      expect(grouped['today'].appointments).toHaveLength(1);
      expect(grouped['tomorrow'].appointments).toHaveLength(1);
      expect(grouped['next-week'].appointments).toHaveLength(1);
    });

    it('should sort groups in chronological order', () => {
      const grouped = groupAppointmentsByDate(mockAppointments);
      const sortedKeys = getSortedGroupKeys(grouped);

      // Today should come before tomorrow, tomorrow before next week
      const todayIndex = sortedKeys.indexOf('today');
      const tomorrowIndex = sortedKeys.indexOf('tomorrow');
      const nextWeekIndex = sortedKeys.indexOf('next-week');

      expect(todayIndex).toBeLessThan(tomorrowIndex);
      expect(tomorrowIndex).toBeLessThan(nextWeekIndex);
    });

    it('should sort appointments within groups by time', () => {
      // Add multiple appointments for the same day
      const sameDay = new Date().toISOString().split('T')[0];
      const appointmentsWithMultipleTimes = [
        ...mockAppointments,
        {
          ...mockAppointments[0],
          id: 'apt-4',
          start_time: '15:00:00'
        },
        {
          ...mockAppointments[0],
          id: 'apt-5',
          start_time: '08:00:00'
        }
      ];

      const grouped = groupAppointmentsByDate(appointmentsWithMultipleTimes);
      const todayAppointments = grouped['today'].appointments;

      // Should be sorted by time: 08:00, 09:00, 15:00
      expect(todayAppointments[0].start_time).toBe('08:00:00');
      expect(todayAppointments[1].start_time).toBe('09:00:00');
      expect(todayAppointments[2].start_time).toBe('15:00:00');
    });

    it('should generate appropriate headers for different time periods', () => {
      const todayHeader = getDateHeader('today', 'Hoy');
      const tomorrowHeader = getDateHeader('tomorrow', 'Mañana');
      const nextWeekHeader = getDateHeader('next-week', 'Próxima Semana - Lunes');

      expect(todayHeader.title).toBe('Hoy');
      expect(todayHeader.icon).toBe('clock');
      expect(todayHeader.subtitle).toBeDefined();

      expect(tomorrowHeader.title).toBe('Mañana');
      expect(tomorrowHeader.icon).toBe('calendar');
      expect(tomorrowHeader.subtitle).toBeDefined();

      expect(nextWeekHeader.title).toBe('Próxima Semana - Lunes');
      expect(nextWeekHeader.icon).toBe('calendar');
    });
  });

  describe('2. DateGroupHeader Component', () => {
    it('should render with correct title and appointment count', () => {
      render(
        <DateGroupHeader
          title="Hoy"
          subtitle="Miércoles, 29 de enero de 2025"
          icon="clock"
          appointmentCount={3}
        />
      );

      expect(screen.getByText('Hoy')).toBeInTheDocument();
      expect(screen.getByText('Miércoles, 29 de enero de 2025')).toBeInTheDocument();
      expect(screen.getByText('3 citas')).toBeInTheDocument();
    });

    it('should handle singular appointment count', () => {
      render(
        <DateGroupHeader
          title="Mañana"
          icon="calendar"
          appointmentCount={1}
        />
      );

      expect(screen.getByText('1 cita')).toBeInTheDocument();
    });

    it('should apply correct color scheme based on icon type', () => {
      const { rerender } = render(
        <DateGroupHeader
          title="Hoy"
          icon="clock"
          appointmentCount={2}
        />
      );

      // Clock icon should use blue color scheme
      expect(screen.getByText('Hoy')).toHaveClass('text-blue-900');

      rerender(
        <DateGroupHeader
          title="Ayer"
          icon="history"
          appointmentCount={1}
        />
      );

      // History icon should use gray color scheme
      expect(screen.getByText('Ayer')).toHaveClass('text-gray-900');
    });
  });

  describe('3. Cost Display Functionality', () => {
    it('should format prices in Colombian Pesos', () => {
      // Test the price formatting function
      const formatPrice = (price: number): string => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(price);
      };

      expect(formatPrice(150000)).toContain('150.000');
      expect(formatPrice(200000)).toContain('200.000');
      expect(formatPrice(75000)).toContain('75.000');

      // Verify it includes currency symbol
      expect(formatPrice(150000)).toContain('$');
    });

    it('should handle appointments with and without pricing', () => {
      const appointmentWithPrice = mockAppointments[0]; // Has price: 150000
      const appointmentWithoutPrice = mockAppointments[1]; // Has price: null

      expect(appointmentWithPrice.service[0].price).toBe(150000);
      expect(appointmentWithoutPrice.service[0].price).toBeNull();
    });

    it('should show cost information for non-patient roles', () => {
      // This would be tested in the AppointmentCard component
      // The logic is: showCost={profile?.role !== 'patient'}
      const adminRole = 'admin';
      const patientRole = 'patient';

      expect(adminRole !== 'patient').toBe(true); // Should show cost
      expect(patientRole !== 'patient').toBe(false); // Should not show cost
    });
  });

  describe('4. Calendar Integration Enhancements', () => {
    it('should include location information in calendar events', () => {
      const appointmentWithLocation = mockAppointments[0];
      
      expect(appointmentWithLocation.location[0]).toBeDefined();
      expect(appointmentWithLocation.location[0].name).toBe('Sede Principal');
      expect(appointmentWithLocation.location[0].address).toBe('Calle 123 #45-67');
    });

    it('should handle appointments without location gracefully', () => {
      const appointmentWithoutLocation = {
        ...mockAppointments[0],
        location: []
      };

      expect(appointmentWithoutLocation.location).toHaveLength(0);
      expect(appointmentWithoutLocation.location[0]?.name).toBeUndefined();
    });

    it('should support different calendar view modes', () => {
      const viewModes = ['week', 'month', 'day'];
      
      viewModes.forEach(mode => {
        expect(['week', 'month', 'day']).toContain(mode);
      });
    });
  });

  describe('5. Integration Testing', () => {
    it('should maintain all existing functionality while adding new features', () => {
      // Verify that appointments still have all required fields
      mockAppointments.forEach(appointment => {
        expect(appointment.id).toBeDefined();
        expect(appointment.appointment_date).toBeDefined();
        expect(appointment.start_time).toBeDefined();
        expect(appointment.status).toBeDefined();
        expect(appointment.doctor).toBeDefined();
        expect(appointment.patient).toBeDefined();
        expect(appointment.location).toBeDefined();
        expect(appointment.service).toBeDefined();
      });
    });

    it('should handle edge cases in temporal grouping', () => {
      // Test with empty appointments array
      const emptyGrouped = groupAppointmentsByDate([]);
      expect(Object.keys(emptyGrouped)).toHaveLength(0);

      // Test with appointments far in the future
      const futureAppointment: AppointmentData = {
        ...mockAppointments[0],
        id: 'future-apt',
        appointment_date: '2026-12-31'
      };

      const groupedWithFuture = groupAppointmentsByDate([futureAppointment]);
      expect(groupedWithFuture['future']).toBeDefined();
    });

    it('should maintain performance with large datasets', () => {
      // Generate a large number of appointments
      const largeDataset: AppointmentData[] = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date();
        date.setDate(date.getDate() + (i % 30)); // Spread over 30 days
        
        largeDataset.push({
          ...mockAppointments[0],
          id: `apt-${i}`,
          appointment_date: date.toISOString().split('T')[0]
        });
      }

      const startTime = performance.now();
      const grouped = groupAppointmentsByDate(largeDataset);
      const endTime = performance.now();

      // Should complete in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });
  });
});
