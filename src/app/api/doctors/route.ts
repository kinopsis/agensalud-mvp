import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/doctors
 * Get doctors for an organization, optionally filtered by service
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const serviceId = searchParams.get('serviceId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const serviceSupabase = createServiceClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let doctors;

    if (serviceId) {
      // First get doctor profile IDs who can provide the specific service
      // Use service role client to bypass RLS for this internal query

      const { data: doctorServices, error: serviceError } = await serviceSupabase
        .from('doctor_services')
        .select('doctor_id')
        .eq('service_id', serviceId);

      console.log(`DEBUG: Doctor services query - Service: ${serviceId}, Results: ${doctorServices?.length || 0}, Error: ${serviceError?.message || 'none'}`);

      if (serviceError) {
        console.error('Error fetching doctor services:', serviceError);
        return NextResponse.json(
          { error: 'Failed to fetch doctor services' },
          { status: 500 }
        );
      }

      const doctorProfileIds = doctorServices?.map(ds => ds.doctor_id) || [];
      console.log(`DEBUG: Doctor profile IDs: ${JSON.stringify(doctorProfileIds)}`);

      if (doctorProfileIds.length === 0) {
        console.log(`DEBUG: No doctor profile IDs found for service ${serviceId}`);
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Filter doctors who can provide the specific service
      // Use service role client to bypass RLS for profile access
      const { data: filteredDoctors, error } = await serviceSupabase
        .from('doctors')
        .select(`
          id,
          specialization,
          consultation_fee,
          is_available,
          profiles(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_available', true)
        .in('profile_id', doctorProfileIds);

      console.log(`DEBUG: Doctors query - Org: ${organizationId}, Profile IDs: ${doctorProfileIds.length}, Results: ${filteredDoctors?.length || 0}, Error: ${error?.message || 'none'}`);

      if (filteredDoctors && filteredDoctors.length > 0) {
        console.log(`DEBUG: Sample doctor data:`, JSON.stringify(filteredDoctors[0], null, 2));
      }

      doctors = { data: filteredDoctors, error };
    } else {
      // Return all available doctors
      // Use service role client to bypass RLS for profile access
      doctors = await serviceSupabase
        .from('doctors')
        .select(`
          id,
          specialization,
          consultation_fee,
          is_available,
          profiles(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_available', true);
    }

    const { data: doctorsData, error } = doctors;

    if (error) {
      console.error('Error fetching doctors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch doctors' },
        { status: 500 }
      );
    }



    const filteredDoctors = doctorsData?.filter(doctor => doctor.profiles) || [];
    const mappedDoctors = filteredDoctors.map(doctor => ({
      id: doctor.id,
      name: `${doctor.profiles.first_name} ${doctor.profiles.last_name}`,
      specialization: doctor.specialization,
      consultation_fee: doctor.consultation_fee,
      is_available: doctor.is_available,
      profiles: doctor.profiles
    }));

    console.log(`DEBUG: API Response - Service: ${serviceId || 'ALL'}, Doctors found: ${mappedDoctors.length}`);

    return NextResponse.json({
      success: true,
      data: mappedDoctors
    });

  } catch (error) {
    console.error('Doctors API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
