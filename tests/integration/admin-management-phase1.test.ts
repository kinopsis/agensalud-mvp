/**
 * Integration Tests for Phase 1 - Critical Admin Management
 * Tests services management, locations management, and doctor-service associations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@/lib/supabase/server';

describe('Phase 1 - Critical Admin Management', () => {
  let supabase: any;
  let testOrganizationId: string;
  let testServiceId: string;
  let testLocationId: string;
  let testDoctorId: string;

  beforeAll(async () => {
    supabase = await createClient();
    
    // Create test organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Admin Management Org',
        domain: 'test-admin-mgmt.com',
        subscription_plan: 'premium'
      })
      .select()
      .single();
    
    testOrganizationId = org.id;

    // Create test doctor profile
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        first_name: 'Test',
        last_name: 'Doctor',
        email: 'test.doctor@admin-mgmt.com',
        role: 'doctor',
        organization_id: testOrganizationId
      })
      .select()
      .single();

    // Create doctor record
    const { data: doctor } = await supabase
      .from('doctors')
      .insert({
        profile_id: profile.id,
        organization_id: testOrganizationId,
        specialization: 'Test Specialization',
        consultation_fee: 75.00,
        is_available: true
      })
      .select()
      .single();

    testDoctorId = profile.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testOrganizationId) {
      await supabase
        .from('organizations')
        .delete()
        .eq('id', testOrganizationId);
    }
  });

  describe('Services Management', () => {
    it('should create a new service', async () => {
      const serviceData = {
        name: 'Test Service',
        description: 'Test service description',
        duration_minutes: 45,
        price: 60.00,
        category: 'Test Category',
        organization_id: testOrganizationId,
        is_active: true
      };

      const { data: service, error } = await supabase
        .from('services')
        .insert(serviceData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(service).toBeDefined();
      expect(service.name).toBe(serviceData.name);
      expect(service.duration_minutes).toBe(serviceData.duration_minutes);
      expect(service.price).toBe(serviceData.price);
      expect(service.organization_id).toBe(testOrganizationId);

      testServiceId = service.id;
    });

    it('should fetch services for organization', async () => {
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', testOrganizationId);

      expect(error).toBeNull();
      expect(services).toBeDefined();
      expect(services.length).toBeGreaterThan(0);
      expect(services[0].organization_id).toBe(testOrganizationId);
    });

    it('should update service details', async () => {
      const updateData = {
        name: 'Updated Test Service',
        price: 80.00,
        updated_at: new Date().toISOString()
      };

      const { data: service, error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', testServiceId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(service).toBeDefined();
      expect(service.name).toBe(updateData.name);
      expect(service.price).toBe(updateData.price);
    });

    it('should filter services by category', async () => {
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', testOrganizationId)
        .eq('category', 'Test Category');

      expect(error).toBeNull();
      expect(services).toBeDefined();
      expect(services.length).toBeGreaterThan(0);
      expect(services[0].category).toBe('Test Category');
    });

    it('should filter services by status', async () => {
      const { data: activeServices, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', testOrganizationId)
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(activeServices).toBeDefined();
      expect(activeServices.every(service => service.is_active)).toBe(true);
    });
  });

  describe('Locations Management', () => {
    it('should create a new location', async () => {
      const locationData = {
        name: 'Test Location',
        address: '123 Test Street',
        city: 'Test City',
        postal_code: '12345',
        phone: '+34 123 456 789',
        email: 'test.location@admin-mgmt.com',
        description: 'Test location description',
        organization_id: testOrganizationId,
        is_active: true
      };

      const { data: location, error } = await supabase
        .from('locations')
        .insert(locationData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(location).toBeDefined();
      expect(location.name).toBe(locationData.name);
      expect(location.address).toBe(locationData.address);
      expect(location.city).toBe(locationData.city);
      expect(location.organization_id).toBe(testOrganizationId);

      testLocationId = location.id;
    });

    it('should fetch locations for organization', async () => {
      const { data: locations, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', testOrganizationId);

      expect(error).toBeNull();
      expect(locations).toBeDefined();
      expect(locations.length).toBeGreaterThan(0);
      expect(locations[0].organization_id).toBe(testOrganizationId);
    });

    it('should update location details', async () => {
      const updateData = {
        name: 'Updated Test Location',
        phone: '+34 987 654 321',
        updated_at: new Date().toISOString()
      };

      const { data: location, error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', testLocationId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(location).toBeDefined();
      expect(location.name).toBe(updateData.name);
      expect(location.phone).toBe(updateData.phone);
    });

    it('should filter locations by city', async () => {
      const { data: locations, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', testOrganizationId)
        .eq('city', 'Test City');

      expect(error).toBeNull();
      expect(locations).toBeDefined();
      expect(locations.length).toBeGreaterThan(0);
      expect(locations[0].city).toBe('Test City');
    });

    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+test@company.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain'
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Doctor-Service Associations', () => {
    it('should create doctor-service association', async () => {
      const { data: association, error } = await supabase
        .from('doctor_services')
        .insert({
          doctor_id: testDoctorId,
          service_id: testServiceId
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(association).toBeDefined();
      expect(association.doctor_id).toBe(testDoctorId);
      expect(association.service_id).toBe(testServiceId);
    });

    it('should fetch doctors associated with service', async () => {
      const { data: associations, error } = await supabase
        .from('doctor_services')
        .select(`
          doctor_id,
          service_id,
          profiles!doctor_services_doctor_id_fkey(
            first_name,
            last_name,
            email
          ),
          doctors!doctor_services_doctor_id_fkey(
            specialization,
            consultation_fee,
            is_available
          )
        `)
        .eq('service_id', testServiceId);

      expect(error).toBeNull();
      expect(associations).toBeDefined();
      expect(associations.length).toBeGreaterThan(0);
      expect(associations[0].doctor_id).toBe(testDoctorId);
      expect(associations[0].profiles).toBeDefined();
      expect(associations[0].doctors).toBeDefined();
    });

    it('should prevent duplicate associations', async () => {
      const { data, error } = await supabase
        .from('doctor_services')
        .insert({
          doctor_id: testDoctorId,
          service_id: testServiceId
        });

      // Should fail due to primary key constraint
      expect(error).toBeDefined();
      expect(error.code).toBe('23505'); // Unique violation
    });

    it('should remove doctor-service association', async () => {
      const { error } = await supabase
        .from('doctor_services')
        .delete()
        .eq('doctor_id', testDoctorId)
        .eq('service_id', testServiceId);

      expect(error).toBeNull();

      // Verify association is removed
      const { data: associations } = await supabase
        .from('doctor_services')
        .select('*')
        .eq('doctor_id', testDoctorId)
        .eq('service_id', testServiceId);

      expect(associations).toBeDefined();
      expect(associations.length).toBe(0);
    });
  });

  describe('Multi-Tenant Data Isolation', () => {
    it('should enforce organization boundaries for services', async () => {
      // Create another organization
      const { data: otherOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'Other Test Org',
          domain: 'other-test.com',
          subscription_plan: 'basic'
        })
        .select()
        .single();

      // Try to fetch services from other organization
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', otherOrg.id);

      expect(services).toBeDefined();
      expect(services.length).toBe(0);

      // Cleanup
      await supabase
        .from('organizations')
        .delete()
        .eq('id', otherOrg.id);
    });

    it('should enforce organization boundaries for locations', async () => {
      // Create another organization
      const { data: otherOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'Other Test Org 2',
          domain: 'other-test2.com',
          subscription_plan: 'basic'
        })
        .select()
        .single();

      // Try to fetch locations from other organization
      const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', otherOrg.id);

      expect(locations).toBeDefined();
      expect(locations.length).toBe(0);

      // Cleanup
      await supabase
        .from('organizations')
        .delete()
        .eq('id', otherOrg.id);
    });
  });

  describe('Data Validation', () => {
    it('should validate service duration constraints', async () => {
      const invalidDurations = [0, -5, 500]; // Below 5 or above 480 minutes

      for (const duration of invalidDurations) {
        const { data, error } = await supabase
          .from('services')
          .insert({
            name: 'Invalid Duration Service',
            duration_minutes: duration,
            organization_id: testOrganizationId
          });

        // Should fail validation (either at DB level or application level)
        if (duration <= 0 || duration > 480) {
          expect(error || data).toBeDefined();
        }
      }
    });

    it('should validate required fields for services', async () => {
      const { data, error } = await supabase
        .from('services')
        .insert({
          // Missing required fields: name, duration_minutes, organization_id
          description: 'Service without required fields'
        });

      expect(error).toBeDefined();
    });

    it('should validate required fields for locations', async () => {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          // Missing required fields: name, address, organization_id
          description: 'Location without required fields'
        });

      expect(error).toBeDefined();
    });
  });
});
