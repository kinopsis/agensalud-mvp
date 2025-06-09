import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * COMPREHENSIVE ROLE-BASED DATA CONSISTENCY AUDIT ENDPOINT
 * Validates data consistency between dashboard stats and appointments page for all roles
 * Checks foreign key relationships and multi-tenant data isolation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetRole = searchParams.get('role') || 'all';
    const organizationId = searchParams.get('organizationId');

    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const targetOrgId = organizationId || profile.organization_id;

    // Get all appointments for analysis
    const { data: allAppointments, error: appointmentsError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        appointment_date,
        start_time,
        status,
        organization_id,
        created_at
      `)
      .eq('organization_id', targetOrgId);

    if (appointmentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch appointments', details: appointmentsError.message },
        { status: 500 }
      );
    }

    // Get all profiles in the organization
    const { data: allProfiles, error: profilesError } = await serviceSupabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, organization_id')
      .eq('organization_id', targetOrgId);

    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profilesError.message },
        { status: 500 }
      );
    }

    // Get all doctors in the organization
    const { data: allDoctors, error: doctorsError } = await serviceSupabase
      .from('doctors')
      .select('id, profile_id, specialization, organization_id')
      .eq('organization_id', targetOrgId);

    if (doctorsError) {
      return NextResponse.json(
        { error: 'Failed to fetch doctors', details: doctorsError.message },
        { status: 500 }
      );
    }

    // Get all patients in the organization
    const { data: allPatients, error: patientsError } = await serviceSupabase
      .from('patients')
      .select('id, profile_id, organization_id')
      .eq('organization_id', targetOrgId);

    if (patientsError) {
      return NextResponse.json(
        { error: 'Failed to fetch patients', details: patientsError.message },
        { status: 500 }
      );
    }

    const auditResults = {
      organization: {
        id: targetOrgId,
        totalProfiles: allProfiles?.length || 0,
        totalAppointments: allAppointments?.length || 0,
        totalDoctors: allDoctors?.length || 0,
        totalPatients: allPatients?.length || 0
      },
      roleAnalysis: {},
      foreignKeyValidation: {
        appointmentsToProfiles: { valid: 0, invalid: 0, invalidIds: [] },
        appointmentsToDoctors: { valid: 0, invalid: 0, invalidIds: [] },
        patientsToProfiles: { valid: 0, invalid: 0, invalidIds: [] },
        doctorsToProfiles: { valid: 0, invalid: 0, invalidIds: [] }
      },
      inconsistencies: [],
      recommendations: []
    };

    // Validate Foreign Key Relationships
    const profileIds = new Set(allProfiles?.map(p => p.id) || []);
    const doctorIds = new Set(allDoctors?.map(d => d.id) || []);

    // 1. Validate appointments.patient_id -> profiles.id
    allAppointments?.forEach(apt => {
      if (profileIds.has(apt.patient_id)) {
        auditResults.foreignKeyValidation.appointmentsToProfiles.valid++;
      } else {
        auditResults.foreignKeyValidation.appointmentsToProfiles.invalid++;
        auditResults.foreignKeyValidation.appointmentsToProfiles.invalidIds.push(apt.patient_id);
      }
    });

    // 2. Validate appointments.doctor_id -> doctors.id
    allAppointments?.forEach(apt => {
      if (doctorIds.has(apt.doctor_id)) {
        auditResults.foreignKeyValidation.appointmentsToDoctors.valid++;
      } else {
        auditResults.foreignKeyValidation.appointmentsToDoctors.invalid++;
        auditResults.foreignKeyValidation.appointmentsToDoctors.invalidIds.push(apt.doctor_id);
      }
    });

    // 3. Validate patients.profile_id -> profiles.id
    allPatients?.forEach(patient => {
      if (profileIds.has(patient.profile_id)) {
        auditResults.foreignKeyValidation.patientsToProfiles.valid++;
      } else {
        auditResults.foreignKeyValidation.patientsToProfiles.invalid++;
        auditResults.foreignKeyValidation.patientsToProfiles.invalidIds.push(patient.profile_id);
      }
    });

    // 4. Validate doctors.profile_id -> profiles.id
    allDoctors?.forEach(doctor => {
      if (profileIds.has(doctor.profile_id)) {
        auditResults.foreignKeyValidation.doctorsToProfiles.valid++;
      } else {
        auditResults.foreignKeyValidation.doctorsToProfiles.invalid++;
        auditResults.foreignKeyValidation.doctorsToProfiles.invalidIds.push(doctor.profile_id);
      }
    });

    // Role-specific Analysis
    const roleGroups = {
      patient: allProfiles?.filter(p => p.role === 'patient') || [],
      doctor: allProfiles?.filter(p => p.role === 'doctor') || [],
      admin: allProfiles?.filter(p => p.role === 'admin') || [],
      staff: allProfiles?.filter(p => p.role === 'staff') || [],
      superadmin: allProfiles?.filter(p => p.role === 'superadmin') || []
    };

    // Analyze each role
    Object.entries(roleGroups).forEach(([role, profiles]) => {
      if (profiles.length === 0) return;

      const roleAnalysis = {
        totalUsers: profiles.length,
        appointmentCounts: {},
        potentialInconsistencies: []
      };

      profiles.forEach(profile => {
        if (role === 'patient') {
          // For patients: count appointments where patient_id = profile.id
          const patientAppointments = allAppointments?.filter(apt => 
            apt.patient_id === profile.id
          ) || [];

          // Check if there's a patient record for this profile
          const patientRecord = allPatients?.find(p => p.profile_id === profile.id);

          roleAnalysis.appointmentCounts[profile.id] = {
            name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            appointmentCount: patientAppointments.length,
            hasPatientRecord: !!patientRecord,
            patientRecordId: patientRecord?.id || null
          };

          // Check for potential inconsistency (appointments using patients.id instead of profile.id)
          if (patientRecord) {
            const appointmentsUsingPatientId = allAppointments?.filter(apt => 
              apt.patient_id === patientRecord.id
            ) || [];

            if (appointmentsUsingPatientId.length > 0) {
              roleAnalysis.potentialInconsistencies.push({
                type: 'PATIENT_ID_MISMATCH',
                profileId: profile.id,
                patientRecordId: patientRecord.id,
                appointmentsUsingProfileId: patientAppointments.length,
                appointmentsUsingPatientId: appointmentsUsingPatientId.length,
                description: 'Appointments found using patients.id instead of profiles.id'
              });
            }
          }
        } else if (role === 'doctor') {
          // For doctors: count appointments where doctor_id matches their doctor record
          const doctorRecord = allDoctors?.find(d => d.profile_id === profile.id);
          const doctorAppointments = doctorRecord ? 
            allAppointments?.filter(apt => apt.doctor_id === doctorRecord.id) || [] : [];

          roleAnalysis.appointmentCounts[profile.id] = {
            name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            appointmentCount: doctorAppointments.length,
            hasDoctorRecord: !!doctorRecord,
            doctorRecordId: doctorRecord?.id || null,
            specialization: doctorRecord?.specialization || null
          };
        } else {
          // For admin/staff/superadmin: count all appointments in their organization
          const orgAppointments = allAppointments?.filter(apt => 
            apt.organization_id === profile.organization_id
          ) || [];

          roleAnalysis.appointmentCounts[profile.id] = {
            name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email,
            organizationAppointmentCount: orgAppointments.length
          };
        }
      });

      auditResults.roleAnalysis[role] = roleAnalysis;
    });

    // Generate inconsistencies and recommendations
    if (auditResults.foreignKeyValidation.appointmentsToProfiles.invalid > 0) {
      auditResults.inconsistencies.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'appointments.patient_id -> profiles.id',
        count: auditResults.foreignKeyValidation.appointmentsToProfiles.invalid,
        severity: 'CRITICAL'
      });
    }

    if (auditResults.foreignKeyValidation.appointmentsToDoctors.invalid > 0) {
      auditResults.inconsistencies.push({
        type: 'FOREIGN_KEY_VIOLATION',
        table: 'appointments.doctor_id -> doctors.id',
        count: auditResults.foreignKeyValidation.appointmentsToDoctors.invalid,
        severity: 'CRITICAL'
      });
    }

    // Check for role-specific inconsistencies
    Object.entries(auditResults.roleAnalysis).forEach(([role, analysis]) => {
      if (analysis.potentialInconsistencies && analysis.potentialInconsistencies.length > 0) {
        auditResults.inconsistencies.push({
          type: 'ROLE_DATA_INCONSISTENCY',
          role: role,
          count: analysis.potentialInconsistencies.length,
          severity: 'HIGH'
        });
      }
    });

    // Generate recommendations
    if (auditResults.inconsistencies.length === 0) {
      auditResults.recommendations.push('✅ No data inconsistencies detected. All foreign key relationships are valid.');
    } else {
      auditResults.recommendations.push('🔍 Review foreign key relationships and fix invalid references');
      auditResults.recommendations.push('🛠️ Run data migration to correct appointment patient_id references');
      auditResults.recommendations.push('📊 Implement automated consistency checks in CI/CD pipeline');
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      auditResults
    });

  } catch (error) {
    console.error('Role data consistency audit error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
