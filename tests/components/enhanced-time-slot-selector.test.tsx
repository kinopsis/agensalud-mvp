/**
 * Tests for Enhanced Time Slot Selector
 * Validates period grouping and filtering functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import EnhancedTimeSlotSelector from '@/components/appointments/EnhancedTimeSlotSelector';
import { AvailabilitySlot } from '@/components/appointments/shared/types';

const mockSlots: AvailabilitySlot[] = [
  {
    doctor_id: 'doctor-1',
    doctor_name: 'Dr. Ana Rodríguez',
    specialization: 'Optometría',
    start_time: '09:00:00',
    end_time: '09:30:00',
    consultation_fee: 60,
    available: true
  },
  {
    doctor_id: 'doctor-2',
    doctor_name: 'Dr. Carlos López',
    specialization: 'Cardiología',
    start_time: '14:00:00',
    end_time: '14:30:00',
    consultation_fee: 80,
    available: true
  },
  {
    doctor_id: 'doctor-3',
    doctor_name: 'Dr. María García',
    specialization: 'Dermatología',
    start_time: '19:00:00',
    end_time: '19:30:00',
    consultation_fee: 70,
    available: true
  },
  {
    doctor_id: 'doctor-4',
    doctor_name: 'Dr. Juan Pérez',
    specialization: 'Medicina General',
    start_time: '10:30:00',
    end_time: '11:00:00',
    consultation_fee: 50,
    available: true
  }
];

const mockProps = {
  slots: mockSlots,
  onSlotSelect: jest.fn(),
  loading: false,
  title: 'Horarios disponibles',
  showDoctorInfo: true,
  showPricing: true
};

describe('EnhancedTimeSlotSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all time periods with correct slot counts', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    // Should show all period tabs
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Mañana')).toBeInTheDocument();
    expect(screen.getByText('Tarde')).toBeInTheDocument();
    expect(screen.getByText('Noche')).toBeInTheDocument();

    // Should show correct slot counts
    expect(screen.getByText('4 disponibles')).toBeInTheDocument(); // All slots
    expect(screen.getByText('2 disponibles')).toBeInTheDocument(); // Morning slots (9:00, 10:30)
    expect(screen.getAllByText('1 disponible')).toHaveLength(2); // Afternoon and evening slots (14:00, 19:00)
  });

  it('should filter slots by morning period', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    // Click morning tab
    fireEvent.click(screen.getByText('Mañana'));

    // Should show only morning slots
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.queryByText('14:00')).not.toBeInTheDocument();
    expect(screen.queryByText('19:00')).not.toBeInTheDocument();

    // Should show time range info
    expect(screen.getByText('Mostrando horarios de 6:00 - 12:00')).toBeInTheDocument();
  });

  it('should filter slots by afternoon period', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    // Click afternoon tab
    fireEvent.click(screen.getByText('Tarde'));

    // Should show only afternoon slots
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.queryByText('09:00')).not.toBeInTheDocument();
    expect(screen.queryByText('10:30')).not.toBeInTheDocument();
    expect(screen.queryByText('19:00')).not.toBeInTheDocument();

    // Should show time range info
    expect(screen.getByText('Mostrando horarios de 12:00 - 18:00')).toBeInTheDocument();
  });

  it('should filter slots by evening period', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    // Click evening tab
    fireEvent.click(screen.getByText('Noche'));

    // Should show only evening slots
    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.queryByText('09:00')).not.toBeInTheDocument();
    expect(screen.queryByText('10:30')).not.toBeInTheDocument();
    expect(screen.queryByText('14:00')).not.toBeInTheDocument();

    // Should show time range info
    expect(screen.getByText('Mostrando horarios de 18:00 - 22:00')).toBeInTheDocument();
  });

  it('should show all slots when "Todos" is selected', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    // Click morning first, then all
    fireEvent.click(screen.getByText('Mañana'));
    fireEvent.click(screen.getByText('Todos'));

    // Should show all slots
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText('19:00')).toBeInTheDocument();

    // Should show total count
    expect(screen.getByText('Mostrando 4 de 4 horarios disponibles')).toBeInTheDocument();
  });

  it('should handle slot selection', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    // Click on a slot
    fireEvent.click(screen.getByText('09:00'));

    // Should call onSlotSelect with correct slot
    expect(mockProps.onSlotSelect).toHaveBeenCalledWith(mockSlots[0]);
  });

  it('should show empty state when no slots match filter', () => {
    const emptySlotsProps = {
      ...mockProps,
      slots: [
        {
          doctor_id: 'doctor-1',
          doctor_name: 'Dr. Test',
          specialization: 'Test',
          start_time: '09:00:00',
          end_time: '09:30:00',
          consultation_fee: 60,
          available: true
        }
      ]
    };

    render(<EnhancedTimeSlotSelector {...emptySlotsProps} />);

    // Click evening tab (no slots in evening)
    fireEvent.click(screen.getByText('Noche'));

    // Should show empty state with link to view all
    expect(screen.getByText('No hay horarios disponibles en este período.')).toBeInTheDocument();
    expect(screen.getByText('Ver todos los horarios')).toBeInTheDocument();

    // Click "Ver todos los horarios"
    fireEvent.click(screen.getByText('Ver todos los horarios'));

    // Should switch back to all slots
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} loading={true} />);

    expect(screen.getByText('Buscando disponibilidad...')).toBeInTheDocument();
  });

  it('should show empty message when no slots provided', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} slots={[]} />);

    expect(screen.getByText('No hay horarios disponibles para esta fecha.')).toBeInTheDocument();
  });

  it('should display doctor information when showDoctorInfo is true', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    expect(screen.getByText('Dr. Ana Rodríguez')).toBeInTheDocument();
    expect(screen.getByText('Optometría')).toBeInTheDocument();
  });

  it('should hide doctor information when showDoctorInfo is false', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} showDoctorInfo={false} />);

    expect(screen.queryByText('Dr. Ana Rodríguez')).not.toBeInTheDocument();
    expect(screen.queryByText('Optometría')).not.toBeInTheDocument();
  });

  it('should display pricing when showPricing is true', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    expect(screen.getByText('$60')).toBeInTheDocument();
    expect(screen.getByText('$80')).toBeInTheDocument();
  });

  it('should hide pricing when showPricing is false', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} showPricing={false} />);

    expect(screen.queryByText('$60')).not.toBeInTheDocument();
    expect(screen.queryByText('$80')).not.toBeInTheDocument();
  });

  it('should highlight selected slot', () => {
    const selectedSlot = mockSlots[0];
    render(<EnhancedTimeSlotSelector {...mockProps} selectedSlot={selectedSlot} />);

    // The selected slot should have aria-selected="true"
    const selectedButton = screen.getByRole('option', { selected: true });
    expect(selectedButton).toBeInTheDocument();
  });

  it('should use grid layout for better organization', () => {
    render(<EnhancedTimeSlotSelector {...mockProps} />);

    // Should have grid layout class
    const slotsContainer = screen.getByRole('listbox');
    expect(slotsContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2');
  });
});
