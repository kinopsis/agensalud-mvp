/**
 * @jest-environment jsdom
 */

import { SmartSuggestionsEngine } from '@/lib/ai/SmartSuggestionsEngine';
import type { AIContext } from '@/lib/ai/AIContextProcessor';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('SmartSuggestionsEngine - Filtrado de Horarios Crítico', () => {
  let engine: SmartSuggestionsEngine;
  const mockOrganizationId = 'test-org-123';

  beforeEach(() => {
    engine = new SmartSuggestionsEngine(mockOrganizationId);
    
    // Mock current time to 2025-01-27 14:00 (2:00 PM)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-27T14:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockAIContext: AIContext = {
    urgencyLevel: 'medium',
    preferredTimeRange: 'afternoon',
    suggestedDates: ['2025-01-27', '2025-01-28'],
    confidence: {
      overall: 0.8,
      timePreference: 0.7,
      datePreference: 0.9
    }
  };

  describe('Filtrado de horarios pasados con regla de 4 horas', () => {
    it('debe filtrar correctamente las opciones antes de generar sugerencias', async () => {
      const optionsWithPastTimes = [
        { date: '2025-01-27', time: '10:00', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' },
        { date: '2025-01-27', time: '13:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' },
        { date: '2025-01-27', time: '18:00', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' }, // Válido: 4+ horas
        { date: '2025-01-28', time: '09:00', available: true, doctorId: 'doc4', doctorName: 'Dr. Test 4' }  // Válido: día futuro
      ];

      const result = await engine.generateSuggestions(mockAIContext, optionsWithPastTimes);

      // Debe procesar solo las opciones válidas (2 de 4)
      expect(result.totalAnalyzed).toBe(2);

      // Si hay sugerencias, no deben incluir horarios pasados
      if (result.suggestions.length > 0) {
        const suggestionTimes = result.suggestions.map(s => s.data.time);
        expect(suggestionTimes).not.toContain('10:00');
        expect(suggestionTimes).not.toContain('13:00');
      }
    });

    it('debe aplicar regla de 4 horas mínimas para el día actual', async () => {
      const currentDayOptions = [
        { date: '2025-01-27', time: '15:00', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' }, // 1 hora - rechazar
        { date: '2025-01-27', time: '16:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' }, // 2 horas - rechazar
        { date: '2025-01-27', time: '17:00', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' }, // 3 horas - rechazar
        { date: '2025-01-27', time: '18:00', available: true, doctorId: 'doc4', doctorName: 'Dr. Test 4' }, // 4 horas - aceptar
        { date: '2025-01-27', time: '19:00', available: true, doctorId: 'doc5', doctorName: 'Dr. Test 5' }  // 5 horas - aceptar
      ];

      const result = await engine.generateSuggestions(mockAIContext, currentDayOptions);

      // Solo debe procesar horarios con 4+ horas de anticipación (2 de 5)
      expect(result.totalAnalyzed).toBe(2);
    });

    it('debe permitir todos los horarios para días futuros', async () => {
      const futureDayOptions = [
        { date: '2025-01-28', time: '08:00', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' },
        { date: '2025-01-28', time: '09:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' },
        { date: '2025-01-28', time: '10:00', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' },
        { date: '2025-01-29', time: '07:00', available: true, doctorId: 'doc4', doctorName: 'Dr. Test 4' }
      ];

      const result = await engine.generateSuggestions(mockAIContext, futureDayOptions);

      // Para días futuros, todos los horarios deben ser válidos
      expect(result.totalAnalyzed).toBe(futureDayOptions.length);
    });

    it('debe manejar fechas pasadas correctamente', async () => {
      const optionsWithPastDates = [
        { date: '2025-01-26', time: '10:00', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' }, // Ayer - rechazar
        { date: '2025-01-25', time: '15:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' }, // Anteayer - rechazar
        { date: '2025-01-27', time: '18:00', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' }, // Hoy válido
        { date: '2025-01-28', time: '09:00', available: true, doctorId: 'doc4', doctorName: 'Dr. Test 4' }  // Mañana válido
      ];

      const result = await engine.generateSuggestions(mockAIContext, optionsWithPastDates);

      // No debe incluir fechas pasadas
      const suggestionDates = result.suggestions.map(s => s.data.date);
      expect(suggestionDates).not.toContain('2025-01-26');
      expect(suggestionDates).not.toContain('2025-01-25');
    });

    it('debe retornar fallback cuando no hay opciones válidas', async () => {
      const invalidOptions = [
        { date: '2025-01-27', time: '10:00', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' }, // Pasado
        { date: '2025-01-27', time: '13:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' }, // Muy cerca
        { date: '2025-01-26', time: '15:00', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' }  // Fecha pasada
      ];

      const result = await engine.generateSuggestions(mockAIContext, invalidOptions);

      // Debe retornar resultado fallback con 0 opciones analizadas
      expect(result.totalAnalyzed).toBe(0);
      expect(result.confidence).toBe(0.3);
    });

    it('debe manejar opciones con datos faltantes', async () => {
      const optionsWithMissingData = [
        { date: '2025-01-28', time: '09:00', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' }, // Válido
        { date: '', time: '10:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' }, // Sin fecha
        { date: '2025-01-28', time: '', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' }, // Sin hora
        { available: true, doctorId: 'doc4', doctorName: 'Dr. Test 4' } // Sin fecha ni hora
      ];

      const result = await engine.generateSuggestions(mockAIContext, optionsWithMissingData);

      // Solo debe procesar opciones válidas
      expect(result.totalAnalyzed).toBe(1); // Solo la primera opción es válida
    });
  });

  describe('Casos edge del filtrado de tiempo', () => {
    it('debe manejar horarios exactamente en el límite de 4 horas', async () => {
      // Hora actual: 14:00, límite exacto: 18:00
      const borderlineOptions = [
        { date: '2025-01-27', time: '17:59', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' }, // 3h59m - rechazar
        { date: '2025-01-27', time: '18:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' }, // 4h00m - aceptar
        { date: '2025-01-27', time: '18:01', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' }  // 4h01m - aceptar
      ];

      const result = await engine.generateSuggestions(mockAIContext, borderlineOptions);

      // Solo debe procesar horarios con 4+ horas exactas (2 de 3)
      expect(result.totalAnalyzed).toBe(2);
    });

    it('debe manejar cambio de día a medianoche', async () => {
      // Simular hora actual: 23:00
      jest.setSystemTime(new Date('2025-01-27T23:00:00.000Z'));

      const midnightOptions = [
        { date: '2025-01-27', time: '23:30', available: true, doctorId: 'doc1', doctorName: 'Dr. Test' }, // 30min - rechazar
        { date: '2025-01-28', time: '00:00', available: true, doctorId: 'doc2', doctorName: 'Dr. Test 2' }, // Día siguiente - aceptar
        { date: '2025-01-28', time: '03:00', available: true, doctorId: 'doc3', doctorName: 'Dr. Test 3' }  // 4h después - aceptar
      ];

      const result = await engine.generateSuggestions(mockAIContext, midnightOptions);

      // Día siguiente debe ser válido independientemente de la hora
      expect(result.totalAnalyzed).toBe(2); // Solo las opciones del día siguiente
    });
  });
});
