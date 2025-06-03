/**
 * Enhanced Appointment States Types
 * Defines types for MVP appointment states and audit trail functionality
 * 
 * @description Types for extended appointment status system with audit trail
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

// =====================================================
// APPOINTMENT STATUS ENUMS AND TYPES
// =====================================================

/**
 * Enhanced appointment status enum with MVP states
 * Aligned with medical standards and compliance requirements
 */
export enum AppointmentStatus {
  // Existing states (preserved for compatibility)
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  
  // New MVP states for enhanced workflow
  PENDIENTE_PAGO = 'pendiente_pago',
  REAGENDADA = 'reagendada',
  CANCELADA_PACIENTE = 'cancelada_paciente',
  CANCELADA_CLINICA = 'cancelada_clinica',
  EN_CURSO = 'en_curso'
}

/**
 * Status configuration for UI display and business logic
 */
export interface StatusConfig {
  label: string;
  color: string;
  icon: string;
  description: string;
  isFinal: boolean;
  allowedTransitions: AppointmentStatus[];
  requiredRoles: string[];
}

/**
 * Status transition validation result
 */
export interface StatusTransitionResult {
  valid: boolean;
  reason?: string;
  requiredRole?: string;
  allowedTransitions?: AppointmentStatus[];
}

/**
 * Status change request parameters
 */
export interface StatusChangeRequest {
  appointmentId: string;
  newStatus: AppointmentStatus;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Status change result
 */
export interface StatusChangeResult {
  success: boolean;
  error?: string;
  auditId?: string;
}

// =====================================================
// AUDIT TRAIL TYPES
// =====================================================

/**
 * Appointment status history record
 */
export interface AppointmentStatusHistory {
  id: string;
  appointment_id: string;
  previous_status: AppointmentStatus | null;
  new_status: AppointmentStatus;
  changed_by: string;
  reason?: string;
  user_role: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Parameters for logging status changes
 */
export interface StatusChangeParams {
  appointmentId: string;
  previousStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus;
  changedBy: string;
  userRole: string;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit trail query parameters
 */
export interface AuditTrailQuery {
  appointmentId?: string;
  userId?: string;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// BUSINESS RULES AND VALIDATION
// =====================================================

/**
 * Role-based permissions for status changes
 */
export interface RolePermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canMarkInProgress: boolean;
  canComplete: boolean;
  canViewAuditTrail: boolean;
  allowedTransitions: AppointmentStatus[];
}

/**
 * User role types for appointment management
 */
export type UserRole = 'patient' | 'doctor' | 'staff' | 'admin' | 'superadmin';

/**
 * Status transition validation parameters
 */
export interface TransitionValidationParams {
  currentStatus: AppointmentStatus;
  newStatus: AppointmentStatus;
  userRole: UserRole;
  appointmentId: string;
  userId: string;
}

// =====================================================
// UI COMPONENT TYPES
// =====================================================

/**
 * Props for AppointmentStatusBadge component
 */
export interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  canChangeStatus?: boolean;
  onStatusChange?: (newStatus: AppointmentStatus, reason?: string) => void;
  className?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Props for StatusChangeDropdown component
 */
export interface StatusChangeDropdownProps {
  currentStatus: AppointmentStatus;
  availableTransitions: AppointmentStatus[];
  onStatusChange: (status: AppointmentStatus, reason?: string) => void;
  disabled?: boolean;
  userRole: UserRole;
}

/**
 * Props for AuditTrailViewer component
 */
export interface AuditTrailViewerProps {
  appointmentId: string;
  showUserInfo?: boolean;
  maxEntries?: number;
  className?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * API response for status change operations
 */
export interface StatusChangeApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    appointmentId: string;
    newStatus: AppointmentStatus;
    auditId: string;
    timestamp: string;
  };
}

/**
 * API response for audit trail queries
 */
export interface AuditTrailApiResponse {
  success: boolean;
  data?: AppointmentStatusHistory[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * API response for status validation
 */
export interface StatusValidationApiResponse {
  valid: boolean;
  allowedTransitions: AppointmentStatus[];
  reason?: string;
  userPermissions: RolePermissions;
}

// =====================================================
// CONSTANTS AND CONFIGURATIONS
// =====================================================

/**
 * Default status configurations for UI display
 */
export const STATUS_CONFIGS: Record<AppointmentStatus, StatusConfig> = {
  [AppointmentStatus.PENDING]: {
    label: 'Solicitada',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: 'Clock',
    description: 'Cita registrada, pendiente de confirmación',
    isFinal: false,
    allowedTransitions: [AppointmentStatus.PENDIENTE_PAGO, AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELADA_CLINICA],
    requiredRoles: ['staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.PENDIENTE_PAGO]: {
    label: 'Pendiente de Pago',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'DollarSign',
    description: 'Requiere pago de depósito para confirmar',
    isFinal: false,
    allowedTransitions: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, AppointmentStatus.CANCELADA_PACIENTE],
    requiredRoles: ['patient', 'staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.CONFIRMED]: {
    label: 'Confirmada',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'CheckCircle',
    description: 'Cita confirmada y programada',
    isFinal: false,
    allowedTransitions: [AppointmentStatus.EN_CURSO, AppointmentStatus.REAGENDADA, AppointmentStatus.CANCELADA_PACIENTE, AppointmentStatus.CANCELADA_CLINICA, AppointmentStatus.NO_SHOW],
    requiredRoles: ['patient', 'doctor', 'staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.REAGENDADA]: {
    label: 'Reagendada',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'Calendar',
    description: 'Cita reprogramada a nueva fecha/hora',
    isFinal: false,
    allowedTransitions: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELADA_PACIENTE, AppointmentStatus.CANCELADA_CLINICA],
    requiredRoles: ['patient', 'staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.CANCELADA_PACIENTE]: {
    label: 'Cancelada por Paciente',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'XCircle',
    description: 'Cancelada por el paciente',
    isFinal: true,
    allowedTransitions: [],
    requiredRoles: ['patient', 'staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.CANCELADA_CLINICA]: {
    label: 'Cancelada por Clínica',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'XCircle',
    description: 'Cancelada por la clínica',
    isFinal: true,
    allowedTransitions: [],
    requiredRoles: ['staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.EN_CURSO]: {
    label: 'En Curso',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: 'Play',
    description: 'Paciente siendo atendido',
    isFinal: false,
    allowedTransitions: [AppointmentStatus.COMPLETED],
    requiredRoles: ['doctor', 'staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.COMPLETED]: {
    label: 'Completada',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: 'CheckCircle',
    description: 'Cita realizada exitosamente',
    isFinal: true,
    allowedTransitions: [],
    requiredRoles: ['doctor', 'staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.CANCELLED]: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'XCircle',
    description: 'Cita cancelada',
    isFinal: true,
    allowedTransitions: [],
    requiredRoles: ['patient', 'staff', 'admin', 'superadmin']
  },
  [AppointmentStatus.NO_SHOW]: {
    label: 'No Show',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'AlertTriangle',
    description: 'Paciente no se presentó',
    isFinal: true,
    allowedTransitions: [],
    requiredRoles: ['doctor', 'staff', 'admin', 'superadmin']
  }
};

/**
 * Role-based permissions matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  patient: {
    canCreate: true,
    canUpdate: false,
    canCancel: true,
    canMarkInProgress: false,
    canComplete: false,
    canViewAuditTrail: false,
    allowedTransitions: [AppointmentStatus.CANCELADA_PACIENTE, AppointmentStatus.REAGENDADA]
  },
  doctor: {
    canCreate: false,
    canUpdate: true,
    canCancel: false,
    canMarkInProgress: true,
    canComplete: true,
    canViewAuditTrail: true,
    allowedTransitions: [AppointmentStatus.EN_CURSO, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW]
  },
  staff: {
    canCreate: true,
    canUpdate: true,
    canCancel: true,
    canMarkInProgress: true,
    canComplete: true,
    canViewAuditTrail: true,
    allowedTransitions: Object.values(AppointmentStatus)
  },
  admin: {
    canCreate: true,
    canUpdate: true,
    canCancel: true,
    canMarkInProgress: true,
    canComplete: true,
    canViewAuditTrail: true,
    allowedTransitions: Object.values(AppointmentStatus)
  },
  superadmin: {
    canCreate: true,
    canUpdate: true,
    canCancel: true,
    canMarkInProgress: true,
    canComplete: true,
    canViewAuditTrail: true,
    allowedTransitions: Object.values(AppointmentStatus)
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get available transitions for a status and user role
 */
export function getAvailableTransitions(
  currentStatus: AppointmentStatus,
  userRole: UserRole
): AppointmentStatus[] {
  const statusConfig = STATUS_CONFIGS[currentStatus];
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  
  return statusConfig.allowedTransitions.filter(transition =>
    rolePermissions.allowedTransitions.includes(transition)
  );
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus,
  userRole: UserRole
): boolean {
  const availableTransitions = getAvailableTransitions(currentStatus, userRole);
  return availableTransitions.includes(newStatus);
}

/**
 * Get status configuration
 */
export function getStatusConfig(status: AppointmentStatus): StatusConfig {
  return STATUS_CONFIGS[status];
}

/**
 * Get role permissions
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}
