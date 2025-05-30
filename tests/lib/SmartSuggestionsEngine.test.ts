/**
 * Tests for SmartSuggestionsEngine
 * 
 * Pruebas unitarias para el motor de sugerencias inteligentes
 * con cobertura completa de algoritmos de recomendación y análisis de patrones
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 3 Tests
 * @version 1.0.0
 */

import { SmartSuggestionsEngine, type SmartSuggestion, type SuggestionsResult } from '@/lib/ai/SmartSuggestionsEngine';
import { AIContext } from '@/lib/ai/AIContextProcessor';

describe('SmartSuggestionsEngine', () => {
  let engine: SmartSuggestionsEngine;
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    engine = new SmartSuggestionsEngine(mockOrganizationId);
  });

  const mockAvailableOptions = [
    {
      date: '2024-12-20',
      time: '09:00',
      doctorId: 'doc-1',
      doctorName: 'Dr. García',
      available: true,
      price: 50000
    },
    {
      date: '2024-12-20',
      time: '14:00',
      doctorId: 'doc-2',
      doctorName: 'Dr. López',
      available: true,
      price: 60000
    },
    {
      date: '2024-12-21',
      time: '10:00',
      doctorId: 'doc-1',
      doctorName: 'Dr. García',
      available: true,
      price: 50000
    },
    {
      date: '2024-12-22',
      time: '16:00',
      doctorId: 'doc-3',
      doctorName: 'Dr. Martínez',
      available: true,
      price: 55000
    }
  ];

  describe('Inicialización', () => {
    it('debe inicializar correctamente con configuración por defecto', () => {
      expect(engine).toBeInstanceOf(SmartSuggestionsEngine);
    });

    it('debe aceptar opciones personalizadas', () => {
      const customEngine = new SmartSuggestionsEngine(mockOrganizationId, {
        maxSuggestions: 3,
        minConfidence: 0.8,
        includeExplanations: false
      });
      expect(customEngine).toBeDefined();
    });
  });

  describe('Generación de sugerencias básicas', () => {
    const mockAIContext: AIContext = {
      urgencyLevel: 'medium',
      preferredTimeRange: 'morning',
      flexibilityLevel: 'flexible',
      suggestedDates: ['2024-12-20'],
      confidence: {
        overall: 0.7,
        datePreference: 0.8,
        timePreference: 0.6,
        urgency: 0.5,
        flexibility: 0.7
      }
    };

    it('debe generar sugerencias basadas en contexto de IA', async () => {
      const result = await engine.generateSuggestions(
        mockAIContext,
        mockAvailableOptions
      );

      expect(result.suggestions).toHaveLength(5); // maxSuggestions por defecto
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.totalAnalyzed).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('debe incluir insights del usuario', async () => {
      const result = await engine.generateSuggestions(
        mockAIContext,
        mockAvailableOptions
      );

      expect(result.insights).toBeDefined();
      expect(result.insights.userProfile).toBe('new');
      expect(result.insights.urgencyLevel).toBe('medium');
      expect(result.insights.flexibilityScore).toBeGreaterThan(0);
    });

    it('debe generar recomendaciones UX apropiadas', async () => {
      const result = await engine.generateSuggestions(
        mockAIContext,
        mockAvailableOptions
      );

      expect(result.uxRecommendations).toBeDefined();
      expect(typeof result.uxRecommendations.showComparison).toBe('boolean');
      expect(typeof result.uxRecommendations.highlightBestOption).toBe('boolean');
    });
  });

  describe('Sugerencias basadas en urgencia', () => {
    it('debe priorizar opciones tempranas para urgencia alta', async () => {
      const urgentContext: AIContext = {
        urgencyLevel: 'high',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.8, datePreference: 0.7, timePreference: 0.6, urgency: 0.9, flexibility: 0.5 }
      };

      const result = await engine.generateSuggestions(
        urgentContext,
        mockAvailableOptions
      );

      const urgentSuggestion = result.suggestions.find(s => s.type === 'urgency_based');
      expect(urgentSuggestion).toBeDefined();
      expect(urgentSuggestion?.priority).toBe(10);
      expect(urgentSuggestion?.data.date).toBe('2024-12-20'); // Fecha más temprana
    });

    it('debe incluir explicación de urgencia', async () => {
      const urgentContext: AIContext = {
        urgencyLevel: 'emergency',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.9, datePreference: 0.8, timePreference: 0.7, urgency: 1.0, flexibility: 0.5 }
      };

      const result = await engine.generateSuggestions(
        urgentContext,
        mockAvailableOptions
      );

      const urgentSuggestion = result.suggestions.find(s => s.type === 'urgency_based');
      expect(urgentSuggestion?.explanation).toContain('urgente');
    });
  });

  describe('Sugerencias basadas en preferencias de tiempo', () => {
    it('debe filtrar por horario de mañana', async () => {
      const morningContext: AIContext = {
        preferredTimeRange: 'morning',
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.8, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        morningContext,
        mockAvailableOptions
      );

      const timeSuggestion = result.suggestions.find(s => s.type === 'user_pattern');
      expect(timeSuggestion).toBeDefined();
      
      if (timeSuggestion?.data.time) {
        const hour = parseInt(timeSuggestion.data.time.split(':')[0]);
        expect(hour).toBeLessThan(12); // Horario de mañana
      }
    });

    it('debe filtrar por horario de tarde', async () => {
      const afternoonContext: AIContext = {
        preferredTimeRange: 'afternoon',
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.8, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        afternoonContext,
        mockAvailableOptions
      );

      const timeSuggestion = result.suggestions.find(s => s.type === 'user_pattern');
      expect(timeSuggestion).toBeDefined();
      
      if (timeSuggestion?.data.time) {
        const hour = parseInt(timeSuggestion.data.time.split(':')[0]);
        expect(hour).toBeGreaterThanOrEqual(12);
        expect(hour).toBeLessThan(18);
      }
    });
  });

  describe('Sugerencias basadas en fechas específicas', () => {
    it('debe crear sugerencia para fecha mencionada', async () => {
      const dateContext: AIContext = {
        suggestedDates: ['2024-12-21'],
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.8, datePreference: 0.9, timePreference: 0.6, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        dateContext,
        mockAvailableOptions
      );

      const dateSuggestion = result.suggestions.find(s => s.type === 'ai_recommended');
      expect(dateSuggestion).toBeDefined();
      expect(dateSuggestion?.data.date).toBe('2024-12-21');
      expect(dateSuggestion?.explanation).toContain('mencionaste');
    });
  });

  describe('Sugerencias populares', () => {
    it('debe incluir sugerencia popular', async () => {
      const basicContext: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.6, datePreference: 0.5, timePreference: 0.5, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        basicContext,
        mockAvailableOptions
      );

      const popularSuggestion = result.suggestions.find(s => s.type === 'popular_choice');
      expect(popularSuggestion).toBeDefined();
      expect(popularSuggestion?.metrics.popularityScore).toBeGreaterThan(0.8);
    });
  });

  describe('Ranking y filtrado', () => {
    it('debe ordenar sugerencias por prioridad y confianza', async () => {
      const context: AIContext = {
        urgencyLevel: 'high',
        preferredTimeRange: 'morning',
        suggestedDates: ['2024-12-20'],
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.8, datePreference: 0.9, timePreference: 0.8, urgency: 0.9, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        context,
        mockAvailableOptions
      );

      // La primera sugerencia debe ser la de mayor prioridad
      expect(result.suggestions[0].type).toBe('urgency_based');
      
      // Las sugerencias deben estar ordenadas por score
      for (let i = 1; i < result.suggestions.length; i++) {
        const currentScore = result.suggestions[i].confidence * 0.6 + (result.suggestions[i].priority / 10) * 0.4;
        const prevScore = result.suggestions[i-1].confidence * 0.6 + (result.suggestions[i-1].priority / 10) * 0.4;
        expect(currentScore).toBeLessThanOrEqual(prevScore);
      }
    });

    it('debe filtrar sugerencias por confianza mínima', async () => {
      const lowConfidenceEngine = new SmartSuggestionsEngine(mockOrganizationId, {
        minConfidence: 0.9
      });

      const context: AIContext = {
        urgencyLevel: 'low',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.5, datePreference: 0.4, timePreference: 0.4, urgency: 0.3, flexibility: 0.7 }
      };

      const result = await lowConfidenceEngine.generateSuggestions(
        context,
        mockAvailableOptions
      );

      // Debe tener menos sugerencias debido al filtro de confianza
      expect(result.suggestions.length).toBeLessThan(5);
    });
  });

  describe('Métricas y análisis', () => {
    it('debe calcular métricas de rendimiento', async () => {
      const context: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.6, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        context,
        mockAvailableOptions
      );

      result.suggestions.forEach(suggestion => {
        expect(suggestion.metrics.successRate).toBeGreaterThanOrEqual(0);
        expect(suggestion.metrics.successRate).toBeLessThanOrEqual(1);
        expect(suggestion.metrics.userSatisfaction).toBeGreaterThanOrEqual(0);
        expect(suggestion.metrics.userSatisfaction).toBeLessThanOrEqual(5);
        expect(suggestion.metrics.conversionRate).toBeGreaterThanOrEqual(0);
        expect(suggestion.metrics.conversionRate).toBeLessThanOrEqual(1);
      });
    });

    it('debe incluir contexto de razonamiento', async () => {
      const context: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.6, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        context,
        mockAvailableOptions
      );

      result.suggestions.forEach(suggestion => {
        expect(suggestion.context.basedOn).toHaveLength(2);
        expect(suggestion.context.reasoning).toBeDefined();
        expect(suggestion.context.alternatives).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Acciones disponibles', () => {
    it('debe definir acciones apropiadas para cada sugerencia', async () => {
      const context: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.6, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        context,
        mockAvailableOptions
      );

      result.suggestions.forEach(suggestion => {
        expect(typeof suggestion.actions.canBook).toBe('boolean');
        expect(typeof suggestion.actions.canModify).toBe('boolean');
        expect(typeof suggestion.actions.canCompare).toBe('boolean');
        expect(typeof suggestion.actions.requiresConfirmation).toBe('boolean');
      });
    });

    it('debe requerir confirmación para sugerencias urgentes', async () => {
      const urgentContext: AIContext = {
        urgencyLevel: 'emergency',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.9, datePreference: 0.8, timePreference: 0.7, urgency: 1.0, flexibility: 0.5 }
      };

      const result = await engine.generateSuggestions(
        urgentContext,
        mockAvailableOptions
      );

      const urgentSuggestion = result.suggestions.find(s => s.type === 'urgency_based');
      expect(urgentSuggestion?.actions.requiresConfirmation).toBe(true);
    });
  });

  describe('Manejo de casos límite', () => {
    it('debe manejar opciones vacías', async () => {
      const context: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.6, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(context, []);

      expect(result.suggestions).toHaveLength(0);
      expect(result.confidence).toBe(0.3);
      expect(result.uxRecommendations.suggestAlternatives).toBe(true);
    });

    it('debe manejar contexto de IA mínimo', async () => {
      const minimalContext: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible'
      };

      const result = await engine.generateSuggestions(
        minimalContext,
        mockAvailableOptions
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('debe proporcionar fallback en caso de error', async () => {
      // Simular error con contexto inválido
      const invalidContext = null as any;

      const result = await engine.generateSuggestions(
        invalidContext,
        mockAvailableOptions
      );

      expect(result.suggestions).toHaveLength(0);
      expect(result.confidence).toBe(0.3);
      expect(result.insights.userProfile).toBe('new');
    });
  });

  describe('Personalización con historial de usuario', () => {
    const mockUserProfile = {
      userId: 'user-123',
      organizationId: mockOrganizationId,
      appointmentHistory: [
        {
          date: '2024-11-15',
          time: '09:00',
          doctorId: 'doc-1',
          serviceId: 'service-1',
          satisfaction: 4.5,
          completed: true
        }
      ],
      preferences: {
        preferredTimes: ['09:00', '10:00'],
        preferredDoctors: ['doc-1'],
        flexibilityLevel: 'medium' as const
      },
      behaviorMetrics: {
        averageBookingTime: 5,
        cancellationRate: 0.1,
        rescheduleRate: 0.2,
        satisfactionScore: 4.2
      }
    };

    it('debe generar sugerencias basadas en historial', async () => {
      const context: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.6, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        context,
        mockAvailableOptions,
        mockUserProfile
      );

      const historySuggestion = result.suggestions.find(s => s.type === 'user_pattern');
      expect(historySuggestion).toBeDefined();
      expect(historySuggestion?.explanation).toContain('historial');
    });

    it('debe ajustar insights para usuario recurrente', async () => {
      const context: AIContext = {
        urgencyLevel: 'medium',
        flexibilityLevel: 'flexible',
        confidence: { overall: 0.7, datePreference: 0.6, timePreference: 0.6, urgency: 0.5, flexibility: 0.7 }
      };

      const result = await engine.generateSuggestions(
        context,
        mockAvailableOptions,
        mockUserProfile
      );

      expect(result.insights.userProfile).toBe('returning');
    });
  });
});
