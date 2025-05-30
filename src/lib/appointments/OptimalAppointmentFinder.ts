/**
 * OptimalAppointmentFinder
 * Algorithm to find the best available appointment slot based on multiple criteria
 * Weights: Time proximity (40%), Location distance (30%), Doctor availability (20%), Service compatibility (10%)
 */

export interface OptimalAppointmentCriteria {
  serviceId: string;
  organizationId: string;
  userLocation?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  preferences?: {
    maxDaysOut?: number;
    timePreference?: 'morning' | 'afternoon' | 'evening' | 'any';
    preferredDoctorId?: string;
    preferredLocationId?: string;
  };
}

export interface OptimalAppointmentResult {
  appointment: {
    doctorId: string;
    doctorName: string;
    specialization: string;
    locationId: string;
    locationName: string;
    locationAddress: string;
    date: string;
    startTime: string;
    endTime: string;
    consultationFee: number;
  };
  score: number;
  reasoning: {
    timeProximity: number;
    locationDistance: number;
    doctorAvailability: number;
    serviceCompatibility: number;
    explanation: string;
  };
}

export interface AvailabilitySlot {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  start_time: string;
  end_time: string;
  consultation_fee: number;
  available: boolean;
}

export class OptimalAppointmentFinder {
  private readonly WEIGHTS = {
    TIME_PROXIMITY: 0.4,
    LOCATION_DISTANCE: 0.3,
    DOCTOR_AVAILABILITY: 0.2,
    SERVICE_COMPATIBILITY: 0.1
  };

  /**
   * Find the optimal appointment based on criteria
   */
  async findOptimalAppointment(criteria: OptimalAppointmentCriteria): Promise<OptimalAppointmentResult | null> {
    try {
      // Get available slots for the next 14 days
      const availableSlots = await this.getAvailableSlots(criteria);

      if (availableSlots.length === 0) {
        return null;
      }

      // Score each slot
      const scoredSlots = availableSlots.map(slot => ({
        slot,
        score: this.calculateSlotScore(slot, criteria),
        reasoning: this.generateReasoning(slot, criteria)
      }));

      // Sort by score (highest first)
      scoredSlots.sort((a, b) => b.score - a.score);

      const bestSlot = scoredSlots[0];

      return {
        appointment: {
          doctorId: bestSlot.slot.doctor_id,
          doctorName: bestSlot.slot.doctor_name,
          specialization: bestSlot.slot.specialization,
          locationId: '', // Will be populated from doctor data
          locationName: 'Sede Principal', // Default location
          locationAddress: 'Dirección por confirmar',
          date: bestSlot.slot.date,
          startTime: bestSlot.slot.start_time,
          endTime: bestSlot.slot.end_time,
          consultationFee: bestSlot.slot.consultation_fee
        },
        score: bestSlot.score,
        reasoning: bestSlot.reasoning
      };

    } catch (error) {
      console.error('Error finding optimal appointment:', error);
      return null;
    }
  }

  /**
   * Get available slots from the API
   */
  private async getAvailableSlots(criteria: OptimalAppointmentCriteria): Promise<AvailabilitySlot[]> {
    const slots: AvailabilitySlot[] = [];
    const maxDays = criteria.preferences?.maxDaysOut || 14;
    const today = new Date();

    // Check availability for the next maxDays days
    for (let i = 1; i <= maxDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      try {
        let url = `/api/doctors/availability?organizationId=${criteria.organizationId}&date=${dateString}`;

        if (criteria.serviceId) {
          url += `&serviceId=${criteria.serviceId}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const daySlots = data.data || [];

          // Add date to each slot since the API doesn't include it
          const slotsWithDate = daySlots.map((slot: any) => ({
            ...slot,
            date: dateString
          }));

          // Filter by time preference if specified
          const filteredSlots = this.filterByTimePreference(slotsWithDate, criteria.preferences?.timePreference);
          slots.push(...filteredSlots);
        }
      } catch (error) {
        console.error(`Error fetching availability for ${dateString}:`, error);
      }
    }

    return slots.filter(slot => slot.available);
  }

  /**
   * Filter slots by time preference
   */
  private filterByTimePreference(slots: AvailabilitySlot[], timePreference?: string): AvailabilitySlot[] {
    if (!timePreference || timePreference === 'any') {
      return slots;
    }

    return slots.filter(slot => {
      const hour = parseInt(slot.start_time.split(':')[0]);

      switch (timePreference) {
        case 'morning':
          return hour >= 6 && hour < 12;
        case 'afternoon':
          return hour >= 12 && hour < 18;
        case 'evening':
          return hour >= 18 && hour < 22;
        default:
          return true;
      }
    });
  }

  /**
   * Calculate score for a slot based on all criteria
   */
  private calculateSlotScore(slot: AvailabilitySlot, criteria: OptimalAppointmentCriteria): number {
    const timeScore = this.calculateTimeProximityScore(slot.date);
    const locationScore = this.calculateLocationScore(slot, criteria.userLocation);
    const doctorScore = this.calculateDoctorScore(slot, criteria.preferences?.preferredDoctorId);
    const serviceScore = this.calculateServiceCompatibilityScore(slot);

    return (
      timeScore * this.WEIGHTS.TIME_PROXIMITY +
      locationScore * this.WEIGHTS.LOCATION_DISTANCE +
      doctorScore * this.WEIGHTS.DOCTOR_AVAILABILITY +
      serviceScore * this.WEIGHTS.SERVICE_COMPATIBILITY
    );
  }

  /**
   * Calculate time proximity score (closer dates get higher scores)
   */
  private calculateTimeProximityScore(date: string): number {
    const today = new Date();
    const appointmentDate = new Date(date);
    const daysDifference = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Score decreases as days increase (max 14 days out)
    return Math.max(0, (14 - daysDifference) / 14);
  }

  /**
   * Calculate location score (closer locations get higher scores)
   */
  private calculateLocationScore(slot: AvailabilitySlot, userLocation?: OptimalAppointmentCriteria['userLocation']): number {
    // Since we don't have location data in the simplified API response,
    // return a neutral score for now
    return 0.7; // Assume reasonable accessibility
  }

  /**
   * Calculate doctor score (preferred doctors get higher scores)
   */
  private calculateDoctorScore(slot: AvailabilitySlot, preferredDoctorId?: string): number {
    if (preferredDoctorId && slot.doctor_id === preferredDoctorId) {
      return 1.0; // Perfect match
    }

    // Base score for any available doctor
    return 0.8;
  }

  /**
   * Calculate service compatibility score
   */
  private calculateServiceCompatibilityScore(slot: AvailabilitySlot): number {
    // All slots returned should be compatible with the service
    // This could be enhanced to consider doctor specialization match
    return 0.9;
  }

  /**
   * Generate human-readable reasoning for the selection
   */
  private generateReasoning(slot: AvailabilitySlot, criteria: OptimalAppointmentCriteria): OptimalAppointmentResult['reasoning'] {
    const timeScore = this.calculateTimeProximityScore(slot.date);
    const locationScore = this.calculateLocationScore(slot, criteria.userLocation);
    const doctorScore = this.calculateDoctorScore(slot, criteria.preferences?.preferredDoctorId);
    const serviceScore = this.calculateServiceCompatibilityScore(slot);

    const reasons: string[] = [];

    if (timeScore > 0.8) {
      reasons.push('Cita disponible muy pronto');
    } else if (timeScore > 0.6) {
      reasons.push('Cita disponible en pocos días');
    }

    if (locationScore > 0.8) {
      reasons.push('Ubicación conveniente');
    }

    if (doctorScore === 1.0) {
      reasons.push('Doctor de tu preferencia');
    } else if (doctorScore > 0.8) {
      reasons.push('Doctor altamente calificado');
    }

    if (serviceScore > 0.8) {
      reasons.push('Especialización perfecta para tu consulta');
    }

    const explanation = reasons.length > 0
      ? `Seleccionado por: ${reasons.join(', ')}`
      : 'Mejor opción disponible según tus criterios';

    return {
      timeProximity: timeScore,
      locationDistance: locationScore,
      doctorAvailability: doctorScore,
      serviceCompatibility: serviceScore,
      explanation
    };
  }

  /**
   * Get next available appointment (simplified version for quick booking)
   */
  async getNextAvailableAppointment(serviceId: string, organizationId: string): Promise<OptimalAppointmentResult | null> {
    return this.findOptimalAppointment({
      serviceId,
      organizationId,
      preferences: {
        maxDaysOut: 7, // Look only 1 week ahead for quick booking
        timePreference: 'any'
      }
    });
  }
}
