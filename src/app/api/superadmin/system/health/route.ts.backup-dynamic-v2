import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/system/health
 * Get system health metrics and status
 * SuperAdmin only endpoint
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

    // Verify SuperAdmin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access denied. SuperAdmin only.' },
        { status: 403 }
      );
    }

    // Get system health metrics
    const startTime = Date.now();

    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    const apiResponseTime = Date.now() - startTime;
    const databaseStatus = dbError ? 'disconnected' : apiResponseTime > 1000 ? 'slow' : 'connected';

    // Get system statistics
    const [
      { count: totalOrganizations },
      { count: totalUsers },
      { count: totalAppointments }
    ] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
    ]);

    // Calculate uptime (mock data - in real implementation, this would come from system metrics)
    const uptimeHours = Math.floor(Math.random() * 720) + 24; // 1-30 days
    const uptimeDays = Math.floor(uptimeHours / 24);
    const remainingHours = uptimeHours % 24;
    const uptime = `${uptimeDays}d ${remainingHours}h`;

    // Mock system resource usage (in real implementation, these would come from system monitoring)
    const cpuUsage = Math.floor(Math.random() * 30) + 10; // 10-40%
    const memoryUsage = Math.floor(Math.random() * 40) + 30; // 30-70%
    const diskUsage = Math.floor(Math.random() * 20) + 15; // 15-35%

    // Mock active connections
    const activeConnections = Math.floor(Math.random() * 50) + 10; // 10-60

    // Calculate overall health status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (cpuUsage > 80 || memoryUsage > 85 || diskUsage > 90 || databaseStatus === 'disconnected') {
      status = 'critical';
    } else if (cpuUsage > 60 || memoryUsage > 70 || diskUsage > 75 || databaseStatus === 'slow') {
      status = 'warning';
    }

    // Mock last backup date
    const lastBackup = new Date();
    lastBackup.setHours(lastBackup.getHours() - Math.floor(Math.random() * 24));

    const healthData = {
      status,
      uptime,
      cpu_usage: cpuUsage,
      memory_usage: memoryUsage,
      disk_usage: diskUsage,
      database_status: databaseStatus,
      api_response_time: apiResponseTime,
      active_connections: activeConnections,
      last_backup: lastBackup.toISOString(),
      version: '1.0.0',
      total_organizations: totalOrganizations || 0,
      total_users: totalUsers || 0,
      total_appointments: totalAppointments || 0
    };

    return NextResponse.json({
      success: true,
      data: healthData
    });

  } catch (error) {
    console.error('Error in GET /api/superadmin/system/health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
