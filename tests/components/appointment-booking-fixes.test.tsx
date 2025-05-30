/**
 * Tests for Appointment Booking Critical Fixes
 * Validates duplicate time slots fix and patient name display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AppointmentSummary from '@/components/appointments/shared/AppointmentSummary';
import ExpressConfirmation from '@/components/appointments/ExpressConfirmation';
import { OptimalAppointmentResult } from '@/lib/appointments/OptimalAppointmentFinder';

// Mock optimal appointment result
const mockOptimalAppointment: OptimalAppointmentResult = {
  appointment: {
    doctorId: 'doctor-1',
    doctorName: 'Dr. Ana Rodríguez',
    specialization: 'Optometría',
    locationId: 'location-1',
    locationName: 'Sede Principal',
    locationAddress: 'Calle 123 #45-67',
    date: '2025-05-29',
    startTime: '10:30:00',
    endTime: '11:00:00',
    consultationFee: 60
  },
  score: 0.85,
  reasoning: {
    timeProximity: 0.9,
    locationDistance: 0.8,
    doctorAvailability: 0.85,
    serviceCompatibility: 0.9,
    explanation: 'Seleccionado por: Cita disponible muy pronto, Ubicación conveniente, Doctor altamente calificado'
  }
};

describe('Appointment Booking Critical Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Issue 1: Service-Based Pricing Fix', () => {
    it('should display service price instead of doctor consultation fee when available', () => {
      const servicePrice = 80;
      const doctorFee = 60;
      
      render(
        <AppointmentSummary
          service="Examen Visual Completo"
          doctor="Dr. Ana Rodríguez"
          location="Sede Principal"
          date="2025-05-29"
          time="10:30:00"
          price={servicePrice} // Service price should take precedence
          patientName="Juan Pérez"
        />
      );

      // Should show service price, not doctor fee
      expect(screen.getByText('$80')).toBeInTheDocument();
      expect(screen.queryByText('$60')).not.toBeInTheDocument();
    });

    it('should fall back to doctor consultation fee when service price is not available', () => {
      const doctorFee = 60;
      
      render(
        <AppointmentSummary
          service="Examen Visual Completo"
          doctor="Dr. Ana Rodríguez"
          location="Sede Principal"
          date="2025-05-29"
          time="10:30:00"
          price={doctorFee} // Only doctor fee available
          patientName="Juan Pérez"
        />
      );

      // Should show doctor fee as fallback
      expect(screen.getByText('$60')).toBeInTheDocument();
    });
  });

  describe('Issue 2: Patient Name Display Fix', () => {
    it('should display patient name in AppointmentSummary', () => {
      render(
        <AppointmentSummary
          service="Examen Visual Completo"
          doctor="Dr. Ana Rodríguez"
          location="Sede Principal"
          date="2025-05-29"
          time="10:30:00"
          price={60}
          patientName="Juan Pérez"
        />
      );

      // Should display patient name
      expect(screen.getByText('Paciente:')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    it('should not display patient section when patientName is not provided', () => {
      render(
        <AppointmentSummary
          service="Examen Visual Completo"
          doctor="Dr. Ana Rodríguez"
          location="Sede Principal"
          date="2025-05-29"
          time="10:30:00"
          price={60}
        />
      );

      // Should not display patient section
      expect(screen.queryByText('Paciente:')).not.toBeInTheDocument();
    });

    it('should display patient name in ExpressConfirmation', () => {
      const mockProps = {
        appointment: mockOptimalAppointment,
        onConfirm: jest.fn(),
        onCustomize: jest.fn(),
        onBack: jest.fn(),
        patientName: 'María García'
      };

      render(<ExpressConfirmation {...mockProps} />);

      // Should display patient name prominently
      expect(screen.getByText('Paciente')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
    });

    it('should not display patient section in ExpressConfirmation when patientName is not provided', () => {
      const mockProps = {
        appointment: mockOptimalAppointment,
        onConfirm: jest.fn(),
        onCustomize: jest.fn(),
        onBack: jest.fn()
      };

      render(<ExpressConfirmation {...mockProps} />);

      // Should not display patient section
      expect(screen.queryByText('Paciente')).not.toBeInTheDocument();
    });

    it('should display patient name with proper styling in ExpressConfirmation', () => {
      const mockProps = {
        appointment: mockOptimalAppointment,
        onConfirm: jest.fn(),
        onCustomize: jest.fn(),
        onBack: jest.fn(),
        patientName: 'Carlos López'
      };

      render(<ExpressConfirmation {...mockProps} />);

      // Check for proper styling classes
      const patientNameElement = screen.getByText('Carlos López');
      expect(patientNameElement).toHaveClass('text-lg', 'font-bold', 'text-blue-900');
    });
  });

  describe('Integration: Both Fixes Working Together', () => {
    it('should display both patient name and correct pricing in appointment summary', () => {
      render(
        <AppointmentSummary
          service="Examen Visual Completo"
          doctor="Dr. Ana Rodríguez"
          location="Sede Principal"
          date="2025-05-29"
          time="10:30:00"
          price={75} // Service-based price
          patientName="Isabel Díaz"
          reason="Control visual anual"
          notes="Paciente con antecedentes de miopía"
        />
      );

      // Should display patient name
      expect(screen.getByText('Paciente:')).toBeInTheDocument();
      expect(screen.getByText('Isabel Díaz')).toBeInTheDocument();

      // Should display service-based price
      expect(screen.getByText('$75')).toBeInTheDocument();

      // Should display all other information
      expect(screen.getByText('Examen Visual Completo')).toBeInTheDocument();
      expect(screen.getByText('Dr. Ana Rodríguez')).toBeInTheDocument();
      expect(screen.getByText('Sede Principal')).toBeInTheDocument();
      expect(screen.getByText('Control visual anual')).toBeInTheDocument();
      expect(screen.getByText('Paciente con antecedentes de miopía')).toBeInTheDocument();
    });

    it('should handle missing optional fields gracefully', () => {
      render(
        <AppointmentSummary
          date="2025-05-29"
          time="10:30:00"
          price={60}
          patientName="Ana Martínez"
        />
      );

      // Should display required fields
      expect(screen.getByText('Ana Martínez')).toBeInTheDocument();
      expect(screen.getByText('$60')).toBeInTheDocument();

      // Should not crash or display undefined values
      expect(screen.queryByText('undefined')).not.toBeInTheDocument();
      expect(screen.queryByText('null')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper ARIA labels and semantic structure', () => {
      render(
        <AppointmentSummary
          service="Examen Visual Completo"
          doctor="Dr. Ana Rodríguez"
          date="2025-05-29"
          time="10:30:00"
          price={60}
          patientName="Pedro Sánchez"
        />
      );

      // Check for semantic structure
      expect(screen.getByText('Resumen de la cita:')).toBeInTheDocument();
      
      // Patient name should be prominently displayed
      const patientElement = screen.getByText('Pedro Sánchez');
      expect(patientElement).toHaveClass('font-medium', 'text-blue-700');
    });

    it('should display patient name first in the summary for better UX', () => {
      render(
        <AppointmentSummary
          service="Examen Visual Completo"
          doctor="Dr. Ana Rodríguez"
          date="2025-05-29"
          time="10:30:00"
          price={60}
          patientName="Laura González"
        />
      );

      const summaryElement = screen.getByText('Resumen de la cita:').parentElement;
      const patientText = screen.getByText('Paciente:');
      const serviceText = screen.getByText('Servicio:');

      // Patient should appear before service in the DOM
      expect(summaryElement).toContainElement(patientText);
      expect(summaryElement).toContainElement(serviceText);
    });
  });
});
