/**
 * Tests for SmartSuggestionsDisplay Component
 * 
 * Pruebas unitarias para el componente de visualización de sugerencias inteligentes
 * con cobertura completa de interacciones y estados
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 3 Tests
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SmartSuggestionsDisplay from '@/components/ai/SmartSuggestionsDisplay';
import { SmartSuggestion, SuggestionsResult } from '@/lib/ai/SmartSuggestionsEngine';

describe('SmartSuggestionsDisplay', () => {
  const mockSuggestion: SmartSuggestion = {
    id: 'suggestion-1',
    type: 'ai_recommended',
    title: 'Cita recomendada por IA',
    description: '20 de diciembre a las 09:00',
    explanation: 'Basado en tu preferencia por horarios de mañana',
    confidence: 0.85,
    priority: 8,
    data: {
      date: '2024-12-20',
      time: '09:00',
      doctorId: 'doc-1',
      doctorName: 'Dr. García',
      price: 50000
    },
    metrics: {
      successRate: 0.82,
      userSatisfaction: 4.4,
      conversionRate: 0.75,
      popularityScore: 0.7
    },
    context: {
      basedOn: ['time_preference', 'conversation_analysis'],
      reasoning: 'Basado en tu preferencia de horario mencionada',
      alternatives: 2,
      timeWindow: 'morning'
    },
    actions: {
      canBook: true,
      canModify: true,
      canCompare: true,
      requiresConfirmation: false
    }
  };

  const mockSuggestionsResult: SuggestionsResult = {
    suggestions: [mockSuggestion],
    totalAnalyzed: 5,
    processingTime: 150,
    confidence: 0.8,
    insights: {
      userProfile: 'returning',
      preferenceStrength: 'strong',
      urgencyLevel: 'medium',
      flexibilityScore: 0.7,
      predictedSatisfaction: 0.85
    },
    uxRecommendations: {
      showComparison: true,
      highlightBestOption: true,
      showExplanations: true,
      enableQuickBook: false,
      suggestAlternatives: true
    }
  };

  const mockProps = {
    suggestionsResult: mockSuggestionsResult,
    onSuggestionSelect: jest.fn(),
    onCompare: jest.fn(),
    onViewDetails: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado básico', () => {
    it('debe renderizar título y descripción', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText('Sugerencias Inteligentes')).toBeInTheDocument();
      expect(screen.getByText(/Basado en tu conversación y preferencias/)).toBeInTheDocument();
    });

    it('debe mostrar métricas de confianza', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText('Confianza: 80%')).toBeInTheDocument();
    });

    it('debe mostrar insights del usuario', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText('Returning')).toBeInTheDocument();
      expect(screen.getByText('Strong')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });
  });

  describe('Visualización de sugerencias', () => {
    it('debe renderizar sugerencia individual correctamente', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText('Cita recomendada por IA')).toBeInTheDocument();
      expect(screen.getByText('20 de diciembre a las 09:00')).toBeInTheDocument();
      expect(screen.getByText('💡 Basado en tu preferencia por horarios de mañana')).toBeInTheDocument();
    });

    it('debe mostrar detalles de la cita', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText('2024-12-20')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('Dr. García')).toBeInTheDocument();
      expect(screen.getByText('$50000')).toBeInTheDocument();
    });

    it('debe mostrar badge de recomendado para la mejor opción', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText('⭐ Recomendado')).toBeInTheDocument();
    });

    it('debe mostrar indicador de confianza', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  describe('Interacciones', () => {
    it('debe llamar onSuggestionSelect al hacer clic en Seleccionar', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      const selectButton = screen.getByText('Seleccionar');
      fireEvent.click(selectButton);
      
      expect(mockProps.onSuggestionSelect).toHaveBeenCalledWith(mockSuggestion);
    });

    it('debe llamar onViewDetails al hacer clic en el botón de información', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      const infoButton = screen.getByRole('button', { name: '' }); // Botón con solo icono
      fireEvent.click(infoButton);
      
      expect(mockProps.onViewDetails).toHaveBeenCalledWith(mockSuggestion);
    });

    it('debe llamar onCompare cuando está habilitado', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      const compareButton = screen.getByText('Comparar opciones');
      fireEvent.click(compareButton);
      
      expect(mockProps.onCompare).toHaveBeenCalledWith([mockSuggestion]);
    });
  });

  describe('Estados de carga', () => {
    it('debe mostrar skeleton de carga', () => {
      render(<SmartSuggestionsDisplay {...mockProps} loading={true} />);
      
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Skeleton
      expect(screen.queryByText('Sugerencias Inteligentes')).not.toBeInTheDocument();
    });

    it('debe ocultar contenido durante carga', () => {
      render(<SmartSuggestionsDisplay {...mockProps} loading={true} />);
      
      expect(screen.queryByText('Cita recomendada por IA')).not.toBeInTheDocument();
    });
  });

  describe('Estado vacío', () => {
    const emptySuggestionsResult: SuggestionsResult = {
      ...mockSuggestionsResult,
      suggestions: []
    };

    it('debe mostrar mensaje cuando no hay sugerencias', () => {
      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={emptySuggestionsResult}
        />
      );
      
      expect(screen.getByText('Sin sugerencias disponibles')).toBeInTheDocument();
      expect(screen.getByText(/No pudimos generar sugerencias personalizadas/)).toBeInTheDocument();
    });

    it('debe mostrar icono apropiado para estado vacío', () => {
      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={emptySuggestionsResult}
        />
      );
      
      const icon = screen.getByRole('img', { hidden: true }); // Lucide icon
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Modo compacto', () => {
    it('debe ocultar insights en modo compacto', () => {
      render(<SmartSuggestionsDisplay {...mockProps} compact={true} />);
      
      expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
      expect(screen.queryByText('Preferencias')).not.toBeInTheDocument();
    });

    it('debe ocultar acciones adicionales en modo compacto', () => {
      render(<SmartSuggestionsDisplay {...mockProps} compact={true} />);
      
      expect(screen.queryByText('Comparar opciones')).not.toBeInTheDocument();
      expect(screen.queryByText('Ver más alternativas')).not.toBeInTheDocument();
    });

    it('debe usar padding reducido en modo compacto', () => {
      render(<SmartSuggestionsDisplay {...mockProps} compact={true} />);
      
      // Verificar que se aplican clases de padding compacto
      const suggestionCard = screen.getByText('Cita recomendada por IA').closest('div');
      expect(suggestionCard).toHaveClass('p-3'); // En lugar de p-4
    });
  });

  describe('Métricas detalladas', () => {
    it('debe mostrar métricas cuando está habilitado', () => {
      render(<SmartSuggestionsDisplay {...mockProps} showMetrics={true} />);
      
      expect(screen.getByText('Éxito: 82%')).toBeInTheDocument();
      expect(screen.getByText('Satisfacción: 4.4/5')).toBeInTheDocument();
    });

    it('debe ocultar métricas por defecto', () => {
      render(<SmartSuggestionsDisplay {...mockProps} showMetrics={false} />);
      
      expect(screen.queryByText('Éxito: 82%')).not.toBeInTheDocument();
      expect(screen.queryByText('Satisfacción: 4.4/5')).not.toBeInTheDocument();
    });
  });

  describe('Múltiples sugerencias', () => {
    const multipleSuggestions: SuggestionsResult = {
      ...mockSuggestionsResult,
      suggestions: [
        mockSuggestion,
        {
          ...mockSuggestion,
          id: 'suggestion-2',
          type: 'urgency_based',
          title: 'Cita urgente',
          priority: 10,
          confidence: 0.9
        },
        {
          ...mockSuggestion,
          id: 'suggestion-3',
          type: 'popular_choice',
          title: 'Opción popular',
          priority: 6,
          confidence: 0.7
        }
      ]
    };

    it('debe renderizar múltiples sugerencias', () => {
      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={multipleSuggestions}
        />
      );
      
      expect(screen.getByText('Cita recomendada por IA')).toBeInTheDocument();
      expect(screen.getByText('Cita urgente')).toBeInTheDocument();
      expect(screen.getByText('Opción popular')).toBeInTheDocument();
    });

    it('debe mostrar diferentes iconos para diferentes tipos', () => {
      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={multipleSuggestions}
        />
      );
      
      // Verificar que hay múltiples iconos (diferentes tipos de sugerencias)
      const icons = screen.getAllByRole('img', { hidden: true });
      expect(icons.length).toBeGreaterThan(3); // Al menos un icono por sugerencia
    });
  });

  describe('Recomendaciones UX', () => {
    it('debe mostrar botón de comparación cuando está recomendado', () => {
      const withComparisonResult = {
        ...mockSuggestionsResult,
        uxRecommendations: {
          ...mockSuggestionsResult.uxRecommendations,
          showComparison: true
        }
      };

      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={withComparisonResult}
        />
      );
      
      expect(screen.getByText('Comparar opciones')).toBeInTheDocument();
    });

    it('debe mostrar enlace de alternativas cuando está recomendado', () => {
      const withAlternativesResult = {
        ...mockSuggestionsResult,
        uxRecommendations: {
          ...mockSuggestionsResult.uxRecommendations,
          suggestAlternatives: true
        }
      };

      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={withAlternativesResult}
        />
      );
      
      expect(screen.getByText('Ver más alternativas')).toBeInTheDocument();
    });

    it('debe ocultar acciones cuando no están recomendadas', () => {
      const withoutActionsResult = {
        ...mockSuggestionsResult,
        uxRecommendations: {
          showComparison: false,
          highlightBestOption: false,
          showExplanations: false,
          enableQuickBook: false,
          suggestAlternatives: false
        }
      };

      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={withoutActionsResult}
        />
      );
      
      expect(screen.queryByText('Comparar opciones')).not.toBeInTheDocument();
      expect(screen.queryByText('Ver más alternativas')).not.toBeInTheDocument();
    });
  });

  describe('Información adicional', () => {
    it('debe mostrar estadísticas de procesamiento', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByText(/Sugerencias generadas en 150ms/)).toBeInTheDocument();
      expect(screen.getByText(/Analizadas 5 opciones/)).toBeInTheDocument();
      expect(screen.getByText(/Satisfacción predicha: 85%/)).toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener estructura semántica correcta', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(3); // Seleccionar, Info, Comparar
    });

    it('debe tener navegación por teclado funcional', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      const selectButton = screen.getByText('Seleccionar');
      
      selectButton.focus();
      expect(selectButton).toHaveFocus();
      
      fireEvent.keyDown(selectButton, { key: 'Enter' });
      expect(mockProps.onSuggestionSelect).toHaveBeenCalled();
    });

    it('debe tener textos alternativos apropiados', () => {
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      // Verificar que los iconos tienen contexto apropiado
      const icons = screen.getAllByRole('img', { hidden: true });
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive design', () => {
    it('debe adaptar grid en pantallas pequeñas', () => {
      // Mock de window.innerWidth para simular móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<SmartSuggestionsDisplay {...mockProps} />);
      
      // Verificar que se aplican clases responsive apropiadas
      const insightsGrid = screen.getByText('Perfil').closest('div')?.parentElement;
      expect(insightsGrid).toHaveClass('grid-cols-2', 'md:grid-cols-4');
    });
  });

  describe('Colores y estilos por tipo', () => {
    it('debe aplicar colores apropiados según el tipo de sugerencia', () => {
      const urgentSuggestion = {
        ...mockSuggestion,
        type: 'urgency_based' as const,
        title: 'Cita urgente'
      };

      const urgentResult = {
        ...mockSuggestionsResult,
        suggestions: [urgentSuggestion]
      };

      render(
        <SmartSuggestionsDisplay 
          {...mockProps} 
          suggestionsResult={urgentResult}
        />
      );
      
      // Verificar que se aplican clases de color apropiadas para urgencia (rojo)
      const suggestionCard = screen.getByText('Cita urgente').closest('div');
      expect(suggestionCard).toHaveClass('border-red-300', 'bg-red-50');
    });
  });
});
