import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/locations
 * Fetch locations for an organization with filtering support
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const city = searchParams.get('city');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query
    let query = supabase
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    // Apply filters
    if (city) {
      query = query.eq('city', city);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    } else if (!status) {
      // If no status filter, show all (including inactive for admin management)
      // This is different from the original behavior which only showed active
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.limit(limit);

    const { data: locations, error } = await query;

    if (error) {
      console.error('Error fetching locations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      locations: locations || []
    });

  } catch (error) {
    console.error('Unexpected error in locations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations
 * Create a new location
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      address,
      city,
      postal_code,
      phone,
      email,
      description,
      organization_id,
      is_active = true
    } = body;

    // Validation
    if (!name || !address || !organization_id) {
      return NextResponse.json(
        { error: 'Name, address, and organization_id are required' },
        { status: 400 }
      );
    }

    // Email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin access to the organization
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

    // For admin users, ensure they can only create locations in their organization
    if (profile.role === 'admin' && profile.organization_id !== organization_id) {
      return NextResponse.json(
        { error: 'Cannot create locations for other organizations' },
        { status: 403 }
      );
    }

    // Create the location
    const { data: location, error } = await supabase
      .from('locations')
      .insert({
        name,
        address,
        city,
        postal_code,
        phone,
        email,
        description,
        organization_id,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return NextResponse.json(
        { error: 'Failed to create location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      location
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
