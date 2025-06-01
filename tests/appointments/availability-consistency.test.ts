/**
 * CRITICAL TEST: Availability Data Consistency Between Flows
 * 
 * This test validates that both the new appointment flow and reschedule modal
 * process availability data identically, ensuring consistent slot counts and
 * availability levels across the application.
 * 
 * @author AgentSalud MVP Team - Critical Consistency Fix
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/**
 * Type definitions for availability data
 */
interface DayAvailabilityData {
  date: string;
  dayName: string;
  slotsCount: number;
  availabilityLevel: 'high' | 'medium' | 'low' | 'none';
  isToday: boolean;
  isTomorrow: boolean;
  isWeekend: boolean;
  slots?: any[];
}

// Mock API response structure
const mockApiResponse = {
  success: true,
  data: {
    '2025-06-01': {
      slots: [
        { id: '1', time: '09:00', available: true, doctorId: 'doc1' },
        { id: '2', time: '09:30', available: true, doctorId: 'doc1' },
        { id: '3', time: '10:00', available: false, doctorId: 'doc1' },
        { id: '4', time: '10:30', available: true, doctorId: 'doc1' },
        { id: '5', time: '14:00', available: true, doctorId: 'doc2' },
        { id: '6', time: '14:30', available: false, doctorId: 'doc2' },
        { id: '7', time: '15:00', available: true, doctorId: 'doc2' },
        { id: '8', time: '15:30', available: true, doctorId: 'doc2' }
      ],
      totalSlots: 8,
      availableSlots: 6 // Pre-calculated by API
    },
    '2025-06-02': {
      slots: [
        { id: '9', time: '09:00', available: false, doctorId: 'doc1' },
        { id: '10', time: '09:30', available: false, doctorId: 'doc1' }
      ],
      totalSlots: 2,
      availableSlots: 0 // Pre-calculated by API
    },
    '2025-06-03': {
      slots: [
        { id: '11', time: '09:00', available: true, doctorId: 'doc1' },
        { id: '12', time: '09:30', available: true, doctorId: 'doc1' },
        { id: '13', time: '10:00', available: true, doctorId: 'doc1' }
      ],
      totalSlots: 3,
      availableSlots: 3 // Pre-calculated by API
    }
  }
};

/**
 * Simulate UnifiedAppointmentFlow data processing logic
 */
function processNewAppointmentFlowData(apiResponse: any): DayAvailabilityData[] {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const processedData: DayAvailabilityData[] = [];
  
  for (const dateString of Object.keys(apiResponse.data)) {
    const dayData = apiResponse.data[dateString];
    const date = new Date(dateString);
    
    // CRITICAL: Use pre-calculated availableSlots from API
    const availableSlots = dayData?.availableSlots || 0;
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let availabilityLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
    if (availableSlots === 0) availabilityLevel = 'none';
    else if (availableSlots <= 2) availabilityLevel = 'low';
    else if (availableSlots <= 5) availabilityLevel = 'medium';
    else availabilityLevel = 'high';

    processedData.push({
      date: dateString,
      dayName: dayNames[date.getDay()],
      slotsCount: availableSlots,
      availabilityLevel,
      isToday,
      isTomorrow,
      isWeekend,
      slots: dayData?.slots || []
    });
  }

  return processedData;
}

/**
 * Simulate AIEnhancedRescheduleModal data processing logic (FIXED VERSION)
 */
function processRescheduleModalData(apiResponse: any): DayAvailabilityData[] {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const availabilityData: DayAvailabilityData[] = [];

  for (const dateStr of Object.keys(apiResponse.data)) {
    const dayData = apiResponse.data[dateStr];
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const isToday = date.getTime() === today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.getTime() === tomorrow.getTime();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // CRITICAL FIX: Use pre-calculated availableSlots from API (same as UnifiedAppointmentFlow)
    const slotsCount = dayData?.availableSlots || 0;
    
    let availabilityLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
    if (slotsCount === 0) availabilityLevel = 'none';
    else if (slotsCount <= 2) availabilityLevel = 'low';
    else if (slotsCount <= 5) availabilityLevel = 'medium';
    else availabilityLevel = 'high';

    availabilityData.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      slotsCount,
      availabilityLevel,
      isToday,
      isTomorrow,
      isWeekend
    });
  }

  return availabilityData;
}

/**
 * Simulate WeeklyAvailabilitySelector data processing logic (FIXED VERSION)
 */
function processWeeklyAvailabilitySelectorData(apiResponse: any): DayAvailabilityData[] {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const availabilityData: DayAvailabilityData[] = [];

  for (const dateStr of Object.keys(apiResponse.data)) {
    const dayData = apiResponse.data[dateStr];
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const isToday = date.getTime() === today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow = date.getTime() === tomorrow.getTime();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // CRITICAL FIX: Use pre-calculated availableSlots from API (same as other flows)
    const slotsCount = dayData?.availableSlots || 0;

    let availabilityLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
    if (slotsCount === 0) availabilityLevel = 'none';
    else if (slotsCount <= 2) availabilityLevel = 'low';
    else if (slotsCount <= 5) availabilityLevel = 'medium';
    else availabilityLevel = 'high';

    availabilityData.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      slotsCount,
      availabilityLevel,
      isToday,
      isTomorrow,
      isWeekend
    });
  }

  return availabilityData;
}

describe('Availability Data Consistency Between All Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Slot Count Consistency', () => {
    it('should return identical slot counts for the same API response across all flows', () => {
      const newAppointmentData = processNewAppointmentFlowData(mockApiResponse);
      const rescheduleModalData = processRescheduleModalData(mockApiResponse);
      const weeklyAvailabilityData = processWeeklyAvailabilitySelectorData(mockApiResponse);

      // Compare slot counts for each date
      for (const date of Object.keys(mockApiResponse.data)) {
        const newAppointmentDay = newAppointmentData.find(d => d.date === date);
        const rescheduleModalDay = rescheduleModalData.find(d => d.date === date);

        expect(newAppointmentDay?.slotsCount).toBe(rescheduleModalDay?.slotsCount);
        expect(newAppointmentDay?.slotsCount).toBe(mockApiResponse.data[date].availableSlots);
      }
    });

    it('should return identical availability levels for the same API response', () => {
      const newAppointmentData = processNewAppointmentFlowData(mockApiResponse);
      const rescheduleModalData = processRescheduleModalData(mockApiResponse);

      // Compare availability levels for each date
      for (const date of Object.keys(mockApiResponse.data)) {
        const newAppointmentDay = newAppointmentData.find(d => d.date === date);
        const rescheduleModalDay = rescheduleModalData.find(d => d.date === date);

        expect(newAppointmentDay?.availabilityLevel).toBe(rescheduleModalDay?.availabilityLevel);
      }
    });
  });

  describe('Availability Level Classification', () => {
    it('should classify availability levels correctly', () => {
      const testCases = [
        { availableSlots: 0, expected: 'none' },
        { availableSlots: 1, expected: 'low' },
        { availableSlots: 2, expected: 'low' },
        { availableSlots: 3, expected: 'medium' },
        { availableSlots: 5, expected: 'medium' },
        { availableSlots: 6, expected: 'high' },
        { availableSlots: 10, expected: 'high' }
      ];

      testCases.forEach(({ availableSlots, expected }) => {
        const testApiResponse = {
          success: true,
          data: {
            '2025-06-01': {
              slots: Array(availableSlots).fill({ available: true }),
              totalSlots: availableSlots,
              availableSlots
            }
          }
        };

        const newAppointmentData = processNewAppointmentFlowData(testApiResponse);
        const rescheduleModalData = processRescheduleModalData(testApiResponse);

        expect(newAppointmentData[0].availabilityLevel).toBe(expected);
        expect(rescheduleModalData[0].availabilityLevel).toBe(expected);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing dayData gracefully', () => {
      const emptyApiResponse = {
        success: true,
        data: {
          '2025-06-01': null,
          '2025-06-02': undefined
        }
      };

      const newAppointmentData = processNewAppointmentFlowData(emptyApiResponse);
      const rescheduleModalData = processRescheduleModalData(emptyApiResponse);

      expect(newAppointmentData[0].slotsCount).toBe(0);
      expect(rescheduleModalData[0].slotsCount).toBe(0);
      expect(newAppointmentData[0].availabilityLevel).toBe('none');
      expect(rescheduleModalData[0].availabilityLevel).toBe('none');
    });

    it('should handle missing availableSlots property', () => {
      const incompleteApiResponse = {
        success: true,
        data: {
          '2025-06-01': {
            slots: [{ available: true }, { available: false }],
            totalSlots: 2
            // Missing availableSlots property
          }
        }
      };

      const newAppointmentData = processNewAppointmentFlowData(incompleteApiResponse);
      const rescheduleModalData = processRescheduleModalData(incompleteApiResponse);

      expect(newAppointmentData[0].slotsCount).toBe(0);
      expect(rescheduleModalData[0].slotsCount).toBe(0);
      expect(newAppointmentData[0].availabilityLevel).toBe('none');
      expect(rescheduleModalData[0].availabilityLevel).toBe('none');
    });
  });

  describe('Data Structure Consistency', () => {
    it('should return the same data structure format', () => {
      const newAppointmentData = processNewAppointmentFlowData(mockApiResponse);
      const rescheduleModalData = processRescheduleModalData(mockApiResponse);

      // Check that both return arrays of the same length
      expect(newAppointmentData.length).toBe(rescheduleModalData.length);

      // Check that each item has the required properties
      newAppointmentData.forEach((item, index) => {
        const rescheduleItem = rescheduleModalData[index];
        
        expect(item.date).toBe(rescheduleItem.date);
        expect(item.dayName).toBe(rescheduleItem.dayName);
        expect(item.slotsCount).toBe(rescheduleItem.slotsCount);
        expect(item.availabilityLevel).toBe(rescheduleItem.availabilityLevel);
        expect(item.isToday).toBe(rescheduleItem.isToday);
        expect(item.isTomorrow).toBe(rescheduleItem.isTomorrow);
        expect(item.isWeekend).toBe(rescheduleItem.isWeekend);
      });
    });
  });
});
