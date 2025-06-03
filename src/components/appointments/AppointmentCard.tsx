'use client';

/**
 * AppointmentCardBase Component
 *
 * Base component for appointment cards with role-specific customization
 * Implements the enhanced appointment status system and improved UX patterns
 *
 * Features:
 * - Enhanced status system with 6 states (Pending, Confirmed, InProgress, Completed, Cancelled, NoShow)
 * - Role-based content and action customization
 * - Improved accessibility and responsive design
 * - Modular architecture for easy extension
 * - Consistent visual hierarchy and spacing
 * - Performance optimized with minimal re-renders
 *
 * Layout Structure:
 * [Status/Priority] [DateTime] [Content] [Actions]
 *
 * @version 3.0.0 - Base component for role-specific cards
 * @author AgentSalud MVP Team
 * @date 2025-01-28
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
  DollarSign,
  Play,
  Pause
} from 'lucide-react';
import { UserRole } from '@/types/database';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import StatusChangeDropdown from './StatusChangeDropdown';
import {
  UserRole as AppointmentUserRole,
  AppointmentStatus,
  getAvailableTransitions
} from '@/types/appointment-states';

/**
 * Enhanced appointment data interface with improved typing
 */
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

/**
 * Enhanced appointment card props with role-specific customization
 */
export interface AppointmentCardBaseProps {
  appointment: AppointmentData;
  userRole: UserRole;
  onReschedule?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  onStatusChange?: (appointmentId: string, newStatus: string) => void;
  onViewDetails?: (appointmentId: string) => void;
  canReschedule?: boolean;
  canCancel?: boolean;
  canChangeStatus?: boolean;
  canViewDetails?: boolean;
  showLocation?: boolean;
  showCost?: boolean;
  showDuration?: boolean;
  showPatient?: boolean;
  showDoctor?: boolean;
  showPriority?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

/**
 * Legacy props interface for backward compatibility
 */
export interface AppointmentCardProps extends AppointmentCardBaseProps {}

/**
 * Enhanced appointment status system with 6 core states
 */
export enum EnhancedAppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

/**
 * Status configuration for enhanced UI display
 */
interface StatusInfo {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  priority: number;
  description: string;
}

/**
 * Enhanced status information with improved UX
 */
const getEnhancedStatusInfo = (status: string): StatusInfo => {
  switch (status.toLowerCase()) {
    case 'pending':
      return {
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Clock,
        text: 'Pendiente',
        priority: 2,
        description: 'Esperando confirmación'
      };
    case 'confirmed':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: 'Confirmada',
        priority: 1,
        description: 'Cita confirmada'
      };
    case 'in_progress':
    case 'en_curso':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Play,
        text: 'En Curso',
        priority: 0,
        description: 'Consulta en progreso'
      };
    case 'completed':
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: CheckCircle,
        text: 'Completada',
        priority: 3,
        description: 'Consulta finalizada'
      };
    case 'cancelled':
    case 'cancelada':
    case 'cancelada_paciente':
    case 'cancelada_clinica':
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: X,
        text: 'Cancelada',
        priority: 4,
        description: 'Cita cancelada'
      };
    case 'no_show':
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        text: 'No Asistió',
        priority: 4,
        description: 'Paciente no se presentó'
      };
    // Legacy status support
    case 'scheduled':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        text: 'Programada',
        priority: 1,
        description: 'Cita programada'
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
        text: status,
        priority: 5,
        description: 'Estado desconocido'
      };
  }
};

/**
 * Map UserRole to AppointmentUserRole for compatibility
 */
const mapUserRole = (role: UserRole): AppointmentUserRole => {
  switch (role) {
    case 'patient':
      return 'patient';
    case 'doctor':
      return 'doctor';
    case 'staff':
      return 'staff';
    case 'admin':
      return 'admin';
    case 'superadmin':
      return 'superadmin';
    default:
      return 'patient';
  }
};

/**
 * Enhanced date formatting with relative time support
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Check if it's today or tomorrow for better UX
  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Mañana';
  }

  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Enhanced time formatting with 12-hour format
 */
const formatTime = (timeString: string): string => {
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeString.slice(0, 5); // Fallback to original format
  }
};

/**
 * Enhanced doctor name extraction with better error handling
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
    return 'Dr. [Nombre no disponible]';
  }
};

/**
 * Enhanced patient name extraction
 */
const getPatientName = (patient: any): string => {
  if (!patient) {
    return '[Paciente no asignado]';
  }

  const patientRecord = Array.isArray(patient) ? patient[0] : patient;

  if (!patientRecord) {
    return '[Paciente no asignado]';
  }

  const firstName = patientRecord.first_name;
  const lastName = patientRecord.last_name;

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else {
    return '[Nombre no disponible]';
  }
};

/**
 * Enhanced price formatting with currency support
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
 * Calculate appointment urgency for priority display
 */
const getAppointmentUrgency = (appointmentDate: string, startTime: string): 'high' | 'medium' | 'low' => {
  const appointmentDateTime = new Date(`${appointmentDate}T${startTime}`);
  const now = new Date();
  const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil <= 2) return 'high';
  if (hoursUntil <= 24) return 'medium';
  return 'low';
};

/**
 * AppointmentCardBase Component - Enhanced base implementation
 */
export function AppointmentCardBase({
  appointment,
  userRole,
  onReschedule,
  onCancel,
  onStatusChange,
  onViewDetails,
  canReschedule = false,
  canCancel = false,
  canChangeStatus = false,
  canViewDetails = false,
  showLocation = true,
  showCost = false,
  showDuration = true,
  showPatient = false,
  showDoctor = true,
  showPriority = false,
  variant = 'default',
  className = ''
}: AppointmentCardBaseProps) {
  const mappedUserRole = mapUserRole(userRole);
  const statusInfo = getEnhancedStatusInfo(appointment.status);
  const StatusIcon = statusInfo.icon;

  // Extract data with improved handling
  const doctor = appointment.doctor?.[0];
  const patient = appointment.patient?.[0];
  const location = appointment.location?.[0];
  const service = appointment.service?.[0];

  // Calculate urgency for priority display
  const urgency = showPriority ? getAppointmentUrgency(appointment.appointment_date, appointment.start_time) : null;

  /**
   * Handle status change with enhanced logging
   */
  const handleStatusChange = (newStatus: string, reason?: string) => {
    console.log(`🔄 Status change in AppointmentCard: ${appointment.status} → ${newStatus}`, {
      appointmentId: appointment.id,
      reason,
      userRole
    });
    onStatusChange?.(appointment.id, newStatus);
  };

  /**
   * Get variant-specific styling
   */
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          container: 'min-h-[60px] p-3',
          spacing: 'space-x-2',
          iconSize: 'w-8 h-8',
          textSize: 'text-xs'
        };
      case 'detailed':
        return {
          container: 'min-h-[100px] p-6',
          spacing: 'space-x-6',
          iconSize: 'w-14 h-14',
          textSize: 'text-sm'
        };
      default:
        return {
          container: 'min-h-[80px] p-4',
          spacing: 'space-x-4',
          iconSize: 'w-12 h-12',
          textSize: 'text-sm'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`
      bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md
      transition-all duration-200 group
      ${urgency === 'high' ? 'border-l-4 border-l-red-500' : ''}
      ${urgency === 'medium' ? 'border-l-4 border-l-amber-500' : ''}
      ${className}
    `}>
      {/* Enhanced horizontal layout with priority indicator */}
      <div className={`flex items-center justify-between ${styles.container}`}>

        {/* Left section: Status & Priority */}
        <div className={`flex items-center ${styles.spacing} flex-shrink-0`}>
          {/* Priority Indicator (if enabled) */}
          {showPriority && urgency && (
            <div className={`
              flex items-center justify-center ${styles.iconSize} rounded-lg
              ${urgency === 'high' ? 'bg-red-50' : urgency === 'medium' ? 'bg-amber-50' : 'bg-green-50'}
            `}>
              <AlertCircle className={`
                h-5 w-5
                ${urgency === 'high' ? 'text-red-600' : urgency === 'medium' ? 'text-amber-600' : 'text-green-600'}
              `} />
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center ${styles.iconSize} bg-blue-50 rounded-lg`}>
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className={`${styles.textSize} font-semibold text-gray-900`}>
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

          {/* 🔧 CRITICAL UX IMPROVEMENT: Manual Status Control */}
          {canChangeStatus ? (
            <StatusChangeDropdown
              appointmentId={appointment.id}
              currentStatus={appointment.status as AppointmentStatus}
              userRole={mappedUserRole}
              availableTransitions={getAvailableTransitions(appointment.status as AppointmentStatus, mappedUserRole)}
              onStatusChange={async (newStatus: AppointmentStatus, reason?: string) => {
                handleStatusChange(newStatus, reason);
              }}
              size="sm"
              className="flex-shrink-0"
            />
          ) : (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.text}
            </div>
          )}
        </div>

        {/* Center section: Service, Doctor & Location */}
        <div className="flex-1 min-w-0 px-4">
          <div className="flex items-center space-x-4">
            {/* Service & Doctor/Patient */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg flex-shrink-0">
                <Stethoscope className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`${styles.textSize} font-semibold text-gray-900 truncate`}>
                  {service?.name || 'Consulta General'}
                </p>

                {/* Show doctor or patient based on role */}
                {showDoctor && (
                  <p className="text-xs text-gray-600 truncate">
                    {getDoctorName(appointment.doctor)}
                  </p>
                )}
                {showPatient && (
                  <p className="text-xs text-gray-600 truncate">
                    <User className="h-3 w-3 inline mr-1" />
                    {getPatientName(appointment.patient)}
                  </p>
                )}

                {doctor?.specialization && showDoctor && (
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
                <div className={
                  // CRITICAL: Always show patient name for admin roles (no responsive hiding)
                  ['admin', 'staff', 'superadmin'].includes(userRole)
                    ? "block" // Always visible for administrative roles
                    : "hidden md:block" // Responsive for other roles
                }>
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
          {/* View Details Button */}
          {canViewDetails && (
            <button
              type="button"
              onClick={() => onViewDetails?.(appointment.id)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 transition-colors"
              title="Ver detalles"
            >
              <FileText className="h-3 w-3" />
            </button>
          )}

          {/* Action Buttons - Enhanced */}
          {canReschedule && (
            <button
              type="button"
              onClick={() => onReschedule?.(appointment.id)}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 transition-colors"
              title="Reagendar cita"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Reagendar</span>
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
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Legacy AppointmentCard component for backward compatibility
 * Wraps the new AppointmentCardBase with default settings
 */
export default function AppointmentCard(props: AppointmentCardProps) {
  return <AppointmentCardBase {...props} />;
}
