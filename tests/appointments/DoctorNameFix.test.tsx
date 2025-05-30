/**
 * Doctor Name Fix Tests
 * 
 * Tests for the getDoctorName function to ensure it handles
 * different data structures correctly
 * 
 * @author AgentSalud MVP Team - Technical Investigation
 * @version 1.0.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppointmentCard from '@/components/appointments/AppointmentCard';
import { AppointmentData } from '@/components/appointments/AppointmentCard';

// Mock data structures to test different scenarios
const baseAppointment: Omit<AppointmentData, 'doctor'> = {
  id: 'apt-1',
  appointment_date: '2024-12-20',
  start_time: '10:00:00',
  duration_minutes: 30,
  status: 'confirmed',
  reason: 'Consulta general',
  notes: null,
  patient: [{ id: 'patient1', first_name: 'María', last_name: 'García' }],
  location: [{ id: 'loc1', name: 'Sede Principal', address: 'Calle 123' }],
  service: [{ id: 'serv1', name: 'Consulta General', duration_minutes: 30, price: 50000 }]
};

describe('Doctor Name Fix', () => {
  const mockOnReschedule = jest.fn();
  const mockOnCancel = jest.fn();
  const mockCanReschedule = jest.fn().mockReturnValue(true);
  const mockCanCancel = jest.fn().mockReturnValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDoctorName function handling different data structures', () => {
    it('should handle normal doctor structure with profiles array', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
    });

    it('should handle doctor structure with profiles object (not array)', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: { first_name: 'Ana', last_name: 'García' } as any
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. Ana García')).toBeInTheDocument();
    });

    it('should handle flattened doctor structure (direct name fields)', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          first_name: 'Carlos',
          last_name: 'Rodríguez',
          profiles: [] as any
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. Carlos Rodríguez')).toBeInTheDocument();
    });

    it('should handle doctor with only first name', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: 'María', last_name: '' }]
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. María')).toBeInTheDocument();
    });

    it('should handle doctor with only last name', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: '', last_name: 'González' }]
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. González')).toBeInTheDocument();
    });

    it('should handle empty doctor array', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: []
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. [No asignado]')).toBeInTheDocument();
    });

    it('should handle null doctor', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: null as any
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. [No asignado]')).toBeInTheDocument();
    });

    it('should handle doctor with empty profiles array', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: []
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. [Perfil no encontrado]')).toBeInTheDocument();
    });

    it('should handle doctor with profile but no names', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: '', last_name: '' }]
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. [Nombre no disponible]')).toBeInTheDocument();
    });

    it('should handle doctor with null profile fields', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: null as any, last_name: null as any }]
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(screen.getByText('Dr. [Nombre no disponible]')).toBeInTheDocument();
    });
  });

  describe('Console warnings for debugging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log warning when no profile found', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: []
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ No profile found for doctor:',
        expect.objectContaining({ id: 'doc1' })
      );
    });

    it('should log warning when no name found in profile', () => {
      const appointment: AppointmentData = {
        ...baseAppointment,
        doctor: [{
          id: 'doc1',
          specialization: 'Medicina General',
          profiles: [{ first_name: '', last_name: '' }]
        }]
      };

      render(
        <AppointmentCard
          appointment={appointment}
          onReschedule={mockOnReschedule}
          onCancel={mockOnCancel}
          canReschedule={mockCanReschedule}
          canCancel={mockCanCancel}
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ No name found in profile:',
        expect.objectContaining({ first_name: '', last_name: '' })
      );
    });
  });
});
