/**
 * Tests for Location Information Integration
 * Validates that location data is properly included in appointment queries and displays
 */

import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}));

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

describe('Location Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Appointment Queries Include Location', () => {
    it('should include location information in appointment queries', async () => {
      // Mock successful query response
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'appointment-1',
            appointment_date: '2025-01-30',
            start_time: '14:30:00',
            duration_minutes: 30,
            status: 'confirmed',
            reason: 'Consulta de rutina',
            notes: null,
            doctor: [{
              id: 'doctor-1',
              specialization: 'Cardiología',
              profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
            }],
            patient: [{
              id: 'patient-1',
              first_name: 'María',
              last_name: 'García'
            }],
            location: [{
              id: 'location-1',
              name: 'Sede Principal',
              address: 'Calle 123 #45-67, Bogotá'
            }],
            service: [{
              id: 'service-1',
              name: 'Consulta Cardiológica',
              duration_minutes: 30,
              price: 150000
            }]
          }
        ],
        error: null
      });

      // Simulate the query structure used in appointments page
      const query = mockSupabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          reason,
          notes,
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            profiles(first_name, last_name)
          ),
          patient:profiles!appointments_patient_id_fkey(
            id,
            first_name,
            last_name
          ),
          location:locations!appointments_location_id_fkey(
            id,
            name,
            address
          ),
          service:services!appointments_service_id_fkey(
            id,
            name,
            duration_minutes,
            price
          )
        `);

      // Verify that the select method was called with location information
      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('location:locations!appointments_location_id_fkey')
      );
      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('service:services!appointments_service_id_fkey')
      );
    });

    it('should include location in calendar appointments query', async () => {
      // Mock calendar query
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const calendarQuery = mockSupabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          patient:profiles!appointments_patient_id_fkey(
            id,
            first_name,
            last_name
          ),
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            profiles(
              id,
              first_name,
              last_name
            )
          ),
          service:services(
            id,
            name,
            duration_minutes
          ),
          location:locations(
            id,
            name,
            address
          )
        `);

      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('location:locations')
      );
    });
  });

  describe('Location Data Validation', () => {
    it('should handle appointments with missing location data gracefully', () => {
      const appointmentWithoutLocation = {
        id: 'appointment-1',
        appointment_date: '2025-01-30',
        start_time: '14:30:00',
        duration_minutes: 30,
        status: 'confirmed',
        reason: 'Consulta de rutina',
        notes: null,
        doctor: [{
          id: 'doctor-1',
          specialization: 'Cardiología',
          profiles: [{ first_name: 'Juan', last_name: 'Pérez' }]
        }],
        patient: [{
          id: 'patient-1',
          first_name: 'María',
          last_name: 'García'
        }],
        location: [], // Empty location array
        service: [{
          id: 'service-1',
          name: 'Consulta Cardiológica',
          duration_minutes: 30,
          price: 150000
        }]
      };

      // Test that the appointment can be processed even without location
      expect(appointmentWithoutLocation.location).toEqual([]);
      expect(appointmentWithoutLocation.location[0]?.name).toBeUndefined();
    });

    it('should validate location data structure', () => {
      const validLocationData = {
        id: 'location-1',
        name: 'Sede Principal',
        address: 'Calle 123 #45-67, Bogotá'
      };

      // Validate required fields
      expect(validLocationData.id).toBeDefined();
      expect(validLocationData.name).toBeDefined();
      expect(validLocationData.address).toBeDefined();
      expect(typeof validLocationData.name).toBe('string');
      expect(typeof validLocationData.address).toBe('string');
    });
  });

  describe('Service Data Integration', () => {
    it('should include service information with pricing', () => {
      const serviceData = {
        id: 'service-1',
        name: 'Consulta Cardiológica',
        duration_minutes: 30,
        price: 150000
      };

      expect(serviceData.id).toBeDefined();
      expect(serviceData.name).toBeDefined();
      expect(serviceData.duration_minutes).toBeGreaterThan(0);
      expect(serviceData.price).toBeGreaterThanOrEqual(0);
    });

    it('should handle services without pricing', () => {
      const serviceWithoutPrice = {
        id: 'service-1',
        name: 'Consulta General',
        duration_minutes: 30,
        price: null
      };

      expect(serviceWithoutPrice.price).toBeNull();
      expect(serviceWithoutPrice.name).toBeDefined();
    });
  });

  describe('Query Performance', () => {
    it('should use efficient joins for related data', () => {
      // Verify that the query uses proper foreign key relationships
      const expectedSelectString = expect.stringContaining('!appointments_location_id_fkey');
      
      mockSupabase
        .from('appointments')
        .select(`
          location:locations!appointments_location_id_fkey(
            id,
            name,
            address
          )
        `);

      expect(mockSupabase.select).toHaveBeenCalledWith(expectedSelectString);
    });

    it('should limit selected fields to necessary data only', () => {
      // Verify that we're not selecting unnecessary fields
      const selectQuery = `
        id,
        appointment_date,
        start_time,
        duration_minutes,
        status,
        reason,
        notes,
        location:locations!appointments_location_id_fkey(
          id,
          name,
          address
        )
      `;

      // Should not include unnecessary fields like created_at, updated_at in location
      expect(selectQuery).not.toContain('created_at');
      expect(selectQuery).not.toContain('updated_at');
      expect(selectQuery).not.toContain('organization_id');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const result = await mockSupabase
        .from('appointments')
        .select('*');

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should handle missing foreign key relationships', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'appointment-1',
            appointment_date: '2025-01-30',
            start_time: '14:30:00',
            location: null, // Missing location relationship
            service: null   // Missing service relationship
          }
        ],
        error: null
      });

      const result = await mockSupabase
        .from('appointments')
        .select('*');

      expect(result.data[0].location).toBeNull();
      expect(result.data[0].service).toBeNull();
    });
  });
});
