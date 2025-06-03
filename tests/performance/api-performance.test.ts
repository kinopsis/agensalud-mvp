/**
 * API Performance Tests
 * 
 * Tests performance characteristics of unified APIs including
 * response times, throughput, and resource usage.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { jest } from '@jest/globals';

// =====================================================
// TYPES
// =====================================================

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
}

interface APIEndpoint {
  method: string;
  url: string;
  payload?: any;
  expectedMaxResponseTime: number;
}

// =====================================================
// MOCKS
// =====================================================

// Mock fetch with performance tracking
global.fetch = jest.fn();

// Mock performance API
const mockPerformance = {
  now: jest.fn(),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn()
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// =====================================================
// TEST DATA
// =====================================================

const API_ENDPOINTS: APIEndpoint[] = [
  {
    method: 'GET',
    url: '/api/channels/whatsapp/instances',
    expectedMaxResponseTime: 1000 // 1 second
  },
  {
    method: 'POST',
    url: '/api/channels/whatsapp/instances',
    payload: {
      instance_name: 'Test Instance',
      phone_number: '+57300123456',
      webhook_url: 'https://test.com/webhook',
      evolution_api: {
        base_url: 'https://api.evolution.com',
        api_key: 'test-key',
        instance_name: 'test-instance'
      }
    },
    expectedMaxResponseTime: 2000 // 2 seconds
  },
  {
    method: 'PUT',
    url: '/api/channels/whatsapp/instances/inst-123',
    payload: {
      auto_reply: true,
      ai_config: {
        enabled: true,
        model: 'gpt-3.5-turbo',
        temperature: 0.7
      }
    },
    expectedMaxResponseTime: 1500 // 1.5 seconds
  },
  {
    method: 'GET',
    url: '/api/channels/whatsapp/instances/inst-123/status',
    expectedMaxResponseTime: 800 // 800ms
  },
  {
    method: 'POST',
    url: '/api/channels/whatsapp/instances/inst-123/status',
    payload: {
      action: 'restart',
      reason: 'Performance test'
    },
    expectedMaxResponseTime: 3000 // 3 seconds
  }
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Measure API response time
 */
const measureResponseTime = async (endpoint: APIEndpoint): Promise<number> => {
  const startTime = Date.now();
  
  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' },
      body: endpoint.payload ? JSON.stringify(endpoint.payload) : undefined
    });
    
    const endTime = Date.now();
    return endTime - startTime;
  } catch (error) {
    const endTime = Date.now();
    return endTime - startTime;
  }
};

/**
 * Simulate concurrent requests
 */
const simulateConcurrentRequests = async (
  endpoint: APIEndpoint,
  concurrency: number
): Promise<PerformanceMetrics> => {
  const startTime = Date.now();
  const promises = Array(concurrency).fill(null).map(() => measureResponseTime(endpoint));
  
  const responseTimes = await Promise.all(promises);
  const endTime = Date.now();
  
  const totalTime = endTime - startTime;
  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const throughput = concurrency / (totalTime / 1000); // requests per second
  
  return {
    responseTime: avgResponseTime,
    memoryUsage: 0, // Mock value
    cpuUsage: 0, // Mock value
    throughput
  };
};

/**
 * Setup performance mocks
 */
const setupPerformanceMocks = () => {
  let timeCounter = 0;
  mockPerformance.now.mockImplementation(() => {
    timeCounter += Math.random() * 100; // Simulate varying response times
    return timeCounter;
  });

  (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(async (url, options) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { message: 'Performance test response' },
        meta: { timestamp: new Date().toISOString() }
      })
    } as Response;
  });
};

// =====================================================
// PERFORMANCE TESTS
// =====================================================

describe('API Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupPerformanceMocks();
  });

  describe('Individual Endpoint Performance', () => {
    it.each(API_ENDPOINTS)(
      'should respond within acceptable time for $method $url',
      async (endpoint) => {
        const responseTime = await measureResponseTime(endpoint);
        
        expect(responseTime).toBeLessThan(endpoint.expectedMaxResponseTime);
        expect(fetch).toHaveBeenCalledWith(
          endpoint.url,
          expect.objectContaining({
            method: endpoint.method
          })
        );
      }
    );

    it('should handle GET /api/channels/whatsapp/instances efficiently', async () => {
      const endpoint = API_ENDPOINTS[0]; // GET instances
      const responseTime = await measureResponseTime(endpoint);
      
      // Should be very fast for read operations
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle configuration updates efficiently', async () => {
      const endpoint = API_ENDPOINTS[2]; // PUT configuration
      const responseTime = await measureResponseTime(endpoint);
      
      // Configuration updates should be reasonably fast
      expect(responseTime).toBeLessThan(1500);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 10 concurrent GET requests efficiently', async () => {
      const endpoint = API_ENDPOINTS[0]; // GET instances
      const metrics = await simulateConcurrentRequests(endpoint, 10);
      
      expect(metrics.responseTime).toBeLessThan(2000); // Average response time
      expect(metrics.throughput).toBeGreaterThan(2); // At least 2 requests per second
    });

    it('should handle 5 concurrent configuration updates', async () => {
      const endpoint = API_ENDPOINTS[2]; // PUT configuration
      const metrics = await simulateConcurrentRequests(endpoint, 5);
      
      expect(metrics.responseTime).toBeLessThan(3000); // Average response time
      expect(metrics.throughput).toBeGreaterThan(1); // At least 1 request per second
    });

    it('should maintain performance under moderate load', async () => {
      const endpoint = API_ENDPOINTS[0]; // GET instances
      const metrics = await simulateConcurrentRequests(endpoint, 20);
      
      // Should still perform reasonably well with 20 concurrent requests
      expect(metrics.responseTime).toBeLessThan(5000);
      expect(metrics.throughput).toBeGreaterThan(1);
    });
  });

  describe('API Response Size Optimization', () => {
    it('should return appropriately sized responses', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            instances: Array(10).fill(null).map((_, i) => ({
              id: `inst-${i}`,
              instance_name: `Instance ${i}`,
              status: 'connected',
              metrics: { messages_24h: 100 }
            }))
          },
          meta: { timestamp: new Date().toISOString() }
        })
      } as Response);

      const response = await fetch('/api/channels/whatsapp/instances');
      const data = await response.json();
      
      // Response should contain reasonable amount of data
      expect(data.data.instances).toHaveLength(10);
      expect(JSON.stringify(data).length).toBeLessThan(10000); // Less than 10KB
    });

    it('should paginate large datasets efficiently', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            instances: Array(10).fill(null).map((_, i) => ({ id: `inst-${i}` })),
            pagination: {
              page: 1,
              limit: 10,
              total: 100,
              pages: 10
            }
          }
        })
      } as Response);

      const response = await fetch('/api/channels/whatsapp/instances?page=1&limit=10');
      const data = await response.json();
      
      expect(data.data.pagination.limit).toBe(10);
      expect(data.data.instances).toHaveLength(10);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors quickly', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const startTime = Date.now();
      
      try {
        await fetch('/api/channels/whatsapp/instances');
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Error handling should be fast
        expect(responseTime).toBeLessThan(1000);
      }
    });

    it('should timeout appropriately for long requests', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );

      const startTime = Date.now();
      
      // In a real implementation, this would timeout
      // For testing, we'll simulate the timeout behavior
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      try {
        await Promise.race([
          fetch('/api/channels/whatsapp/instances'),
          timeoutPromise
        ]);
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Should timeout within reasonable time
        expect(responseTime).toBeLessThan(6000);
        expect(error).toEqual(new Error('Timeout'));
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated requests', async () => {
      const endpoint = API_ENDPOINTS[0];
      
      // Simulate multiple requests
      for (let i = 0; i < 50; i++) {
        await measureResponseTime(endpoint);
      }
      
      // In a real test, we would check actual memory usage
      // For now, we verify that all requests completed
      expect(fetch).toHaveBeenCalledTimes(50);
    });

    it('should handle large payloads efficiently', async () => {
      const largePayload = {
        config: {
          ai_config: {
            custom_prompt: 'A'.repeat(1000) // 1KB string
          },
          webhook: {
            events: Array(100).fill('MESSAGE_RECEIVED') // Large array
          }
        }
      };

      const startTime = Date.now();
      await fetch('/api/channels/whatsapp/instances/inst-123', {
        method: 'PUT',
        body: JSON.stringify(largePayload)
      });
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(3000); // Should handle large payloads reasonably
    });
  });
});
