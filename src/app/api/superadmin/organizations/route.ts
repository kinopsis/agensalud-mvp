import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/organizations
 * Fetch organizations with comprehensive details for SuperAdmin management
 * Includes user counts, appointment counts, and activity status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = await createClient();

    // Get current user and verify SuperAdmin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is SuperAdmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Build base query
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        description,
        website,
        phone,
        email,
        address,
        city,
        country,
        is_active,
        created_at,
        subscription_plan
      `);

    // Apply filters
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (plan) {
      query = query.eq('subscription_plan', plan);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Execute query
    const { data: organizations, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    // Get user and appointment counts for each organization
    const orgIds = organizations?.map(org => org.id) || [];

    let orgStats: Record<string, { user_count: number; appointment_count: number }> = {};

    if (orgIds.length > 0) {
      // Get user counts
      const { data: userCounts } = await supabase
        .from('profiles')
        .select('organization_id')
        .in('organization_id', orgIds);

      // Get appointment counts
      const { data: appointmentCounts } = await supabase
        .from('appointments')
        .select('organization_id')
        .in('organization_id', orgIds);

      // Process counts
      orgIds.forEach(orgId => {
        const userCount = userCounts?.filter(u => u.organization_id === orgId).length || 0;
        const appointmentCount = appointmentCounts?.filter(a => a.organization_id === orgId).length || 0;

        orgStats[orgId] = {
          user_count: userCount,
          appointment_count: appointmentCount
        };
      });
    }

    // Transform data to include counts
    const transformedOrganizations = organizations?.map(org => ({
      ...org,
      user_count: orgStats[org.id]?.user_count || 0,
      appointment_count: orgStats[org.id]?.appointment_count || 0
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedOrganizations
    });

  } catch (error) {
    console.error('Error in superadmin organizations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/organizations
 * Create a new organization (SuperAdmin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      website,
      phone,
      email,
      address,
      city,
      country,
      subscription_plan = 'basic',
      admin_first_name,
      admin_last_name,
      admin_email,
      admin_phone
    } = body;

    const supabase = await createClient();

    // Get current user and verify SuperAdmin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is SuperAdmin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // If admin user data is provided, validate it
    if (admin_first_name || admin_last_name || admin_email) {
      if (!admin_first_name || !admin_last_name || !admin_email) {
        return NextResponse.json(
          { error: 'Admin first name, last name, and email are required when creating admin user' },
          { status: 400 }
        );
      }

      // Check if admin email is already registered
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', admin_email)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Admin email is already registered' },
          { status: 400 }
        );
      }
    }

    // Check if slug is unique
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 400 }
      );
    }

    // Create organization
    const { data: organization, error: createError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        description,
        website,
        phone,
        email,
        address,
        city,
        country,
        subscription_plan,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating organization:', createError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    let adminUser = null;

    // Create admin user if data is provided
    if (admin_first_name && admin_last_name && admin_email) {
      try {
        // Generate temporary password
        const tempPassword = generateTemporaryPassword();

        // Create admin user account using Supabase Auth Admin API
        const { data: newAdminUser, error: adminUserError } = await supabase.auth.admin.createUser({
          email: admin_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: admin_first_name,
            last_name: admin_last_name,
            role: 'admin',
            organization_id: organization.id
          }
        });

        if (adminUserError) {
          console.error('Error creating admin user:', adminUserError);
          // Don't rollback organization, just log the error
          console.warn('Organization created but admin user creation failed');
        } else {
          // Create admin profile
          const { error: profileCreateError } = await supabase
            .from('profiles')
            .insert({
              id: newAdminUser.user.id,
              email: admin_email,
              first_name: admin_first_name,
              last_name: admin_last_name,
              phone: admin_phone,
              role: 'admin',
              organization_id: organization.id,
              is_active: true
            });

          if (profileCreateError) {
            console.error('Error creating admin profile:', profileCreateError);
            // Clean up user account
            await supabase.auth.admin.deleteUser(newAdminUser.user.id);
          } else {
            adminUser = {
              id: newAdminUser.user.id,
              email: admin_email,
              first_name: admin_first_name,
              last_name: admin_last_name,
              temporary_password: tempPassword
            };
          }
        }
      } catch (adminError) {
        console.error('Error in admin user creation process:', adminError);
        // Continue without failing the organization creation
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        organization,
        admin_user: adminUser
      },
      message: adminUser
        ? 'Organization and admin user created successfully'
        : 'Organization created successfully'
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate a temporary password for new admin users
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
