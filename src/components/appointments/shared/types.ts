/**
 * Shared types for appointment booking components
 * Used across both manual and AI booking flows
 */

export interface Doctor {
  id: string;
  specialization: string;
  consultation_fee?: number;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  organization_id: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  organization_id: string;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  consultation_fee: number;
  available: boolean;
}

export interface FlowStep {
  id: string;
  title: string;
  completed: boolean;
  current: boolean;
}

export interface AppointmentFormData {
  service_id?: string;
  doctor_id?: string;
  location_id?: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  notes?: string;
}

// Unified booking request interface for both manual and AI flows
export interface UnifiedBookingRequest {
  // Common fields
  organizationId?: string;
  patientId: string;
  doctorId: string;
  serviceId?: string;
  locationId?: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  duration_minutes?: number;
  reason?: string;
  notes?: string;

  // AI-specific fields
  action?: 'book_appointment';
  message?: string;
  userId?: string;
}

// Unified booking response interface
export interface UnifiedBookingResponse {
  success: boolean;
  appointmentId?: string;
  appointment?: any;
  message?: string;
  error?: string;
  timestamp?: string;

  // AI-specific response fields
  intent?: any;
  response?: string;
  nextActions?: string[];
  canProceed?: boolean;
  availability?: AvailabilitySlot[];
}

export interface SelectionOption {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  price?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface AppointmentBookingProps {
  organizationId: string;
  userId?: string;
  patientName?: string;
  onAppointmentBooked?: (appointmentId: string) => void;
  onCancel?: () => void;
  initialData?: Partial<AppointmentFormData>;
  mode?: 'manual' | 'ai' | 'guided';
}
