/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SelectionCard from '@/components/appointments/shared/SelectionCard';
import TimeSlotSelector from '@/components/appointments/shared/TimeSlotSelector';

const mockSelectionOptions = [
  {
    id: 'option-1',
    title: 'Consulta General',
    subtitle: 'Medicina General',
    description: 'Consulta médica general para diagnóstico y tratamiento',
    price: 50000
  },
  {
    id: 'option-2',
    title: 'Cualquier doctor disponible',
    subtitle: 'Recomendado para mayor flexibilidad de horarios',
    description: 'Ver disponibilidad de todos los doctores (5 disponibles)'
  }
];

const mockTimeSlots = [
  {
    start_time: '09:00:00',
    end_time: '09:30:00',
    doctor_id: 'doctor-1',
    doctor_name: 'Dr. Juan Pérez',
    specialization: 'Medicina General',
    consultation_fee: 50000,
    available: true
  },
  {
    start_time: '10:00:00',
    end_time: '10:30:00',
    doctor_id: 'doctor-2',
    doctor_name: 'Dra. María García',
    specialization: 'Cardiología',
    consultation_fee: 75000,
    available: true
  }
];

describe('Visual Improvements Tests', () => {
  describe('SelectionCard Enhanced Design', () => {
    it('should render with improved visual hierarchy', () => {
      render(
        <SelectionCard
          title="Test Selection"
          subtitle="Choose an option"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
        />
      );

      // Check enhanced typography
      expect(screen.getByText('Consulta General')).toHaveClass('font-semibold', 'text-lg', 'text-gray-900');
      expect(screen.getByText('Medicina General')).toHaveClass('text-sm', 'font-medium', 'text-gray-700');
    });

    it('should have proper ARIA attributes for accessibility', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
        />
      );

      // Check ARIA attributes
      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Test Selection');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[0]).toHaveAttribute('aria-label');
    });

    it('should show enhanced selection state', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          selectedId="option-1"
          onSelect={jest.fn()}
        />
      );

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveClass('border-blue-500', 'bg-blue-50', 'ring-4', 'ring-blue-200', 'shadow-lg');
    });

    it('should display enhanced price formatting', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
        />
      );

      // Check enhanced price display
      const priceElement = screen.getByText('$50,000');
      expect(priceElement).toHaveClass('font-bold', 'text-lg', 'text-green-600', 'bg-green-50');
      expect(screen.getByText('Consulta')).toBeInTheDocument();
    });

    it('should have proper touch targets for mobile', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
        />
      );

      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveClass('min-h-[80px]');
      });
    });

    it('should show hover effects', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
        />
      );

      const option = screen.getAllByRole('option')[0];
      expect(option).toHaveClass('hover:border-blue-400', 'hover:bg-blue-50', 'hover:shadow-md');
    });
  });

  describe('TimeSlotSelector Enhanced Design', () => {
    it('should render with improved visual layout', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
          showDoctorInfo={true}
          showPricing={true}
        />
      );

      // Check enhanced time display
      expect(screen.getByText('09:00')).toHaveClass('font-bold', 'text-xl', 'text-gray-900');
      
      // Check doctor info layout
      expect(screen.getByText('Dr. Juan Pérez')).toHaveClass('font-semibold', 'text-gray-900');
      expect(screen.getByText('Medicina General')).toHaveClass('text-sm', 'text-gray-600', 'font-medium');
    });

    it('should have proper ARIA attributes', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Available Times');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[0]).toHaveAttribute('aria-label');
    });

    it('should display enhanced pricing layout', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
          showPricing={true}
        />
      );

      // Check enhanced price display
      const priceElement = screen.getByText('$50,000');
      expect(priceElement).toHaveClass('font-bold', 'text-xl', 'text-green-600');
      expect(screen.getAllByText('Consulta')[0]).toBeInTheDocument();
    });

    it('should show enhanced selection state', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          selectedSlot={mockTimeSlots[0]}
          onSlotSelect={jest.fn()}
        />
      );

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveClass('border-blue-500', 'bg-blue-50', 'ring-4', 'ring-blue-200', 'shadow-lg');
    });

    it('should have proper touch targets for mobile', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
        />
      );

      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveClass('min-h-[100px]');
      });
    });

    it('should handle slot selection correctly', () => {
      const mockOnSelect = jest.fn();
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={mockOnSelect}
        />
      );

      const firstSlot = screen.getAllByRole('option')[0];
      fireEvent.click(firstSlot);

      expect(mockOnSelect).toHaveBeenCalledWith(mockTimeSlots[0]);
    });

    it('should show doctor information when enabled', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
          showDoctorInfo={true}
        />
      );

      expect(screen.getByText('Dr. Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Medicina General')).toBeInTheDocument();
    });

    it('should hide doctor information when disabled', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
          showDoctorInfo={false}
        />
      );

      expect(screen.queryByText('Dr. Juan Pérez')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Compliance', () => {
    it('should meet WCAG 2.1 keyboard navigation requirements', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
        />
      );

      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveClass('focus:outline-none', 'focus:ring-4', 'focus:ring-blue-300');
      });
    });

    it('should have proper focus indicators', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
        />
      );

      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveClass('focus:ring-4', 'focus:ring-blue-300', 'focus:ring-opacity-50');
      });
    });

    it('should provide descriptive ARIA labels', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
        />
      );

      const option = screen.getByRole('option', { name: /Consulta General.*Medicina General.*50,000/ });
      expect(option).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply proper grid layout classes', () => {
      render(
        <SelectionCard
          title="Test Selection"
          options={mockSelectionOptions}
          onSelect={jest.fn()}
          gridCols={2}
        />
      );

      const gridContainer = screen.getByRole('listbox');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2');
    });

    it('should have responsive spacing', () => {
      render(
        <TimeSlotSelector
          title="Available Times"
          slots={mockTimeSlots}
          onSlotSelect={jest.fn()}
        />
      );

      const gridContainer = screen.getByRole('listbox');
      expect(gridContainer).toHaveClass('gap-4');
    });
  });
});
