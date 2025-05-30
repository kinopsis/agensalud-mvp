'use client';

/**
 * EnhancedRescheduleModal Component
 * 
 * Modal mejorado para reagendar citas con visualización de disponibilidad:
 * - Muestra horarios disponibles del doctor en formato grid
 * - Integración con AvailabilityEngine para datos reales
 * - UX optimizada con selección visual de slots
 * - Validación en tiempo real de conflictos
 * 
 * Características:
 * - Grid de horarios disponibles por períodos (Mañana/Tarde)
 * - Integración con API de disponibilidad existente
 * - Estados de carga y manejo de errores mejorados
 * - Accesibilidad WCAG 2.1 completa
 * - Diseño responsive y consistente
 * 
 * @author AgentSalud MVP Team - UX/UI Enhancement
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Stethoscope, 
  AlertCircle,
  Info,
  Save,
  Loader2,
  Sun,
  Sunset,
  RefreshCw
} from 'lucide-react';
import { AppointmentData } from './AppointmentCard';

/**
 * Interfaz para slots de tiempo disponibles
 */
interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  reason?: string;
}

/**
 * Props del componente EnhancedRescheduleModal
 */
interface EnhancedRescheduleModalProps {
  /** Si el modal está abierto */
  isOpen: boolean;
  /** Datos de la cita a reagendar */
  appointment: AppointmentData | null;
  /** ID de la organización */
  organizationId: string;
  /** Callback cuando se confirma el reagendado */
  onConfirm: (appointmentId: string, newDate: string, newTime: string) => Promise<void>;
  /** Callback cuando se cancela el modal */
  onCancel: () => void;
  /** Estado de carga */
  loading?: boolean;
  /** Mensaje de error */
  error?: string | null;
}

/**
 * Agrupa slots por período del día
 */
const groupSlotsByPeriod = (slots: TimeSlot[]) => {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];
  const evening: TimeSlot[] = [];

  slots.forEach(slot => {
    const hour = parseInt(slot.start_time?.split(':')[0] || '0');
    if (hour < 12) {
      morning.push(slot);
    } else if (hour < 18) {
      afternoon.push(slot);
    } else {
      evening.push(slot);
    }
  });

  return { morning, afternoon, evening };
};

/**
 * Formatea la hora para mostrar
 */
const formatTimeDisplay = (time: string): string => {
  return time.substring(0, 5); // Remove seconds
};

/**
 * Get doctor name with fallback handling
 * Handles different data structures that might come from Supabase
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
    console.warn('⚠️ EnhancedRescheduleModal - No profile found for doctor:', doctorRecord);
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
    console.warn('⚠️ EnhancedRescheduleModal - No name found in profile:', profile);
    return 'Dr. [Nombre no disponible]';
  }
};

/**
 * Componente principal EnhancedRescheduleModal
 */
const EnhancedRescheduleModal: React.FC<EnhancedRescheduleModalProps> = ({
  isOpen,
  appointment,
  organizationId,
  onConfirm,
  onCancel,
  loading = false,
  error = null
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && appointment) {
      setSelectedDate(appointment.appointment_date);
      setSelectedTime(appointment.start_time.substring(0, 5));
      setSlotsError(null);
      loadAvailability(appointment.appointment_date);
    } else {
      setSelectedDate('');
      setSelectedTime('');
      setAvailableSlots([]);
      setSlotsError(null);
    }
  }, [isOpen, appointment]);

  /**
   * Carga la disponibilidad del doctor para una fecha específica
   */
  const loadAvailability = async (date: string) => {
    if (!appointment || !organizationId) return;

    const doctorId = appointment.doctor?.[0]?.id;
    if (!doctorId) return;

    setLoadingSlots(true);
    setSlotsError(null);

    try {
      const response = await fetch(
        `/api/doctors/availability?organizationId=${organizationId}&doctorId=${doctorId}&date=${date}&duration=30`
      );

      if (!response.ok) {
        throw new Error('Error al cargar disponibilidad');
      }

      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error('Error loading availability:', error);
      setSlotsError('Error al cargar horarios disponibles');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  /**
   * Maneja el cambio de fecha
   */
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedTime(''); // Reset selected time
    loadAvailability(newDate);
  };

  /**
   * Maneja la selección de un slot de tiempo
   */
  const handleTimeSlotSelect = (time: string) => {
    setSelectedTime(time);
  };

  /**
   * Valida si se puede enviar el formulario
   */
  const canSubmit = (): boolean => {
    return !!(selectedDate && selectedTime && !loadingSlots && !isSubmitting);
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment || !canSubmit()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(appointment.id, selectedDate, selectedTime);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
    } finally {
      setIsSubmitting(false);
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

  // Debug: Log doctor data structure to identify the issue
  React.useEffect(() => {
    if (appointment?.doctor?.[0]) {
      const doctor = appointment.doctor[0];
      console.log('🔍 DEBUG - EnhancedRescheduleModal Doctor data:', {
        doctor: doctor,
        profiles: doctor.profiles,
        profilesLength: doctor.profiles?.length,
        firstProfile: doctor.profiles?.[0],
        firstName: doctor.profiles?.[0]?.first_name,
        lastName: doctor.profiles?.[0]?.last_name,
        doctorId: doctor.id
      });
    }
  }, [appointment?.doctor]);

  if (!isOpen || !appointment) return null;

  const doctor = appointment.doctor?.[0];
  const service = appointment.service?.[0];
  const location = appointment.location?.[0];
  const { morning, afternoon, evening } = groupSlotsByPeriod(availableSlots);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full mx-auto transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Reagendar Cita
                </h3>
                <p className="text-sm text-gray-600">
                  Selecciona una nueva fecha y horario disponible
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
            {/* Current Appointment Info - Ribbon Style */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Información de la cita (no modificable):</h4>
              <div className="flex items-center justify-between">
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

                {/* Current Date & Time */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">Actual:</p>
                      <p className="text-xs text-gray-600">{appointment.appointment_date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                      <Clock className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">Hora:</p>
                      <p className="text-xs text-gray-600">{formatTimeDisplay(appointment.start_time)}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {location && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                      <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{location.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reschedule Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Selection */}
              <div>
                <label htmlFor="newDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Fecha
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="newDate"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                    required
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Time Slots Grid */}
              {selectedDate && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Horarios Disponibles
                    </label>
                    <button
                      type="button"
                      onClick={() => loadAvailability(selectedDate)}
                      disabled={loadingSlots}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${loadingSlots ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                  </div>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Cargando horarios...</span>
                    </div>
                  ) : slotsError ? (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                        <p className="text-sm text-red-700">{slotsError}</p>
                      </div>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex">
                        <Info className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                        <p className="text-sm text-yellow-700">
                          No hay horarios disponibles para esta fecha. Intenta con otra fecha.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Morning Slots */}
                      {morning.length > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <Sun className="h-4 w-4 text-yellow-500 mr-2" />
                            <h4 className="text-sm font-medium text-gray-700">Mañana</h4>
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {morning.map((slot) => (
                              <button
                                key={slot.start_time}
                                type="button"
                                onClick={() => handleTimeSlotSelect(slot.start_time)}
                                disabled={!slot.available}
                                className={`p-2 text-xs rounded-md border transition-colors ${
                                  selectedTime === slot.start_time
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : slot.available
                                    ? 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                }`}
                                title={slot.available ? `Disponible a las ${formatTimeDisplay(slot.start_time)}` : slot.reason}
                              >
                                {formatTimeDisplay(slot.start_time)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Afternoon Slots */}
                      {afternoon.length > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <Sunset className="h-4 w-4 text-orange-500 mr-2" />
                            <h4 className="text-sm font-medium text-gray-700">Tarde</h4>
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {afternoon.map((slot) => (
                              <button
                                key={slot.start_time}
                                type="button"
                                onClick={() => handleTimeSlotSelect(slot.start_time)}
                                disabled={!slot.available}
                                className={`p-2 text-xs rounded-md border transition-colors ${
                                  selectedTime === slot.start_time
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : slot.available
                                    ? 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                }`}
                                title={slot.available ? `Disponible a las ${formatTimeDisplay(slot.start_time)}` : slot.reason}
                              >
                                {formatTimeDisplay(slot.start_time)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">¿Necesitas cambiar más detalles?</p>
                    <p>Para cambiar ubicación, servicio o doctor, debes cancelar esta cita y crear una nueva.</p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit() || loading}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting || loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reagendando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Confirmar Reagendado
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

export default EnhancedRescheduleModal;
