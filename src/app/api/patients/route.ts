import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/patients
 * Fetch patients with filtering and search capabilities
 * Supports Staff, Admin, Doctor, and SuperAdmin access with proper multi-tenant isolation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const ageRange = searchParams.get('ageRange');
    const lastVisit = searchParams.get('lastVisit');

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has appropriate access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Determine organization filter
    let targetOrgId = organizationId;
    if (profile.role !== 'superadmin') {
      targetOrgId = profile.organization_id;
    }

    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Build base query
    let query = supabase
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
      .eq('organization_id', targetOrgId);

    // Execute base query
    const { data: patientsData, error: patientsError } = await query;

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    // Get appointment counts for each patient
    const patientIds = patientsData?.map(p => p.profile_id) || [];

    let appointmentCounts: Record<string, { total: number; upcoming: number; last_appointment?: string }> = {};

    if (patientIds.length > 0) {
      // Get total appointments
      const { data: totalAppointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .in('patient_id', patientIds);

      // Get upcoming appointments
      const { data: upcomingAppointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .in('patient_id', patientIds)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .in('status', ['scheduled', 'confirmed']);

      // Get last appointment dates
      const { data: lastAppointments } = await supabase
        .from('appointments')
        .select('patient_id, appointment_date')
        .in('patient_id', patientIds)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false });

      // Process counts
      patientIds.forEach(patientId => {
        const total = totalAppointments?.filter(a => a.patient_id === patientId).length || 0;
        const upcoming = upcomingAppointments?.filter(a => a.patient_id === patientId).length || 0;
        const lastAppt = lastAppointments?.find(a => a.patient_id === patientId);

        appointmentCounts[patientId] = {
          total,
          upcoming,
          last_appointment: lastAppt?.appointment_date
        };
      });
    }

    // Transform and filter data
    let transformedPatients = patientsData?.map(patient => {
      // Debug log for transformation
      console.log('🔍 PATIENTS API DEBUG: Transforming patient', {
        patientId: patient.id,
        profilesType: Array.isArray(patient.profiles) ? 'Array' : typeof patient.profiles,
        profilesLength: Array.isArray(patient.profiles) ? patient.profiles.length : 'N/A',
        profilesContent: patient.profiles
      });

      // Handle both array and object formats for profiles
      const profile = Array.isArray(patient.profiles) && patient.profiles.length > 0
        ? patient.profiles[0]
        : (patient.profiles && typeof patient.profiles === 'object')
        ? patient.profiles
        : null;

      return {
        id: patient.id,
        profile_id: patient.profile_id,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        date_of_birth: profile?.date_of_birth,
        gender: profile?.gender,
        address: profile?.address,
        city: profile?.city,
        emergency_contact_name: patient.emergency_contact_name,
        emergency_contact_phone: patient.emergency_contact_phone,
        medical_notes: patient.medical_notes,
        created_at: patient.created_at,
        is_active: profile?.is_active || false,
        total_appointments: appointmentCounts[patient.profile_id]?.total || 0,
        upcoming_appointments: appointmentCounts[patient.profile_id]?.upcoming || 0,
        last_appointment: appointmentCounts[patient.profile_id]?.last_appointment
      };
    }) || [];

    console.log('🔍 PATIENTS API DEBUG: Transformation complete', {
      originalCount: patientsData?.length || 0,
      transformedCount: transformedPatients.length,
      firstTransformed: transformedPatients[0] ? {
        id: transformedPatients[0].id,
        name: `${transformedPatients[0].first_name} ${transformedPatients[0].last_name}`,
        email: transformedPatients[0].email,
        is_active: transformedPatients[0].is_active
      } : 'No patients transformed'
    });

    // Apply filters
    if (status === 'active') {
      transformedPatients = transformedPatients.filter(p => p.is_active);
    } else if (status === 'inactive') {
      transformedPatients = transformedPatients.filter(p => !p.is_active);
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      transformedPatients = transformedPatients.filter(p =>
        p.first_name?.toLowerCase().includes(searchTerm) ||
        p.last_name?.toLowerCase().includes(searchTerm) ||
        p.email.toLowerCase().includes(searchTerm) ||
        p.phone?.toLowerCase().includes(searchTerm)
      );
    }

    if (ageRange) {
      transformedPatients = transformedPatients.filter(p => {
        if (!p.date_of_birth) return false;

        const age = Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        switch (ageRange) {
          case '0-18': return age >= 0 && age <= 18;
          case '19-35': return age >= 19 && age <= 35;
          case '36-50': return age >= 36 && age <= 50;
          case '51-65': return age >= 51 && age <= 65;
          case '65+': return age > 65;
          default: return true;
        }
      });
    }

    if (lastVisit) {
      const now = new Date();
      transformedPatients = transformedPatients.filter(p => {
        if (!p.last_appointment) return lastVisit === 'never';

        const lastApptDate = new Date(p.last_appointment);
        const daysSince = Math.floor((now.getTime() - lastApptDate.getTime()) / (24 * 60 * 60 * 1000));

        switch (lastVisit) {
          case '30d': return daysSince <= 30;
          case '90d': return daysSince <= 90;
          case '180d': return daysSince <= 180;
          case '1y': return daysSince <= 365;
          case 'never': return false;
          default: return true;
        }
      });
    }

    console.log('🔍 PATIENTS API DEBUG: Final response', {
      success: true,
      dataCount: transformedPatients.length,
      firstPatient: transformedPatients[0] ? {
        name: `${transformedPatients[0].first_name} ${transformedPatients[0].last_name}`,
        email: transformedPatients[0].email
      } : 'No patients in final response'
    });

    return NextResponse.json({
      success: true,
      data: transformedPatients
    });

  } catch (error) {
    console.error('Error in patients API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients
 * Create a new patient record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      emergency_contact_name,
      emergency_contact_phone,
      medical_notes
    } = body;

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has appropriate access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Create user in auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: password || 'TempPassword123!', // Generate temp password if not provided
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
        role: 'patient',
        organization_id: profile.organization_id,
        phone,
        date_of_birth,
        gender,
        address,
        city,
        is_active: true
      });

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create patient profile' },
        { status: 500 }
      );
    }

    // Create patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        profile_id: newUser.user.id,
        organization_id: profile.organization_id,
        emergency_contact_name,
        emergency_contact_phone,
        medical_notes
      })
      .select()
      .single();

    if (patientError) {
      // Clean up profile and auth user if patient creation fails
      await supabase.from('profiles').delete().eq('id', newUser.user.id);
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create patient record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: patient.id,
        profile_id: newUser.user.id,
        email,
        first_name,
        last_name
      }
    });

  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
