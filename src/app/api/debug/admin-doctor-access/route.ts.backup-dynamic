import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';

/**
 * DEBUG ENDPOINT: Admin Doctor Access Diagnostics
 * Helps diagnose RLS and permission issues for Admin users accessing doctor data
 * 
 * Usage: GET /api/debug/admin-doctor-access
 * Requires: Admin or SuperAdmin role
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, organization_id, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only allow admin and superadmin to access this debug endpoint
    if (!['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions - Admin or SuperAdmin required' },
        { status: 403 }
      );
    }

    const diagnostics = {
      user_info: {
        id: user.id,
        email: user.email,
        role: profile.role,
        organization_id: profile.organization_id,
        name: `${profile.first_name} ${profile.last_name}`
      },
      tests: {}
    };

    // Test 1: Check RLS helper functions
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

    // Test 2: Direct doctors query with user client (RLS applied)
    try {
      const { data: doctorsUser, error: doctorsUserError } = await supabase
        .from('doctors')
        .select(`
          id,
          specialization,
          is_available,
          organization_id,
          profiles(id, first_name, last_name, email)
        `)
        .eq('organization_id', profile.organization_id);

      diagnostics.tests.doctors_user_client = {
        success: !doctorsUserError,
        count: doctorsUser?.length || 0,
        data: doctorsUser?.slice(0, 2), // First 2 records for debugging
        error: doctorsUserError?.message
      };
    } catch (err) {
      diagnostics.tests.doctors_user_client = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 3: Direct doctors query with service client (RLS bypassed)
    try {
      const { data: doctorsService, error: doctorsServiceError } = await serviceSupabase
        .from('doctors')
        .select(`
          id,
          specialization,
          is_available,
          organization_id,
          profiles(id, first_name, last_name, email)
        `)
        .eq('organization_id', profile.organization_id);

      diagnostics.tests.doctors_service_client = {
        success: !doctorsServiceError,
        count: doctorsService?.length || 0,
        data: doctorsService?.slice(0, 2), // First 2 records for debugging
        error: doctorsServiceError?.message
      };
    } catch (err) {
      diagnostics.tests.doctors_service_client = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 4: Check organization data
    try {
      const { data: orgData, error: orgDataError } = await supabase
        .from('organizations')
        .select('id, name, is_active')
        .eq('id', profile.organization_id)
        .single();

      diagnostics.tests.organization_data = {
        success: !orgDataError,
        data: orgData,
        error: orgDataError?.message
      };
    } catch (err) {
      diagnostics.tests.organization_data = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test 5: Check if there are any doctors in the organization
    try {
      const { data: doctorCount, error: countError } = await serviceSupabase
        .from('doctors')
        .select('id', { count: 'exact' })
        .eq('organization_id', profile.organization_id);

      diagnostics.tests.doctor_count_check = {
        success: !countError,
        total_doctors: doctorCount?.length || 0,
        error: countError?.message
      };
    } catch (err) {
      diagnostics.tests.doctor_count_check = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Summary
    const allTestsPassed = Object.values(diagnostics.tests).every(
      (test: any) => test.success
    );

    diagnostics.summary = {
      all_tests_passed: allTestsPassed,
      timestamp: new Date().toISOString(),
      recommendations: []
    };

    if (!diagnostics.tests.rls_functions?.success) {
      diagnostics.summary.recommendations.push(
        'RLS helper functions are failing - check database migrations'
      );
    }

    if (diagnostics.tests.doctors_user_client?.count === 0 && 
        diagnostics.tests.doctors_service_client?.count > 0) {
      diagnostics.summary.recommendations.push(
        'RLS policies are blocking admin access - check policy conditions'
      );
    }

    if (diagnostics.tests.doctor_count_check?.total_doctors === 0) {
      diagnostics.summary.recommendations.push(
        'No doctors found in organization - data issue'
      );
    }

    return NextResponse.json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
