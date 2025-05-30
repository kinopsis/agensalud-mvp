/**
 * Schedule Validation Tests
 * Tests for schedule validation logic and business rules
 * Uses mock data to avoid external dependencies
 */

import { describe, it, expect } from '@jest/globals';

// Mock schedule data structure
interface DoctorSchedule {
  id: string;
  doctor_id: string;
  organization_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
}

// Validation functions to test
function validateTimeRange(startTime: string, endTime: string): boolean {
  return startTime < endTime;
}

function validateDayOfWeek(dayOfWeek: number): boolean {
  return dayOfWeek >= 0 && dayOfWeek <= 6;
}

function calculateScheduleDuration(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
}

function hasScheduleConflict(
  newSchedule: Omit<DoctorSchedule, 'id'>,
  existingSchedules: DoctorSchedule[]
): boolean {
  return existingSchedules.some(existing => {
    // Same doctor, same day
    if (existing.doctor_id === newSchedule.doctor_id &&
        existing.day_of_week === newSchedule.day_of_week) {

      // Check time overlap
      const newStart = newSchedule.start_time;
      const newEnd = newSchedule.end_time;
      const existingStart = existing.start_time;
      const existingEnd = existing.end_time;

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    }
    return false;
  });
}

function calculateWeeklyHours(schedules: DoctorSchedule[]): number {
  return schedules
    .filter(schedule => schedule.is_available)
    .reduce((total, schedule) => {
      return total + calculateScheduleDuration(schedule.start_time, schedule.end_time);
    }, 0);
}

function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): Array<{ start_time: string; end_time: string }> {
  const slots: Array<{ start_time: string; end_time: string }> = [];

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  for (let currentMinutes = startMinutes;
       currentMinutes + durationMinutes <= endMinutes;
       currentMinutes += durationMinutes) {
    slots.push({
      start_time: minutesToTime(currentMinutes),
      end_time: minutesToTime(currentMinutes + durationMinutes)
    });
  }

  return slots;
}

function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

describe('Schedule Validation Logic', () => {
  describe('Time Range Validation', () => {
    it('should validate correct time ranges', () => {
      expect(validateTimeRange('09:00', '17:00')).toBe(true);
      expect(validateTimeRange('08:30', '12:30')).toBe(true);
      expect(validateTimeRange('14:00', '18:00')).toBe(true);
    });

    it('should reject invalid time ranges', () => {
      expect(validateTimeRange('17:00', '09:00')).toBe(false);
      expect(validateTimeRange('12:00', '12:00')).toBe(false);
      expect(validateTimeRange('18:00', '08:00')).toBe(false);
    });
  });

  describe('Day of Week Validation', () => {
    it('should validate correct day values', () => {
      for (let day = 0; day <= 6; day++) {
        expect(validateDayOfWeek(day)).toBe(true);
      }
    });

    it('should reject invalid day values', () => {
      expect(validateDayOfWeek(-1)).toBe(false);
      expect(validateDayOfWeek(7)).toBe(false);
      expect(validateDayOfWeek(10)).toBe(false);
    });
  });

  describe('Schedule Duration Calculation', () => {
    it('should calculate duration correctly', () => {
      expect(calculateScheduleDuration('09:00', '17:00')).toBe(8);
      expect(calculateScheduleDuration('10:00', '14:00')).toBe(4);
      expect(calculateScheduleDuration('08:30', '12:30')).toBe(4);
      expect(calculateScheduleDuration('14:15', '16:45')).toBe(2.5);
    });

    it('should handle edge cases', () => {
      expect(calculateScheduleDuration('00:00', '23:59')).toBeCloseTo(23.98, 1);
      expect(calculateScheduleDuration('12:00', '12:30')).toBe(0.5);
    });
  });

  describe('Schedule Conflict Detection', () => {
    const existingSchedules: DoctorSchedule[] = [
      {
        id: '1',
        doctor_id: 'doctor-1',
        organization_id: 'org-1',
        day_of_week: 1, // Monday
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
      },
      {
        id: '2',
        doctor_id: 'doctor-1',
        organization_id: 'org-1',
        day_of_week: 2, // Tuesday
        start_time: '10:00',
        end_time: '18:00',
        is_available: true
      }
    ];

    it('should detect overlapping schedules', () => {
      const conflictingSchedule = {
        doctor_id: 'doctor-1',
        organization_id: 'org-1',
        day_of_week: 1,
        start_time: '16:00', // Overlaps with existing 09:00-17:00
        end_time: '20:00',
        is_available: true
      };

      expect(hasScheduleConflict(conflictingSchedule, existingSchedules)).toBe(true);
    });

    it('should allow non-overlapping schedules', () => {
      const nonConflictingSchedule = {
        doctor_id: 'doctor-1',
        organization_id: 'org-1',
        day_of_week: 3, // Wednesday - different day
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
      };

      expect(hasScheduleConflict(nonConflictingSchedule, existingSchedules)).toBe(false);
    });

    it('should allow schedules for different doctors', () => {
      const differentDoctorSchedule = {
        doctor_id: 'doctor-2', // Different doctor
        organization_id: 'org-1',
        day_of_week: 1, // Same day as existing
        start_time: '09:00', // Same time as existing
        end_time: '17:00',
        is_available: true
      };

      expect(hasScheduleConflict(differentDoctorSchedule, existingSchedules)).toBe(false);
    });

    it('should detect partial overlaps', () => {
      const partialOverlapSchedule = {
        doctor_id: 'doctor-1',
        organization_id: 'org-1',
        day_of_week: 1,
        start_time: '08:00', // Starts before existing
        end_time: '10:00',   // Ends within existing
        is_available: true
      };

      expect(hasScheduleConflict(partialOverlapSchedule, existingSchedules)).toBe(true);
    });
  });

  describe('Weekly Hours Calculation', () => {
    const weeklySchedules: DoctorSchedule[] = [
      // Monday: 8 hours
      { id: '1', doctor_id: 'doctor-1', organization_id: 'org-1', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
      // Tuesday: 8 hours
      { id: '2', doctor_id: 'doctor-1', organization_id: 'org-1', day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
      // Wednesday: 8 hours
      { id: '3', doctor_id: 'doctor-1', organization_id: 'org-1', day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
      // Thursday: 8 hours
      { id: '4', doctor_id: 'doctor-1', organization_id: 'org-1', day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true },
      // Friday: 8 hours
      { id: '5', doctor_id: 'doctor-1', organization_id: 'org-1', day_of_week: 5, start_time: '09:00', end_time: '17:00', is_available: true },
      // Saturday: 4 hours
      { id: '6', doctor_id: 'doctor-1', organization_id: 'org-1', day_of_week: 6, start_time: '10:00', end_time: '14:00', is_available: true },
      // Sunday: Not available
      { id: '7', doctor_id: 'doctor-1', organization_id: 'org-1', day_of_week: 0, start_time: '10:00', end_time: '14:00', is_available: false }
    ];

    it('should calculate total weekly hours correctly', () => {
      const totalHours = calculateWeeklyHours(weeklySchedules);
      expect(totalHours).toBe(44); // 8*5 + 4 = 44 hours (excluding unavailable Sunday)
    });

    it('should exclude unavailable schedules', () => {
      const schedulesWithUnavailable = weeklySchedules.map(schedule => ({
        ...schedule,
        is_available: schedule.day_of_week !== 6 && schedule.day_of_week !== 0 // Make Saturday and Sunday unavailable
      }));

      const totalHours = calculateWeeklyHours(schedulesWithUnavailable);
      expect(totalHours).toBe(40); // 8*5 = 40 hours (excluding Saturday and Sunday)
    });
  });

  describe('Time Slot Generation', () => {
    it('should generate correct 30-minute slots', () => {
      const slots = generateTimeSlots('09:00', '12:00', 30);

      expect(slots).toHaveLength(6); // 3 hours = 6 slots of 30 minutes
      expect(slots[0]).toEqual({ start_time: '09:00', end_time: '09:30' });
      expect(slots[1]).toEqual({ start_time: '09:30', end_time: '10:00' });
      expect(slots[5]).toEqual({ start_time: '11:30', end_time: '12:00' });
    });

    it('should generate correct 60-minute slots', () => {
      const slots = generateTimeSlots('14:00', '18:00', 60);

      expect(slots).toHaveLength(4); // 4 hours = 4 slots of 60 minutes
      expect(slots[0]).toEqual({ start_time: '14:00', end_time: '15:00' });
      expect(slots[3]).toEqual({ start_time: '17:00', end_time: '18:00' });
    });

    it('should handle edge cases', () => {
      // No slots if duration is too large
      const noSlots = generateTimeSlots('09:00', '10:00', 90);
      expect(noSlots).toHaveLength(0);

      // Single slot
      const singleSlot = generateTimeSlots('09:00', '10:00', 60);
      expect(singleSlot).toHaveLength(1);
      expect(singleSlot[0]).toEqual({ start_time: '09:00', end_time: '10:00' });
    });

    it('should handle 15-minute slots', () => {
      const slots = generateTimeSlots('10:00', '11:00', 15);

      expect(slots).toHaveLength(4); // 1 hour = 4 slots of 15 minutes
      expect(slots[0]).toEqual({ start_time: '10:00', end_time: '10:15' });
      expect(slots[1]).toEqual({ start_time: '10:15', end_time: '10:30' });
      expect(slots[2]).toEqual({ start_time: '10:30', end_time: '10:45' });
      expect(slots[3]).toEqual({ start_time: '10:45', end_time: '11:00' });
    });
  });

  describe('Time Conversion Utilities', () => {
    it('should convert time to minutes correctly', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('01:00')).toBe(60);
      expect(timeToMinutes('12:30')).toBe(750);
      expect(timeToMinutes('23:59')).toBe(1439);
    });

    it('should convert minutes to time correctly', () => {
      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(60)).toBe('01:00');
      expect(minutesToTime(750)).toBe('12:30');
      expect(minutesToTime(1439)).toBe('23:59');
    });

    it('should handle round-trip conversions', () => {
      const testTimes = ['09:00', '14:30', '18:45', '23:15'];

      testTimes.forEach(time => {
        const minutes = timeToMinutes(time);
        const convertedBack = minutesToTime(minutes);
        expect(convertedBack).toBe(time);
      });
    });
  });
});

describe('VisualCare Schedule Patterns', () => {
  // Test patterns based on OPTICAL_SIMULATION.md
  const visualCareSchedules = {
    'Ana Rodríguez': [
      { day: 1, start: '09:00', end: '17:00' }, // Mon-Fri
      { day: 2, start: '09:00', end: '17:00' },
      { day: 3, start: '09:00', end: '17:00' },
      { day: 4, start: '09:00', end: '17:00' },
      { day: 5, start: '09:00', end: '17:00' },
      { day: 6, start: '10:00', end: '14:00' }, // Sat
    ],
    'Pedro Sánchez': [
      { day: 1, start: '10:00', end: '19:00' }, // Mon-Fri
      { day: 2, start: '10:00', end: '19:00' },
      { day: 3, start: '10:00', end: '19:00' },
      { day: 4, start: '10:00', end: '19:00' },
      { day: 5, start: '10:00', end: '19:00' },
      { day: 6, start: '10:00', end: '14:00' }, // Sat
    ]
  };

  it('should validate VisualCare schedule patterns', () => {
    Object.entries(visualCareSchedules).forEach(([doctorName, schedules]) => {
      schedules.forEach(schedule => {
        expect(validateDayOfWeek(schedule.day)).toBe(true);
        expect(validateTimeRange(schedule.start, schedule.end)).toBe(true);

        const duration = calculateScheduleDuration(schedule.start, schedule.end);
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThanOrEqual(12); // Reasonable max hours per day
      });
    });
  });

  it('should calculate correct weekly hours for VisualCare doctors', () => {
    const anaSchedules = visualCareSchedules['Ana Rodríguez'].map((s, i) => ({
      id: `ana-${i}`,
      doctor_id: 'ana',
      organization_id: 'visualcare',
      day_of_week: s.day,
      start_time: s.start,
      end_time: s.end,
      is_available: true
    }));

    const anaWeeklyHours = calculateWeeklyHours(anaSchedules);
    expect(anaWeeklyHours).toBe(44); // 8*5 + 4 = 44 hours

    const pedroSchedules = visualCareSchedules['Pedro Sánchez'].map((s, i) => ({
      id: `pedro-${i}`,
      doctor_id: 'pedro',
      organization_id: 'visualcare',
      day_of_week: s.day,
      start_time: s.start,
      end_time: s.end,
      is_available: true
    }));

    const pedroWeeklyHours = calculateWeeklyHours(pedroSchedules);
    expect(pedroWeeklyHours).toBe(49); // 9*5 + 4 = 49 hours
  });
});
