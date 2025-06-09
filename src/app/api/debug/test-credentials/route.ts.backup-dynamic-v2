import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DEBUG ENDPOINT: Test Credentials Fix
 * Tests if the credentials: 'include' fix resolves the authentication issue
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      investigation: 'Credentials Fix Test',
      tests: {} as any
    };

    const visualcareOrgId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

    // Test 1: Check authentication state
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      diagnostics.tests.auth_check = {
        success: !authError,
        user_id: user?.id || null,
        user_email: user?.email || null,
        error: authError?.message
      };

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        diagnostics.tests.profile_check = {
          success: !profileError,
          profile: profile,
          error: profileError?.message
        };
      }
    } catch (err) {
      diagnostics.tests.auth_check = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 2: Test the exact patients API logic
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        diagnostics.tests.patients_api_test = {
          success: false,
          step: 'authentication',
          error: 'No authenticated user'
        };
      } else {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, organization_id')
          .eq('id', user.id)
          .single();

        if (!profile || !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
          diagnostics.tests.patients_api_test = {
            success: false,
            step: 'authorization',
            error: 'Insufficient permissions',
            profile: profile
          };
        } else {
          let targetOrgId = visualcareOrgId;
          if (profile.role !== 'superadmin') {
            targetOrgId = profile.organization_id;
          }

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

          diagnostics.tests.patients_api_test = {
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
    } catch (err) {
      diagnostics.tests.patients_api_test = {
        success: false,
        step: 'exception',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 3: Simulate frontend call with credentials
    try {
      const testUrl = new URL('/api/patients', request.url);
      testUrl.searchParams.set('organizationId', visualcareOrgId);
      
      const frontendResponse = await fetch(testUrl.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || ''
        }
      });

      const frontendData = await frontendResponse.json();

      diagnostics.tests.frontend_simulation = {
        success: frontendResponse.ok,
        status: frontendResponse.status,
        count: frontendData.data?.length || 0,
        data: frontendData,
        error: frontendData.error || null
      };
    } catch (err) {
      diagnostics.tests.frontend_simulation = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        authenticated: diagnostics.tests.auth_check?.success || false,
        user_email: diagnostics.tests.auth_check?.user_email || 'Unknown',
        profile_found: diagnostics.tests.profile_check?.success || false,
        api_test_success: diagnostics.tests.patients_api_test?.success || false,
        patients_count: diagnostics.tests.patients_api_test?.count || 0,
        frontend_simulation_success: diagnostics.tests.frontend_simulation?.success || false,
        frontend_count: diagnostics.tests.frontend_simulation?.count || 0
      },
      fix_status: {
        credentials_fix_working: diagnostics.tests.frontend_simulation?.success || false,
        issue_resolved: (diagnostics.tests.patients_api_test?.success && diagnostics.tests.frontend_simulation?.success) || false
      }
    });

  } catch (error) {
    console.error('Error in credentials test debug:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
