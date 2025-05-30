import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/services/[id]/doctors
 * Get doctors associated with a specific service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: serviceId } = params;

    if (!serviceId) {
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

    // Get doctors associated with this service
    const { data: doctorServices, error } = await supabase
      .from('doctor_services')
      .select(`
        doctor_id,
        profiles!doctor_services_doctor_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        doctors!doctor_services_doctor_id_fkey(
          id,
          specialization,
          consultation_fee,
          is_available,
          organization_id
        )
      `)
      .eq('service_id', serviceId);

    if (error) {
      console.error('Error fetching service doctors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch service doctors' },
        { status: 500 }
      );
    }

    // Transform the data
    const doctors = doctorServices?.map(ds => ({
      id: ds.doctors?.id,
      profile_id: ds.doctor_id,
      name: `${ds.profiles?.first_name} ${ds.profiles?.last_name}`,
      email: ds.profiles?.email,
      specialization: ds.doctors?.specialization,
      consultation_fee: ds.doctors?.consultation_fee,
      is_available: ds.doctors?.is_available,
      organization_id: ds.doctors?.organization_id
    })).filter(doctor => doctor.id) || [];

    return NextResponse.json({
      success: true,
      doctors
    });

  } catch (error) {
    console.error('Error in GET /api/services/[id]/doctors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services/[id]/doctors
 * Associate a doctor with a service
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: serviceId } = params;
    const body = await request.json();
    const { doctor_id } = body;

    if (!serviceId || !doctor_id) {
      return NextResponse.json(
        { error: 'Service ID and doctor ID are required' },
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

    // Verify service exists and belongs to user's organization
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('organization_id')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // For admin users, ensure they can only manage services in their organization
    if (profile.role === 'admin' && profile.organization_id !== service.organization_id) {
      return NextResponse.json(
        { error: 'Cannot manage services from other organizations' },
        { status: 403 }
      );
    }

    // Verify doctor exists and belongs to the same organization
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('organization_id')
      .eq('profile_id', doctor_id)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    if (doctor.organization_id !== service.organization_id) {
      return NextResponse.json(
        { error: 'Doctor and service must belong to the same organization' },
        { status: 400 }
      );
    }

    // Check if association already exists
    const { data: existing, error: existingError } = await supabase
      .from('doctor_services')
      .select('doctor_id, service_id')
      .eq('doctor_id', doctor_id)
      .eq('service_id', serviceId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Doctor is already associated with this service' },
        { status: 400 }
      );
    }

    // Create the association
    const { data: association, error } = await supabase
      .from('doctor_services')
      .insert({
        doctor_id,
        service_id: serviceId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating doctor-service association:', error);
      return NextResponse.json(
        { error: 'Failed to create association' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      association
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/services/[id]/doctors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/[id]/doctors
 * Remove doctor association from a service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: serviceId } = params;
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');

    if (!serviceId || !doctorId) {
      return NextResponse.json(
        { error: 'Service ID and doctor ID are required' },
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

    // Verify service exists and belongs to user's organization
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('organization_id')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // For admin users, ensure they can only manage services in their organization
    if (profile.role === 'admin' && profile.organization_id !== service.organization_id) {
      return NextResponse.json(
        { error: 'Cannot manage services from other organizations' },
        { status: 403 }
      );
    }

    // Remove the association
    const { error } = await supabase
      .from('doctor_services')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('service_id', serviceId);

    if (error) {
      console.error('Error removing doctor-service association:', error);
      return NextResponse.json(
        { error: 'Failed to remove association' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Doctor association removed successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/services/[id]/doctors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
