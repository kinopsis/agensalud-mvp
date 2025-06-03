/**
 * Appointment Cards Index
 *
 * Centralized exports for all appointment card components
 * Provides role-specific cards and base components
 *
 * FIXED: Removed circular dependencies and simplified imports
 *
 * @version 1.1.0 - Fixed circular dependency issues
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

// Base component exports
export { AppointmentCardBase, default as AppointmentCard } from '../AppointmentCard';
export type { AppointmentCardBaseProps, AppointmentCardProps, AppointmentData } from '../AppointmentCard';

// Direct exports without intermediate imports to prevent circular dependencies
export { default as PatientAppointmentCard, PatientDashboardCard, PatientCompactCard } from './PatientAppointmentCard';
export type { PatientAppointmentCardProps } from './PatientAppointmentCard';

export { default as DoctorAppointmentCard, DoctorTodayCard, DoctorCompactCard } from './DoctorAppointmentCard';
export type { DoctorAppointmentCardProps } from './DoctorAppointmentCard';

export { default as AdminAppointmentCard, AdminDashboardCard, AdminBulkCard } from './AdminAppointmentCard';
export type { AdminAppointmentCardProps } from './AdminAppointmentCard';

// Re-export factory functions from separate factory module to avoid circular dependencies
export {
  getAppointmentCardForRole,
  getDashboardCardForRole,
  getCompactCardForRole,
  getCardForContext,
  getDefaultPropsForRole,
  createAppointmentCard,
  isAdministrativeRole,
  isClinicalRole,
  isPatientRole,
  getRoleCapabilities
} from './factory';
