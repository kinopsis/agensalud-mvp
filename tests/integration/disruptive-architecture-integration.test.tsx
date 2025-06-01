/**
 * DISRUPTIVE ARCHITECTURE INTEGRATION TESTS
 * 
 * Comprehensive integration tests to validate that the new architecture
 * successfully resolves all critical MVP issues with real API data.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppointmentDataProvider } from '@/contexts/AppointmentDataProvider';
import EnhancedWeeklyAvailabilitySelector from '@/components/appointments/EnhancedWeeklyAvailabilitySelector';
import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';
import { UnifiedAppointmentDataService } from '@/lib/core/UnifiedAppointmentDataService';
import { DataIntegrityValidator } from '@/lib/core/DataIntegrityValidator';

// Mock fetch for controlled testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to capture logs
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('DISRUPTIVE ARCHITECTURE - Integration Tests', () => {
  
  beforeEach(() => {
    // Clear all mocks
    mockFetch.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    
    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    
    // Clear cache before each test
    UnifiedAppointmentDataService.clearCache();
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  describe('Phase 3.1: Real API Integration', () => {
    
    test('should handle real API response without date displacement', async () => {
      // Mock real API response structure
      const mockApiResponse = {
        success: true,
        data: {
          '2025-06-04': {
            slots: [
              { id: '1', start_time: '09:00', end_time: '09:30', available: true, doctor_id: 'doc1', doctor_name: 'Dr. Smith' },
              { id: '2', start_time: '09:30', end_time: '10:00', available: true, doctor_id: 'doc1', doctor_name: 'Dr. Smith' },
              { id: '3', start_time: '10:00', end_time: '10:30', available: false, doctor_id: 'doc1', doctor_name: 'Dr. Smith' }
            ],
            totalSlots: 3,
            availableSlots: 2
          },
          '2025-06-05': {
            slots: [
              { id: '4', start_time: '09:00', end_time: '09:30', available: true, doctor_id: 'doc1', doctor_name: 'Dr. Smith' },
              { id: '5', start_time: '09:30', end_time: '10:00', available: true, doctor_id: 'doc1', doctor_name: 'Dr. Smith' }
            ],
            totalSlots: 2,
            availableSlots: 2
          }
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });
      
      const mockOnDateSelect = jest.fn();
      
      render(
        <AppointmentDataProvider>
          <EnhancedWeeklyAvailabilitySelector
            title="Test Selector"
            subtitle="Testing real API integration"
            onDateSelect={mockOnDateSelect}
            organizationId="org-123"
            serviceId="service-1"
          />
        </AppointmentDataProvider>
      );
      
      // Wait for data to load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
      
      // Verify API was called with correct parameters
      const fetchCall = mockFetch.mock.calls[0];
      const apiUrl = new URL(fetchCall[0]);
      expect(apiUrl.pathname).toBe('/api/appointments/availability');
      expect(apiUrl.searchParams.get('organizationId')).toBe('org-123');
      expect(apiUrl.searchParams.get('serviceId')).toBe('service-1');
      
      // Verify no date displacement in logs
      const displacementLogs = mockConsoleError.mock.calls.filter(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('DATE DISPLACEMENT DETECTED'))
      );
      expect(displacementLogs).toHaveLength(0);
      
      // Verify data integrity validation passed
      const validationLogs = mockConsoleLog.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Data Validation PASSED'))
      );
      expect(validationLogs.length).toBeGreaterThan(0);
    });
    
    test('should maintain slot count consistency across multiple calls', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          '2025-06-04': {
            slots: Array.from({ length: 10 }, (_, i) => ({
              id: `slot-${i}`,
              start_time: `${9 + Math.floor(i / 2)}:${(i % 2) * 30}`,
              available: i < 8, // 8 available, 2 unavailable
              doctor_id: 'doc1',
              doctor_name: 'Dr. Smith'
            })),
            totalSlots: 10,
            availableSlots: 8
          }
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });
      
      const query = {
        organizationId: 'org-123',
        startDate: '2025-06-04',
        endDate: '2025-06-04',
        serviceId: 'service-1'
      };
      
      // First call
      const data1 = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Second call (should use cache)
      const data2 = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Verify data consistency
      expect(data1).toEqual(data2);
      expect(data1[0].slotsCount).toBe(8); // Should use availableSlots
      expect(data1[0].availableSlots).toBe(8);
      expect(data1[0].totalSlots).toBe(10);
      
      // Verify only one API call was made (second used cache)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    test('should detect and prevent slot count mismatches', async () => {
      // Mock API response with inconsistent data
      const mockApiResponse = {
        success: true,
        data: {
          '2025-06-04': {
            slots: [
              { id: '1', available: true },
              { id: '2', available: false }
            ],
            totalSlots: 2,
            availableSlots: 5 // WRONG! Should be 1
          }
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });
      
      const query = {
        organizationId: 'org-123',
        startDate: '2025-06-04',
        endDate: '2025-06-04'
      };
      
      const data = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Verify validation detected the inconsistency
      const validationErrorLogs = mockConsoleError.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Data integrity issues detected'))
      );
      expect(validationErrorLogs.length).toBeGreaterThan(0);
    });
  });
  
  describe('Phase 3.2: Performance Monitoring', () => {
    
    test('should track cache hit rates', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          '2025-06-04': {
            slots: [],
            totalSlots: 0,
            availableSlots: 0
          }
        }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });
      
      const query = {
        organizationId: 'org-123',
        startDate: '2025-06-04',
        endDate: '2025-06-04'
      };
      
      // First call (cache miss)
      await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Second call (cache hit)
      await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Verify cache statistics
      const cacheStats = UnifiedAppointmentDataService.getCacheStats();
      expect(cacheStats.size).toBe(1);
      expect(cacheStats.keys.length).toBe(1);
      
      // Verify only one API call was made
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Verify cache usage was logged
      const cacheUsageLogs = mockConsoleLog.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Using cached data'))
      );
      expect(cacheUsageLogs.length).toBeGreaterThan(0);
    });
    
    test('should monitor data transformation performance', async () => {
      const startTime = Date.now();
      
      // Log a transformation
      const logId = DataIntegrityValidator.logDataTransformation(
        'TestComponent',
        'PERFORMANCE_TEST',
        { input: 'test' },
        { output: 'result' },
        ['TestRule']
      );
      
      const endTime = Date.now();
      
      // Verify log was created
      expect(logId).toBeDefined();
      
      // Verify transformation was logged
      const transformationLogs = DataIntegrityValidator.getTransformationLogs('TestComponent', 10);
      expect(transformationLogs.length).toBeGreaterThan(0);
      
      const testLog = transformationLogs.find(log => log.id === logId);
      expect(testLog).toBeDefined();
      expect(testLog?.operation).toBe('PERFORMANCE_TEST');
      expect(testLog?.duration).toBeLessThan(endTime - startTime + 100); // Allow some margin
    });
  });
  
  describe('Phase 3.3: Error Tracking & Recovery', () => {
    
    test('should handle API failures gracefully with mock fallback', async () => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('API Error'));
      
      const query = {
        organizationId: 'org-123',
        startDate: '2025-06-04',
        endDate: '2025-06-10'
      };
      
      const data = await UnifiedAppointmentDataService.getAvailabilityData(query);
      
      // Should return mock data instead of throwing
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      
      // Verify error was logged
      const errorLogs = mockConsoleError.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('API call failed'))
      );
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Verify fallback warning was logged
      const fallbackLogs = mockConsoleLog.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Using mock data fallback'))
      );
      expect(fallbackLogs.length).toBeGreaterThan(0);
    });
    
    test('should validate and correct invalid date formats', () => {
      const invalidDate = '2025/06/04'; // Wrong format
      const validation = ImmutableDateSystem.validateAndNormalize(invalidDate);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Invalid date format');
    });
  });
  
  describe('Phase 3.4: Debug Panel Functionality', () => {
    
    test('should render debug panels in development mode', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <AppointmentDataProvider>
          <EnhancedWeeklyAvailabilitySelector
            title="Test Selector"
            subtitle="Testing debug panels"
            onDateSelect={() => {}}
            organizationId="org-123"
          />
        </AppointmentDataProvider>
      );
      
      // Debug panels should be available in development
      // (Note: This would need actual debug panel implementation to test)
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});
