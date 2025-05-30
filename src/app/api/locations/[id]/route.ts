import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/locations/[id]
 * Get a specific location by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
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

    // Get the location
    const { data: location, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching location:', error);
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      location
    });

  } catch (error) {
    console.error('Error in GET /api/locations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/locations/[id]
 * Update a location
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      name,
      address,
      city,
      postal_code,
      phone,
      email,
      description,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Validation
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Location name cannot be empty' },
        { status: 400 }
      );
    }

    if (address && address.trim().length === 0) {
      return NextResponse.json(
        { error: 'Address cannot be empty' },
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

    // Verify user has admin access
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

    // Get the existing location to verify ownership
    const { data: existingLocation, error: fetchError } = await supabase
      .from('locations')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // For admin users, ensure they can only update locations in their organization
    if (profile.role === 'admin' && profile.organization_id !== existingLocation.organization_id) {
      return NextResponse.json(
        { error: 'Cannot update locations from other organizations' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update the location
    const { data: location, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      location
    });

  } catch (error) {
    console.error('Error in PUT /api/locations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]
 * Delete a location
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
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

    // Verify user has admin access
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

    // Get the existing location to verify ownership
    const { data: existingLocation, error: fetchError } = await supabase
      .from('locations')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // For admin users, ensure they can only delete locations in their organization
    if (profile.role === 'admin' && profile.organization_id !== existingLocation.organization_id) {
      return NextResponse.json(
        { error: 'Cannot delete locations from other organizations' },
        { status: 403 }
      );
    }

    // Check if location is being used in appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('location_id', id)
      .limit(1);

    if (appointmentsError) {
      console.error('Error checking appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to verify location usage' },
        { status: 500 }
      );
    }

    if (appointments && appointments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location that has associated appointments. Deactivate it instead.' },
        { status: 400 }
      );
    }

    // Delete the location
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting location:', error);
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/locations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
