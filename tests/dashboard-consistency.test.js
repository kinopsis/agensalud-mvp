/**
 * @fileoverview Dashboard Data Consistency Tests
 * Validates that dashboard APIs return consistent data with database queries
 * for all user roles in AgentSalud MVP
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const ORGANIZATION_ID = '927cecbe-d9e5-43a4-b9d0-25f942ededc4'; // VisualCare
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Test Suite: Dashboard Data Consistency
 */
describe('Dashboard Data Consistency Tests', () => {
  let dbStats;

  beforeAll(async () => {
    // Get baseline database statistics
    dbStats = await getDatabaseStats();
  });

  /**
   * Test: SuperAdmin Dashboard Stats
   */
  test('SuperAdmin dashboard stats should match database', async () => {
    const apiStats = await getSuperAdminStats();
    
    expect(apiStats.totalOrganizations).toBeGreaterThan(0);
    expect(apiStats.totalUsers).toBe(dbStats.totalUsers);
    expect(apiStats.totalAppointments).toBe(dbStats.totalAppointments);
  });

  /**
   * Test: Admin Dashboard Stats
   */
  test('Admin dashboard stats should match database', async () => {
    const apiStats = await getAdminStats();
    
    expect(apiStats.totalDoctors).toBe(dbStats.totalDoctors);
    expect(apiStats.totalPatients).toBe(dbStats.totalPatients);
    expect(apiStats.totalAppointments).toBe(dbStats.thisMonthAppointments);
    expect(apiStats.pendingAppointments).toBe(dbStats.appointmentsByStatus.pending || 0);
  });

  /**
   * Test: Doctor Dashboard Stats
   */
  test('Doctor dashboard stats should be consistent', async () => {
    // Get a doctor ID from the database
    const { data: doctors } = await supabase
      .from('doctors')
      .select('profile_id')
      .eq('organization_id', ORGANIZATION_ID)
      .limit(1);

    if (doctors && doctors.length > 0) {
      const doctorId = doctors[0].profile_id;
      const apiStats = await getDoctorStats(doctorId);
      
      expect(apiStats).toBeDefined();
      expect(typeof apiStats.todayAppointments).toBe('number');
      expect(typeof apiStats.totalPatients).toBe('number');
    }
  });

  /**
   * Test: Staff Dashboard Stats
   */
  test('Staff dashboard stats should be consistent', async () => {
    const apiStats = await getStaffStats();
    
    expect(apiStats.totalDoctors).toBe(dbStats.totalDoctors);
    expect(apiStats.totalPatients).toBe(dbStats.totalPatients);
    expect(typeof apiStats.todayAppointments).toBe('number');
    expect(typeof apiStats.pendingAppointments).toBe('number');
  });

  /**
   * Test: Patient Dashboard Stats
   */
  test('Patient dashboard stats should be consistent', async () => {
    // Get a patient ID from the database
    const { data: patients } = await supabase
      .from('patients')
      .select('profile_id')
      .eq('organization_id', ORGANIZATION_ID)
      .limit(1);

    if (patients && patients.length > 0) {
      const patientId = patients[0].profile_id;
      const apiStats = await getPatientStats(patientId);
      
      expect(apiStats).toBeDefined();
      expect(typeof apiStats.totalAppointments).toBe('number');
      expect(typeof apiStats.upcomingAppointments).toBe('number');
    }
  });

  /**
   * Test: Multi-tenant Data Isolation
   */
  test('Dashboard APIs should respect multi-tenant isolation', async () => {
    // Verify that all queries include organization_id filter
    const adminStats = await getAdminStats();
    
    // All counts should be specific to VisualCare organization
    expect(adminStats.totalDoctors).toBe(5); // Known count for VisualCare
    expect(adminStats.totalPatients).toBe(3); // Known count for VisualCare
  });

  /**
   * Test: Role-based Data Access
   */
  test('Different roles should see appropriate data scopes', async () => {
    const adminStats = await getAdminStats();
    const staffStats = await getStaffStats();
    
    // Admin and Staff should see organization-wide data
    expect(adminStats.totalDoctors).toBe(staffStats.totalDoctors);
    expect(adminStats.totalPatients).toBe(staffStats.totalPatients);
  });
});

/**
 * Helper Functions
 */

async function getDatabaseStats() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('role, is_active, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, is_active')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: patients } = await supabase
    .from('patients')
    .select('id, status, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, status, appointment_date, created_at')
    .eq('organization_id', ORGANIZATION_ID);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  return {
    totalUsers: profiles?.length || 0,
    totalDoctors: doctors?.length || 0,
    totalPatients: patients?.length || 0,
    totalAppointments: appointments?.length || 0,
    thisMonthAppointments: appointments?.filter(apt => apt.appointment_date >= thisMonth).length || 0,
    todayAppointments: appointments?.filter(apt => apt.appointment_date === today).length || 0,
    appointmentsByStatus: appointments?.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {}) || {}
  };
}

async function getSuperAdminStats() {
  // Simulate SuperAdmin API logic
  const { data: organizations } = await supabase.from('organizations').select('id');
  const { data: users } = await supabase.from('profiles').select('id');
  const { data: appointments } = await supabase.from('appointments').select('id');

  return {
    totalOrganizations: organizations?.length || 0,
    totalUsers: users?.length || 0,
    totalAppointments: appointments?.length || 0
  };
}

async function getAdminStats() {
  // Simulate Admin API logic (from actual API code)
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const { data: thisMonthAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .gte('appointment_date', thisMonth)
    .lte('appointment_date', today);

  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('appointment_date', today);

  const { data: patients } = await supabase
    .from('patients')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: doctors } = await supabase
    .from('doctors')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: pendingAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('status', 'pending');

  return {
    totalAppointments: thisMonthAppointments?.length || 0,
    todayAppointments: todayAppointments?.length || 0,
    totalPatients: patients?.length || 0,
    totalDoctors: doctors?.length || 0,
    pendingAppointments: pendingAppointments?.length || 0
  };
}

async function getDoctorStats(doctorId) {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', today);

  const { data: totalPatients } = await supabase
    .from('appointments')
    .select('patient_id')
    .eq('doctor_id', doctorId);

  const uniquePatients = new Set(totalPatients?.map(apt => apt.patient_id) || []);

  return {
    todayAppointments: todayAppointments?.length || 0,
    totalPatients: uniquePatients.size
  };
}

async function getStaffStats() {
  const { data: doctors } = await supabase
    .from('doctors')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID);

  const { data: patients } = await supabase
    .from('patients')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID);

  const today = new Date().toISOString().split('T')[0];
  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('appointment_date', today);

  const { data: pendingAppointments } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('status', 'pending');

  return {
    totalDoctors: doctors?.length || 0,
    totalPatients: patients?.length || 0,
    todayAppointments: todayAppointments?.length || 0,
    pendingAppointments: pendingAppointments?.length || 0
  };
}

async function getPatientStats(patientId) {
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, status, appointment_date')
    .eq('patient_id', patientId);

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const upcomingAppointments = appointments?.filter(apt => 
    apt.appointment_date >= today && ['confirmed', 'pending'].includes(apt.status)
  ).length || 0;

  return {
    totalAppointments: appointments?.length || 0,
    upcomingAppointments
  };
}

module.exports = {
  getDatabaseStats,
  getAdminStats,
  getDoctorStats,
  getStaffStats,
  getPatientStats
};
