import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const revalidate = 0;


/**
 * GET /api/dashboard/superadmin/stats
 * Fetch system-wide statistics for SuperAdmin dashboard
 * Includes organizations, users, appointments, and system health
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get date ranges for trend calculations
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // Fetch total organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, is_active, created_at');

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations data' },
        { status: 500 }
      );
    }

    // Fetch total users across all organizations
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, created_at');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users data' },
        { status: 500 }
      );
    }

    // Fetch total appointments across all organizations
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, created_at');

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments data' },
        { status: 500 }
      );
    }

    // Calculate organization statistics
    const totalOrganizations = organizations?.length || 0;
    const activeOrganizations = organizations?.filter(org => org.is_active).length || 0;

    const orgsThisMonth = organizations?.filter(org => {
      if (!org.created_at || !thisMonth) return false;
      try {
        const createdDate = new Date(org.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= thisMonth;
      } catch {
        return false;
      }
    }).length || 0;

    const orgsLastMonth = organizations?.filter(org => {
      if (!org.created_at || !lastMonth || !lastMonthEnd) return false;
      try {
        const createdDate = new Date(org.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= lastMonth && createdDate <= lastMonthEnd;
      } catch {
        return false;
      }
    }).length || 0;

    const organizationsTrend = orgsLastMonth > 0
      ? Math.round(((orgsThisMonth - orgsLastMonth) / orgsLastMonth) * 100)
      : orgsThisMonth > 0 ? 100 : 0;

    // Calculate user statistics
    const totalUsers = users?.length || 0;

    const usersThisMonth = users?.filter(user => {
      if (!user.created_at || !thisMonth) return false;
      try {
        const createdDate = new Date(user.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= thisMonth;
      } catch {
        return false;
      }
    }).length || 0;

    const usersLastMonth = users?.filter(user => {
      if (!user.created_at || !lastMonth || !lastMonthEnd) return false;
      try {
        const createdDate = new Date(user.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= lastMonth && createdDate <= lastMonthEnd;
      } catch {
        return false;
      }
    }).length || 0;

    const usersTrend = usersLastMonth > 0
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : usersThisMonth > 0 ? 100 : 0;

    // Calculate appointment statistics
    const totalAppointments = appointments?.length || 0;

    const appointmentsThisMonth = appointments?.filter(apt => {
      if (!apt.created_at || !thisMonth) return false;
      try {
        const createdDate = new Date(apt.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= thisMonth;
      } catch {
        return false;
      }
    }).length || 0;

    const appointmentsLastMonth = appointments?.filter(apt => {
      if (!apt.created_at || !lastMonth || !lastMonthEnd) return false;
      try {
        const createdDate = new Date(apt.created_at).toISOString().split('T')[0];
        return createdDate && createdDate >= lastMonth && createdDate <= lastMonthEnd;
      } catch {
        return false;
      }
    }).length || 0;

    const appointmentsTrend = appointmentsLastMonth > 0
      ? Math.round(((appointmentsThisMonth - appointmentsLastMonth) / appointmentsLastMonth) * 100)
      : appointmentsThisMonth > 0 ? 100 : 0;

    // Calculate system health (simplified algorithm)
    let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';

    if (activeOrganizations === 0) {
      systemHealth = 'critical';
    } else if (activeOrganizations / totalOrganizations < 0.5) {
      systemHealth = 'warning';
    } else if (activeOrganizations / totalOrganizations < 0.8) {
      systemHealth = 'good';
    }

    // If there's significant negative growth, downgrade health
    if (organizationsTrend < -20 || usersTrend < -20 || appointmentsTrend < -30) {
      systemHealth = systemHealth === 'excellent' ? 'good' :
                   systemHealth === 'good' ? 'warning' : 'critical';
    }

    const stats = {
      totalOrganizations,
      totalUsers,
      totalAppointments,
      activeOrganizations,
      organizationsTrend,
      usersTrend,
      appointmentsTrend,
      systemHealth
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error in SuperAdmin stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
