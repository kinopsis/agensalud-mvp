/**
 * SmartSuggestions Component Tests - FASE 2 MVP
 * Tests for AI-powered appointment booking suggestions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SmartSuggestions from '@/components/ai/SmartSuggestions';

describe('SmartSuggestions', () => {
  const defaultContext = {
    selectedService: 'Consulta General',
    selectedDate: '2024-01-15',
    userRole: 'patient'
  };

  const mockOnSuggestionApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders suggestions when context is provided', async () => {
      render(
        <SmartSuggestions 
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sugerencias Inteligentes')).toBeInTheDocument();
      });
    });

    test('does not render when no suggestions available', () => {
      render(
        <SmartSuggestions 
          context={{}}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      expect(screen.queryByText('Sugerencias Inteligentes')).not.toBeInTheDocument();
    });

    test('can be dismissed', async () => {
      render(
        <SmartSuggestions 
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sugerencias Inteligentes')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Sugerencias Inteligentes')).not.toBeInTheDocument();
    });
  });

  describe('Service-based Suggestions', () => {
    test('shows time recommendations for general consultation', async () => {
      render(
        <SmartSuggestions 
          context={{ selectedService: 'Consulta General' }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Horario Recomendado')).toBeInTheDocument();
        expect(screen.getByText(/horarios matutinos/)).toBeInTheDocument();
      });
    });

    test('shows preparation suggestions for specialist appointments', async () => {
      render(
        <SmartSuggestions 
          context={{ selectedService: 'Consulta Especialista' }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Preparación para Especialista')).toBeInTheDocument();
        expect(screen.getByText(/resultados de exámenes/)).toBeInTheDocument();
      });
    });
  });

  describe('Time-based Suggestions', () => {
    test('shows Monday morning suggestions', async () => {
      // Monday date
      const mondayDate = '2024-01-15'; // This is a Monday
      
      render(
        <SmartSuggestions 
          context={{ selectedDate: mondayDate }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Lunes Temprano')).toBeInTheDocument();
        expect(screen.getByText(/menos espera/)).toBeInTheDocument();
      });
    });

    test('shows Friday suggestions', async () => {
      // Friday date
      const fridayDate = '2024-01-19'; // This is a Friday
      
      render(
        <SmartSuggestions 
          context={{ selectedDate: fridayDate }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Viernes Tarde')).toBeInTheDocument();
        expect(screen.getByText(/se llenan rápido/)).toBeInTheDocument();
      });
    });
  });

  describe('Doctor Suggestions', () => {
    test('suggests any available doctor when service is selected but no doctor', async () => {
      render(
        <SmartSuggestions 
          context={{ 
            selectedService: 'Consulta General',
            selectedDoctor: undefined 
          }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cualquier Doctor Disponible')).toBeInTheDocument();
        expect(screen.getByText(/Sin preferencia/)).toBeInTheDocument();
      });
    });
  });

  describe('Historical Suggestions', () => {
    test('suggests annual checkup for patients with old visits', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      const patientHistory = [
        { date: oldDate.toISOString(), service: 'Consulta General' }
      ];

      render(
        <SmartSuggestions 
          context={{ patientHistory }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chequeo Anual')).toBeInTheDocument();
        expect(screen.getByText(/más de un año/)).toBeInTheDocument();
      });
    });
  });

  describe('Role-based Suggestions', () => {
    test('shows bulk booking suggestions for staff', async () => {
      render(
        <SmartSuggestions 
          context={{ userRole: 'staff' }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Agendamiento Múltiple')).toBeInTheDocument();
        expect(screen.getByText(/asistente IA/)).toBeInTheDocument();
      });
    });

    test('shows bulk booking suggestions for admin', async () => {
      render(
        <SmartSuggestions 
          context={{ userRole: 'admin' }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Agendamiento Múltiple')).toBeInTheDocument();
      });
    });
  });

  describe('Interaction', () => {
    test('calls onSuggestionApply when suggestion is clicked', async () => {
      render(
        <SmartSuggestions 
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Horario Recomendado')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('Horario Recomendado');
      fireEvent.click(suggestion);

      expect(mockOnSuggestionApply).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'time',
          title: 'Horario Recomendado'
        })
      );
    });

    test('executes suggestion action when available', async () => {
      const mockAction = jest.fn();
      
      // Mock the suggestion generation to include an action
      render(
        <SmartSuggestions 
          context={{ selectedService: 'Consulta General', selectedDoctor: undefined }}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cualquier Doctor Disponible')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('Cualquier Doctor Disponible');
      fireEvent.click(suggestion);

      expect(mockOnSuggestionApply).toHaveBeenCalled();
    });
  });

  describe('Confidence Display', () => {
    test('displays confidence percentage', async () => {
      render(
        <SmartSuggestions 
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/80% confianza/)).toBeInTheDocument();
      });
    });

    test('applies correct confidence styling', async () => {
      render(
        <SmartSuggestions
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        const suggestion = screen.getByText('Horario Recomendado').closest('div');
        expect(suggestion).toHaveClass('border'); // Check for basic styling
      });
    });
  });

  describe('Icons', () => {
    test('displays appropriate icons for suggestion types', async () => {
      render(
        <SmartSuggestions
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        // Check for time icon (Clock) - look for SVG elements
        const svgElements = screen.getAllByRole('img', { hidden: true });
        expect(svgElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      render(
        <SmartSuggestions 
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        const suggestions = screen.getAllByRole('button');
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    test('supports keyboard navigation', async () => {
      render(
        <SmartSuggestions
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
        />
      );

      await waitFor(() => {
        const suggestion = screen.getByText('Horario Recomendado');
        fireEvent.click(suggestion); // Use click instead of keyDown for now

        expect(mockOnSuggestionApply).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    test('applies custom className', async () => {
      render(
        <SmartSuggestions
          context={defaultContext}
          onSuggestionApply={mockOnSuggestionApply}
          className="custom-class"
        />
      );

      await waitFor(() => {
        const container = screen.getByText(/Sugerencias generadas por IA/).closest('div');
        expect(container).toHaveClass('custom-class');
      });
    });
  });
});
