import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/users
 * Fetch users with role-based filtering and search
 * Supports Admin and SuperAdmin access with proper multi-tenant isolation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin or superadmin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        organization_id,
        created_at,
        phone,
        is_active,
        last_sign_in_at,
        organizations!inner(
          name,
          slug
        )
      `);

    // Apply organization filter based on role
    if (profile.role === 'admin') {
      // Admin can only see users from their organization
      query = query.eq('organization_id', profile.organization_id);
    } else if (profile.role === 'superadmin' && organizationId) {
      // SuperAdmin can filter by specific organization
      query = query.eq('organization_id', organizationId);
    }

    // Apply additional filters
    if (role) {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Apply search filter
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Execute query
    const { data: users, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Transform data to include organization name
    const transformedUsers = users?.map(user => {
      const organization = Array.isArray(user.organizations) && user.organizations.length > 0
        ? user.organizations[0]
        : null;

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        organization_id: user.organization_id,
        organization_name: organization?.name,
        created_at: user.created_at,
        phone: user.phone,
        is_active: user.is_active,
        last_sign_in_at: user.last_sign_in_at
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: transformedUsers
    });

  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user with proper role-based permissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, first_name, last_name, role, organization_id, phone } = body;

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin or superadmin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate organization access
    if (profile.role === 'admin' && organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Cannot create users for other organizations' },
        { status: 403 }
      );
    }

    // Create user in auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        first_name,
        last_name,
        role,
        organization_id: organization_id || profile.organization_id,
        phone,
        is_active: true
      });

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.user.id,
        email,
        first_name,
        last_name,
        role
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
