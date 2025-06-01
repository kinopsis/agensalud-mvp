/**
 * Admin Booking Settings API
 * Manages tenant-specific booking configuration
 * 
 * @description CRUD operations for organization booking settings
 * including advance booking rules, time windows, and policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import BookingConfigService, { type BookingSettings } from '@/lib/services/BookingConfigService';

/**
 * GET /api/admin/booking-settings
 * Retrieve current booking settings for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin access to this organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get booking settings using the service
    const bookingService = BookingConfigService.getInstance();
    const settings = await bookingService.getBookingSettings(organizationId);

    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Error fetching booking settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/booking-settings
 * Update booking settings for the organization
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, settings } = body;

    if (!organizationId || !settings) {
      return NextResponse.json(
        { error: 'Organization ID and settings are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin access to this organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile ||
        (profile.organization_id !== organizationId && profile.role !== 'superadmin') ||
        !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate settings structure
    const validationErrors = validateBookingSettings(settings);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid booking settings',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // Update settings using the service
    const bookingService = BookingConfigService.getInstance();
    const success = await bookingService.updateBookingSettings(organizationId, settings);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update booking settings' },
        { status: 500 }
      );
    }

    // Get updated settings to return
    const updatedSettings = await bookingService.getBookingSettings(organizationId);

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Booking settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating booking settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/booking-settings/validate
 * Validate booking settings without saving
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user and verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate settings structure
    const validationErrors = validateBookingSettings(settings);
    
    return NextResponse.json({
      success: validationErrors.length === 0,
      valid: validationErrors.length === 0,
      errors: validationErrors
    });

  } catch (error) {
    console.error('Error validating booking settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate booking settings structure and business rules
 */
function validateBookingSettings(settings: Partial<BookingSettings>): string[] {
  const errors: string[] = [];

  // Validate advance_booking_hours
  if (settings.advance_booking_hours !== undefined) {
    if (typeof settings.advance_booking_hours !== 'number' || 
        settings.advance_booking_hours < 0 || 
        settings.advance_booking_hours > 72) {
      errors.push('advance_booking_hours must be a number between 0 and 72');
    }
  }

  // Validate max_advance_booking_days
  if (settings.max_advance_booking_days !== undefined) {
    if (typeof settings.max_advance_booking_days !== 'number' || 
        settings.max_advance_booking_days < 1 || 
        settings.max_advance_booking_days > 365) {
      errors.push('max_advance_booking_days must be a number between 1 and 365');
    }
  }

  // Validate time format for booking windows
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (settings.booking_window_start !== undefined) {
    if (typeof settings.booking_window_start !== 'string' || 
        !timeRegex.test(settings.booking_window_start)) {
      errors.push('booking_window_start must be in HH:MM format');
    }
  }

  if (settings.booking_window_end !== undefined) {
    if (typeof settings.booking_window_end !== 'string' || 
        !timeRegex.test(settings.booking_window_end)) {
      errors.push('booking_window_end must be in HH:MM format');
    }
  }

  // Validate booking window logic
  if (settings.booking_window_start && settings.booking_window_end) {
    const [startHour, startMin] = settings.booking_window_start.split(':').map(Number);
    const [endHour, endMin] = settings.booking_window_end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes >= endMinutes) {
      errors.push('booking_window_start must be before booking_window_end');
    }
  }

  // Validate cancellation and reschedule deadlines
  if (settings.cancellation_deadline_hours !== undefined) {
    if (typeof settings.cancellation_deadline_hours !== 'number' || 
        settings.cancellation_deadline_hours < 0 || 
        settings.cancellation_deadline_hours > 168) { // 1 week max
      errors.push('cancellation_deadline_hours must be a number between 0 and 168');
    }
  }

  if (settings.reschedule_deadline_hours !== undefined) {
    if (typeof settings.reschedule_deadline_hours !== 'number' || 
        settings.reschedule_deadline_hours < 0 || 
        settings.reschedule_deadline_hours > 168) { // 1 week max
      errors.push('reschedule_deadline_hours must be a number between 0 and 168');
    }
  }

  // Validate boolean fields
  const booleanFields = [
    'allow_same_day_booking',
    'weekend_booking_enabled',
    'auto_confirmation'
  ];

  booleanFields.forEach(field => {
    if (settings[field as keyof BookingSettings] !== undefined && 
        typeof settings[field as keyof BookingSettings] !== 'boolean') {
      errors.push(`${field} must be a boolean value`);
    }
  });

  return errors;
}
