'use client';

/**
 * CancelAppointmentModal Component
 * 
 * Modal especializado para cancelar citas con UX optimizada:
 * - Resumen completo de la cita a cancelar
 * - Captura de motivos de cancelación predefinidos
 * - Campo de texto libre para "Otro motivo"
 * - Confirmación detallada con botones claros
 * 
 * Características:
 * - Diseño ribbon-style consistente con AppointmentCard
 * - Almacenamiento de motivos para análisis posterior
 * - Accesibilidad WCAG 2.1 completa
 * - Integración con arquitectura multi-tenant
 * - Validación de formularios y manejo de errores
 * 
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  MapPin, 
  Stethoscope, 
  User, 
  FileText,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { AppointmentData } from './AppointmentCard';

/**
 * Motivos predefinidos de cancelación
 */
export const CANCELLATION_REASONS = [
  { value: 'schedule_conflict', label: 'Conflicto de horario' },
  { value: 'health_issue', label: 'Problema de salud que impide asistir' },
  { value: 'personal_plans', label: 'Cambio de planes personales' },
  { value: 'service_dissatisfaction', label: 'Insatisfacción con el servicio' },
  { value: 'financial_issue', label: 'Problema económico' },
  { value: 'other', label: 'Otro motivo' }
] as const;

/**
 * Props del componente CancelAppointmentModal
 */
interface CancelAppointmentModalProps {
  /** Si el modal está abierto */
  isOpen: boolean;
  /** Datos de la cita a cancelar */
  appointment: AppointmentData | null;
  /** Callback cuando se confirma la cancelación */
  onConfirm: (appointmentId: string, reason: string, customReason?: string) => Promise<void>;
  /** Callback cuando se cancela el modal */
  onCancel: () => void;
  /** Estado de carga */
  loading?: boolean;
  /** Mensaje de error */
  error?: string | null;
}

/**
 * Interfaz para datos del formulario de cancelación
 */
interface CancellationFormData {
  reason: string;
  customReason: string;
}

/**
 * Formatea la duración en minutos a texto legible
 * 
 * @param minutes - Duración en minutos
 * @returns Texto formateado (ej: "30 min", "1h 30min")
 */
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
};

/**
 * Formatea la fecha para mostrar
 * 
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Fecha formateada en español
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatea la hora para mostrar
 *
 * @param timeString - Hora en formato HH:MM:SS
 * @returns Hora formateada (ej: "14:30")
 */
const formatTime = (timeString: string): string => {
  return timeString.substring(0, 5);
};

/**
 * Get doctor name with fallback handling
 * Handles different data structures that might come from Supabase
 *
 * @param doctor - Doctor data from appointment
 * @returns Formatted doctor name with fallbacks
 */
const getDoctorName = (doctor: any): string => {
  if (!doctor) {
    return 'Dr. [No asignado]';
  }

  // Handle array structure: doctor[0]
  const doctorRecord = Array.isArray(doctor) ? doctor[0] : doctor;

  if (!doctorRecord) {
    return 'Dr. [No asignado]';
  }

  // Try different profile access patterns
  let profile = null;

  // Pattern 1: profiles array
  if (doctorRecord.profiles && Array.isArray(doctorRecord.profiles) && doctorRecord.profiles.length > 0) {
    profile = doctorRecord.profiles[0];
  }
  // Pattern 2: profiles object
  else if (doctorRecord.profiles && !Array.isArray(doctorRecord.profiles)) {
    profile = doctorRecord.profiles;
  }
  // Pattern 3: direct profile fields (flattened structure)
  else if (doctorRecord.first_name || doctorRecord.last_name) {
    profile = doctorRecord;
  }

  if (!profile) {
    console.warn('⚠️ CancelAppointmentModal - No profile found for doctor:', doctorRecord);
    return 'Dr. [Perfil no encontrado]';
  }

  const firstName = profile.first_name;
  const lastName = profile.last_name;

  if (firstName && lastName) {
    return `Dr. ${firstName} ${lastName}`;
  } else if (firstName) {
    return `Dr. ${firstName}`;
  } else if (lastName) {
    return `Dr. ${lastName}`;
  } else {
    console.warn('⚠️ CancelAppointmentModal - No name found in profile:', profile);
    return 'Dr. [Nombre no disponible]';
  }
};

/**
 * Componente principal CancelAppointmentModal
 */
const CancelAppointmentModal: React.FC<CancelAppointmentModalProps> = ({
  isOpen,
  appointment,
  onConfirm,
  onCancel,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState<CancellationFormData>({
    reason: '',
    customReason: ''
  });
  const [showCustomReason, setShowCustomReason] = useState(false);

  // Usar el estado de loading del padre en lugar de isSubmitting local
  const isSubmitting = loading;

  // Debug: Log appointment data structure and loading states
  useEffect(() => {
    if (appointment?.doctor?.[0]) {
      const doctor = appointment.doctor[0];
      console.log('🔍 DEBUG - CancelAppointmentModal Doctor data:', {
        doctor: doctor,
        profiles: doctor.profiles,
        profilesLength: doctor.profiles?.length,
        firstProfile: doctor.profiles?.[0],
        firstName: doctor.profiles?.[0]?.first_name,
        lastName: doctor.profiles?.[0]?.last_name,
        doctorId: doctor.id
      });
    }

    console.log('🔍 DEBUG - CancelAppointmentModal States:', {
      isOpen,
      loading,
      isSubmitting,
      hasAppointment: !!appointment,
      appointmentId: appointment?.id
    });
  }, [appointment?.doctor, isOpen, loading, isSubmitting, appointment?.id]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({ reason: '', customReason: '' });
      setShowCustomReason(false);
    }
  }, [isOpen]);

  // Show/hide custom reason field based on selection
  useEffect(() => {
    setShowCustomReason(formData.reason === 'other');
    if (formData.reason !== 'other') {
      setFormData(prev => ({ ...prev, customReason: '' }));
    }
  }, [formData.reason]);

  /**
   * Maneja cambios en los campos del formulario
   */
  const handleInputChange = (field: keyof CancellationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Valida el formulario antes del envío
   */
  const validateForm = (): boolean => {
    if (!formData.reason) {
      return false;
    }
    if (formData.reason === 'other' && !formData.customReason.trim()) {
      return false;
    }
    return true;
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appointment || !validateForm() || isSubmitting) {
      return;
    }

    try {
      const finalReason = formData.reason === 'other'
        ? formData.customReason.trim()
        : CANCELLATION_REASONS.find(r => r.value === formData.reason)?.label || formData.reason;

      // El estado de loading es manejado por el componente padre
      await onConfirm(appointment.id, formData.reason, finalReason);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      // El manejo de errores y estados es responsabilidad del componente padre
    }
  };

  /**
   * Maneja el cierre del modal
   */
  const handleClose = () => {
    if (!isSubmitting) {
      onCancel();
    }
  };

  if (!isOpen || !appointment) return null;

  const doctor = appointment.doctor?.[0];
  const service = appointment.service?.[0];
  const location = appointment.location?.[0];
  const isFormValid = validateForm();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-auto transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Cancelar Cita
                </h3>
                <p className="text-sm text-gray-600">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Appointment Summary - Ribbon Style */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Resumen de la cita a cancelar:</h4>
              
              {/* Main Info Row */}
              <div className="flex items-center justify-between mb-3">
                {/* Service & Doctor */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <Stethoscope className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {service?.name || 'Consulta General'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {getDoctorName(appointment.doctor)}
                    </p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        {formatTime(appointment.start_time)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDuration(appointment.duration_minutes)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              {location && (
                <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                    <MapPin className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{location.name}</p>
                    {location.address && (
                      <p className="text-xs text-gray-600">{location.address}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cancellation Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reason Selection */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de cancelación *
                </label>
                <div className="relative">
                  <select
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none bg-white"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="">Selecciona un motivo</option>
                    {CANCELLATION_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Custom Reason Field */}
              {showCustomReason && (
                <div>
                  <label htmlFor="customReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Especifica el motivo *
                  </label>
                  <textarea
                    id="customReason"
                    value={formData.customReason}
                    onChange={(e) => handleInputChange('customReason', e.target.value)}
                    placeholder="Describe brevemente el motivo de cancelación..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    disabled={isSubmitting}
                    required
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.customReason.length}/500 caracteres
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  Mantener Cita
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || loading || !isFormValid}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting || loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Confirmar Cancelación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelAppointmentModal;
