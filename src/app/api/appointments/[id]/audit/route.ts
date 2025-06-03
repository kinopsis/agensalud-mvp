/**
 * Appointment Audit Trail API
 * GET /api/appointments/[id]/audit
 * 
 * @description Endpoint for retrieving appointment status change history
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import appointmentStatusService from '@/lib/services/AppointmentStatusService';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const auditQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0)
});

// =====================================================
// GET ENDPOINT - AUDIT TRAIL
// =====================================================

/**
 * GET /api/appointments/[id]/audit
 * Get audit trail for appointment status changes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    
    // Validate UUID format
    if (!appointmentId || !isValidUUID(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID format' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = auditQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    });

    // Get current user and verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this appointment
    const hasAccess = await verifyAppointmentAccess(
      supabase,
      appointmentId,
      user.id,
      profile.role,
      profile.organization_id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this appointment' },
        { status: 403 }
      );
    }

    // Check if user can view audit trail
    const canViewAudit = ['admin', 'staff', 'superadmin'].includes(profile.role);
    if (!canViewAudit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit trail' },
        { status: 403 }
      );
    }

    // Get audit trail
    const result = await appointmentStatusService.getAuditTrail(
      appointmentId,
      queryParams.limit
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Format audit trail for response
    const formattedHistory = result.history?.map(entry => ({
      id: entry.id,
      previousStatus: entry.previous_status,
      newStatus: entry.new_status,
      changedBy: entry.changed_by,
      changedByName: entry.profiles ? 
        `${entry.profiles.first_name} ${entry.profiles.last_name}`.trim() : 
        'Unknown User',
      userRole: entry.user_role,
      reason: entry.reason,
      ipAddress: entry.ip_address,
      timestamp: entry.created_at,
      metadata: entry.metadata
    }));

    return NextResponse.json({
      success: true,
      data: {
        appointmentId,
        auditTrail: formattedHistory,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
          total: formattedHistory?.length || 0
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('❌ ERROR in audit trail endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Verify user has access to appointment
 */
async function verifyAppointmentAccess(
  supabase: any,
  appointmentId: string,
  userId: string,
  userRole: string,
  organizationId: string
): Promise<boolean> {
  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('patient_id, doctor_id, organization_id')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return false;
    }

    // Check role-based access
    switch (userRole) {
      case 'patient':
        return appointment.patient_id === userId;
      
      case 'doctor':
        return appointment.doctor_id === userId;
      
      case 'staff':
      case 'admin':
        return appointment.organization_id === organizationId;
      
      case 'superadmin':
        return true;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error verifying appointment access:', error);
    return false;
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
