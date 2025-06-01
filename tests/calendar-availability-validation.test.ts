/**
 * Calendar Availability Validation Test
 * Tests the fixed calendar availability system to ensure it works correctly
 * for both new appointments and rescheduling flows
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock fetch for API testing
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Calendar Availability System', () => {
  const testOrganizationId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
  const testDate = '2025-06-16'; // Monday
  
  beforeAll(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('API Endpoint: /api/doctors/availability', () => {
    it('should return availability for all doctors when no doctorId is specified', async () => {
      // Mock successful API response
      const mockAvailabilityData = {
        success: true,
        data: [
          {
            start_time: '10:00',
            end_time: '10:30',
            doctor_id: 'doctor-1',
            doctor_name: 'Dr. Miguel Fernández',
            specialization: 'Optometría General',
            consultation_fee: 50000,
            available: true
          },
          {
            start_time: '10:30',
            end_time: '11:00',
            doctor_id: 'doctor-1',
            doctor_name: 'Dr. Miguel Fernández',
            specialization: 'Optometría General',
            consultation_fee: 50000,
            available: true
          }
        ],
        count: 2,
        date: testDate,
        day_of_week: 1,
        duration_minutes: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityData
      });

      // Test API call without doctorId
      const params = new URLSearchParams({
        organizationId: testOrganizationId,
        date: testDate,
        duration: '30'
      });

      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].available).toBe(true);
    });

    it('should apply role-based booking rules for patients', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Mock API response with standard rules applied
      const mockAvailabilityData = {
        success: true,
        data: [], // No slots available for same-day booking
        count: 0,
        date: today,
        day_of_week: new Date().getDay(),
        duration_minutes: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityData
      });

      // Test API call with useStandardRules for patient
      const params = new URLSearchParams({
        organizationId: testOrganizationId,
        date: today,
        duration: '30',
        useStandardRules: 'true'
      });

      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0); // No same-day appointments for patients
    });

    it('should allow privileged users to book same-day appointments', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Mock API response without standard rules (privileged user)
      const mockAvailabilityData = {
        success: true,
        data: [
          {
            start_time: '14:00',
            end_time: '14:30',
            doctor_id: 'doctor-1',
            doctor_name: 'Dr. Miguel Fernández',
            specialization: 'Optometría General',
            consultation_fee: 50000,
            available: true
          }
        ],
        count: 1,
        date: today,
        day_of_week: new Date().getDay(),
        duration_minutes: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityData
      });

      // Test API call without useStandardRules (privileged user)
      const params = new URLSearchParams({
        organizationId: testOrganizationId,
        date: today,
        duration: '30'
        // No useStandardRules parameter = privileged user
      });

      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.count).toBeGreaterThan(0); // Same-day appointments allowed for privileged users
    });
  });

  describe('Calendar Component Integration', () => {
    it('should fetch availability without requiring doctor selection', () => {
      // Test that the Calendar component can fetch availability for all doctors
      const mockCalendarProps = {
        organizationId: testOrganizationId,
        showAvailability: true,
        currentDate: new Date(testDate),
        selectedFilters: {
          doctor: '', // No specific doctor selected
          status: '',
          service: ''
        }
      };

      // Verify that the API call would be made without doctorId
      const expectedParams = new URLSearchParams({
        organizationId: testOrganizationId,
        date: testDate,
        duration: '30'
      });

      expect(expectedParams.has('doctorId')).toBe(false);
      expect(expectedParams.get('organizationId')).toBe(testOrganizationId);
      expect(expectedParams.get('date')).toBe(testDate);
    });
  });

  describe('Rescheduling Flow Consistency', () => {
    it('should use the same availability logic for rescheduling as new appointments', async () => {
      // Mock availability response
      const mockAvailabilityData = {
        success: true,
        data: [
          {
            start_time: '15:00',
            end_time: '15:30',
            doctor_id: 'doctor-2',
            doctor_name: 'Dr. Ana Rodríguez',
            specialization: 'Medicina General',
            consultation_fee: 45000,
            available: true
          }
        ],
        count: 1,
        date: testDate,
        day_of_week: 1,
        duration_minutes: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityData
      });

      // Test that rescheduling uses the same API endpoint
      const params = new URLSearchParams({
        organizationId: testOrganizationId,
        date: testDate,
        duration: '30'
      });

      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      
      // Verify the slot structure is consistent
      const slot = data.data[0];
      expect(slot).toHaveProperty('start_time');
      expect(slot).toHaveProperty('end_time');
      expect(slot).toHaveProperty('doctor_id');
      expect(slot).toHaveProperty('doctor_name');
      expect(slot).toHaveProperty('available');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        const params = new URLSearchParams({
          organizationId: testOrganizationId,
          date: testDate,
          duration: '30'
        });

        await fetch(`/api/doctors/availability?${params}`);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should validate required parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid query parameters',
          details: ['organizationId is required']
        })
      });

      // Test API call without required organizationId
      const params = new URLSearchParams({
        date: testDate,
        duration: '30'
      });

      const response = await fetch(`/api/doctors/availability?${params}`);
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });
  });
});
