/**
 * AI Appointment Processor
 * Handles intelligent appointment booking with real data integration
 * Integrates with doctor schedules and availability system
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Enhanced schema for appointment intent and entity extraction
export const AppointmentIntentSchema = z.object({
  intent: z.enum(['book', 'reschedule', 'cancel', 'inquire', 'unknown']),
  specialty: z.string().optional(),
  preferredDate: z.string().optional(), // YYYY-MM-DD format
  preferredTime: z.string().optional(), // HH:MM format
  doctorName: z.string().optional(),
  doctorId: z.string().uuid().optional(),
  urgency: z.enum(['urgent', 'routine', 'flexible']).default('routine'),
  patientConcerns: z.string().optional(),
  confidence: z.number().min(0).max(1),
  missingInfo: z.array(z.string()),
  suggestedResponse: z.string(),
  extractedEntities: z.object({
    dateType: z.enum(['specific', 'relative', 'flexible']).optional(),
    timeType: z.enum(['specific', 'morning', 'afternoon', 'evening', 'flexible']).optional(),
    duration: z.number().optional(), // minutes
  }).optional()
});

export type AppointmentIntent = z.infer<typeof AppointmentIntentSchema>;

// Enhanced prompt for better entity extraction
const APPOINTMENT_EXTRACTION_PROMPT = `
Analiza el siguiente mensaje del paciente y extrae la información relevante para citas médicas en una clínica óptica.

ESPECIALIDADES ÓPTICAS DISPONIBLES:
- Optometría Clínica (exámenes visuales completos, topografía corneal)
- Contactología Avanzada (adaptación de lentes de contacto)
- Optometría Pediátrica (atención visual infantil, terapia visual)
- Optometría General (exámenes rutinarios, controles)
- Baja Visión (evaluación y rehabilitación)

SERVICIOS ESPECÍFICOS:
- Examen Visual Completo (45 min)
- Control Visual Rápido (20 min)
- Examen Visual Pediátrico (30 min)
- Adaptación de Lentes Blandas (40 min)
- Adaptación de Lentes Rígidas (60 min)
- Topografía Corneal (30 min)
- Evaluación de Baja Visión (60 min)
- Terapia Visual (45 min)

INTENCIONES POSIBLES:
- book: quiere agendar una nueva cita
- reschedule: quiere cambiar una cita existente
- cancel: quiere cancelar una cita
- inquire: quiere información sobre citas, servicios o disponibilidad
- unknown: no está claro qué quiere

INTERPRETACIÓN DE FECHAS:
- "mañana" = fecha específica (día siguiente)
- "pasado mañana" = fecha específica (en 2 días)
- "próxima semana" = rango flexible (próximos 7-14 días)
- "en X días" = fecha calculada específica
- "urgente" = lo antes posible
- "cuando pueda" = flexible

INTERPRETACIÓN DE HORARIOS:
- "mañana" = 9:00-12:00
- "tarde" = 14:00-17:00
- "mediodía" = 12:00-14:00
- "temprano" = 8:00-10:00
- "al final del día" = 17:00-19:00

EVALUACIÓN DE CONFIANZA:
- 0.9-1.0: Intención muy clara, información específica
- 0.7-0.8: Intención clara, alguna información falta
- 0.5-0.6: Intención probable, información limitada
- 0.3-0.4: Intención incierta, información vaga
- 0.0-0.2: No se puede determinar la intención

INFORMACIÓN FALTANTE COMÚN:
- specialty: especialidad o servicio específico
- preferred_date: fecha preferida
- preferred_time: hora preferida
- patient_concerns: motivo de la consulta
- contact_info: información de contacto

Genera una respuesta conversacional profesional y empática, apropiada para una clínica óptica.
`;

export interface AppointmentProcessingOptions {
  organizationId: string;
  userId?: string;
  userRole?: string;
  includeAvailability?: boolean;
}

export class AppointmentProcessor {
  private async getSupabase() {
    return await createClient();
  }

  /**
   * Process natural language message and extract appointment intent
   */
  async processMessage(
    message: string,
    options: AppointmentProcessingOptions
  ): Promise<{
    intent: AppointmentIntent;
    availability?: any[];
    nextActions: string[];
    canProceed: boolean;
  }> {
    try {
      // Extract intent and entities using AI
      const result = await generateObject({
        model: openai('gpt-3.5-turbo'),
        prompt: `${APPOINTMENT_EXTRACTION_PROMPT}\n\nMensaje del paciente: "${message}"`,
        schema: AppointmentIntentSchema,
      });

      const intent: AppointmentIntent = result.object;
      let availability: any[] = [];
      let nextActions: string[] = [];
      let canProceed = false;

      // Process based on intent
      switch (intent.intent) {
        case 'book':
          const bookingResult = await this.processBookingIntent(intent, options);
          availability = bookingResult.availability;
          nextActions = bookingResult.nextActions;
          canProceed = bookingResult.canProceed;
          break;

        case 'reschedule':
          nextActions = ['find_existing_appointment', 'get_new_preferences'];
          break;

        case 'cancel':
          nextActions = ['find_existing_appointment', 'confirm_cancellation'];
          break;

        case 'inquire':
          const inquiryResult = await this.processInquiryIntent(intent, options);
          availability = inquiryResult.availability;
          nextActions = inquiryResult.nextActions;
          break;

        default:
          nextActions = ['clarify_intent'];
      }

      return {
        intent,
        availability,
        nextActions,
        canProceed
      };

    } catch (error) {
      console.error('Error processing appointment message:', error);
      throw new Error('Failed to process appointment request');
    }
  }

  /**
   * Process booking intent and check availability
   */
  private async processBookingIntent(
    intent: AppointmentIntent,
    options: AppointmentProcessingOptions
  ): Promise<{
    availability: any[];
    nextActions: string[];
    canProceed: boolean;
  }> {
    const nextActions: string[] = [];
    let availability: any[] = [];
    let canProceed = false;

    // Check what information we have
    const hasSpecialty = !!intent.specialty;
    const hasDate = !!intent.preferredDate;
    const hasTime = !!intent.preferredTime;

    if (!hasSpecialty) {
      nextActions.push('request_specialty');
    }

    if (!hasDate) {
      nextActions.push('request_date');
    }

    // If we have enough info, check availability
    if (hasSpecialty && hasDate) {
      try {
        // Parse the date to ensure it's in the correct format
        const parsedDate = this.parseDate(intent.preferredDate!);
        if (!parsedDate) {
          nextActions.push('invalid_date');
          return { availability, nextActions, canProceed };
        }

        availability = await this.getAvailability({
          organizationId: options.organizationId,
          specialty: intent.specialty!,
          date: parsedDate,
          time: intent.preferredTime
        });

        if (availability.length > 0) {
          nextActions.push('show_availability');
          canProceed = true;
        } else {
          nextActions.push('suggest_alternatives');
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        nextActions.push('availability_error');
      }
    }

    return { availability, nextActions, canProceed };
  }

  /**
   * Process inquiry intent
   */
  private async processInquiryIntent(
    intent: AppointmentIntent,
    options: AppointmentProcessingOptions
  ): Promise<{
    availability: any[];
    nextActions: string[];
  }> {
    const nextActions: string[] = [];
    let availability: any[] = [];

    if (intent.specialty) {
      nextActions.push('get_specialty_info');

      // Get general availability for the specialty
      try {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const dateStr = nextWeek.toISOString().split('T')[0];
        if (dateStr) {
          availability = await this.getAvailability({
            organizationId: options.organizationId,
            specialty: intent.specialty,
            date: dateStr
          });
        } else {
          console.error('Error processing date for availability check');
          nextActions.push('date_error');
        }

        if (availability.length > 0) {
          nextActions.push('show_general_availability');
        }
      } catch (error) {
        console.error('Error getting general availability:', error);
      }
    } else {
      nextActions.push('get_general_info');
    }

    return { availability, nextActions };
  }

  /**
   * Parse natural language dates to ISO format
   */
  private parseDate(dateStr: string): string | null {
    try {
      const today = new Date();
      const lowerDate = dateStr.toLowerCase().trim();

      // Handle Spanish natural language dates
      if (lowerDate === 'hoy' || lowerDate === 'today') {
        return today.toISOString().split('T')[0];
      }

      if (lowerDate === 'mañana' || lowerDate === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }

      if (lowerDate === 'pasado mañana' || lowerDate === 'day after tomorrow') {
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);
        return dayAfter.toISOString().split('T')[0];
      }

      // Handle "próxima semana" / "next week"
      if (lowerDate.includes('próxima semana') || lowerDate.includes('next week')) {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
      }

      // Try to parse as ISO date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return dateStr;
        }
      }

      // Try to parse other common formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      return null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }

  /**
   * Get real availability from the database
   */
  private async getAvailability(params: {
    organizationId: string;
    specialty?: string;
    date: string;
    time?: string;
    duration?: number;
  }): Promise<any[]> {
    try {
      // Build the availability API URL
      const searchParams = new URLSearchParams({
        organizationId: params.organizationId,
        date: params.date,
        duration: (params.duration || 30).toString()
      });

      // Map specialty to service if needed
      if (params.specialty) {
        const serviceId = await this.mapSpecialtyToService(params.specialty, params.organizationId);
        if (serviceId) {
          searchParams.append('serviceId', serviceId);
        }
      }

      // Call the availability API with absolute URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/doctors/availability?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      console.error('Error fetching availability:', error);
      return [];
    }
  }

  /**
   * Map specialty name to service ID
   */
  private async mapSpecialtyToService(specialty: string, organizationId: string): Promise<string | null> {
    try {
      const specialtyLower = specialty.toLowerCase();

      // Map common specialty terms to service names
      const specialtyMap: Record<string, string[]> = {
        'optometría': ['examen visual completo', 'control visual'],
        'contactología': ['adaptación de lentes', 'lentes de contacto'],
        'pediátrica': ['examen visual pediátrico', 'terapia visual'],
        'baja visión': ['evaluación de baja visión'],
        'topografía': ['topografía corneal'],
        'general': ['examen visual completo', 'control visual rápido']
      };

      let serviceNames: string[] = [];

      // Find matching service names
      for (const [key, names] of Object.entries(specialtyMap)) {
        if (specialtyLower.includes(key)) {
          serviceNames = names;
          break;
        }
      }

      if (serviceNames.length === 0) {
        return null;
      }

      // Query the database for matching services
      const supabase = await this.getSupabase();
      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .eq('organization_id', organizationId)
        .ilike('name', `%${serviceNames[0]}%`)
        .limit(1);

      return services && services.length > 0 && services[0] ? services[0].id : null;

    } catch (error) {
      console.error('Error mapping specialty to service:', error);
      return null;
    }
  }

  /**
   * Create a real appointment in the database
   */
  async createAppointment(params: {
    organizationId: string;
    patientId: string;
    doctorId: string;
    serviceId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    try {
      const supabase = await this.getSupabase();

      // Get default location for the organization
      const { data: defaultLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('organization_id', params.organizationId)
        .limit(1)
        .single();

      if (!defaultLocation) {
        return { success: false, error: 'No location found for organization' };
      }

      // Calculate duration in minutes
      const startTime = new Date(`1970-01-01T${params.startTime}`);
      const endTime = new Date(`1970-01-01T${params.endTime}`);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          organization_id: params.organizationId,
          patient_id: params.patientId,
          doctor_id: params.doctorId,
          service_id: params.serviceId,
          location_id: defaultLocation.id,
          appointment_date: params.appointmentDate,
          start_time: params.startTime,
          end_time: params.endTime,
          duration_minutes: durationMinutes,
          status: 'confirmed',
          notes: params.notes || 'Cita agendada via AI Assistant'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        return { success: false, error: error.message };
      }

      return { success: true, appointmentId: appointment.id };

    } catch (error) {
      console.error('Unexpected error creating appointment:', error);
      return { success: false, error: 'Failed to create appointment' };
    }
  }
}
