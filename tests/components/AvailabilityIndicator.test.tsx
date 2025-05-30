/**
 * Tests for AvailabilityIndicator Component
 * 
 * Pruebas unitarias para el componente de indicadores de disponibilidad
 * con cobertura completa de funcionalidades y casos edge
 * 
 * @author AgentSalud MVP Team - UX Enhancement Tests
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvailabilityIndicator, { WeeklyAvailability, useWeeklyAvailabilityData } from '@/components/appointments/AvailabilityIndicator';

describe('AvailabilityIndicator', () => {
  const mockProps = {
    slotsCount: 5,
    date: '2024-12-20',
    dayName: 'Viernes',
    onClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado básico', () => {
    it('debe renderizar correctamente con props básicas', () => {
      render(<AvailabilityIndicator {...mockProps} />);
      
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Vie')).toBeInTheDocument();
      expect(screen.getByText('5 slots')).toBeInTheDocument();
    });

    it('debe mostrar el tooltip al hacer hover', async () => {
      render(<AvailabilityIndicator {...mockProps} />);
      
      const indicator = screen.getByRole('button');
      fireEvent.mouseEnter(indicator);
      
      await waitFor(() => {
        expect(screen.getByText(/viernes, 20 de diciembre de 2024/i)).toBeInTheDocument();
        expect(screen.getByText(/5 horarios disponibles/i)).toBeInTheDocument();
      });
    });

    it('debe manejar el modo compacto correctamente', () => {
      render(<AvailabilityIndicator {...mockProps} compact={true} />);
      
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.queryByText('Vie')).not.toBeInTheDocument();
      expect(screen.queryByText('5 slots')).not.toBeInTheDocument();
    });
  });

  describe('Niveles de disponibilidad', () => {
    it('debe mostrar alta disponibilidad (verde) para 6+ slots', () => {
      render(<AvailabilityIndicator {...mockProps} slotsCount={8} />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('bg-green-100', 'border-green-300');
    });

    it('debe mostrar media disponibilidad (amarillo) para 3-5 slots', () => {
      render(<AvailabilityIndicator {...mockProps} slotsCount={4} />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('bg-yellow-100', 'border-yellow-300');
    });

    it('debe mostrar baja disponibilidad (rojo) para 1-2 slots', () => {
      render(<AvailabilityIndicator {...mockProps} slotsCount={2} />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('bg-red-100', 'border-red-300');
    });

    it('debe mostrar no disponible (gris) para 0 slots', () => {
      render(<AvailabilityIndicator {...mockProps} slotsCount={0} />);
      
      const indicator = screen.getByRole('presentation');
      expect(indicator).toHaveClass('bg-gray-100', 'border-gray-300', 'opacity-60');
    });
  });

  describe('Interacciones', () => {
    it('debe llamar onClick cuando se hace clic y hay disponibilidad', () => {
      const mockOnClick = jest.fn();
      render(<AvailabilityIndicator {...mockProps} onClick={mockOnClick} />);
      
      const indicator = screen.getByRole('button');
      fireEvent.click(indicator);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('no debe llamar onClick cuando no hay disponibilidad', () => {
      const mockOnClick = jest.fn();
      render(<AvailabilityIndicator {...mockProps} slotsCount={0} onClick={mockOnClick} />);
      
      const indicator = screen.getByRole('presentation');
      fireEvent.click(indicator);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('debe manejar navegación por teclado', () => {
      const mockOnClick = jest.fn();
      render(<AvailabilityIndicator {...mockProps} onClick={mockOnClick} />);
      
      const indicator = screen.getByRole('button');
      
      // Enter key
      fireEvent.keyDown(indicator, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      
      // Space key
      fireEvent.keyDown(indicator, { key: ' ' });
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    it('debe mostrar estado seleccionado correctamente', () => {
      render(<AvailabilityIndicator {...mockProps} isSelected={true} />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('ring-2', 'ring-blue-500', 'ring-offset-2');
    });
  });

  describe('Tamaños', () => {
    it('debe aplicar estilos de tamaño pequeño', () => {
      render(<AvailabilityIndicator {...mockProps} size="sm" />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('w-16', 'h-16', 'p-2');
    });

    it('debe aplicar estilos de tamaño mediano por defecto', () => {
      render(<AvailabilityIndicator {...mockProps} />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('w-20', 'h-20', 'p-3');
    });

    it('debe aplicar estilos de tamaño grande', () => {
      render(<AvailabilityIndicator {...mockProps} size="lg" />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveClass('w-24', 'h-24', 'p-4');
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener aria-label descriptivo', () => {
      render(<AvailabilityIndicator {...mockProps} />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveAttribute('aria-label', 
        expect.stringContaining('viernes, 20 de diciembre de 2024')
      );
      expect(indicator).toHaveAttribute('aria-label', 
        expect.stringContaining('5 horarios disponibles')
      );
    });

    it('debe tener tabIndex correcto para elementos interactivos', () => {
      render(<AvailabilityIndicator {...mockProps} />);
      
      const indicator = screen.getByRole('button');
      expect(indicator).toHaveAttribute('tabIndex', '0');
    });

    it('debe tener tabIndex -1 para elementos no interactivos', () => {
      render(<AvailabilityIndicator {...mockProps} slotsCount={0} />);
      
      const indicator = screen.getByRole('presentation');
      expect(indicator).toHaveAttribute('tabIndex', '-1');
    });
  });
});

describe('WeeklyAvailability', () => {
  const mockWeekData = [
    { date: '2024-12-16', dayName: 'Lunes', slotsCount: 4 },
    { date: '2024-12-17', dayName: 'Martes', slotsCount: 6 },
    { date: '2024-12-18', dayName: 'Miércoles', slotsCount: 0 },
    { date: '2024-12-19', dayName: 'Jueves', slotsCount: 2 },
    { date: '2024-12-20', dayName: 'Viernes', slotsCount: 8 },
    { date: '2024-12-21', dayName: 'Sábado', slotsCount: 3 },
    { date: '2024-12-22', dayName: 'Domingo', slotsCount: 0 }
  ];

  const mockOnDateSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar todos los días de la semana', () => {
    render(
      <WeeklyAvailability 
        weekData={mockWeekData}
        onDateSelect={mockOnDateSelect}
      />
    );

    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
  });

  it('debe manejar selección de fecha correctamente', () => {
    render(
      <WeeklyAvailability 
        weekData={mockWeekData}
        selectedDate="2024-12-20"
        onDateSelect={mockOnDateSelect}
      />
    );

    // Verificar que el día seleccionado tiene el estilo correcto
    const selectedDay = screen.getByLabelText(/viernes, 20 de diciembre de 2024/i);
    expect(selectedDay).toHaveClass('ring-2', 'ring-blue-500');

    // Hacer clic en otro día
    const mondayButton = screen.getByLabelText(/lunes, 16 de diciembre de 2024/i);
    fireEvent.click(mondayButton);
    
    expect(mockOnDateSelect).toHaveBeenCalledWith('2024-12-16');
  });

  it('debe mostrar diferentes niveles de disponibilidad', () => {
    render(
      <WeeklyAvailability 
        weekData={mockWeekData}
        onDateSelect={mockOnDateSelect}
      />
    );

    // Alta disponibilidad (8 slots - verde)
    const highAvailability = screen.getByLabelText(/viernes, 20 de diciembre de 2024/i);
    expect(highAvailability).toHaveClass('bg-green-100');

    // Media disponibilidad (4 slots - amarillo)
    const mediumAvailability = screen.getByLabelText(/lunes, 16 de diciembre de 2024/i);
    expect(mediumAvailability).toHaveClass('bg-yellow-100');

    // Baja disponibilidad (2 slots - rojo)
    const lowAvailability = screen.getByLabelText(/jueves, 19 de diciembre de 2024/i);
    expect(lowAvailability).toHaveClass('bg-red-100');

    // No disponible (0 slots - gris)
    const noAvailability = screen.getByLabelText(/miércoles, 18 de diciembre de 2024/i);
    expect(noAvailability).toHaveClass('bg-gray-100');
  });
});

describe('useWeeklyAvailabilityData Hook', () => {
  it('debe generar datos para 7 días', () => {
    const TestComponent = () => {
      const weekData = useWeeklyAvailabilityData(new Date('2024-12-16'));
      return (
        <div>
          {weekData.map((day, index) => (
            <div key={index} data-testid={`day-${index}`}>
              {day.date} - {day.dayName} - {day.slotsCount}
            </div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    // Verificar que se generaron 7 días
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`day-${i}`)).toBeInTheDocument();
    }
  });

  it('debe generar fechas consecutivas', () => {
    const TestComponent = () => {
      const weekData = useWeeklyAvailabilityData(new Date('2024-12-16'));
      return (
        <div>
          {weekData.map((day, index) => (
            <div key={index} data-testid={`date-${index}`}>
              {day.date}
            </div>
          ))}
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('date-0')).toHaveTextContent('2024-12-16');
    expect(screen.getByTestId('date-1')).toHaveTextContent('2024-12-17');
    expect(screen.getByTestId('date-6')).toHaveTextContent('2024-12-22');
  });
});
