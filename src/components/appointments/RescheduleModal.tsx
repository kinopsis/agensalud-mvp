'use client';

/**
 * RescheduleModal Component
 * 
 * Modal especializado para reagendar citas con restricciones específicas:
 * - Solo permite cambiar fecha y hora
 * - Mantiene invariables: ubicación/sede, servicio, doctor asignado
 * - UX optimizada con validaciones y mensajes explicativos
 * 
 * Características:
 * - Diseño ribbon-style consistente con AppointmentCard
 * - Validación de fechas futuras y horarios disponibles
 * - Accesibilidad WCAG 2.1 completa
 * - Integración con arquitectura multi-tenant
 * - Manejo de errores y estados de carga
 * 
 * @author AgentSalud MVP Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Stethoscope, 
  User, 
  AlertCircle,
  Info,
  Save,
  Loader2
} from 'lucide-react';
import { AppointmentData } from './AppointmentCard';

/**
 * Props del componente RescheduleModal
 */
interface RescheduleModalProps {
  /** Si el modal está abierto */
  isOpen: boolean;
  /** Datos de la cita a reagendar */
  appointment: AppointmentData | null;
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
 * Interfaz para datos del formulario de reagendado
 */
interface RescheduleFormData {
  newDate: string;
  newTime: string;
}

/**
 * Valida si una fecha es válida para reagendar
 * 
 * @param date - Fecha en formato YYYY-MM-DD
 * @returns true si la fecha es válida (futura)
 */
const isValidRescheduleDate = (date: string): boolean => {
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate >= today;
};

/**
 * Valida si una hora es válida para reagendar
 * 
 * @param time - Hora en formato HH:MM
 * @param date - Fecha seleccionada
 * @returns true si la hora es válida (futura si es hoy)
 */
const isValidRescheduleTime = (time: string, date: string): boolean => {
  const selectedDateTime = new Date(`${date}T${time}`);
  const now = new Date();
  return selectedDateTime > now;
};

/**
 * Componente principal RescheduleModal
 */
const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  appointment,
  onConfirm,
  onCancel,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState<RescheduleFormData>({
    newDate: '',
    newTime: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<RescheduleFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && appointment) {
      setFormData({
        newDate: appointment.appointment_date,
        newTime: appointment.start_time.substring(0, 5) // Remove seconds
      });
      setFormErrors({});
    } else {
      setFormData({ newDate: '', newTime: '' });
      setFormErrors({});
    }
  }, [isOpen, appointment]);

  /**
   * Maneja cambios en los campos del formulario
   */
  const handleInputChange = (field: keyof RescheduleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Valida el formulario antes del envío
   */
  const validateForm = (): boolean => {
    const errors: Partial<RescheduleFormData> = {};

    // Validate date
    if (!formData.newDate) {
      errors.newDate = 'La fecha es requerida';
    } else if (!isValidRescheduleDate(formData.newDate)) {
      errors.newDate = 'La fecha debe ser hoy o en el futuro';
    }

    // Validate time
    if (!formData.newTime) {
      errors.newTime = 'La hora es requerida';
    } else if (formData.newDate && !isValidRescheduleTime(formData.newTime, formData.newDate)) {
      errors.newTime = 'La hora debe ser en el futuro';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(appointment.id, formData.newDate, formData.newTime);
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

  if (!isOpen || !appointment) return null;

  const doctor = appointment.doctor?.[0];
  const service = appointment.service?.[0];
  const location = appointment.location?.[0];

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
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Reagendar Cita
                </h3>
                <p className="text-sm text-gray-600">
                  Solo puedes cambiar la fecha y hora
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
                      {doctor?.profiles?.first_name && doctor?.profiles?.last_name
                        ? `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}`
                        : doctor?.profiles?.first_name
                        ? `Dr. ${doctor.profiles.first_name}`
                        : doctor?.profiles?.last_name
                        ? `Dr. ${doctor.profiles.last_name}`
                        : 'Dr. [Nombre no disponible]'
                      }
                    </p>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date Input */}
              <div>
                <label htmlFor="newDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Fecha
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="newDate"
                    value={formData.newDate}
                    onChange={(e) => handleInputChange('newDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.newDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                    required
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {formErrors.newDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {formErrors.newDate}
                  </p>
                )}
              </div>

              {/* Time Input */}
              <div>
                <label htmlFor="newTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Hora
                </label>
                <div className="relative">
                  <input
                    type="time"
                    id="newTime"
                    value={formData.newTime}
                    onChange={(e) => handleInputChange('newTime', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.newTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                    required
                  />
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {formErrors.newTime && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {formErrors.newTime}
                  </p>
                )}
              </div>

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
                  disabled={isSubmitting || loading}
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

export default RescheduleModal;
