/**
 * Integration test to verify doctors can be filtered by service
 * This test validates the database queries work correctly
 */

import { createClient } from '@/lib/supabase/service';

describe('Doctors Service Filtering - Integration Test', () => {
  const TEST_ORG_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient();
  });

  it('should find doctors who can provide a specific service', async () => {
    // First, get a service ID to test with
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name')
      .eq('organization_id', TEST_ORG_ID)
      .limit(1);

    expect(servicesError).toBeNull();
    expect(services).toBeDefined();
    expect(services!.length).toBeGreaterThan(0);

    const testServiceId = services![0].id;
    console.log('Testing with service:', services![0].name, 'ID:', testServiceId);

    // Get doctor IDs who can provide this service
    const { data: doctorServices, error: doctorServicesError } = await supabase
      .from('doctor_services')
      .select('doctor_id')
      .eq('service_id', testServiceId);

    expect(doctorServicesError).toBeNull();
    expect(doctorServices).toBeDefined();
    
    console.log('Doctor-service relationships found:', doctorServices!.length);

    if (doctorServices!.length === 0) {
      console.warn('No doctor-service relationships found for service:', testServiceId);
      return;
    }

    const doctorIds = doctorServices!.map(ds => ds.doctor_id);
    console.log('Doctor IDs who can provide this service:', doctorIds);

    // Get doctors who can provide this service
    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select(`
        id,
        specialization,
        consultation_fee,
        is_available,
        profiles!doctors_profile_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', TEST_ORG_ID)
      .eq('is_available', true)
      .in('profile_id', doctorIds);

    expect(doctorsError).toBeNull();
    expect(doctors).toBeDefined();
    expect(doctors!.length).toBeGreaterThan(0);

    console.log('Doctors found:', doctors!.length);

    // Verify each doctor has proper data structure
    doctors!.forEach(doctor => {
      expect(doctor.id).toBeDefined();
      expect(doctor.specialization).toBeDefined();
      expect(doctor.is_available).toBe(true);
      expect(doctor.profiles).toBeDefined();
      expect(doctor.profiles.first_name).toBeDefined();
      expect(doctor.profiles.last_name).toBeDefined();
      expect(doctor.profiles.email).toBeDefined();
      
      console.log(`- Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name} (${doctor.specialization})`);
    });
  });

  it('should return all available doctors when no service filter is applied', async () => {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select(`
        id,
        specialization,
        consultation_fee,
        is_available,
        profiles!doctors_profile_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', TEST_ORG_ID)
      .eq('is_available', true);

    expect(error).toBeNull();
    expect(doctors).toBeDefined();
    expect(doctors!.length).toBeGreaterThan(0);

    console.log('Total available doctors:', doctors!.length);

    // Verify each doctor has proper data structure
    doctors!.forEach(doctor => {
      expect(doctor.id).toBeDefined();
      expect(doctor.specialization).toBeDefined();
      expect(doctor.is_available).toBe(true);
      expect(doctor.profiles).toBeDefined();
      expect(doctor.profiles.first_name).toBeDefined();
      expect(doctor.profiles.last_name).toBeDefined();
      
      console.log(`- Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name} (${doctor.specialization})`);
    });
  });

  it('should verify doctor-service relationships exist', async () => {
    const { data: relationships, error } = await supabase
      .from('doctor_services')
      .select(`
        doctor_id,
        service_id,
        profiles!doctor_services_doctor_id_fkey(first_name, last_name),
        services!doctor_services_service_id_fkey(name)
      `)
      .limit(10);

    expect(error).toBeNull();
    expect(relationships).toBeDefined();
    expect(relationships!.length).toBeGreaterThan(0);

    console.log('Doctor-Service relationships found:', relationships!.length);

    relationships!.forEach(rel => {
      expect(rel.doctor_id).toBeDefined();
      expect(rel.service_id).toBeDefined();
      
      console.log(`- Dr. ${rel.profiles?.first_name} ${rel.profiles?.last_name} can provide: ${rel.services?.name}`);
    });
  });

  it('should verify the organization has services', async () => {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name, description, is_active')
      .eq('organization_id', TEST_ORG_ID)
      .eq('is_active', true);

    expect(error).toBeNull();
    expect(services).toBeDefined();
    expect(services!.length).toBeGreaterThan(0);

    console.log('Active services found:', services!.length);

    services!.forEach(service => {
      expect(service.id).toBeDefined();
      expect(service.name).toBeDefined();
      expect(service.is_active).toBe(true);
      
      console.log(`- ${service.name}: ${service.description || 'No description'}`);
    });
  });

  it('should verify the organization has doctors', async () => {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select(`
        id,
        specialization,
        is_available,
        profiles!doctors_profile_id_fkey(first_name, last_name, email)
      `)
      .eq('organization_id', TEST_ORG_ID);

    expect(error).toBeNull();
    expect(doctors).toBeDefined();
    expect(doctors!.length).toBeGreaterThan(0);

    console.log('Total doctors found:', doctors!.length);

    const availableDoctors = doctors!.filter(d => d.is_available);
    console.log('Available doctors:', availableDoctors.length);

    doctors!.forEach(doctor => {
      expect(doctor.id).toBeDefined();
      expect(doctor.specialization).toBeDefined();
      expect(doctor.profiles).toBeDefined();
      
      console.log(`- Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name} (${doctor.specialization}) - Available: ${doctor.is_available}`);
    });
  });
});
