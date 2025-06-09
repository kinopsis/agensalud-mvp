import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DEBUG ENDPOINT: Frontend Simulation
 * Simulates the exact frontend call to identify authentication issues
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      investigation: 'Frontend Simulation Debug',
      tests: {} as any
    };

    const visualcareOrgId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

    // Test 1: Check current authentication state
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      diagnostics.tests.auth_state = {
        success: !authError,
        user_id: user?.id || null,
        user_email: user?.email || null,
        error: authError?.message
      };

      if (user) {
        // Get profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        diagnostics.tests.profile_lookup = {
          success: !profileError,
          profile: profile,
          error: profileError?.message
        };
      }
    } catch (err) {
      diagnostics.tests.auth_state = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 2: Test the exact API logic from /api/patients
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        diagnostics.tests.api_logic_simulation = {
          success: false,
          step: 'authentication',
          error: 'Unauthorized - no user found'
        };
      } else {
        // Verify user has appropriate access
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, organization_id')
          .eq('id', user.id)
          .single();

        if (!profile || !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
          diagnostics.tests.api_logic_simulation = {
            success: false,
            step: 'authorization',
            error: 'Insufficient permissions',
            profile: profile
          };
        } else {
          // Determine organization filter
          let targetOrgId = visualcareOrgId;
          if (profile.role !== 'superadmin') {
            targetOrgId = profile.organization_id;
          }

          if (!targetOrgId) {
            diagnostics.tests.api_logic_simulation = {
              success: false,
              step: 'organization_validation',
              error: 'Organization ID required'
            };
          } else {
            // Build base query
            const { data: patientsData, error: patientsError } = await supabase
              .from('patients')
              .select(`
                id,
                profile_id,
                organization_id,
                created_at,
                medical_notes,
                emergency_contact_name,
                emergency_contact_phone,
                profiles!inner(
                  first_name,
                  last_name,
                  email,
                  phone,
                  date_of_birth,
                  gender,
                  address,
                  city,
                  is_active
                )
              `)
              .eq('organization_id', targetOrgId);

            diagnostics.tests.api_logic_simulation = {
              success: !patientsError,
              step: 'data_query',
              count: patientsData?.length || 0,
              data: patientsData,
              error: patientsError?.message,
              target_org_id: targetOrgId,
              user_org_id: profile.organization_id,
              user_role: profile.role
            };
          }
        }
      }
    } catch (err) {
      diagnostics.tests.api_logic_simulation = {
        success: false,
        step: 'exception',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 3: Direct patients query with organization filter
    try {
      const { data: directPatients, error: directError } = await supabase
        .from('patients')
        .select(`
          id,
          profile_id,
          organization_id,
          profiles!inner(first_name, last_name, email)
        `)
        .eq('organization_id', visualcareOrgId);

      diagnostics.tests.direct_patients_query = {
        success: !directError,
        count: directPatients?.length || 0,
        data: directPatients,
        error: directError?.message
      };
    } catch (err) {
      diagnostics.tests.direct_patients_query = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 4: Check RLS policies
    try {
      const { data: rlsOrgId } = await supabase.rpc('get_user_organization_id');
      const { data: rlsRole } = await supabase.rpc('get_user_role');

      diagnostics.tests.rls_context = {
        user_organization_id: rlsOrgId,
        user_role: rlsRole,
        expected_org_id: visualcareOrgId,
        org_match: rlsOrgId === visualcareOrgId,
        role_authorized: ['admin', 'staff', 'doctor', 'superadmin'].includes(rlsRole)
      };
    } catch (err) {
      diagnostics.tests.rls_context = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 5: Check session and cookies
    try {
      const { data: session } = await supabase.auth.getSession();
      
      diagnostics.tests.session_info = {
        has_session: !!session.session,
        access_token_present: !!session.session?.access_token,
        user_id: session.session?.user?.id,
        expires_at: session.session?.expires_at,
        token_type: session.session?.token_type
      };
    } catch (err) {
      diagnostics.tests.session_info = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        authenticated: diagnostics.tests.auth_state?.success || false,
        user_email: diagnostics.tests.auth_state?.user_email || 'Unknown',
        profile_found: diagnostics.tests.profile_lookup?.success || false,
        api_simulation_success: diagnostics.tests.api_logic_simulation?.success || false,
        api_simulation_step: diagnostics.tests.api_logic_simulation?.step || 'unknown',
        patients_count: diagnostics.tests.api_logic_simulation?.count || 0,
        direct_query_count: diagnostics.tests.direct_patients_query?.count || 0,
        rls_org_match: diagnostics.tests.rls_context?.org_match || false
      },
      root_cause_analysis: {
        issue: diagnostics.tests.api_logic_simulation?.success ? 'Data found but not reaching frontend' : 'Authentication or authorization issue',
        step_failed: diagnostics.tests.api_logic_simulation?.step,
        recommendation: diagnostics.tests.api_logic_simulation?.success 
          ? 'Check frontend component state management and rendering'
          : 'Check authentication context and session management'
      }
    });

  } catch (error) {
    console.error('Error in frontend simulation debug:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
