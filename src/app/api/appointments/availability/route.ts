/**
 * API Route: /api/appointments/availability
 * 
 * Endpoint para obtener disponibilidad de doctores por rango de fechas
 * Requerido por WeeklyAvailabilitySelector y SmartSuggestionsEngine
 * 
 * Funcionalidades:
 * - Consulta disponibilidad por rango de fechas
 * - Filtrado por servicio, doctor y ubicación
 * - Soporte multi-tenant con organizationId
 * - Formato optimizado para WeeklyAvailabilitySelector
 * - Integración con SmartSuggestionsEngine
 * 
 * @author AgentSalud MVP Team - Critical API Fix
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Estructura de slot de tiempo individual
 */
interface TimeSlot {
  id: string;
  time: string;
  doctorId: string;
  doctorName: string;
  available: boolean;
  price?: number;
  duration?: number;
  serviceId?: string;
  locationId?: string;
}

/**
 * Datos de disponibilidad por día
 */
interface DayAvailabilityData {
  slots: TimeSlot[];
  totalSlots: number;
  availableSlots: number;
}

/**
 * Alias para compatibilidad con WeeklyAvailabilitySelector
 */
type WeeklyAvailabilityData = DayAvailabilityData;

/**
 * Respuesta de la API
 */
interface AvailabilityResponse {
  success: boolean;
  data: {
    [date: string]: DayAvailabilityData;
  };
  error?: string;
}

/**
 * GET /api/appointments/availability
 * 
 * Query Parameters:
 * - organizationId (required): ID de la organización
 * - startDate (required): Fecha de inicio (YYYY-MM-DD)
 * - endDate (required): Fecha de fin (YYYY-MM-DD)
 * - serviceId (optional): ID del servicio
 * - doctorId (optional): ID del doctor
 * - locationId (optional): ID de la ubicación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validar parámetros requeridos
    const organizationId = searchParams.get('organizationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!organizationId || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'organizationId, startDate y endDate son requeridos'
      }, { status: 400 });
    }
    
    // Parámetros opcionales
    const serviceId = searchParams.get('serviceId');
    const doctorId = searchParams.get('doctorId');
    const locationId = searchParams.get('locationId');
    
    // Validar formato de fechas
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      }, { status: 400 });
    }
    
    if (startDateObj > endDateObj) {
      return NextResponse.json({
        success: false,
        error: 'startDate debe ser anterior o igual a endDate'
      }, { status: 400 });
    }
    
    // Construir consulta base para doctor_availability
    // NOTA: La tabla usa day_of_week, no date específica
    let query = supabase
      .from('doctor_availability')
      .select(`
        *,
        doctor:profiles!doctor_availability_doctor_id_fkey(
          id,
          first_name,
          last_name,
          role,
          organization_id
        ),
        location:locations(
          id,
          name,
          address
        )
      `)
      .eq('is_active', true); // Usar is_active en lugar de is_available
    
    // Aplicar filtros opcionales
    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    // Filtrar por organización a través del doctor
    query = query.eq('doctor.organization_id', organizationId);

    // Ejecutar consulta
    const { data: availabilityData, error: availabilityError } = await query;

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
      return NextResponse.json({
        success: false,
        error: 'Error al consultar disponibilidad'
      }, { status: 500 });
    }
    
    // Si hay filtro por servicio, obtener doctores que ofrecen ese servicio
    let validDoctorIds: string[] | null = null;
    
    if (serviceId) {
      // Obtener doctores que ofrecen el servicio, filtrando por organización a través de profiles
      const { data: doctorServices, error: servicesError } = await supabase
        .from('doctor_services')
        .select(`
          doctor_id,
          doctor:profiles!doctor_services_doctor_id_fkey(
            organization_id
          )
        `)
        .eq('service_id', serviceId);

      if (servicesError) {
        console.error('Error fetching doctor services:', servicesError);
        return NextResponse.json({
          success: false,
          error: 'Error al consultar servicios de doctores'
        }, { status: 500 });
      }

      // Filtrar por organización
      validDoctorIds = doctorServices
        .filter(ds => ds.doctor?.organization_id === organizationId)
        .map(ds => ds.doctor_id);

      // Si no hay doctores para este servicio en esta organización, retornar vacío
      if (validDoctorIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {}
        });
      }
    }
    
    // Procesar datos de disponibilidad
    const processedData: { [date: string]: DayAvailabilityData } = {};

    // Generar todas las fechas en el rango (solo fechas futuras)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    const currentDate = new Date(Math.max(startDateObj.getTime(), today.getTime()));
    while (currentDate <= endDateObj) {
      const dateString = currentDate.toISOString().split('T')[0];

      // Solo incluir fechas futuras o de hoy
      if (currentDate >= today) {
        processedData[dateString] = {
          slots: [],
          totalSlots: 0,
          availableSlots: 0
        };
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Procesar cada registro de disponibilidad semanal
    availabilityData?.forEach((availability: any) => {
      // Filtrar por servicio si es necesario
      if (validDoctorIds && !validDoctorIds.includes(availability.doctor_id)) {
        return;
      }

      // Convertir day_of_week a fechas específicas en el rango
      const dayOfWeek = availability.day_of_week; // 0=Sunday, 1=Monday, etc.

      // Encontrar todas las fechas que coinciden con este día de la semana
      const matchingDates: string[] = [];
      const tempDate = new Date(startDateObj);

      while (tempDate <= endDateObj) {
        if (tempDate.getDay() === dayOfWeek) {
          matchingDates.push(tempDate.toISOString().split('T')[0]);
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      // Generar slots para cada fecha que coincide
      matchingDates.forEach(dateString => {
        const startTime = availability.start_time;
        const endTime = availability.end_time;
        const slotDuration = 30; // 30 minutos por defecto

        const slots = generateTimeSlots(
          startTime,
          endTime,
          slotDuration,
          availability.doctor,
          availability.doctor_id,
          serviceId,
          locationId
        );

        if (processedData[dateString]) {
          processedData[dateString].slots.push(...slots);
          processedData[dateString].totalSlots += slots.length;
          processedData[dateString].availableSlots += slots.filter(s => s.available).length;
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      data: processedData
    } as AvailabilityResponse);
    
  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

/**
 * Generar slots de tiempo para un rango horario
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number,
  doctor: any,
  doctorId: string,
  serviceId?: string | null,
  locationId?: string | null
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  try {
    // Parsear horas de inicio y fin (formato HH:MM:SS o HH:MM)
    const startTimeParts = startTime.split(':');
    const endTimeParts = endTime.split(':');

    const startHour = parseInt(startTimeParts[0]);
    const startMinute = parseInt(startTimeParts[1] || '0');
    const endHour = parseInt(endTimeParts[0]);
    const endMinute = parseInt(endTimeParts[1] || '0');

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Validar que el rango sea válido
    if (startMinutes >= endMinutes) {
      console.warn(`Invalid time range: ${startTime} - ${endTime}`);
      return slots;
    }

    // Generar slots
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // Obtener nombre del doctor
      const doctorName = doctor?.first_name && doctor?.last_name
        ? `Dr. ${doctor.first_name} ${doctor.last_name}`
        : doctor?.profiles?.[0]
        ? `Dr. ${doctor.profiles[0].first_name} ${doctor.profiles[0].last_name}`
        : 'Doctor';

      slots.push({
        id: `${doctorId}-${timeString}`,
        time: timeString,
        doctorId,
        doctorName,
        available: true, // Por ahora todos disponibles, se puede mejorar con lógica de citas existentes
        duration: slotDuration,
        serviceId: serviceId || undefined,
        locationId: locationId || undefined
      });
    }
  } catch (error) {
    console.error('Error generating time slots:', error, { startTime, endTime, doctorId });
  }

  return slots;
}

/**
 * Validar que el usuario tenga permisos para acceder a la organización
 */
async function validateUserAccess(organizationId: string, userId?: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();
    
    if (error || !data) return false;
    
    return data.organization_id === organizationId;
  } catch {
    return false;
  }
}
