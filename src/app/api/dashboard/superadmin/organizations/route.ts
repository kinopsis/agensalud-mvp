import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/dashboard/superadmin/organizations
 * Fetch organizations overview for SuperAdmin dashboard
 * Includes user counts, appointment counts, and activity status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

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
        { error: 'Insufficient permissions - SuperAdmin required' },
        { status: 403 }
      );
    }

    // Fetch organizations with basic info
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get organization IDs for batch queries
    const orgIds = organizations.map(org => org.id);

    // Fetch user counts for each organization
    const { data: userCounts, error: usersError } = await supabase
      .from('profiles')
      .select('organization_id')
      .in('organization_id', orgIds);

    if (usersError) {
      console.error('Error fetching user counts:', usersError);
    }

    // Fetch appointment counts for each organization
    const { data: appointmentCounts, error: appointmentsError } = await supabase
      .from('appointments')
      .select('organization_id')
      .in('organization_id', orgIds);

    if (appointmentsError) {
      console.error('Error fetching appointment counts:', appointmentsError);
    }

    // Fetch recent activity (last appointment or user registration)
    const { data: recentActivity, error: activityError } = await supabase
      .from('appointments')
      .select('organization_id, created_at')
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false });

    if (activityError) {
      console.error('Error fetching recent activity:', activityError);
    }

    // Process the data to create organization overview
    const organizationOverviews = organizations.map(org => {
      // Count users for this organization
      const users_count = userCounts?.filter(user => user.organization_id === org.id).length || 0;

      // Count appointments for this organization
      const appointments_count = appointmentCounts?.filter(apt => apt.organization_id === org.id).length || 0;

      // Find last activity for this organization
      const lastActivity = recentActivity?.find(activity => activity.organization_id === org.id);
      const last_activity = lastActivity?.created_at || org.updated_at;

      // Determine status
      let status: 'active' | 'inactive' | 'suspended' = 'inactive';
      if (org.is_active) {
        // Consider active if there's been activity in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const lastActivityDate = new Date(last_activity);

        status = lastActivityDate > thirtyDaysAgo ? 'active' : 'inactive';
      } else {
        status = 'suspended';
      }

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        users_count,
        appointments_count,
        last_activity,
        status,
        created_at: org.created_at
      };
    });

    return NextResponse.json({
      success: true,
      data: organizationOverviews
    });

  } catch (error) {
    console.error('Error in SuperAdmin organizations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
