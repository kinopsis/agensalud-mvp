import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * DEBUG ENDPOINT: Laura Gómez Patients Access Investigation
 * Investigates the discrepancy between dashboard and patients menu for Laura Gómez
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      investigation: 'Laura Gómez Patients Access Discrepancy',
      tests: {} as any
    };

    // Test 1: Verify Laura's profile
    try {
      const { data: lauraProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'laura.gomez.new@visualcare.com')
        .single();

      diagnostics.tests.laura_profile = {
        success: !profileError,
        data: lauraProfile,
        error: profileError?.message
      };
    } catch (err) {
      diagnostics.tests.laura_profile = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 2: Check patients table directly
    try {
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select(`
          id,
          profile_id,
          organization_id,
          created_at,
          profiles!inner(
            first_name,
            last_name,
            email,
            phone,
            is_active
          )
        `)
        .eq('organization_id', '927cecbe-d9e5-43a4-b9d0-25f942ededc4');

      diagnostics.tests.patients_query = {
        success: !patientsError,
        count: patientsData?.length || 0,
        data: patientsData,
        error: patientsError?.message
      };
    } catch (err) {
      diagnostics.tests.patients_query = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 3: Check dashboard stats query
    try {
      const { data: dashboardPatients, error: dashboardError } = await supabase
        .from('patients')
        .select(`
          id,
          created_at,
          profiles!patients_profile_id_fkey(first_name, last_name)
        `)
        .eq('organization_id', '927cecbe-d9e5-43a4-b9d0-25f942ededc4');

      diagnostics.tests.dashboard_query = {
        success: !dashboardError,
        count: dashboardPatients?.length || 0,
        data: dashboardPatients,
        error: dashboardError?.message
      };
    } catch (err) {
      diagnostics.tests.dashboard_query = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 4: Check profiles with patient role
    try {
      const { data: patientProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, organization_id')
        .eq('organization_id', '927cecbe-d9e5-43a4-b9d0-25f942ededc4')
        .eq('role', 'patient');

      diagnostics.tests.patient_profiles = {
        success: !profilesError,
        count: patientProfiles?.length || 0,
        data: patientProfiles,
        error: profilesError?.message
      };
    } catch (err) {
      diagnostics.tests.patient_profiles = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 5: Check missing patient records
    try {
      const { data: missingPatients, error: missingError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          organization_id
        `)
        .eq('organization_id', '927cecbe-d9e5-43a4-b9d0-25f942ededc4')
        .eq('role', 'patient')
        .not('id', 'in', `(${
          diagnostics.tests.patients_query?.data?.map((p: any) => `'${p.profile_id}'`).join(',') || "''"
        })`);

      diagnostics.tests.missing_patient_records = {
        success: !missingError,
        count: missingPatients?.length || 0,
        data: missingPatients,
        error: missingError?.message,
        explanation: 'Profiles with patient role but no corresponding patient record'
      };
    } catch (err) {
      diagnostics.tests.missing_patient_records = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 6: Simulate API call with organization filter
    try {
      const params = new URLSearchParams();
      params.append('organizationId', '927cecbe-d9e5-43a4-b9d0-25f942ededc4');
      
      diagnostics.tests.api_simulation = {
        url: `/api/patients?${params.toString()}`,
        organization_id: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
        expected_behavior: 'Should return 1 patient (María García) if working correctly'
      };
    } catch (err) {
      diagnostics.tests.api_simulation = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        dashboard_shows: diagnostics.tests.dashboard_query?.count || 0,
        patients_menu_should_show: diagnostics.tests.patients_query?.count || 0,
        profiles_with_patient_role: diagnostics.tests.patient_profiles?.count || 0,
        missing_patient_records: diagnostics.tests.missing_patient_records?.count || 0
      },
      root_cause_analysis: {
        issue: 'Profiles with patient role but no corresponding patient record',
        affected_users: diagnostics.tests.missing_patient_records?.data || [],
        solution: 'Create missing patient records for Juan Pérez and Isabel Díaz'
      }
    });

  } catch (error) {
    console.error('Error in Laura patients access debug:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
