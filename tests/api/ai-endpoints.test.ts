/**
 * API Integration Tests - AI Endpoints
 * Tests AI chat and appointment booking APIs
 */

import { NextRequest } from 'next/server';
import { POST as chatHandler } from '@/app/api/ai/chat/route';
import { POST as appointmentsHandler } from '@/app/api/ai/appointments/route';
import { createMockAISDK } from '../utils/test-helpers';
import { MOCK_USERS, MOCK_ORGANIZATIONS } from '../fixtures/optical-simulation-data';

// Mock AI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}));

jest.mock('ai', () => createMockAISDK());

describe('AI API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/ai/chat', () => {
    it('should handle basic chat requests', async () => {
      const { streamText } = require('ai');
      
      const requestBody = {
        messages: [
          { role: 'user', content: 'Hola, necesito ayuda con una cita médica' }
        ],
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await chatHandler(request);

      expect(streamText).toHaveBeenCalledWith({
        model: 'mocked-model',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Hola, necesito ayuda con una cita médica' })
        ]),
        temperature: 0.7,
        maxTokens: 500,
      });

      expect(response).toBeInstanceOf(Response);
    });

    it('should validate required fields', async () => {
      const requestBody = {
        // Missing messages array
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await chatHandler(request);

      expect(response.status).toBe(400);
      
      const responseText = await response.text();
      expect(responseText).toContain('Messages array is required');
    });

    it('should include system prompt for medical context', async () => {
      const { streamText } = require('ai');
      
      const requestBody = {
        messages: [
          { role: 'user', content: 'Necesito una cita con cardiología' }
        ],
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await chatHandler(request);

      const callArgs = streamText.mock.calls[0][0];
      const systemMessage = callArgs.messages.find((msg: any) => msg.role === 'system');
      
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('asistente médico');
      expect(systemMessage.content).toContain('AgentSalud');
    });

    it('should handle conversation context', async () => {
      const { streamText } = require('ai');
      
      const requestBody = {
        messages: [
          { role: 'user', content: 'Hola' },
          { role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte?' },
          { role: 'user', content: 'Necesito una cita con cardiología' }
        ],
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await chatHandler(request);

      const callArgs = streamText.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(4); // system + 3 conversation messages
    });
  });

  describe('/api/ai/appointments', () => {
    it('should extract appointment intent from natural language', async () => {
      const { generateObject } = require('ai');
      
      const requestBody = {
        message: 'Necesito una cita con cardiología para la próxima semana',
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await appointmentsHandler(request);
      const result = await response.json();

      expect(generateObject).toHaveBeenCalledWith({
        model: 'mocked-model',
        prompt: expect.stringContaining('Necesito una cita con cardiología para la próxima semana'),
        schema: expect.any(Object),
      });

      expect(result.success).toBe(true);
      expect(result.intent).toMatchObject({
        intent: 'book',
        specialty: 'cardiología',
        confidence: 0.9
      });
    });

    it('should validate message parameter', async () => {
      const requestBody = {
        // Missing message
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await appointmentsHandler(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Message is required');
    });

    it('should handle different appointment intents', async () => {
      const testCases = [
        {
          message: 'Quiero agendar una cita con oftalmología',
          expectedIntent: 'book'
        },
        {
          message: 'Necesito cancelar mi cita del martes',
          expectedIntent: 'cancel'
        },
        {
          message: 'Quiero cambiar mi cita para otro día',
          expectedIntent: 'reschedule'
        },
        {
          message: '¿Qué citas tengo programadas?',
          expectedIntent: 'inquire'
        }
      ];

      for (const testCase of testCases) {
        const { generateObject } = require('ai');
        generateObject.mockResolvedValueOnce({
          object: {
            intent: testCase.expectedIntent,
            specialty: 'oftalmología',
            confidence: 0.8,
            missingInfo: [],
            suggestedResponse: 'Respuesta de prueba'
          }
        });

        const requestBody = {
          message: testCase.message,
          organizationId: 'org_visualcare_001',
          userId: 'user_maria_001'
        };

        const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await appointmentsHandler(request);
        const result = await response.json();

        expect(result.intent.intent).toBe(testCase.expectedIntent);
      }
    });

    it('should extract medical specialties correctly', async () => {
      const specialties = [
        'cardiología',
        'oftalmología',
        'dermatología',
        'neurología',
        'pediatría'
      ];

      for (const specialty of specialties) {
        const { generateObject } = require('ai');
        generateObject.mockResolvedValueOnce({
          object: {
            intent: 'book',
            specialty: specialty,
            confidence: 0.9,
            missingInfo: [],
            suggestedResponse: `Te ayudo a agendar una cita con ${specialty}.`
          }
        });

        const requestBody = {
          message: `Necesito una cita con ${specialty}`,
          organizationId: 'org_visualcare_001',
          userId: 'user_maria_001'
        };

        const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await appointmentsHandler(request);
        const result = await response.json();

        expect(result.intent.specialty).toBe(specialty);
      }
    });

    it('should handle low confidence responses', async () => {
      const { generateObject } = require('ai');
      generateObject.mockResolvedValueOnce({
        object: {
          intent: 'unknown',
          confidence: 0.3,
          missingInfo: ['specialty', 'preferred_date'],
          suggestedResponse: 'No estoy seguro de entender. ¿Podrías ser más específico?'
        }
      });

      const requestBody = {
        message: 'Algo sobre citas',
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await appointmentsHandler(request);
      const result = await response.json();

      expect(result.intent.confidence).toBeLessThan(0.5);
      expect(result.intent.missingInfo).toContain('specialty');
      expect(result.response).toContain('más específico');
    });

    it('should handle API errors gracefully', async () => {
      const { generateObject } = require('ai');
      generateObject.mockRejectedValueOnce(new Error('AI service unavailable'));

      const requestBody = {
        message: 'Necesito una cita',
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await appointmentsHandler(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to process appointment request');
    });
  });

  describe('AI Integration with Organization Context', () => {
    it('should respect organization boundaries in AI responses', async () => {
      const org1User = MOCK_USERS.find(u => u.organization_id === 'org_visualcare_001');
      const org2Id = 'org_competitor_001';

      const requestBody = {
        message: 'Necesito una cita',
        organizationId: org2Id,
        userId: org1User?.id
      };

      const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await appointmentsHandler(request);
      const result = await response.json();

      // Should still process but with organization context
      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(org2Id);
    });

    it('should include organization-specific services in AI context', async () => {
      const { generateObject } = require('ai');
      
      const requestBody = {
        message: 'Qué servicios tienen disponibles',
        organizationId: 'org_visualcare_001',
        userId: 'user_maria_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/appointments', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await appointmentsHandler(request);

      const callArgs = generateObject.mock.calls[0][0];
      expect(callArgs.prompt).toContain('servicios');
    });
  });
});
