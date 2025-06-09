import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/reports/metrics
 * Fetch comprehensive system metrics for SuperAdmin reports
 * Includes overview, trends, performance, and usage data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const organizationId = searchParams.get('organizationId');
    const metric = searchParams.get('metric') || 'all';

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

    // Calculate date ranges
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
    }

    // Build organization filter
    let orgFilter = '';
    if (organizationId) {
      orgFilter = `organization_id.eq.${organizationId}`;
    }

    // Fetch overview metrics
    const [
      { data: totalUsers },
      { data: totalOrganizations },
      { data: totalAppointments },
      { data: activeUsers24h },
      { data: newUsersThisMonth }
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('organizations').select('id', { count: 'exact' }),
      supabase.from('appointments').select('id', { count: 'exact' }),
      supabase.from('profiles')
        .select('id', { count: 'exact' })
        .gte('last_sign_in_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('profiles')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
    ]);

    // Fetch trend data (simplified for demo)
    const userGrowthTrend = [
      { period: 'Esta semana', value: 45, change: 12.5 },
      { period: 'Semana pasada', value: 40, change: 8.2 },
      { period: 'Hace 2 semanas', value: 37, change: 15.1 },
      { period: 'Hace 3 semanas', value: 32, change: 5.8 }
    ];

    const appointmentVolumeTrend = [
      { period: 'Esta semana', value: 234, change: 18.3 },
      { period: 'Semana pasada', value: 198, change: 12.1 },
      { period: 'Hace 2 semanas', value: 176, change: 22.4 },
      { period: 'Hace 3 semanas', value: 144, change: 9.7 }
    ];

    const organizationGrowthTrend = [
      { period: 'Este mes', value: 3, change: 50.0 },
      { period: 'Mes pasado', value: 2, change: 100.0 },
      { period: 'Hace 2 meses', value: 1, change: 0.0 },
      { period: 'Hace 3 meses', value: 1, change: 0.0 }
    ];

    // Fetch top organizations
    const { data: organizations } = await supabase
      .from('organizations')
      .select(`
        name,
        profiles!inner(id),
        appointments!inner(id)
      `)
      .limit(5);

    const topOrganizations = organizations?.map(org => ({
      name: org.name,
      users: org.profiles?.length || 0,
      appointments: org.appointments?.length || 0
    })) || [];

    // Fetch role distribution
    const { data: roleData } = await supabase
      .from('profiles')
      .select('role');

    const roleCounts = roleData?.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {}) || {};

    const totalRoleUsers = Object.values(roleCounts).reduce((sum: number, count: number) => sum + count, 0);
    const roleDistribution = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count: count as number,
      percentage: totalRoleUsers > 0 ? Math.round((count as number / totalRoleUsers) * 100) : 0
    }));

    // Mock performance data (in a real app, this would come from monitoring systems)
    const performanceMetrics = {
      averageResponseTime: 245,
      errorRate: 0.12,
      uptime: 99.8,
      peakConcurrentUsers: 156
    };

    // Mock feature usage data
    const featureUsage = [
      { feature: 'Reserva de Citas', usage: 89, trend: 12.3 },
      { feature: 'Gestión de Pacientes', usage: 76, trend: 8.7 },
      { feature: 'Calendario', usage: 92, trend: 15.2 },
      { feature: 'Reportes', usage: 34, trend: -2.1 },
      { feature: 'Configuración', usage: 45, trend: 5.8 }
    ];

    const metrics = {
      overview: {
        totalUsers: totalUsers?.length || 0,
        totalOrganizations: totalOrganizations?.length || 0,
        totalAppointments: totalAppointments?.length || 0,
        systemUptime: 99.8,
        activeUsers24h: activeUsers24h?.length || 0,
        newUsersThisMonth: newUsersThisMonth?.length || 0
      },
      trends: {
        userGrowth: userGrowthTrend,
        appointmentVolume: appointmentVolumeTrend,
        organizationGrowth: organizationGrowthTrend
      },
      performance: performanceMetrics,
      usage: {
        topOrganizations,
        roleDistribution,
        featureUsage
      }
    };

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error in superadmin reports metrics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
