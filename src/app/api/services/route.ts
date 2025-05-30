import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/services
 * Fetch services for an organization with filtering support
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const category = searchParams.get('category');
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
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    query = query.limit(limit);

    const { data: services, error } = await query;

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      services: services || []
    });

  } catch (error) {
    console.error('Unexpected error in services API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Create a new service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      duration_minutes,
      price,
      category,
      organization_id,
      is_active = true
    } = body;

    // Validation
    if (!name || !duration_minutes || !organization_id) {
      return NextResponse.json(
        { error: 'Name, duration_minutes, and organization_id are required' },
        { status: 400 }
      );
    }

    if (duration_minutes < 5 || duration_minutes > 480) {
      return NextResponse.json(
        { error: 'Duration must be between 5 and 480 minutes' },
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

    // For admin users, ensure they can only create services in their organization
    if (profile.role === 'admin' && profile.organization_id !== organization_id) {
      return NextResponse.json(
        { error: 'Cannot create services for other organizations' },
        { status: 403 }
      );
    }

    // Create the service
    const { data: service, error } = await supabase
      .from('services')
      .insert({
        name,
        description,
        duration_minutes,
        price,
        category,
        organization_id,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      return NextResponse.json(
        { error: 'Failed to create service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
