/**
 * Appointment Status Management API
 * PATCH /api/appointments/[id]/status
 * 
 * @description Endpoint for changing appointment status with validation and audit trail
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import appointmentStatusService from '@/lib/services/AppointmentStatusService';
import { AppointmentStatus, UserRole } from '@/types/appointment-states';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const statusChangeSchema = z.object({
  status: z.enum([
    'pending',
    'pendiente_pago', 
    'confirmed',
    'reagendada',
    'cancelada_paciente',
    'cancelada_clinica',
    'en_curso',
    'completed',
    'cancelled',
    'no_show',
    'no-show' // Support existing format
  ]),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const availableTransitionsSchema = z.object({
  userRole: z.enum(['patient', 'doctor', 'staff', 'admin', 'superadmin']).optional()
});

// =====================================================
// PATCH ENDPOINT - CHANGE STATUS
// =====================================================

/**
 * PATCH /api/appointments/[id]/status
 * Change appointment status with validation and audit trail
 */
export async function PATCH(
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = statusChangeSchema.parse(body);
    
    // Get current user and verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile with role and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, organization_id, first_name, last_name')
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

    // Extract client information for audit trail
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Change status using service
    const result = await appointmentStatusService.changeStatus(
      appointmentId,
      validatedData.status as AppointmentStatus,
      user.id,
      profile.role as UserRole,
      validatedData.reason,
      {
        ...validatedData.metadata,
        ipAddress: clientIP,
        userAgent,
        changedByName: `${profile.first_name} ${profile.last_name}`.trim()
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          code: 'STATUS_CHANGE_FAILED'
        },
        { status: 400 }
      );
    }

    // Log successful status change
    console.log(`✅ STATUS CHANGE SUCCESS - Appointment: ${appointmentId}, Status: ${validatedData.status}, User: ${profile.role}, Audit: ${result.auditId}`);

    return NextResponse.json({
      success: true,
      message: 'Appointment status updated successfully',
      data: {
        appointmentId,
        newStatus: validatedData.status,
        auditId: result.auditId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('❌ ERROR in status change endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET ENDPOINT - AVAILABLE TRANSITIONS
// =====================================================

/**
 * GET /api/appointments/[id]/status
 * Get available status transitions for current appointment and user role
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

    // Get available transitions
    const result = await appointmentStatusService.getAvailableTransitions(
      appointmentId,
      profile.role as UserRole
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        appointmentId,
        userRole: profile.role,
        availableTransitions: result.transitions,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ ERROR in get transitions endpoint:', error);
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
 * Extract client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
