import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/analytics
 * Get comprehensive analytics data for SuperAdmin dashboard
 * Provides system-wide metrics, trends, and performance indicators
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';

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
        { error: 'Insufficient permissions. SuperAdmin access required.' },
        { status: 403 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get overview metrics
    const [
      organizationsResult,
      usersResult,
      appointmentsResult,
      revenueResult
    ] = await Promise.all([
      // Total organizations
      supabase
        .from('organizations')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString()),

      // Total users
      supabase
        .from('profiles')
        .select('id, role, created_at, updated_at')
        .gte('created_at', startDate.toISOString()),

      // Total appointments
      supabase
        .from('appointments')
        .select('id, status, created_at, appointment_date')
        .gte('appointment_date', startDate.toISOString().split('T')[0]),

      // Revenue calculation (mock data for now)
      supabase
        .from('appointments')
        .select('id, status, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
    ]);

    // Calculate previous period for trends
    const prevStartDate = new Date(startDate);
    const prevEndDate = new Date(startDate);
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);

    const [
      prevOrganizations,
      prevUsers,
      prevAppointments
    ] = await Promise.all([
      supabase
        .from('organizations')
        .select('id')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),

      supabase
        .from('profiles')
        .select('id')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString()),

      supabase
        .from('appointments')
        .select('id')
        .gte('appointment_date', prevStartDate.toISOString().split('T')[0])
        .lt('appointment_date', startDate.toISOString().split('T')[0])
    ]);

    // Calculate trends
    const currentOrgs = organizationsResult.data?.length || 0;
    const prevOrgs = prevOrganizations.data?.length || 0;
    const orgGrowth = prevOrgs > 0 ? ((currentOrgs - prevOrgs) / prevOrgs) * 100 : 0;

    const currentUsers = usersResult.data?.length || 0;
    const prevUsersCount = prevUsers.data?.length || 0;
    const userGrowth = prevUsersCount > 0 ? ((currentUsers - prevUsersCount) / prevUsersCount) * 100 : 0;

    const currentAppointments = appointmentsResult.data?.length || 0;
    const prevAppointmentsCount = prevAppointments.data?.length || 0;
    const appointmentGrowth = prevAppointmentsCount > 0 ? ((currentAppointments - prevAppointmentsCount) / prevAppointmentsCount) * 100 : 0;

    // Mock revenue calculation (in a real system, this would come from payment data)
    const avgRevenuePerAppointment = 75; // Average appointment cost
    const completedAppointments = appointmentsResult.data?.filter(apt => apt.status === 'completed').length || 0;
    const totalRevenue = completedAppointments * avgRevenuePerAppointment;
    const revenueGrowth = appointmentGrowth; // Simplified correlation

    // Get user metrics by role
    const usersByRole = usersResult.data?.reduce((acc: any, user: any) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    const userMetrics = Object.entries(usersByRole).map(([role, count]) => ({
      role,
      count: count as number,
      activeCount: count as number, // Simplified - in real system, check last_activity
      growthRate: userGrowth // Simplified - would calculate per role
    }));

    // Get appointment metrics by date
    const appointmentsByDate = appointmentsResult.data?.reduce((acc: any, apt: any) => {
      const date = apt.appointment_date;
      if (!acc[date]) {
        acc[date] = { scheduled: 0, completed: 0, cancelled: 0, noShow: 0, revenue: 0 };
      }
      
      switch (apt.status) {
        case 'scheduled':
        case 'confirmed':
          acc[date].scheduled++;
          break;
        case 'completed':
          acc[date].completed++;
          acc[date].revenue += avgRevenuePerAppointment;
          break;
        case 'cancelled':
          acc[date].cancelled++;
          break;
        case 'no_show':
          acc[date].noShow++;
          break;
      }
      
      return acc;
    }, {}) || {};

    const appointmentMetrics = Object.entries(appointmentsByDate).map(([date, metrics]: [string, any]) => ({
      date,
      ...metrics
    }));

    // Get organization metrics
    const { data: allOrganizations } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        subscription_plan,
        created_at,
        updated_at
      `);

    const organizationMetrics = await Promise.all(
      (allOrganizations || []).slice(0, 10).map(async (org: any) => {
        const [orgUsers, orgAppointments] = await Promise.all([
          supabase
            .from('profiles')
            .select('id')
            .eq('organization_id', org.id),
          
          supabase
            .from('appointments')
            .select('id, status')
            .eq('organization_id', org.id)
            .gte('appointment_date', startDate.toISOString().split('T')[0])
        ]);

        const completedOrgAppointments = orgAppointments.data?.filter(apt => apt.status === 'completed').length || 0;
        const orgRevenue = completedOrgAppointments * avgRevenuePerAppointment;

        return {
          id: org.id,
          name: org.name,
          userCount: orgUsers.data?.length || 0,
          appointmentCount: orgAppointments.data?.length || 0,
          revenue: orgRevenue,
          subscriptionPlan: org.subscription_plan || 'basic',
          status: 'active' as const, // Simplified
          lastActivity: org.updated_at || org.created_at
        };
      })
    );

    // Mock system health data (in production, this would come from monitoring systems)
    const systemHealth = {
      apiResponseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
      databaseConnections: Math.floor(Math.random() * 20) + 10, // 10-30 connections
      errorRate: Math.random() * 2, // 0-2% error rate
      uptime: 99.9, // 99.9% uptime
      memoryUsage: Math.floor(Math.random() * 30) + 40, // 40-70% memory usage
      cpuUsage: Math.floor(Math.random() * 20) + 10 // 10-30% CPU usage
    };

    // Get total counts for overview
    const [totalOrgs, totalUsers, totalAppointments] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true })
    ]);

    const analyticsData = {
      overview: {
        totalOrganizations: totalOrgs.count || 0,
        totalUsers: totalUsers.count || 0,
        totalAppointments: totalAppointments.count || 0,
        totalRevenue: totalRevenue,
        activeUsers: totalUsers.count || 0, // Simplified
        systemUptime: systemHealth.uptime
      },
      trends: {
        userGrowth,
        appointmentGrowth,
        revenueGrowth,
        organizationGrowth: orgGrowth
      },
      organizationMetrics,
      appointmentMetrics,
      userMetrics,
      systemHealth
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timeRange,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/superadmin/analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
