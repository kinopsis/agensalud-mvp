import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * DEBUG ENDPOINT: Test /api/patients API directly
 * Simulates the exact call that the frontend makes to identify the issue
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      investigation: 'Patients API Direct Test',
      tests: {} as any
    };

    const visualcareOrgId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

    // Test 1: Direct database query (what should work)
    try {
      const { data: directQuery, error: directError } = await supabase
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
        .eq('organization_id', visualcareOrgId);

      diagnostics.tests.direct_database_query = {
        success: !directError,
        count: directQuery?.length || 0,
        data: directQuery,
        error: directError?.message
      };
    } catch (err) {
      diagnostics.tests.direct_database_query = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 2: Simulate API call with organizationId parameter
    try {
      const apiUrl = new URL('/api/patients', request.url);
      apiUrl.searchParams.set('organizationId', visualcareOrgId);
      
      const apiResponse = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });

      const apiData = await apiResponse.json();

      diagnostics.tests.api_call_simulation = {
        success: apiResponse.ok,
        status: apiResponse.status,
        count: apiData.data?.length || 0,
        data: apiData,
        url: apiUrl.toString()
      };
    } catch (err) {
      diagnostics.tests.api_call_simulation = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 3: Check authentication context
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, organization_id, first_name, last_name, email')
          .eq('id', user.id)
          .single();

        diagnostics.tests.authentication_context = {
          success: !authError,
          user_id: user.id,
          profile: profile,
          error: authError?.message
        };
      } else {
        diagnostics.tests.authentication_context = {
          success: false,
          error: 'No authenticated user found'
        };
      }
    } catch (err) {
      diagnostics.tests.authentication_context = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 4: Check RLS functions
    try {
      const { data: userOrgId, error: orgError } = await supabase
        .rpc('get_user_organization_id');
      
      const { data: userRole, error: roleError } = await supabase
        .rpc('get_user_role');

      diagnostics.tests.rls_functions = {
        success: !orgError && !roleError,
        user_organization_id: userOrgId,
        user_role: userRole,
        errors: {
          org_error: orgError?.message,
          role_error: roleError?.message
        }
      };
    } catch (err) {
      diagnostics.tests.rls_functions = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 5: Test with different parameters
    try {
      const testParams = [
        { organizationId: visualcareOrgId },
        { organizationId: visualcareOrgId, status: 'active' },
        { organizationId: visualcareOrgId, search: '' },
        {}  // No parameters
      ];

      const parameterTests = [];
      
      for (const params of testParams) {
        const testUrl = new URL('/api/patients', request.url);
        Object.entries(params).forEach(([key, value]) => {
          testUrl.searchParams.set(key, value);
        });

        try {
          const response = await fetch(testUrl.toString(), {
            method: 'GET',
            headers: {
              'Cookie': request.headers.get('Cookie') || ''
            }
          });

          const data = await response.json();

          parameterTests.push({
            params,
            success: response.ok,
            status: response.status,
            count: data.data?.length || 0,
            error: data.error || null
          });
        } catch (err) {
          parameterTests.push({
            params,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

      diagnostics.tests.parameter_variations = parameterTests;
    } catch (err) {
      diagnostics.tests.parameter_variations = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 6: Frontend simulation - exact call
    try {
      const frontendParams = new URLSearchParams();
      frontendParams.append('organizationId', visualcareOrgId);
      
      diagnostics.tests.frontend_simulation = {
        expected_url: `/api/patients?${frontendParams.toString()}`,
        organization_id: visualcareOrgId,
        note: 'This is the exact call the frontend should make'
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
        direct_query_count: diagnostics.tests.direct_database_query?.count || 0,
        api_call_count: diagnostics.tests.api_call_simulation?.count || 0,
        authenticated_user: diagnostics.tests.authentication_context?.profile?.email || 'Unknown',
        user_role: diagnostics.tests.rls_functions?.user_role || 'Unknown',
        user_org_id: diagnostics.tests.rls_functions?.user_organization_id || 'Unknown'
      },
      recommendations: [
        'Check if organizationId parameter is being passed correctly from frontend',
        'Verify authentication context is maintained in patients page',
        'Ensure RLS functions return correct values',
        'Check for any filtering that might hide results'
      ]
    });

  } catch (error) {
    console.error('Error in patients API debug:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
