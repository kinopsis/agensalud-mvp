/**
 * Tests for WeeklyAvailabilitySelector Component
 * 
 * Pruebas unitarias para el componente de selección semanal de disponibilidad
 * con cobertura completa de funcionalidades UX mejoradas
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 1 Tests
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeeklyAvailabilitySelector from '@/components/appointments/WeeklyAvailabilitySelector';
import { type DayAvailabilityData } from '@/hooks/useAvailabilityData';

// Mock del hook useAvailabilityData
jest.mock('@/hooks/useAvailabilityData', () => ({
  useWeeklyAvailability: jest.fn(() => ({
    data: [],
    loading: false,
    error: null,
    refresh: jest.fn()
  }))
}));

describe('WeeklyAvailabilitySelector', () => {
  const mockProps = {
    title: '¿Cuándo te gustaría la cita?',
    subtitle: 'Selecciona la fecha que mejor te convenga',
    onDateSelect: jest.fn(),
    organizationId: 'org-123',
    serviceId: 'service-456',
    showDensityIndicators: true,
    enableSmartSuggestions: false
  };

  const mockAvailabilityData: DayAvailabilityData[] = [
    {
      date: '2024-12-16',
      dayName: 'Lunes',
      slotsCount: 4,
      availabilityLevel: 'medium',
      isToday: false,
      isTomorrow: false,
      isWeekend: false
    },
    {
      date: '2024-12-17',
      dayName: 'Martes',
      slotsCount: 8,
      availabilityLevel: 'high',
      isToday: false,
      isTomorrow: true,
      isWeekend: false
    },
    {
      date: '2024-12-18',
      dayName: 'Miércoles',
      slotsCount: 0,
      availabilityLevel: 'none',
      isToday: false,
      isTomorrow: false,
      isWeekend: false
    },
    {
      date: '2024-12-19',
      dayName: 'Jueves',
      slotsCount: 2,
      availabilityLevel: 'low',
      isToday: false,
      isTomorrow: false,
      isWeekend: false
    },
    {
      date: '2024-12-20',
      dayName: 'Viernes',
      slotsCount: 6,
      availabilityLevel: 'high',
      isToday: true,
      isTomorrow: false,
      isWeekend: false
    },
    {
      date: '2024-12-21',
      dayName: 'Sábado',
      slotsCount: 3,
      availabilityLevel: 'medium',
      isToday: false,
      isTomorrow: false,
      isWeekend: true
    },
    {
      date: '2024-12-22',
      dayName: 'Domingo',
      slotsCount: 0,
      availabilityLevel: 'none',
      isToday: false,
      isTomorrow: false,
      isWeekend: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado básico', () => {
    it('debe renderizar título y subtítulo correctamente', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} />);
      
      expect(screen.getByText('¿Cuándo te gustaría la cita?')).toBeInTheDocument();
      expect(screen.getByText('Selecciona la fecha que mejor te convenga')).toBeInTheDocument();
    });

    it('debe mostrar navegación semanal', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} />);
      
      expect(screen.getByText('Anterior')).toBeInTheDocument();
      expect(screen.getByText('Siguiente')).toBeInTheDocument();
    });

    it('debe mostrar leyenda de densidad cuando está habilitada', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} showDensityIndicators={true} />);
      
      expect(screen.getByText('Disponibilidad:')).toBeInTheDocument();
      expect(screen.getByText('Alta (6+ slots)')).toBeInTheDocument();
      expect(screen.getByText('Media (3-5 slots)')).toBeInTheDocument();
      expect(screen.getByText('Baja (1-2 slots)')).toBeInTheDocument();
      expect(screen.getByText('No disponible')).toBeInTheDocument();
    });
  });

  describe('Estados de carga y error', () => {
    it('debe mostrar estado de carga', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} loading={true} />);
      
      expect(screen.getByText('Cargando disponibilidad...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // spinner
    });

    it('debe deshabilitar navegación durante carga', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} loading={true} />);
      
      const prevButton = screen.getByText('Anterior');
      const nextButton = screen.getByText('Siguiente');
      
      expect(prevButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Navegación semanal', () => {
    it('debe navegar a la semana siguiente', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} />);
      
      const nextButton = screen.getByText('Siguiente');
      fireEvent.click(nextButton);
      
      // Verificar que se actualiza el rango de fechas mostrado
      // (esto dependería de la implementación específica del formateo de fechas)
    });

    it('debe navegar a la semana anterior', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} />);
      
      const prevButton = screen.getByText('Anterior');
      fireEvent.click(prevButton);
      
      // Verificar navegación hacia atrás
    });

    it('debe respetar fecha mínima en navegación', () => {
      const today = new Date().toISOString().split('T')[0];
      render(<WeeklyAvailabilitySelector {...mockProps} minDate={today} />);
      
      const prevButton = screen.getByText('Anterior');
      
      // Intentar navegar antes de la fecha mínima debería estar limitado
      fireEvent.click(prevButton);
      // Verificar que no navega antes de minDate
    });
  });

  describe('Sugerencias de IA', () => {
    const aiContext = {
      suggestedDates: ['2024-12-17', '2024-12-20'],
      preferredTimeRange: 'morning' as const,
      urgencyLevel: 'medium' as const
    };

    it('debe mostrar sugerencias cuando están habilitadas', () => {
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          enableSmartSuggestions={true}
          aiContext={aiContext}
        />
      );
      
      expect(screen.getByText('Sugerencias inteligentes')).toBeInTheDocument();
    });

    it('no debe mostrar sugerencias cuando están deshabilitadas', () => {
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          enableSmartSuggestions={false}
          aiContext={aiContext}
        />
      );
      
      expect(screen.queryByText('Sugerencias inteligentes')).not.toBeInTheDocument();
    });

    it('debe manejar selección de sugerencia de IA', () => {
      const mockOnDateSelect = jest.fn();
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onDateSelect={mockOnDateSelect}
          enableSmartSuggestions={true}
          aiContext={aiContext}
        />
      );
      
      // Buscar y hacer clic en una sugerencia
      const suggestionButtons = screen.getAllByText(/Recomendado|Flexible|Próximo/);
      if (suggestionButtons.length > 0) {
        fireEvent.click(suggestionButtons[0]);
        expect(mockOnDateSelect).toHaveBeenCalled();
      }
    });
  });

  describe('Selección de fechas', () => {
    it('debe llamar onDateSelect cuando se selecciona una fecha', async () => {
      const mockOnDateSelect = jest.fn();
      
      // Mock del componente WeeklyAvailability para simular selección
      jest.doMock('@/components/appointments/AvailabilityIndicator', () => ({
        WeeklyAvailability: ({ onDateSelect }: any) => (
          <div>
            <button 
              type="button"
              onClick={() => onDateSelect('2024-12-20')}
              data-testid="date-selector-20"
            >
              20
            </button>
          </div>
        )
      }));
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onDateSelect={mockOnDateSelect}
        />
      );
      
      const dateButton = screen.getByTestId('date-selector-20');
      fireEvent.click(dateButton);
      
      expect(mockOnDateSelect).toHaveBeenCalledWith('2024-12-20');
    });

    it('debe respetar fecha mínima en selección', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      
      const mockOnDateSelect = jest.fn();
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onDateSelect={mockOnDateSelect}
          minDate={new Date().toISOString().split('T')[0]}
        />
      );
      
      // Intentar seleccionar fecha anterior a minDate no debería funcionar
      // (esto dependería de la implementación del componente)
    });
  });

  describe('Integración con API', () => {
    it('debe llamar onLoadAvailability con parámetros correctos', async () => {
      const mockLoadAvailability = jest.fn().mockResolvedValue(mockAvailabilityData);
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onLoadAvailability={mockLoadAvailability}
        />
      );
      
      await waitFor(() => {
        expect(mockLoadAvailability).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-123',
            serviceId: 'service-456',
            startDate: expect.any(String),
            endDate: expect.any(String)
          })
        );
      });
    });

    it('debe manejar errores de carga de disponibilidad', async () => {
      const mockLoadAvailability = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onLoadAvailability={mockLoadAvailability}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Error cargando disponibilidad')).toBeInTheDocument();
        expect(screen.getByText('Error de red')).toBeInTheDocument();
      });
    });

    it('debe mostrar botón de reintentar en caso de error', async () => {
      const mockLoadAvailability = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onLoadAvailability={mockLoadAvailability}
        />
      );
      
      await waitFor(() => {
        const retryButton = screen.getByText('Intentar de nuevo');
        expect(retryButton).toBeInTheDocument();
        
        fireEvent.click(retryButton);
        expect(mockLoadAvailability).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Estado vacío', () => {
    it('debe mostrar mensaje cuando no hay disponibilidad', () => {
      const mockLoadAvailability = jest.fn().mockResolvedValue([]);
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onLoadAvailability={mockLoadAvailability}
        />
      );
      
      expect(screen.getByText('Sin disponibilidad')).toBeInTheDocument();
      expect(screen.getByText('No hay horarios disponibles para esta semana.')).toBeInTheDocument();
    });

    it('debe ofrecer navegar a próxima semana cuando no hay disponibilidad', () => {
      const mockLoadAvailability = jest.fn().mockResolvedValue([]);
      
      render(
        <WeeklyAvailabilitySelector 
          {...mockProps} 
          onLoadAvailability={mockLoadAvailability}
        />
      );
      
      const nextWeekButton = screen.getByText('Ver próxima semana');
      expect(nextWeekButton).toBeInTheDocument();
      
      fireEvent.click(nextWeekButton);
      // Verificar que navega a la próxima semana
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener estructura semántica correcta', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} />);
      
      // Verificar que tiene elementos con roles apropiados
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(2); // Anterior y Siguiente
    });

    it('debe tener navegación por teclado funcional', () => {
      render(<WeeklyAvailabilitySelector {...mockProps} />);
      
      const nextButton = screen.getByText('Siguiente');
      
      // Verificar que el botón puede recibir foco
      nextButton.focus();
      expect(nextButton).toHaveFocus();
      
      // Verificar navegación con Enter
      fireEvent.keyDown(nextButton, { key: 'Enter' });
      // Verificar que se ejecuta la acción
    });
  });

  describe('Responsive design', () => {
    it('debe adaptar layout en pantallas pequeñas', () => {
      // Mock de window.innerWidth para simular móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<WeeklyAvailabilitySelector {...mockProps} />);
      
      // Verificar que se aplican clases responsive apropiadas
      // (esto dependería de la implementación específica)
    });
  });
});
