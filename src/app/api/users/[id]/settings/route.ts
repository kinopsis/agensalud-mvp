import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/users/[id]/settings
 * Fetch user settings and preferences
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user can access these settings (own settings or admin/superadmin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user can access the requested settings
    if (user.id !== userId && !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch user settings (for now, return default settings)
    // In a real implementation, you would have a user_settings table
    const defaultSettings = {
      notifications: {
        email: true,
        sms: false,
        push: true,
        appointment_reminders: true,
        system_updates: false
      },
      preferences: {
        language: 'es',
        timezone: 'America/Bogota',
        theme: 'light',
        date_format: 'DD/MM/YYYY',
        time_format: '24h'
      },
      privacy: {
        profile_visibility: 'organization',
        data_sharing: false,
        analytics: true
      }
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]/settings
 * Update user settings and preferences
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();
    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user can update these settings (own settings or admin/superadmin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user can update the requested settings
    if (user.id !== userId && !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // In a real implementation, you would save to a user_settings table
    // For now, we'll just return success
    console.log('Settings updated for user:', userId, body);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
