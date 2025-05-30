import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/users
 * Fetch system-wide users for SuperAdmin management
 * Includes comprehensive user details across all organizations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const activity = searchParams.get('activity');
    const limit = parseInt(searchParams.get('limit') || '100');

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

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Execute query
    const { data: users, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get appointment counts for doctors and patients
    const doctorIds = users?.filter(u => u.role === 'doctor').map(u => u.id) || [];
    const patientIds = users?.filter(u => u.role === 'patient').map(u => u.id) || [];

    let appointmentCounts: Record<string, number> = {};

    if (doctorIds.length > 0) {
      const { data: doctorAppointments } = await supabase
        .from('appointments')
        .select('doctor_id')
        .in('doctor_id', doctorIds);

      doctorIds.forEach(doctorId => {
        appointmentCounts[doctorId] = doctorAppointments?.filter(a => a.doctor_id === doctorId).length || 0;
      });
    }

    if (patientIds.length > 0) {
      const { data: patientAppointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .in('patient_id', patientIds);

      patientIds.forEach(patientId => {
        appointmentCounts[patientId] = patientAppointments?.filter(a => a.patient_id === patientId).length || 0;
      });
    }

    // Transform data
    let transformedUsers = users?.map(user => {
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
        organization_slug: organization?.slug,
        created_at: user.created_at,
        phone: user.phone,
        is_active: user.is_active,
        last_sign_in_at: user.last_sign_in_at,
        appointment_count: appointmentCounts[user.id] || 0
      };
    }) || [];

    // Apply activity filter
    if (activity) {
      const now = new Date();
      transformedUsers = transformedUsers.filter(user => {
        if (!user.last_sign_in_at) return activity === 'inactive';

        const lastSignIn = new Date(user.last_sign_in_at);
        const daysSince = Math.floor((now.getTime() - lastSignIn.getTime()) / (24 * 60 * 60 * 1000));

        switch (activity) {
          case 'today': return daysSince === 0;
          case 'week': return daysSince <= 7;
          case 'month': return daysSince <= 30;
          case 'inactive': return daysSince > 30;
          default: return true;
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: transformedUsers
    });

  } catch (error) {
    console.error('Error in superadmin users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/users/bulk
 * Bulk actions on users (activate, deactivate, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userIds } = body;

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

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'activate':
        updateData = { is_active: true };
        break;
      case 'deactivate':
        updateData = { is_active: false };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Prevent SuperAdmins from deactivating themselves or other SuperAdmins
    if (action === 'deactivate') {
      const { data: targetUsers } = await supabase
        .from('profiles')
        .select('id, role')
        .in('id', userIds);

      const superAdminIds = targetUsers?.filter(u => u.role === 'superadmin').map(u => u.id) || [];

      if (superAdminIds.length > 0) {
        return NextResponse.json(
          { error: 'Cannot deactivate SuperAdmin users' },
          { status: 403 }
        );
      }
    }

    // Update users
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .in('id', userIds);

    if (updateError) {
      console.error('Error updating users:', updateError);
      return NextResponse.json(
        { error: 'Failed to update users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}d ${userIds.length} users`
    });

  } catch (error) {
    console.error('Error in bulk user update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
