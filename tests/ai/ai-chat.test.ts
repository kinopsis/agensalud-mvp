/**
 * @jest-environment jsdom
 */

import { NextRequest } from 'next/server';
import { POST as chatHandler } from '@/app/api/ai/chat/route';
import { POST as appointmentsHandler } from '@/app/api/ai/appointments/route';

// Mock the AI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}));

jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    toAIStreamResponse: jest.fn(() => new Response('Mocked AI response'))
  })),
  generateObject: jest.fn(() => ({
    object: {
      intent: 'book',
      specialty: 'cardiología',
      preferredDate: 'próxima semana',
      preferredTime: 'mañana',
      confidence: 0.9,
      missingInfo: [],
      suggestedResponse: 'Te ayudo a agendar una cita con cardiología.'
    }
  }))
}));

describe('AI Chat API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/ai/chat', () => {
    it('should handle chat messages successfully', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          messages: [
            { role: 'user', content: 'Necesito una cita con cardiología' }
          ],
          organizationId: 'test-org',
          userId: 'test-user'
        })
      } as unknown as NextRequest;

      const response = await chatHandler(mockRequest);
      
      expect(response).toBeInstanceOf(Response);
      expect(mockRequest.json).toHaveBeenCalled();
    });

    it('should return 400 for missing messages', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          organizationId: 'test-org',
          userId: 'test-user'
        })
      } as unknown as NextRequest;

      const response = await chatHandler(mockRequest);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid messages format', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          messages: 'invalid-format',
          organizationId: 'test-org',
          userId: 'test-user'
        })
      } as unknown as NextRequest;

      const response = await chatHandler(mockRequest);
      
      expect(response.status).toBe(400);
    });
  });

  describe('/api/ai/appointments', () => {
    it('should extract appointment intent successfully', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 'Necesito una cita con cardiología para la próxima semana',
          organizationId: 'test-org',
          userId: 'test-user'
        })
      } as unknown as NextRequest;

      const response = await appointmentsHandler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.intent.intent).toBe('book');
      expect(data.intent.specialty).toBe('cardiología');
      expect(data.intent.confidence).toBe(0.9);
    });

    it('should return 400 for missing message', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          organizationId: 'test-org',
          userId: 'test-user'
        })
      } as unknown as NextRequest;

      const response = await appointmentsHandler(mockRequest);
      
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid message format', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message: 123, // Invalid type
          organizationId: 'test-org',
          userId: 'test-user'
        })
      } as unknown as NextRequest;

      const response = await appointmentsHandler(mockRequest);
      
      expect(response.status).toBe(400);
    });
  });
});

describe('AI Intent Recognition', () => {
  const testCases = [
    {
      message: 'Quiero agendar una cita con cardiología',
      expectedIntent: 'book',
      expectedSpecialty: 'cardiología'
    },
    {
      message: 'Necesito cancelar mi cita',
      expectedIntent: 'cancel',
      expectedSpecialty: undefined
    },
    {
      message: 'Quiero cambiar mi cita para otro día',
      expectedIntent: 'reschedule',
      expectedSpecialty: undefined
    },
    {
      message: '¿Qué especialidades tienen disponibles?',
      expectedIntent: 'inquire',
      expectedSpecialty: undefined
    }
  ];

  testCases.forEach(({ message, expectedIntent, expectedSpecialty }) => {
    it(`should recognize intent "${expectedIntent}" for message: "${message}"`, async () => {
      // Mock the AI response for this specific test
      const { generateObject } = require('ai');
      generateObject.mockResolvedValueOnce({
        object: {
          intent: expectedIntent,
          specialty: expectedSpecialty,
          confidence: 0.8,
          missingInfo: [],
          suggestedResponse: 'Mocked response'
        }
      });

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          message,
          organizationId: 'test-org',
          userId: 'test-user'
        })
      } as unknown as NextRequest;

      const response = await appointmentsHandler(mockRequest);
      const data = await response.json();
      
      expect(data.intent.intent).toBe(expectedIntent);
      if (expectedSpecialty) {
        expect(data.intent.specialty).toBe(expectedSpecialty);
      }
    });
  });
});

describe('AI Error Handling', () => {
  it('should handle AI service errors gracefully', async () => {
    // Mock AI service to throw an error
    const { streamText } = require('ai');
    streamText.mockRejectedValueOnce(new Error('AI service unavailable'));

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        messages: [
          { role: 'user', content: 'Test message' }
        ]
      })
    } as unknown as NextRequest;

    const response = await chatHandler(mockRequest);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to process chat request');
  });

  it('should handle appointment extraction errors gracefully', async () => {
    // Mock AI service to throw an error
    const { generateObject } = require('ai');
    generateObject.mockRejectedValueOnce(new Error('AI extraction failed'));

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        message: 'Test message',
        organizationId: 'test-org',
        userId: 'test-user'
      })
    } as unknown as NextRequest;

    const response = await appointmentsHandler(mockRequest);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to process appointment request');
  });
});
