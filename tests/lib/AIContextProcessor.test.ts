/**
 * Tests for AIContextProcessor
 * 
 * Pruebas unitarias para el procesador de contexto de IA
 * con cobertura completa de extracción de preferencias y transición AI-to-manual
 * 
 * @author AgentSalud MVP Team - UX Enhancement Phase 2 Tests
 * @version 1.0.0
 */

import { AIContextProcessor, type AIContext } from '@/lib/ai/AIContextProcessor';
import { AppointmentIntent } from '@/lib/ai/appointment-processor';

describe('AIContextProcessor', () => {
  let processor: AIContextProcessor;
  const mockOrganizationId = 'org-123';

  beforeEach(() => {
    processor = new AIContextProcessor(mockOrganizationId);
  });

  describe('Inicialización', () => {
    it('debe inicializar correctamente con organizationId', () => {
      expect(processor).toBeInstanceOf(AIContextProcessor);
    });

    it('debe usar threshold de confianza por defecto', () => {
      const defaultProcessor = new AIContextProcessor(mockOrganizationId);
      expect(defaultProcessor).toBeDefined();
    });

    it('debe aceptar threshold personalizado', () => {
      const customProcessor = new AIContextProcessor(mockOrganizationId, 0.8);
      expect(customProcessor).toBeDefined();
    });
  });

  describe('Procesamiento de conversación', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Necesito una cita urgente para mañana por la mañana',
        createdAt: new Date()
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Entiendo que necesitas una cita urgente. ¿Qué tipo de consulta necesitas?',
        createdAt: new Date()
      },
      {
        id: '3',
        role: 'user' as const,
        content: 'Es para un examen de la vista, tengo dolor de cabeza',
        createdAt: new Date()
      }
    ];

    const mockIntent: AppointmentIntent = {
      intent: 'book',
      specialty: 'optometría',
      preferredDate: '2024-12-20',
      preferredTime: '09:00',
      urgency: 'urgent',
      confidence: 0.8,
      missingInfo: [],
      suggestedResponse: 'Procesando solicitud de cita urgente'
    };

    it('debe procesar conversación y extraer contexto básico', async () => {
      const result = await processor.processConversation(
        mockMessages,
        mockIntent,
        { organizationId: mockOrganizationId }
      );

      expect(result.context).toBeDefined();
      expect(result.context.urgencyLevel).toBe('high');
      expect(result.context.suggestedDates).toContain('2024-12-20');
      expect(result.context.preferredTimeRange).toBe('morning');
    });

    it('debe generar recomendaciones basadas en contexto', async () => {
      const result = await processor.processConversation(
        mockMessages,
        mockIntent,
        { organizationId: mockOrganizationId }
      );

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.suggestedDates).toHaveLength(1);
      expect(result.recommendations.suggestedDates[0].date).toBe('2024-12-20');
      expect(result.recommendations.suggestedDates[0].confidence).toBeGreaterThan(0.5);
    });

    it('debe determinar próximas acciones apropiadas', async () => {
      const result = await processor.processConversation(
        mockMessages,
        mockIntent,
        { organizationId: mockOrganizationId }
      );

      expect(result.nextActions).toContain('show_date_suggestions');
      expect(result.nextActions).toContain('prioritize_earliest_available');
      expect(result.nextActions).toContain('transition_to_visual');
    });

    it('debe decidir correctamente sobre transición a visual', async () => {
      const result = await processor.processConversation(
        mockMessages,
        mockIntent,
        { organizationId: mockOrganizationId }
      );

      expect(result.shouldTransitionToVisual).toBe(true);
    });
  });

  describe('Extracción de contexto médico', () => {
    it('debe detectar indicadores de urgencia', async () => {
      const urgentMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Tengo dolor muy fuerte en los ojos, es urgente',
          createdAt: new Date()
        }
      ];

      const result = await processor.processConversation(
        urgentMessages,
        undefined,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.medicalContext?.urgencyIndicators).toContain('urgente');
      expect(result.context.medicalContext?.urgencyIndicators).toContain('dolor');
    });

    it('debe categorizar tipo de seguimiento', async () => {
      const routineMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Necesito un control de rutina para mis lentes',
          createdAt: new Date()
        }
      ];

      const result = await processor.processConversation(
        routineMessages,
        undefined,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.medicalContext?.followUpType).toBe('routine');
    });
  });

  describe('Análisis de flexibilidad', () => {
    it('debe detectar alta flexibilidad', async () => {
      const flexibleMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Cualquier día me viene bien, soy muy flexible con los horarios',
          createdAt: new Date()
        }
      ];

      const result = await processor.processConversation(
        flexibleMessages,
        undefined,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.flexibilityLevel).toBe('very-flexible');
    });

    it('debe detectar baja flexibilidad', async () => {
      const rigidMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Solo puedo el martes a las 3 PM exactamente',
          createdAt: new Date()
        }
      ];

      const result = await processor.processConversation(
        rigidMessages,
        undefined,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.flexibilityLevel).toBe('rigid');
    });
  });

  describe('Generación de explicaciones', () => {
    it('debe generar explicaciones contextuales', async () => {
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Prefiero horarios de mañana porque trabajo en la tarde',
          createdAt: new Date()
        }
      ];

      const intent: AppointmentIntent = {
        intent: 'book',
        preferredTime: '09:00',
        confidence: 0.8,
        missingInfo: [],
        suggestedResponse: 'Procesando preferencia de horario'
      };

      const result = await processor.processConversation(
        messages,
        intent,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.explanations?.timeReason).toContain('mañana');
    });

    it('debe incluir razones de urgencia cuando aplique', async () => {
      const urgentMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Es una emergencia, necesito atención inmediata',
          createdAt: new Date()
        }
      ];

      const urgentIntent: AppointmentIntent = {
        intent: 'book',
        urgency: 'urgent',
        confidence: 0.9,
        missingInfo: [],
        suggestedResponse: 'Procesando solicitud urgente'
      };

      const result = await processor.processConversation(
        urgentMessages,
        urgentIntent,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.explanations?.urgencyReason).toContain('urgencia');
    });
  });

  describe('Métricas de confianza', () => {
    it('debe calcular métricas de confianza apropiadas', async () => {
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Quiero una cita el viernes a las 2 PM con el Dr. García',
          createdAt: new Date()
        }
      ];

      const specificIntent: AppointmentIntent = {
        intent: 'book',
        preferredDate: '2024-12-20',
        preferredTime: '14:00',
        doctorName: 'Dr. García',
        confidence: 0.9,
        missingInfo: [],
        suggestedResponse: 'Procesando solicitud específica'
      };

      const result = await processor.processConversation(
        messages,
        specificIntent,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.confidence?.overall).toBeGreaterThan(0.7);
      expect(result.context.confidence?.datePreference).toBeGreaterThan(0.7);
      expect(result.context.confidence?.timePreference).toBeGreaterThan(0.7);
    });

    it('debe tener baja confianza con información incompleta', async () => {
      const vagueMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Tal vez necesite una cita',
          createdAt: new Date()
        }
      ];

      const result = await processor.processConversation(
        vagueMessages,
        undefined,
        { organizationId: mockOrganizationId }
      );

      expect(result.context.confidence?.overall).toBeLessThan(0.5);
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar conversaciones vacías', async () => {
      const result = await processor.processConversation(
        [],
        undefined,
        { organizationId: mockOrganizationId }
      );

      expect(result.context).toBeDefined();
      expect(result.shouldTransitionToVisual).toBe(true); // Fallback behavior
    });

    it('debe proporcionar contexto de fallback en caso de error', async () => {
      // Simular error interno
      const invalidMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: null as any, // Contenido inválido
          createdAt: new Date()
        }
      ];

      const result = await processor.processConversation(
        invalidMessages,
        undefined,
        { organizationId: mockOrganizationId }
      );

      expect(result.context).toBeDefined();
      expect(result.context.urgencyLevel).toBe('medium');
      expect(result.context.flexibilityLevel).toBe('flexible');
    });
  });

  describe('Metadatos de conversación', () => {
    it('debe incluir metadatos de conversación', async () => {
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Necesito una cita',
          createdAt: new Date()
        }
      ];

      const result = await processor.processConversation(
        messages,
        undefined,
        { organizationId: mockOrganizationId, userId: 'user-123' }
      );

      expect(result.context.conversationMetadata).toBeDefined();
      expect(result.context.conversationMetadata?.messageCount).toBeGreaterThan(0);
      expect(result.context.conversationMetadata?.extractedAt).toBeDefined();
      expect(result.context.conversationMetadata?.lastUpdated).toBeDefined();
    });
  });

  describe('Integración con threshold de confianza', () => {
    it('debe respetar threshold personalizado para transición', async () => {
      const highThresholdProcessor = new AIContextProcessor(mockOrganizationId, 0.9);
      
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Quizás necesite una cita',
          createdAt: new Date()
        }
      ];

      const lowConfidenceIntent: AppointmentIntent = {
        intent: 'book',
        confidence: 0.5,
        missingInfo: ['date', 'time'],
        suggestedResponse: 'Necesito más información'
      };

      const result = await highThresholdProcessor.processConversation(
        messages,
        lowConfidenceIntent,
        { organizationId: mockOrganizationId }
      );

      expect(result.shouldTransitionToVisual).toBe(false);
      expect(result.nextActions).toContain('request_clarification');
    });
  });
});
