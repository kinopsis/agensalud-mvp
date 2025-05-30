import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/services/[id]
 * Get a specific service by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
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

    // Get the service
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching service:', error);
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      service
    });

  } catch (error) {
    console.error('Error in GET /api/services/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/services/[id]
 * Update a service
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
      description,
      duration_minutes,
      price,
      category,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // Validation
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Service name cannot be empty' },
        { status: 400 }
      );
    }

    if (duration_minutes && (duration_minutes < 5 || duration_minutes > 480)) {
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

    // Get the existing service to verify ownership
    const { data: existingService, error: fetchError } = await supabase
      .from('services')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // For admin users, ensure they can only update services in their organization
    if (profile.role === 'admin' && profile.organization_id !== existingService.organization_id) {
      return NextResponse.json(
        { error: 'Cannot update services from other organizations' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update the service
    const { data: service, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      return NextResponse.json(
        { error: 'Failed to update service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      service
    });

  } catch (error) {
    console.error('Error in PUT /api/services/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/[id]
 * Delete a service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Service ID is required' },
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

    // Get the existing service to verify ownership
    const { data: existingService, error: fetchError } = await supabase
      .from('services')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // For admin users, ensure they can only delete services in their organization
    if (profile.role === 'admin' && profile.organization_id !== existingService.organization_id) {
      return NextResponse.json(
        { error: 'Cannot delete services from other organizations' },
        { status: 403 }
      );
    }

    // Check if service is being used in appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('service_id', id)
      .limit(1);

    if (appointmentsError) {
      console.error('Error checking appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to verify service usage' },
        { status: 500 }
      );
    }

    if (appointments && appointments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service that has associated appointments. Deactivate it instead.' },
        { status: 400 }
      );
    }

    // Delete the service
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      return NextResponse.json(
        { error: 'Failed to delete service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/services/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
