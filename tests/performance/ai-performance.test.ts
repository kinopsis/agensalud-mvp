/**
 * Performance Tests for AI Features
 * Tests response times, concurrent users, and system load
 */

import { NextRequest } from 'next/server';
import { POST as chatHandler } from '@/app/api/ai/chat/route';
import { POST as appointmentsHandler } from '@/app/api/ai/appointments/route';
import { measurePerformance, createMockAISDK } from '../utils/test-helpers';
import { MOCK_USERS, MOCK_ORGANIZATIONS } from '../fixtures/optical-simulation-data';

// Mock AI SDK with performance simulation
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model')
}));

jest.mock('ai', () => ({
  ...createMockAISDK(),
  streamText: jest.fn(() => {
    // Simulate AI processing time
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          toAIStreamResponse: jest.fn(() => new Response('Mocked AI response'))
        });
      }, Math.random() * 1000 + 500); // 500-1500ms response time
    });
  }),
  generateObject: jest.fn(() => {
    // Simulate AI processing time
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          object: {
            intent: 'book',
            specialty: 'cardiología',
            confidence: 0.9,
            missingInfo: [],
            suggestedResponse: 'Te ayudo a agendar una cita.'
          }
        });
      }, Math.random() * 800 + 300); // 300-1100ms response time
    });
  })
}));

describe('AI Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Response Time Benchmarks', () => {
    it('should respond to chat requests within acceptable time limits', async () => {
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

      const { duration } = await measurePerformance(async () => {
        return await chatHandler(request);
      });

      // Should respond within 2 seconds
      expect(duration).toBeLessThan(2000);
      
      // Log performance for monitoring
      console.log(`Chat API response time: ${duration.toFixed(2)}ms`);
    });

    it('should process appointment requests within acceptable time limits', async () => {
      const requestBody = {
        message: 'Necesito una cita con cardiología para mañana',
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

      const { duration } = await measurePerformance(async () => {
        return await appointmentsHandler(request);
      });

      // Should process within 1.5 seconds
      expect(duration).toBeLessThan(1500);
      
      console.log(`Appointment processing time: ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance with complex queries', async () => {
      const complexQuery = `
        Hola, necesito agendar una cita urgente con cardiología para mi padre 
        que tiene 75 años y ha estado experimentando dolor en el pecho. 
        Preferiblemente mañana por la mañana, pero si no es posible, 
        cualquier día de esta semana estaría bien. También me gustaría 
        saber si necesita alguna preparación especial para el examen.
      `;

      const requestBody = {
        message: complexQuery,
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

      const { duration } = await measurePerformance(async () => {
        return await appointmentsHandler(request);
      });

      // Complex queries should still process within 2 seconds
      expect(duration).toBeLessThan(2000);
      
      console.log(`Complex query processing time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent User Handling', () => {
    it('should handle multiple simultaneous chat requests', async () => {
      const concurrentUsers = 10;
      const requests = Array.from({ length: concurrentUsers }, (_, i) => {
        const requestBody = {
          messages: [
            { role: 'user', content: `Usuario ${i + 1}: Necesito una cita` }
          ],
          organizationId: 'org_visualcare_001',
          userId: `user_${i + 1}`
        };

        return new NextRequest('http://localhost:3000/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });

      const { duration, result } = await measurePerformance(async () => {
        return await Promise.all(requests.map(req => chatHandler(req)));
      });

      // All requests should complete
      expect(result).toHaveLength(concurrentUsers);
      
      // Should handle concurrent requests within reasonable time
      expect(duration).toBeLessThan(5000);
      
      console.log(`${concurrentUsers} concurrent chat requests: ${duration.toFixed(2)}ms`);
    });

    it('should handle multiple appointment processing requests', async () => {
      const concurrentRequests = 5;
      const appointmentMessages = [
        'Necesito una cita con cardiología',
        'Quiero agendar con oftalmología',
        'Necesito cancelar mi cita',
        'Cambiar mi cita para otro día',
        'Consultar mis citas programadas'
      ];

      const requests = appointmentMessages.map((message, i) => {
        const requestBody = {
          message,
          organizationId: 'org_visualcare_001',
          userId: `user_${i + 1}`
        };

        return new NextRequest('http://localhost:3000/api/ai/appointments', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      });

      const { duration, result } = await measurePerformance(async () => {
        return await Promise.all(requests.map(req => appointmentsHandler(req)));
      });

      // All requests should complete successfully
      expect(result).toHaveLength(concurrentRequests);
      
      // Should handle concurrent processing within reasonable time
      expect(duration).toBeLessThan(3000);
      
      console.log(`${concurrentRequests} concurrent appointment requests: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory with repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const requestBody = {
          messages: [
            { role: 'user', content: `Iteración ${i}: Necesito una cita` }
          ],
          organizationId: 'org_visualcare_001',
          userId: 'user_test'
        };

        const request = new NextRequest('http://localhost:3000/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        await chatHandler(request);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase after ${iterations} requests: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle large conversation histories efficiently', async () => {
      const largeConversation = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Mensaje ${i + 1}: ${i % 2 === 0 ? 'Pregunta del usuario' : 'Respuesta del asistente'}`
      }));

      const requestBody = {
        messages: largeConversation,
        organizationId: 'org_visualcare_001',
        userId: 'user_test'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { duration } = await measurePerformance(async () => {
        return await chatHandler(request);
      });

      // Should handle large conversations within reasonable time
      expect(duration).toBeLessThan(3000);
      
      console.log(`Large conversation (100 messages) processing time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Error Recovery Performance', () => {
    it('should fail fast on invalid requests', async () => {
      const invalidRequestBody = {
        // Missing required fields
        organizationId: 'org_visualcare_001'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { duration } = await measurePerformance(async () => {
        return await chatHandler(request);
      });

      // Should fail quickly (within 100ms)
      expect(duration).toBeLessThan(100);
      
      console.log(`Invalid request failure time: ${duration.toFixed(2)}ms`);
    });

    it('should handle AI service timeouts gracefully', async () => {
      // Mock AI service timeout
      const { streamText } = require('ai');
      streamText.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('AI service timeout'));
          }, 100);
        });
      });

      const requestBody = {
        messages: [
          { role: 'user', content: 'Test timeout scenario' }
        ],
        organizationId: 'org_visualcare_001',
        userId: 'user_test'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { duration } = await measurePerformance(async () => {
        try {
          return await chatHandler(request);
        } catch (error) {
          return new Response('Error handled', { status: 500 });
        }
      });

      // Should handle timeout quickly
      expect(duration).toBeLessThan(500);
      
      console.log(`Timeout handling time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Scalability Metrics', () => {
    it('should maintain performance under increasing load', async () => {
      const loadLevels = [1, 5, 10, 20];
      const results: Array<{ load: number; avgDuration: number }> = [];

      for (const load of loadLevels) {
        const requests = Array.from({ length: load }, (_, i) => {
          const requestBody = {
            message: `Load test ${i + 1}`,
            organizationId: 'org_visualcare_001',
            userId: `user_${i + 1}`
          };

          return new NextRequest('http://localhost:3000/api/ai/appointments', {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
              'Content-Type': 'application/json',
            },
          });
        });

        const { duration } = await measurePerformance(async () => {
          return await Promise.all(requests.map(req => appointmentsHandler(req)));
        });

        const avgDuration = duration / load;
        results.push({ load, avgDuration });

        console.log(`Load ${load}: Average ${avgDuration.toFixed(2)}ms per request`);
      }

      // Performance should not degrade significantly
      const baselineAvg = results[0].avgDuration;
      const highLoadAvg = results[results.length - 1].avgDuration;
      const degradationRatio = highLoadAvg / baselineAvg;

      // Performance degradation should be less than 3x
      expect(degradationRatio).toBeLessThan(3);
    });
  });
});
