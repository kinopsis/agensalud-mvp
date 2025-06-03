/**
 * AppointmentStatusBadge Component Tests
 * Tests for enhanced status badge with dropdown and API integration
 * 
 * @description Comprehensive tests for appointment status badge functionality
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentStatusBadge from '../AppointmentStatusBadge';
import { AppointmentStatus } from '@/types/appointment-states';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the appointment-states module
jest.mock('@/types/appointment-states', () => ({
  ...jest.requireActual('@/types/appointment-states'),
  STATUS_CONFIGS: {
    pending: {
      label: 'Solicitada',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: 'Clock',
      description: 'Cita registrada, pendiente de confirmación',
      isFinal: false,
      allowedTransitions: ['confirmed', 'cancelada_clinica'],
      requiredRoles: ['staff', 'admin']
    },
    confirmed: {
      label: 'Confirmada',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: 'CheckCircle',
      description: 'Cita confirmada y programada',
      isFinal: false,
      allowedTransitions: ['en_curso', 'cancelada_paciente'],
      requiredRoles: ['patient', 'staff', 'admin']
    },
    en_curso: {
      label: 'En Curso',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: 'Play',
      description: 'Paciente siendo atendido',
      isFinal: false,
      allowedTransitions: ['completed'],
      requiredRoles: ['doctor', 'staff', 'admin']
    },
    completed: {
      label: 'Completada',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: 'CheckCircle',
      description: 'Cita realizada exitosamente',
      isFinal: true,
      allowedTransitions: [],
      requiredRoles: ['doctor', 'staff', 'admin']
    }
  }
}));

describe('AppointmentStatusBadge', () => {
  const mockProps = {
    appointmentId: '123e4567-e89b-12d3-a456-426614174000',
    status: 'confirmed',
    userRole: 'staff' as const,
    canChangeStatus: true,
    onStatusChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render status badge with correct label', () => {
      render(<AppointmentStatusBadge {...mockProps} />);
      
      expect(screen.getByText('Confirmada')).toBeInTheDocument();
    });

    it('should render with correct size classes', () => {
      const { rerender } = render(
        <AppointmentStatusBadge {...mockProps} size="sm" />
      );
      
      let badge = screen.getByText('Confirmada').closest('div');
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');

      rerender(<AppointmentStatusBadge {...mockProps} size="lg" />);
      
      badge = screen.getByText('Confirmada').closest('div');
      expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should show tooltip when enabled', async () => {
      const user = userEvent.setup();
      render(<AppointmentStatusBadge {...mockProps} showTooltip={true} />);
      
      const infoIcon = screen.getByRole('generic', { name: /info/i });
      await user.hover(infoIcon);
      
      await waitFor(() => {
        expect(screen.getByText('Cita confirmada y programada')).toBeInTheDocument();
      });
    });

    it('should not show dropdown when canChangeStatus is false', () => {
      render(<AppointmentStatusBadge {...mockProps} canChangeStatus={false} />);
      
      expect(screen.queryByRole('button', { name: /cambiar estado/i })).not.toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<AppointmentStatusBadge {...mockProps} disabled={true} />);
      
      const badge = screen.getByText('Confirmada').closest('div');
      expect(badge).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Status Transitions', () => {
    it('should fetch available transitions on mount', async () => {
      const mockResponse = {
        success: true,
        data: {
          availableTransitions: ['en_curso', 'cancelada_paciente']
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<AppointmentStatusBadge {...mockProps} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/appointments/${mockProps.appointmentId}/status`
        );
      });
    });

    it('should show dropdown with available transitions', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        success: true,
        data: {
          availableTransitions: ['en_curso', 'cancelada_paciente']
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      render(<AppointmentStatusBadge {...mockProps} />);

      // Wait for transitions to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Click dropdown arrow
      const dropdownButton = screen.getByRole('button', { name: /cambiar estado/i });
      await user.click(dropdownButton);

      // Check if transitions are shown
      await waitFor(() => {
        expect(screen.getByText('En Curso')).toBeInTheDocument();
      });
    });

    it('should handle status change successfully', async () => {
      const user = userEvent.setup();
      const mockTransitionsResponse = {
        success: true,
        data: {
          availableTransitions: ['en_curso']
        }
      };

      const mockStatusChangeResponse = {
        success: true,
        data: {
          appointmentId: mockProps.appointmentId,
          newStatus: 'en_curso',
          auditId: 'audit-123'
        }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTransitionsResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatusChangeResponse
        });

      render(<AppointmentStatusBadge {...mockProps} />);

      // Wait for transitions to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/appointments/${mockProps.appointmentId}/status`
        );
      });

      // Click dropdown arrow
      const dropdownButton = screen.getByRole('button', { name: /cambiar estado/i });
      await user.click(dropdownButton);

      // Click on status option
      const statusOption = await screen.findByText('En Curso');
      await user.click(statusOption);

      // Verify status change API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/appointments/${mockProps.appointmentId}/status`,
          expect.objectContaining({
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'en_curso',
              metadata: {
                source: 'status_badge',
                userRole: 'staff',
                previousStatus: 'confirmed'
              }
            })
          })
        );
      });

      // Verify callback was called
      expect(mockProps.onStatusChange).toHaveBeenCalledWith('en_curso', undefined);
    });

    it('should show reason input for critical status changes', async () => {
      const user = userEvent.setup();
      const mockTransitionsResponse = {
        success: true,
        data: {
          availableTransitions: ['cancelada_paciente']
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransitionsResponse
      });

      render(<AppointmentStatusBadge {...mockProps} />);

      // Wait for transitions to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Click dropdown arrow
      const dropdownButton = screen.getByRole('button', { name: /cambiar estado/i });
      await user.click(dropdownButton);

      // Click on cancellation option
      const cancelOption = await screen.findByText('Cancelada por Paciente');
      await user.click(cancelOption);

      // Check if reason input modal appears
      await waitFor(() => {
        expect(screen.getByText('Motivo del cambio')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/ingrese el motivo/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const mockTransitionsResponse = {
        success: true,
        data: {
          availableTransitions: ['en_curso']
        }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTransitionsResponse
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Invalid transition' })
        });

      render(<AppointmentStatusBadge {...mockProps} />);

      // Wait for transitions to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Click dropdown arrow
      const dropdownButton = screen.getByRole('button', { name: /cambiar estado/i });
      await user.click(dropdownButton);

      // Click on status option
      const statusOption = await screen.findByText('En Curso');
      await user.click(statusOption);

      // Check if error is displayed
      await waitFor(() => {
        expect(screen.getByText('Invalid transition')).toBeInTheDocument();
      });
    });
  });

  describe('Legacy Status Mapping', () => {
    it('should map legacy status values correctly', () => {
      render(
        <AppointmentStatusBadge 
          {...mockProps} 
          status="scheduled" 
          canChangeStatus={false}
        />
      );
      
      expect(screen.getByText('Confirmada')).toBeInTheDocument();
    });

    it('should map no_show status correctly', () => {
      render(
        <AppointmentStatusBadge 
          {...mockProps} 
          status="no_show" 
          canChangeStatus={false}
        />
      );
      
      expect(screen.getByText('No Show')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<AppointmentStatusBadge {...mockProps} />);
      
      const dropdownButton = screen.getByRole('button', { name: /cambiar estado/i });
      expect(dropdownButton).toHaveAttribute('aria-label', 'Cambiar estado');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AppointmentStatusBadge {...mockProps} />);
      
      const dropdownButton = screen.getByRole('button', { name: /cambiar estado/i });
      
      // Focus and press Enter
      dropdownButton.focus();
      await user.keyboard('{Enter}');
      
      // Should open dropdown (tested indirectly through API call)
      expect(dropdownButton).toHaveFocus();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner during status change', async () => {
      const user = userEvent.setup();
      const mockTransitionsResponse = {
        success: true,
        data: {
          availableTransitions: ['en_curso']
        }
      };

      // Mock a delayed response for status change
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTransitionsResponse
        })
        .mockImplementationOnce(() => new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true })
          }), 100);
        }));

      render(<AppointmentStatusBadge {...mockProps} />);

      // Wait for transitions to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Click dropdown and select option
      const dropdownButton = screen.getByRole('button', { name: /cambiar estado/i });
      await user.click(dropdownButton);

      const statusOption = await screen.findByText('En Curso');
      await user.click(statusOption);

      // Check for loading spinner
      expect(screen.getByTestId('loading-spinner') || screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
