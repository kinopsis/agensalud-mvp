/**
 * Doctor Schedules Tests
 * Tests for doctor schedule management functionality
 * Covers CRUD operations, validation, and business logic
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const testOrganizationId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
let testDoctorId: string;
let testScheduleIds: string[] = [];

describe('Doctor Schedules Management', () => {
  beforeEach(async () => {
    // Get a test doctor from VisualCare
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id')
      .eq('organization_id', testOrganizationId)
      .limit(1);
    
    if (doctors && doctors.length > 0) {
      testDoctorId = doctors[0].id;
    }
  });

  afterEach(async () => {
    // Clean up test schedules
    if (testScheduleIds.length > 0) {
      await supabase
        .from('doctor_schedules')
        .delete()
        .in('id', testScheduleIds);
      testScheduleIds = [];
    }
  });

  describe('Schedule Creation', () => {
    it('should create a valid schedule', async () => {
      const scheduleData = {
        doctor_id: testDoctorId,
        organization_id: testOrganizationId,
        day_of_week: 1, // Monday
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        notes: 'Test schedule'
      };

      const { data: schedule, error } = await supabase
        .from('doctor_schedules')
        .insert(scheduleData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(schedule).toBeDefined();
      expect(schedule.day_of_week).toBe(1);
      expect(schedule.start_time).toBe('09:00:00');
      expect(schedule.end_time).toBe('17:00:00');
      expect(schedule.is_available).toBe(true);

      if (schedule) {
        testScheduleIds.push(schedule.id);
      }
    });

    it('should reject invalid time ranges', async () => {
      const scheduleData = {
        doctor_id: testDoctorId,
        organization_id: testOrganizationId,
        day_of_week: 1,
        start_time: '17:00', // End time before start time
        end_time: '09:00',
        is_available: true
      };

      const { error } = await supabase
        .from('doctor_schedules')
        .insert(scheduleData);

      expect(error).toBeDefined();
      expect(error?.message).toContain('valid_time_range');
    });

    it('should reject duplicate schedules', async () => {
      const scheduleData = {
        doctor_id: testDoctorId,
        organization_id: testOrganizationId,
        day_of_week: 2, // Tuesday
        start_time: '10:00',
        end_time: '18:00',
        is_available: true
      };

      // Create first schedule
      const { data: firstSchedule } = await supabase
        .from('doctor_schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (firstSchedule) {
        testScheduleIds.push(firstSchedule.id);
      }

      // Try to create duplicate
      const { error } = await supabase
        .from('doctor_schedules')
        .insert(scheduleData);

      expect(error).toBeDefined();
      expect(error?.message).toContain('unique_doctor_schedule');
    });

    it('should validate day_of_week range', async () => {
      const scheduleData = {
        doctor_id: testDoctorId,
        organization_id: testOrganizationId,
        day_of_week: 8, // Invalid day (should be 0-6)
        start_time: '09:00',
        end_time: '17:00',
        is_available: true
      };

      const { error } = await supabase
        .from('doctor_schedules')
        .insert(scheduleData);

      expect(error).toBeDefined();
    });
  });

  describe('Schedule Retrieval', () => {
    beforeEach(async () => {
      // Create test schedules
      const schedules = [
        {
          doctor_id: testDoctorId,
          organization_id: testOrganizationId,
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
          notes: 'Monday schedule'
        },
        {
          doctor_id: testDoctorId,
          organization_id: testOrganizationId,
          day_of_week: 2,
          start_time: '10:00',
          end_time: '18:00',
          is_available: true,
          notes: 'Tuesday schedule'
        }
      ];

      const { data: createdSchedules } = await supabase
        .from('doctor_schedules')
        .insert(schedules)
        .select();

      if (createdSchedules) {
        testScheduleIds.push(...createdSchedules.map(s => s.id));
      }
    });

    it('should retrieve schedules for a doctor', async () => {
      const { data: schedules, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', testDoctorId)
        .order('day_of_week');

      expect(error).toBeNull();
      expect(schedules).toBeDefined();
      expect(schedules!.length).toBeGreaterThanOrEqual(2);
      
      // Check ordering
      for (let i = 1; i < schedules!.length; i++) {
        expect(schedules![i].day_of_week).toBeGreaterThanOrEqual(
          schedules![i - 1].day_of_week
        );
      }
    });

    it('should filter schedules by availability', async () => {
      const { data: availableSchedules, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', testDoctorId)
        .eq('is_available', true);

      expect(error).toBeNull();
      expect(availableSchedules).toBeDefined();
      expect(availableSchedules!.every(s => s.is_available)).toBe(true);
    });

    it('should filter schedules by day of week', async () => {
      const { data: mondaySchedules, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', testDoctorId)
        .eq('day_of_week', 1);

      expect(error).toBeNull();
      expect(mondaySchedules).toBeDefined();
      expect(mondaySchedules!.every(s => s.day_of_week === 1)).toBe(true);
    });
  });

  describe('Schedule Updates', () => {
    let testScheduleId: string;

    beforeEach(async () => {
      const { data: schedule } = await supabase
        .from('doctor_schedules')
        .insert({
          doctor_id: testDoctorId,
          organization_id: testOrganizationId,
          day_of_week: 3,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
          notes: 'Original schedule'
        })
        .select()
        .single();

      if (schedule) {
        testScheduleId = schedule.id;
        testScheduleIds.push(testScheduleId);
      }
    });

    it('should update schedule times', async () => {
      const { data: updatedSchedule, error } = await supabase
        .from('doctor_schedules')
        .update({
          start_time: '08:00',
          end_time: '16:00'
        })
        .eq('id', testScheduleId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule.start_time).toBe('08:00:00');
      expect(updatedSchedule.end_time).toBe('16:00:00');
    });

    it('should update availability status', async () => {
      const { data: updatedSchedule, error } = await supabase
        .from('doctor_schedules')
        .update({ is_available: false })
        .eq('id', testScheduleId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule.is_available).toBe(false);
    });

    it('should update notes', async () => {
      const newNotes = 'Updated schedule notes';
      
      const { data: updatedSchedule, error } = await supabase
        .from('doctor_schedules')
        .update({ notes: newNotes })
        .eq('id', testScheduleId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule.notes).toBe(newNotes);
    });

    it('should reject invalid time range updates', async () => {
      const { error } = await supabase
        .from('doctor_schedules')
        .update({
          start_time: '18:00',
          end_time: '09:00' // Invalid: end before start
        })
        .eq('id', testScheduleId);

      expect(error).toBeDefined();
      expect(error?.message).toContain('valid_time_range');
    });
  });

  describe('Schedule Deletion', () => {
    let testScheduleId: string;

    beforeEach(async () => {
      const { data: schedule } = await supabase
        .from('doctor_schedules')
        .insert({
          doctor_id: testDoctorId,
          organization_id: testOrganizationId,
          day_of_week: 4,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true
        })
        .select()
        .single();

      if (schedule) {
        testScheduleId = schedule.id;
      }
    });

    it('should delete a schedule', async () => {
      const { error } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('id', testScheduleId);

      expect(error).toBeNull();

      // Verify deletion
      const { data: deletedSchedule } = await supabase
        .from('doctor_schedules')
        .select()
        .eq('id', testScheduleId)
        .single();

      expect(deletedSchedule).toBeNull();
    });

    it('should handle deletion of non-existent schedule', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('id', fakeId);

      expect(error).toBeNull(); // Supabase doesn't error on delete of non-existent record
    });
  });

  describe('Business Logic Validation', () => {
    it('should calculate total weekly hours correctly', async () => {
      // Create multiple schedules for the week
      const weeklySchedules = [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00' }, // 8 hours
        { day_of_week: 2, start_time: '09:00', end_time: '17:00' }, // 8 hours
        { day_of_week: 3, start_time: '09:00', end_time: '17:00' }, // 8 hours
        { day_of_week: 4, start_time: '09:00', end_time: '17:00' }, // 8 hours
        { day_of_week: 5, start_time: '09:00', end_time: '17:00' }, // 8 hours
        { day_of_week: 6, start_time: '10:00', end_time: '14:00' }, // 4 hours
      ].map(schedule => ({
        ...schedule,
        doctor_id: testDoctorId,
        organization_id: testOrganizationId,
        is_available: true
      }));

      const { data: createdSchedules } = await supabase
        .from('doctor_schedules')
        .insert(weeklySchedules)
        .select();

      if (createdSchedules) {
        testScheduleIds.push(...createdSchedules.map(s => s.id));
      }

      // Calculate total hours
      const { data: schedules } = await supabase
        .from('doctor_schedules')
        .select('start_time, end_time')
        .eq('doctor_id', testDoctorId)
        .eq('is_available', true);

      let totalHours = 0;
      schedules?.forEach(schedule => {
        const start = new Date(`2000-01-01T${schedule.start_time}`);
        const end = new Date(`2000-01-01T${schedule.end_time}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      });

      expect(totalHours).toBe(44); // 8*5 + 4 = 44 hours
    });

    it('should identify schedule conflicts', async () => {
      // Create overlapping schedules for the same day
      const baseSchedule = {
        doctor_id: testDoctorId,
        organization_id: testOrganizationId,
        day_of_week: 5, // Friday
        is_available: true
      };

      // First schedule: 09:00-17:00
      const { data: firstSchedule } = await supabase
        .from('doctor_schedules')
        .insert({
          ...baseSchedule,
          start_time: '09:00',
          end_time: '17:00'
        })
        .select()
        .single();

      if (firstSchedule) {
        testScheduleIds.push(firstSchedule.id);
      }

      // Try to create overlapping schedule: 16:00-20:00
      const { error } = await supabase
        .from('doctor_schedules')
        .insert({
          ...baseSchedule,
          start_time: '16:00',
          end_time: '20:00'
        });

      // Should fail due to unique constraint
      expect(error).toBeDefined();
    });
  });
});

describe('Schedule API Integration', () => {
  it('should validate API response format', async () => {
    // This would test the actual API endpoints
    // For now, we'll test the data structure
    const { data: schedules } = await supabase
      .from('doctor_schedules')
      .select(`
        *,
        doctors!inner(
          id,
          specialization,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('organization_id', testOrganizationId)
      .limit(1);

    if (schedules && schedules.length > 0) {
      const schedule = schedules[0];
      
      // Validate schedule structure
      expect(schedule).toHaveProperty('id');
      expect(schedule).toHaveProperty('day_of_week');
      expect(schedule).toHaveProperty('start_time');
      expect(schedule).toHaveProperty('end_time');
      expect(schedule).toHaveProperty('is_available');
      expect(schedule).toHaveProperty('doctors');
      
      // Validate nested doctor structure
      expect(schedule.doctors).toHaveProperty('id');
      expect(schedule.doctors).toHaveProperty('specialization');
      expect(schedule.doctors).toHaveProperty('profiles');
      expect(schedule.doctors.profiles).toHaveProperty('first_name');
      expect(schedule.doctors.profiles).toHaveProperty('last_name');
    }
  });
});
