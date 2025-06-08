/**
 * Appointment Business Rules Service
 * 
 * Enforces business rules for appointment booking including 24-hour advance booking,
 * availability checking, conflict validation, and organization-specific policies.
 * Integrates with existing appointment APIs and validation systems.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { createClient } from '@/lib/supabase/server';
import { AppointmentStatus } from '@/types/appointment-states';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface BusinessRuleValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface AvailabilitySlot {
  date: string;
  time: string;
  doctorId: string;
  doctorName: string;
  available: boolean;
  reason?: string;
}

export interface BookingRequest {
  service: string;
  date: string;
  time: string;
  doctorId?: string;
  patientPhone: string;
  organizationId: string;
  urgency?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  errors: string[];
  warnings: string[];
}

export interface BusinessHours {
  monday: { start: string; end: string; active: boolean };
  tuesday: { start: string; end: string; active: boolean };
  wednesday: { start: string; end: string; active: boolean };
  thursday: { start: string; end: string; active: boolean };
  friday: { start: string; end: string; active: boolean };
  saturday: { start: string; end: string; active: boolean };
  sunday: { start: string; end: string; active: boolean };
}

// =====================================================
// APPOINTMENT BUSINESS RULES SERVICE
// =====================================================

/**
 * Appointment Business Rules Service Class
 * 
 * @description Enforces business rules and validates appointment bookings
 * with integration to existing appointment systems and policies.
 */
export class AppointmentBusinessRulesService {
  private supabase: any;

  constructor() {
    this.supabase = createClient();
  }

  // =====================================================
  // BUSINESS RULE VALIDATION
  // =====================================================

  /**
   * Validate booking request against all business rules
   */
  async validateBookingRequest(request: BookingRequest, userRole?: string): Promise<BusinessRuleValidation> {
    const validation: BusinessRuleValidation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // 1. Validate 24-hour advance booking rule
      const advanceBookingValidation = this.validateAdvanceBooking(request.date, request.time, userRole);
      if (!advanceBookingValidation.valid) {
        validation.valid = false;
        validation.errors.push(...advanceBookingValidation.errors);
      }
      validation.warnings.push(...advanceBookingValidation.warnings);

      // 2. Validate business hours
      const businessHoursValidation = await this.validateBusinessHours(request.date, request.time, request.organizationId);
      if (!businessHoursValidation.valid) {
        validation.valid = false;
        validation.errors.push(...businessHoursValidation.errors);
      }

      // 3. Check doctor availability
      const availabilityValidation = await this.validateDoctorAvailability(request);
      if (!availabilityValidation.valid) {
        validation.valid = false;
        validation.errors.push(...availabilityValidation.errors);
      }
      validation.suggestions.push(...availabilityValidation.suggestions);

      // 4. Check for conflicts
      const conflictValidation = await this.validateConflicts(request);
      if (!conflictValidation.valid) {
        validation.valid = false;
        validation.errors.push(...conflictValidation.errors);
      }

      // 5. Validate service availability
      const serviceValidation = await this.validateServiceAvailability(request.service, request.organizationId);
      if (!serviceValidation.valid) {
        validation.valid = false;
        validation.errors.push(...serviceValidation.errors);
      }

      return validation;

    } catch (error) {
      console.error('❌ Error validating booking request:', error);
      return {
        valid: false,
        errors: ['Error interno validando la solicitud'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate 24-hour advance booking rule
   */
  private validateAdvanceBooking(date: string, time: string, userRole?: string): BusinessRuleValidation {
    const validation: BusinessRuleValidation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      const appointmentDateTime = new Date(`${date}T${time}`);
      const now = new Date();
      const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Admin and staff can book with less than 24 hours
      const isPrivilegedUser = userRole === 'admin' || userRole === 'staff';

      if (hoursDifference < 24 && !isPrivilegedUser) {
        validation.valid = false;
        validation.errors.push('Las citas deben agendarse con al menos 24 horas de anticipación');
        
        // Suggest next available day
        const nextDay = new Date(now);
        nextDay.setDate(now.getDate() + 1);
        nextDay.setHours(8, 0, 0, 0); // 8 AM next day
        
        validation.suggestions.push(
          `La próxima fecha disponible sería: ${nextDay.toLocaleDateString('es-ES')} a las 8:00 AM`
        );
      } else if (hoursDifference < 2) {
        validation.warnings.push('Cita muy próxima. Confirma que puedas llegar a tiempo.');
      }

      return validation;

    } catch (error) {
      return {
        valid: false,
        errors: ['Error validando horario de anticipación'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate business hours
   */
  private async validateBusinessHours(date: string, time: string, organizationId: string): Promise<BusinessRuleValidation> {
    const validation: BusinessRuleValidation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Get organization business hours
      const businessHours = await this.getBusinessHours(organizationId);
      
      const appointmentDate = new Date(date);
      const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek] as keyof BusinessHours;
      
      const daySchedule = businessHours[dayName];
      
      if (!daySchedule.active) {
        validation.valid = false;
        validation.errors.push(`No atendemos los ${this.getDayNameInSpanish(dayOfWeek)}`);
        
        // Suggest next business day
        const nextBusinessDay = this.getNextBusinessDay(appointmentDate, businessHours);
        if (nextBusinessDay) {
          validation.suggestions.push(
            `Próximo día disponible: ${nextBusinessDay.toLocaleDateString('es-ES')}`
          );
        }
        
        return validation;
      }

      // Check if time is within business hours
      const [hours, minutes] = time.split(':').map(Number);
      const appointmentMinutes = hours * 60 + minutes;
      
      const [startHours, startMinutes] = daySchedule.start.split(':').map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      
      const [endHours, endMinutes] = daySchedule.end.split(':').map(Number);
      const endTotalMinutes = endHours * 60 + endMinutes;

      if (appointmentMinutes < startTotalMinutes || appointmentMinutes >= endTotalMinutes) {
        validation.valid = false;
        validation.errors.push(
          `Horario fuera de atención. Atendemos de ${daySchedule.start} a ${daySchedule.end}`
        );
        
        validation.suggestions.push(
          `Horarios disponibles: ${daySchedule.start} - ${daySchedule.end}`
        );
      }

      return validation;

    } catch (error) {
      console.error('❌ Error validating business hours:', error);
      return {
        valid: false,
        errors: ['Error validando horarios de atención'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate doctor availability
   */
  private async validateDoctorAvailability(request: BookingRequest): Promise<BusinessRuleValidation> {
    const validation: BusinessRuleValidation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      if (!request.doctorId) {
        // If no specific doctor requested, find any available doctor
        const availableDoctors = await this.getAvailableDoctors(request.date, request.time, request.organizationId);
        
        if (availableDoctors.length === 0) {
          validation.valid = false;
          validation.errors.push('No hay doctores disponibles en ese horario');
          
          // Suggest alternative times
          const alternatives = await this.getAlternativeSlots(request.date, request.organizationId);
          if (alternatives.length > 0) {
            validation.suggestions.push(
              `Horarios alternativos disponibles: ${alternatives.slice(0, 3).map(alt => alt.time).join(', ')}`
            );
          }
        }
        
        return validation;
      }

      // Check specific doctor availability
      const { data: doctorSchedule } = await this.supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', request.doctorId)
        .eq('date', request.date)
        .eq('start_time', request.time)
        .eq('available', true)
        .single();

      if (!doctorSchedule) {
        validation.valid = false;
        validation.errors.push('El doctor no está disponible en ese horario');
        
        // Suggest alternative times for the same doctor
        const doctorAlternatives = await this.getDoctorAlternativeSlots(
          request.doctorId, 
          request.date, 
          request.organizationId
        );
        
        if (doctorAlternatives.length > 0) {
          validation.suggestions.push(
            `Horarios disponibles para este doctor: ${doctorAlternatives.slice(0, 3).map(alt => alt.time).join(', ')}`
          );
        }
      }

      return validation;

    } catch (error) {
      console.error('❌ Error validating doctor availability:', error);
      return {
        valid: false,
        errors: ['Error verificando disponibilidad del doctor'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate appointment conflicts
   */
  private async validateConflicts(request: BookingRequest): Promise<BusinessRuleValidation> {
    const validation: BusinessRuleValidation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Check for existing appointments at the same time
      const { data: existingAppointments } = await this.supabase
        .from('appointments')
        .select('id, status, doctor_id')
        .eq('appointment_date', request.date)
        .eq('appointment_time', request.time)
        .in('status', [
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.EN_CURSO,
          AppointmentStatus.PENDING_PAYMENT
        ]);

      if (existingAppointments && existingAppointments.length > 0) {
        // If specific doctor requested, check if they have a conflict
        if (request.doctorId) {
          const doctorConflict = existingAppointments.find(apt => apt.doctor_id === request.doctorId);
          if (doctorConflict) {
            validation.valid = false;
            validation.errors.push('El doctor ya tiene una cita agendada en ese horario');
          }
        } else {
          // Check if all doctors are busy
          const busyDoctors = existingAppointments.map(apt => apt.doctor_id);
          const availableDoctors = await this.getAvailableDoctors(request.date, request.time, request.organizationId);
          const freeDoctors = availableDoctors.filter(doc => !busyDoctors.includes(doc.id));
          
          if (freeDoctors.length === 0) {
            validation.valid = false;
            validation.errors.push('Todos los doctores están ocupados en ese horario');
          }
        }
      }

      return validation;

    } catch (error) {
      console.error('❌ Error validating conflicts:', error);
      return {
        valid: false,
        errors: ['Error verificando conflictos de horario'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate service availability
   */
  private async validateServiceAvailability(service: string, organizationId: string): Promise<BusinessRuleValidation> {
    const validation: BusinessRuleValidation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      const { data: serviceData } = await this.supabase
        .from('services')
        .select('*')
        .eq('name', service)
        .eq('organization_id', organizationId)
        .eq('active', true)
        .single();

      if (!serviceData) {
        validation.valid = false;
        validation.errors.push('El servicio solicitado no está disponible');
        
        // Suggest available services
        const { data: availableServices } = await this.supabase
          .from('services')
          .select('name')
          .eq('organization_id', organizationId)
          .eq('active', true);

        if (availableServices && availableServices.length > 0) {
          validation.suggestions.push(
            `Servicios disponibles: ${availableServices.map(s => s.name).join(', ')}`
          );
        }
      }

      return validation;

    } catch (error) {
      console.error('❌ Error validating service availability:', error);
      return {
        valid: false,
        errors: ['Error verificando disponibilidad del servicio'],
        warnings: [],
        suggestions: []
      };
    }
  }

  // =====================================================
  // APPOINTMENT BOOKING
  // =====================================================

  /**
   * Create appointment with business rule validation
   */
  async createAppointment(request: BookingRequest, userRole?: string): Promise<BookingResult> {
    try {
      console.log('📅 Creating appointment with business rules validation:', request);

      // Validate business rules
      const validation = await this.validateBookingRequest(request, userRole);
      
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Find patient or create if doesn't exist
      let { data: patient } = await this.supabase
        .from('patients')
        .select('id')
        .eq('phone', request.patientPhone)
        .eq('organization_id', request.organizationId)
        .single();

      if (!patient) {
        // Create basic patient record
        const { data: newPatient, error: patientError } = await this.supabase
          .from('patients')
          .insert({
            phone: request.patientPhone,
            organization_id: request.organizationId,
            first_name: 'Paciente',
            last_name: 'WhatsApp',
            created_via: 'whatsapp_bot'
          })
          .select('id')
          .single();

        if (patientError) {
          return {
            success: false,
            errors: ['Error creando registro de paciente'],
            warnings: []
          };
        }

        patient = newPatient;
      }

      // Get service ID
      const { data: serviceData } = await this.supabase
        .from('services')
        .select('id')
        .eq('name', request.service)
        .eq('organization_id', request.organizationId)
        .single();

      if (!serviceData) {
        return {
          success: false,
          errors: ['Servicio no encontrado'],
          warnings: []
        };
      }

      // Assign doctor if not specified
      let doctorId = request.doctorId;
      if (!doctorId) {
        const availableDoctors = await this.getAvailableDoctors(request.date, request.time, request.organizationId);
        if (availableDoctors.length > 0) {
          doctorId = availableDoctors[0].id;
        }
      }

      // Create appointment
      const { data: appointment, error: appointmentError } = await this.supabase
        .from('appointments')
        .insert({
          patient_id: patient.id,
          doctor_id: doctorId,
          service_id: serviceData.id,
          organization_id: request.organizationId,
          appointment_date: request.date,
          appointment_time: request.time,
          status: AppointmentStatus.CONFIRMED,
          notes: request.notes || 'Cita agendada via WhatsApp Bot',
          created_via: 'whatsapp_bot'
        })
        .select('id')
        .single();

      if (appointmentError) {
        console.error('❌ Error creating appointment:', appointmentError);
        return {
          success: false,
          errors: ['Error creando la cita'],
          warnings: []
        };
      }

      console.log('✅ Appointment created successfully:', appointment.id);

      return {
        success: true,
        appointmentId: appointment.id,
        errors: [],
        warnings: validation.warnings
      };

    } catch (error) {
      console.error('❌ Error in createAppointment:', error);
      return {
        success: false,
        errors: ['Error interno creando la cita'],
        warnings: []
      };
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Get business hours for organization
   */
  private async getBusinessHours(organizationId: string): Promise<BusinessHours> {
    // Default business hours - in a real implementation, this would come from the database
    return {
      monday: { start: '08:00', end: '18:00', active: true },
      tuesday: { start: '08:00', end: '18:00', active: true },
      wednesday: { start: '08:00', end: '18:00', active: true },
      thursday: { start: '08:00', end: '18:00', active: true },
      friday: { start: '08:00', end: '18:00', active: true },
      saturday: { start: '08:00', end: '14:00', active: true },
      sunday: { start: '00:00', end: '00:00', active: false }
    };
  }

  /**
   * Get available doctors for a specific time slot
   */
  private async getAvailableDoctors(date: string, time: string, organizationId: string): Promise<any[]> {
    try {
      const { data: doctors } = await this.supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'doctor')
        .eq('organization_id', organizationId)
        .eq('active', true);

      // In a real implementation, this would check doctor schedules and availability
      return doctors || [];

    } catch (error) {
      console.error('❌ Error getting available doctors:', error);
      return [];
    }
  }

  /**
   * Get alternative time slots for a date
   */
  private async getAlternativeSlots(date: string, organizationId: string): Promise<AvailabilitySlot[]> {
    // In a real implementation, this would query available slots
    return [
      { date, time: '09:00', doctorId: '1', doctorName: 'Dr. Elena López', available: true },
      { date, time: '11:00', doctorId: '2', doctorName: 'Dr. Ana Rodríguez', available: true },
      { date, time: '15:00', doctorId: '3', doctorName: 'Dr. Pedro Sánchez', available: true }
    ];
  }

  /**
   * Get alternative slots for a specific doctor
   */
  private async getDoctorAlternativeSlots(doctorId: string, date: string, organizationId: string): Promise<AvailabilitySlot[]> {
    // In a real implementation, this would query doctor-specific availability
    return [
      { date, time: '10:00', doctorId, doctorName: 'Doctor', available: true },
      { date, time: '14:00', doctorId, doctorName: 'Doctor', available: true },
      { date, time: '16:00', doctorId, doctorName: 'Doctor', available: true }
    ];
  }

  /**
   * Get next business day
   */
  private getNextBusinessDay(currentDate: Date, businessHours: BusinessHours): Date | null {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 1; i <= 7; i++) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + i);
      
      const dayName = dayNames[nextDay.getDay()] as keyof BusinessHours;
      if (businessHours[dayName].active) {
        return nextDay;
      }
    }
    
    return null;
  }

  /**
   * Get day name in Spanish
   */
  private getDayNameInSpanish(dayOfWeek: number): string {
    const dayNames = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
    return dayNames[dayOfWeek];
  }
}
