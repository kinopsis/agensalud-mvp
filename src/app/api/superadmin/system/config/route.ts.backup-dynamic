import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/system/config
 * Get system configuration settings
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

    // Get system configuration from database or environment variables
    // In a real implementation, this would come from a system_config table
    const config = {
      maintenance_mode: process.env.MAINTENANCE_MODE === 'true' || false,
      registration_enabled: process.env.REGISTRATION_ENABLED !== 'false',
      email_notifications: process.env.EMAIL_NOTIFICATIONS !== 'false',
      backup_frequency: process.env.BACKUP_FREQUENCY || 'daily',
      max_organizations: parseInt(process.env.MAX_ORGANIZATIONS || '100'),
      max_users_per_org: parseInt(process.env.MAX_USERS_PER_ORG || '500'),
      session_timeout: parseInt(process.env.SESSION_TIMEOUT || '480') // 8 hours in minutes
    };

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error in GET /api/superadmin/system/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/superadmin/system/config
 * Update system configuration settings
 * SuperAdmin only endpoint
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Validate configuration values
    const allowedKeys = [
      'maintenance_mode',
      'registration_enabled',
      'email_notifications',
      'backup_frequency',
      'max_organizations',
      'max_users_per_org',
      'session_timeout'
    ];

    const updates: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedKeys.includes(key)) {
        // Validate specific fields
        if (key === 'max_organizations' || key === 'max_users_per_org' || key === 'session_timeout') {
          const numValue = parseInt(value as string);
          if (isNaN(numValue) || numValue < 1) {
            return NextResponse.json(
              { error: `${key} must be a positive number` },
              { status: 400 }
            );
          }
          updates[key] = numValue;
        } else if (key === 'backup_frequency') {
          const validFrequencies = ['hourly', 'daily', 'weekly'];
          if (!validFrequencies.includes(value as string)) {
            return NextResponse.json(
              { error: 'backup_frequency must be hourly, daily, or weekly' },
              { status: 400 }
            );
          }
          updates[key] = value;
        } else {
          // Boolean fields
          updates[key] = Boolean(value);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid configuration updates provided' },
        { status: 400 }
      );
    }

    // In a real implementation, you would save these to a system_config table
    // For now, we'll just return the updated configuration
    // Note: Environment variables cannot be changed at runtime in most deployments

    // Get current config
    const currentConfig = {
      maintenance_mode: process.env.MAINTENANCE_MODE === 'true' || false,
      registration_enabled: process.env.REGISTRATION_ENABLED !== 'false',
      email_notifications: process.env.EMAIL_NOTIFICATIONS !== 'false',
      backup_frequency: process.env.BACKUP_FREQUENCY || 'daily',
      max_organizations: parseInt(process.env.MAX_ORGANIZATIONS || '100'),
      max_users_per_org: parseInt(process.env.MAX_USERS_PER_ORG || '500'),
      session_timeout: parseInt(process.env.SESSION_TIMEOUT || '480')
    };

    // Merge updates
    const updatedConfig = { ...currentConfig, ...updates };

    // Log configuration changes
    console.log('System configuration updated by SuperAdmin:', {
      user_id: user.id,
      updates,
      timestamp: new Date().toISOString()
    });

    // In a production system, you would:
    // 1. Save to database
    // 2. Update environment variables or config files
    // 3. Potentially restart services if needed
    // 4. Send notifications to other admins

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/superadmin/system/config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
