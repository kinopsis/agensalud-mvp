/**
 * UNIFIED AVAILABILITY API - SINGLE SOURCE OF TRUTH
 * 
 * Consolidates all availability queries into a single endpoint that replaces:
 * - /api/doctors/availability
 * - /api/appointments/availability
 * - /api/calendar/appointments (availability portion)
 * 
 * Uses UnifiedSlotGenerator for consistent slot generation across all booking flows.
 * Implements timezone-safe date handling with ImmutableDateSystem.
 * 
 * @author AgentSalud MVP Team - Disruptive Architecture Solution
 * @version 2.0.0 - Zero Displacement Architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import UnifiedSlotGenerator, { type TimeSlot } from '@/lib/calendar/UnifiedSlotGenerator';
import ImmutableDateSystem from '@/lib/core/ImmutableDateSystem';

// Validation schema for availability query
const availabilityQuerySchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  doctorId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  duration: z.string().transform(Number).pipe(z.number().min(15).max(240)).default('30'),
  userRole: z.enum(['patient', 'admin', 'staff', 'doctor', 'superadmin']).default('patient'),
  useStandardRules: z.string().transform(val => val === 'true').default('false'),
  includeUnavailable: z.string().transform(val => val === 'true').default('false')
});

interface AvailabilityResponse {
  success: boolean;
  data: {
    [date: string]: {
      slots: TimeSlot[];
      totalSlots: number;
      availableSlots: number;
      date: string;
      dayOfWeek: string;
    };
  };
  metadata: {
    dateRange: {
      start: string;
      end: string;
    };
    filters: {
      organizationId: string;
      doctorId?: string;
      serviceId?: string;
      locationId?: string;
      userRole: string;
      duration: number;
    };
    generatedAt: string;
    generatedBy: string;
  };
  error?: string;
}

/**
 * GET /api/availability
 * 
 * Query Parameters:
 * - organizationId (required): Organization UUID
 * - startDate (required): Start date in YYYY-MM-DD format
 * - endDate (optional): End date in YYYY-MM-DD format (defaults to startDate)
 * - doctorId (optional): Specific doctor UUID
 * - serviceId (optional): Specific service UUID
 * - locationId (optional): Specific location UUID
 * - duration (optional): Slot duration in minutes (default: 30)
 * - userRole (optional): User role for filtering (default: patient)
 * - useStandardRules (optional): Force standard rules for privileged users (default: false)
 * - includeUnavailable (optional): Include unavailable slots in response (default: false)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Get current user for audit trail
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Extract and validate query parameters
    const rawParams = {
      organizationId: searchParams.get('organizationId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      doctorId: searchParams.get('doctorId'),
      serviceId: searchParams.get('serviceId'),
      locationId: searchParams.get('locationId'),
      duration: searchParams.get('duration') || '30',
      userRole: searchParams.get('userRole') || 'patient',
      useStandardRules: searchParams.get('useStandardRules') || 'false',
      includeUnavailable: searchParams.get('includeUnavailable') || 'false'
    };

    const validationResult = availabilityQuerySchema.safeParse(rawParams);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const params = validationResult.data;
    const endDate = params.endDate || params.startDate;

    console.log(`🔧 UNIFIED AVAILABILITY API - User: ${params.userRole}, Range: ${params.startDate} to ${endDate}`);

    // Validate date range using ImmutableDateSystem
    const startValidation = ImmutableDateSystem.validateAndNormalize(params.startDate, 'UnifiedAvailabilityAPI');
    const endValidation = ImmutableDateSystem.validateAndNormalize(endDate, 'UnifiedAvailabilityAPI');

    if (!startValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid start date: ${startValidation.error}`
      }, { status: 400 });
    }

    if (!endValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: `Invalid end date: ${endValidation.error}`
      }, { status: 400 });
    }

    // Ensure start date is not after end date
    if (ImmutableDateSystem.compareDates(params.startDate, endDate) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Start date must be before or equal to end date'
      }, { status: 400 });
    }

    // Generate date range using ImmutableDateSystem
    const dateRange = generateDateRange(params.startDate, endDate);
    const slotGenerator = UnifiedSlotGenerator.getInstance();
    const responseData: AvailabilityResponse['data'] = {};

    // Generate slots for each date in range
    for (const date of dateRange) {
      try {
        const slots = await slotGenerator.generateSlots({
          organizationId: params.organizationId,
          date,
          doctorId: params.doctorId,
          serviceId: params.serviceId,
          locationId: params.locationId,
          duration: params.duration,
          userRole: params.userRole,
          useStandardRules: params.useStandardRules
        });

        // Filter slots based on includeUnavailable parameter
        const filteredSlots = params.includeUnavailable 
          ? slots 
          : slots.filter(slot => slot.available);

        // Get day of week for display
        const dayOfWeek = getDayOfWeekName(date);

        responseData[date] = {
          slots: filteredSlots,
          totalSlots: slots.length,
          availableSlots: slots.filter(slot => slot.available).length,
          date,
          dayOfWeek
        };

      } catch (error) {
        console.error(`Error generating slots for date ${date}:`, error);
        responseData[date] = {
          slots: [],
          totalSlots: 0,
          availableSlots: 0,
          date,
          dayOfWeek: getDayOfWeekName(date)
        };
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ UNIFIED AVAILABILITY API - Generated slots for ${dateRange.length} dates in ${processingTime}ms`);

    const response: AvailabilityResponse = {
      success: true,
      data: responseData,
      metadata: {
        dateRange: {
          start: params.startDate,
          end: endDate
        },
        filters: {
          organizationId: params.organizationId,
          doctorId: params.doctorId,
          serviceId: params.serviceId,
          locationId: params.locationId,
          userRole: params.userRole,
          duration: params.duration
        },
        generatedAt: new Date().toISOString(),
        generatedBy: 'UnifiedAvailabilityAPI'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in Unified Availability API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate date range using ImmutableDateSystem (timezone-safe)
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let currentDate = startDate;

  while (ImmutableDateSystem.compareDates(currentDate, endDate) <= 0) {
    dates.push(currentDate);
    currentDate = ImmutableDateSystem.addDays(currentDate, 1);
  }

  return dates;
}

/**
 * Get day of week name using ImmutableDateSystem (timezone-safe)
 */
function getDayOfWeekName(dateStr: string): string {
  try {
    const components = ImmutableDateSystem.parseDate(dateStr);
    const tempDate = new Date(components.year, components.month - 1, components.day);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dayNames[tempDate.getDay()];
  } catch (error) {
    console.error('Error getting day of week name:', error);
    return 'Desconocido';
  }
}
