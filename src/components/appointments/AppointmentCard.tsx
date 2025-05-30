'use client';

/**
 * AppointmentCard Component
 *
 * Ribbon-style horizontal card design for displaying appointment information
 * Optimized for the appointment tabs system with compact, modern layout
 *
 * Features:
 * - Horizontal ribbon layout with fixed height (80px minimum)
 * - Left section: Date, time, and status badge
 * - Center section: Service, doctor, location, and additional info
 * - Right section: Action buttons (Reagendar, Cancelar)
 * - Responsive design with progressive disclosure
 * - WCAG 2.1 accessibility compliance
 * - Smooth hover transitions and visual feedback
 *
 * Layout Structure:
 * [Date/Time/Status] [Service/Doctor/Location/Notes] [Action Buttons]
 *
 * @version 2.0.0 - Ribbon-style redesign for appointment tabs
 */

import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Stethoscope,
  FileText,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { UserRole } from '@/types/database';

export interface AppointmentData {
  id: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  reason: string | null;
  notes: string | null;
  doctor?: {
    id: string;
    specialization?: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
    }[];
  }[] | null;
  patient?: {
    id: string;
    first_name?: string;
    last_name?: string;
  }[] | null;
  location?: {
    id: string;
    name?: string;
    address?: string;
  }[] | null;
  service?: {
    id: string;
    name?: string;
    duration_minutes?: number;
    price?: number | null;
  }[] | null;
}

export interface AppointmentCardProps {
  appointment: AppointmentData;
  userRole: UserRole;
  onReschedule?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  onStatusChange?: (appointmentId: string, newStatus: string) => void;
  canReschedule?: boolean;
  canCancel?: boolean;
  canChangeStatus?: boolean;
  showLocation?: boolean;
  showCost?: boolean;
  showDuration?: boolean;
  className?: string;
}

/**
 * Get status color and icon based on appointment status
 * Simplified status system for better UX
 */
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Clock,
        text: 'Pendiente de Confirmación'
      };
    case 'confirmed':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: 'Confirmada'
      };
    case 'cancelled':
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: X,
        text: 'Cancelada'
      };
    case 'completed':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: CheckCircle,
        text: 'Completada'
      };
    // Legacy status support - map to simplified states
    case 'scheduled':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: 'Confirmada'
      };
    case 'no_show':
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
        text: 'No Asistió'
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
        text: status
      };
  }
};

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time for display
 */
const formatTime = (timeString: string): string => {
  return timeString.slice(0, 5); // Remove seconds if present
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
    console.warn('⚠️ No profile found for doctor:', doctorRecord);
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
    console.warn('⚠️ No name found in profile:', profile);
    return 'Dr. [Nombre no disponible]';
  }
};

/**
 * Format price in Colombian Pesos (COP)
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

/**
 * AppointmentCard Component
 */
export default function AppointmentCard({
  appointment,
  userRole,
  onReschedule,
  onCancel,
  onStatusChange,
  canReschedule = false,
  canCancel = false,
  canChangeStatus = false,
  showLocation = true,
  showCost = false,
  showDuration = true,
  className = ''
}: AppointmentCardProps) {
  const statusInfo = getStatusInfo(appointment.status);
  const StatusIcon = statusInfo.icon;

  const doctor = appointment.doctor?.[0];
  const patient = appointment.patient?.[0];
  const location = appointment.location?.[0];
  const service = appointment.service?.[0];

  // Debug: Log doctor data structure to identify the issue
  React.useEffect(() => {
    if (doctor) {
      console.log('🔍 DEBUG - Doctor data structure:', {
        doctor: doctor,
        profiles: doctor.profiles,
        profilesLength: doctor.profiles?.length,
        firstProfile: doctor.profiles?.[0],
        firstName: doctor.profiles?.[0]?.first_name,
        lastName: doctor.profiles?.[0]?.last_name
      });
    }
  }, [doctor]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      {/* Ribbon-style horizontal layout */}
      <div className="flex items-center justify-between p-4 min-h-[80px]">
        {/* Left section: Date, Time & Status */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          {/* Date & Time */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(appointment.appointment_date)}
              </p>
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{formatTime(appointment.start_time)}</span>
                {showDuration && (
                  <span className="text-gray-400">
                    • {appointment.duration_minutes}min
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.text}
          </div>
        </div>

        {/* Center section: Service, Doctor & Location */}
        <div className="flex-1 min-w-0 px-4">
          <div className="flex items-center space-x-4">
            {/* Service & Doctor */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg flex-shrink-0">
                <Stethoscope className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {service?.name || 'Consulta General'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {getDoctorName(appointment.doctor)}
                </p>
                {doctor?.specialization && (
                  <p className="text-xs text-gray-500 truncate">{doctor.specialization}</p>
                )}
              </div>
            </div>

            {/* Location */}
            {showLocation && location && (
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-orange-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-gray-900">{location.name}</p>
                  {location.address && (
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">{location.address}</p>
                  )}
                </div>
              </div>
            )}

            {/* Patient (for non-patient roles) */}
            {userRole !== 'patient' && patient && (
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-50 rounded-lg">
                  <User className="h-4 w-4 text-purple-600" />
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-gray-900">
                    {patient?.first_name} {patient?.last_name}
                  </p>
                </div>
              </div>
            )}

            {/* Cost (if enabled) */}
            {showCost && (
              <div className="flex items-center space-x-2 flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-emerald-50 rounded-lg">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="hidden lg:block">
                  {service?.price ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      {formatPrice(service.price)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      Consultar
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reason/Notes - Compact display */}
          {(appointment.reason || appointment.notes) && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              {appointment.reason && (
                <p className="text-xs text-gray-600 truncate">
                  <span className="font-medium">Motivo:</span> {appointment.reason}
                </p>
              )}
              {appointment.notes && (
                <p className="text-xs text-gray-500 truncate">
                  <span className="font-medium">Notas:</span> {appointment.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Status Change Dropdown - Compact */}
          {canChangeStatus && (
            <select
              value={appointment.status === 'scheduled' ? 'confirmed' : appointment.status}
              onChange={(e) => onStatusChange?.(appointment.id, e.target.value)}
              className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[100px]"
              aria-label="Cambiar estado de la cita"
            >
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          )}

          {/* Action Buttons - Compact */}
          {canReschedule && (
            <button
              type="button"
              onClick={() => onReschedule?.(appointment.id)}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 transition-colors"
              title="Reagendar cita"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Reagendar</span>
              <span className="sm:hidden">Reagendar</span>
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel?.(appointment.id)}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:ring-2 focus:ring-red-500 transition-colors"
              title="Cancelar cita"
            >
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Cancelar</span>
              <span className="sm:hidden">Cancelar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
