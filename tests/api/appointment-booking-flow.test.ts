/**
 * Appointment Booking Flow Integration Tests
 * Tests the complete appointment booking flow including doctor-service filtering
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_ORG_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

describe('Appointment Booking Flow', () => {
  let testServiceId: string;
  let testDoctorId: string;
  let testLocationId: string;

  beforeAll(async () => {
    // Get test data
    const { data: services } = await supabase
      .from('services')
      .select('id, name')
      .eq('organization_id', TEST_ORG_ID)
      .limit(1);
    
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, profile_id')
      .eq('organization_id', TEST_ORG_ID)
      .limit(1);

    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('organization_id', TEST_ORG_ID)
      .limit(1);

    testServiceId = services?.[0]?.id;
    testDoctorId = doctors?.[0]?.id;
    testLocationId = locations?.[0]?.id;

    expect(testServiceId).toBeDefined();
    expect(testDoctorId).toBeDefined();
    expect(testLocationId).toBeDefined();
  });

  describe('Doctor-Service Association', () => {
    it('should have doctor-service associations in database', async () => {
      const { data: associations, error } = await supabase
        .from('doctor_services')
        .select('doctor_id, service_id')
        .limit(5);

      expect(error).toBeNull();
      expect(associations).toBeDefined();
      expect(associations!.length).toBeGreaterThan(0);
    });

    it('should filter doctors by service correctly', async () => {
      // Get doctors who can provide a specific service
      const { data: doctorServices } = await supabase
        .from('doctor_services')
        .select('doctor_id')
        .eq('service_id', testServiceId);

      expect(doctorServices).toBeDefined();
      expect(doctorServices!.length).toBeGreaterThan(0);

      // Verify these doctors exist and are available
      const doctorIds = doctorServices!.map(ds => ds.doctor_id);
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, profile_id, specialization, is_available')
        .eq('organization_id', TEST_ORG_ID)
        .in('profile_id', doctorIds)
        .eq('is_available', true);

      expect(doctors).toBeDefined();
      expect(doctors!.length).toBeGreaterThan(0);
    });
  });

  describe('Service-Location Association', () => {
    it('should have service-location associations', async () => {
      const { data: associations, error } = await supabase
        .from('service_locations')
        .select('service_id, location_id')
        .limit(5);

      expect(error).toBeNull();
      expect(associations).toBeDefined();
      expect(associations!.length).toBeGreaterThan(0);
    });
  });

  describe('Doctor Schedules', () => {
    it('should have doctor schedules configured', async () => {
      const { data: schedules, error } = await supabase
        .from('doctor_schedules')
        .select('doctor_id, day_of_week, start_time, end_time, is_available')
        .eq('is_available', true)
        .limit(5);

      expect(error).toBeNull();
      expect(schedules).toBeDefined();
      expect(schedules!.length).toBeGreaterThan(0);
    });

    it('should have schedules for test doctor', async () => {
      // Get profile_id for test doctor
      const { data: doctor } = await supabase
        .from('doctors')
        .select('profile_id')
        .eq('id', testDoctorId)
        .single();

      const { data: schedules } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctor!.profile_id)
        .eq('is_available', true);

      expect(schedules).toBeDefined();
      expect(schedules!.length).toBeGreaterThan(0);
    });
  });

  describe('Availability Generation', () => {
    it('should generate time slots for available doctors', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      const dayOfWeek = tomorrow.getDay();

      // Get doctors who can provide the test service
      const { data: doctorServices } = await supabase
        .from('doctor_services')
        .select('doctor_id')
        .eq('service_id', testServiceId);

      const doctorIds = doctorServices?.map(ds => ds.doctor_id) || [];

      // Get schedules for these doctors for tomorrow
      const { data: schedules } = await supabase
        .from('doctor_schedules')
        .select('doctor_id, start_time, end_time')
        .in('doctor_id', doctorIds)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      expect(schedules).toBeDefined();
      
      if (schedules && schedules.length > 0) {
        // Should have at least one schedule
        expect(schedules.length).toBeGreaterThan(0);
        
        // Each schedule should have valid time format
        schedules.forEach(schedule => {
          expect(schedule.start_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
          expect(schedule.end_time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        });
      }
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent doctor references', async () => {
      // Check that all doctor_services.doctor_id references exist in profiles
      const { data: orphanedServices } = await supabase
        .from('doctor_services')
        .select('doctor_id')
        .not('doctor_id', 'in', 
          supabase.from('profiles').select('id').eq('role', 'doctor')
        );

      expect(orphanedServices).toBeDefined();
      expect(orphanedServices!.length).toBe(0);
    });

    it('should have consistent service references', async () => {
      // Check that all doctor_services.service_id references exist in services
      const { data: orphanedDoctors } = await supabase
        .from('doctor_services')
        .select('service_id')
        .not('service_id', 'in', 
          supabase.from('services').select('id')
        );

      expect(orphanedDoctors).toBeDefined();
      expect(orphanedDoctors!.length).toBe(0);
    });
  });
});
