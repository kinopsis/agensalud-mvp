/**
 * Appointment Card Factory Functions
 * 
 * Provides automatic component selection based on user role and context
 * Implements the factory pattern for dynamic component instantiation
 * 
 * @version 1.0.0 - Factory functions for role-based component selection
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import type { UserRole } from '@/types/database';
import PatientAppointmentCard, { PatientDashboardCard, PatientCompactCard } from './PatientAppointmentCard';
import DoctorAppointmentCard, { DoctorTodayCard, DoctorCompactCard } from './DoctorAppointmentCard';
import AdminAppointmentCard, { AdminDashboardCard, AdminBulkCard } from './AdminAppointmentCard';
import type { AppointmentCardProps } from '../AppointmentCard';

/**
 * Get the appropriate appointment card component for a given user role
 * Returns the standard card component for each role
 */
export function getAppointmentCardForRole(userRole: UserRole): React.ComponentType<AppointmentCardProps> {
  switch (userRole) {
    case 'patient':
      return PatientAppointmentCard;
    case 'doctor':
      return DoctorAppointmentCard;
    case 'admin':
    case 'staff':
    case 'superadmin':
      return AdminAppointmentCard;
    default:
      // Fallback to patient card for unknown roles
      return PatientAppointmentCard;
  }
}

/**
 * Get the appropriate dashboard card component for a given user role
 * Returns the dashboard-optimized card component for each role
 */
export function getDashboardCardForRole(userRole: UserRole): React.ComponentType<AppointmentCardProps> {
  switch (userRole) {
    case 'patient':
      return PatientDashboardCard;
    case 'doctor':
      return DoctorTodayCard;
    case 'admin':
    case 'staff':
    case 'superadmin':
      return AdminDashboardCard;
    default:
      // Fallback to patient dashboard card for unknown roles
      return PatientDashboardCard;
  }
}

/**
 * Get the appropriate compact card component for a given user role
 * Returns the compact/list-optimized card component for each role
 */
export function getCompactCardForRole(userRole: UserRole): React.ComponentType<AppointmentCardProps> {
  switch (userRole) {
    case 'patient':
      return PatientCompactCard;
    case 'doctor':
      return DoctorCompactCard;
    case 'admin':
    case 'staff':
    case 'superadmin':
      return AdminBulkCard;
    default:
      // Fallback to patient compact card for unknown roles
      return PatientCompactCard;
  }
}

/**
 * Get the appropriate card component based on role and context
 * Provides intelligent selection based on usage context
 */
export function getCardForContext(
  userRole: UserRole, 
  context: 'dashboard' | 'list' | 'detail' | 'bulk' = 'dashboard'
): React.ComponentType<AppointmentCardProps> {
  switch (context) {
    case 'dashboard':
      return getDashboardCardForRole(userRole);
    case 'list':
    case 'bulk':
      return getCompactCardForRole(userRole);
    case 'detail':
      return getAppointmentCardForRole(userRole);
    default:
      return getDashboardCardForRole(userRole);
  }
}

/**
 * Get default props for a given user role and context
 * Provides sensible defaults for each role and usage context
 */
export function getDefaultPropsForRole(
  userRole: UserRole, 
  context: 'dashboard' | 'list' | 'detail' | 'bulk' = 'dashboard'
): Partial<AppointmentCardProps> {
  const baseProps: Partial<AppointmentCardProps> = {
    showLocation: true,
    showDuration: true,
    canViewDetails: true,
  };

  switch (userRole) {
    case 'patient':
      return {
        ...baseProps,
        showPatient: false, // Patients don't need to see their own name
        showDoctor: true,
        canReschedule: context === 'dashboard',
        canCancel: context === 'dashboard',
        showUpcomingPriority: context === 'dashboard',
        showHistoryContext: context === 'list',
        variant: context === 'list' ? 'compact' : 'default',
      };

    case 'doctor':
      return {
        ...baseProps,
        showPatient: true,
        showDoctor: false, // Doctors don't need to see their own name
        canChangeStatus: true,
        canViewPatient: true,
        showClinicalPriority: context === 'dashboard',
        showPatientHistory: context === 'dashboard',
        enableClinicalActions: context === 'dashboard',
        showTimeRemaining: context === 'dashboard',
        variant: context === 'list' ? 'compact' : 'default',
      };

    case 'admin':
    case 'staff':
    case 'superadmin':
      return {
        ...baseProps,
        showPatient: true,
        showDoctor: true,
        canChangeStatus: true,
        enableBulkSelection: context === 'bulk' || context === 'list',
        showOperationalPriority: context === 'dashboard',
        showFinancialInfo: context === 'dashboard',
        variant: context === 'list' || context === 'bulk' ? 'compact' : 'default',
      };

    default:
      return baseProps;
  }
}

/**
 * Create a configured appointment card component for a specific role and context
 * Returns a pre-configured component with appropriate defaults
 */
export function createAppointmentCard(
  userRole: UserRole,
  context: 'dashboard' | 'list' | 'detail' | 'bulk' = 'dashboard'
) {
  const CardComponent = getCardForContext(userRole, context);
  const defaultProps = getDefaultPropsForRole(userRole, context);

  return React.forwardRef<HTMLDivElement, AppointmentCardProps>((props, ref) => {
    const mergedProps = { ...defaultProps, ...props };
    return React.createElement(CardComponent, { ...mergedProps, ref });
  });
}

/**
 * Utility function to determine if a role has administrative privileges
 */
export function isAdministrativeRole(userRole: UserRole): boolean {
  return ['admin', 'staff', 'superadmin'].includes(userRole);
}

/**
 * Utility function to determine if a role has clinical privileges
 */
export function isClinicalRole(userRole: UserRole): boolean {
  return ['doctor'].includes(userRole);
}

/**
 * Utility function to determine if a role is a patient
 */
export function isPatientRole(userRole: UserRole): boolean {
  return userRole === 'patient';
}

/**
 * Get role-specific capabilities for appointment management
 */
export function getRoleCapabilities(userRole: UserRole) {
  return {
    canReschedule: isPatientRole(userRole) || isAdministrativeRole(userRole),
    canCancel: isPatientRole(userRole) || isAdministrativeRole(userRole),
    canChangeStatus: isClinicalRole(userRole) || isAdministrativeRole(userRole),
    canViewPatient: isClinicalRole(userRole) || isAdministrativeRole(userRole),
    canViewDoctor: isPatientRole(userRole) || isAdministrativeRole(userRole),
    canBulkSelect: isAdministrativeRole(userRole),
    canViewFinancial: isAdministrativeRole(userRole),
    canManageSchedule: isClinicalRole(userRole) || isAdministrativeRole(userRole),
  };
}

/**
 * Export all factory functions and utilities
 */
export {
  PatientAppointmentCard,
  PatientDashboardCard,
  PatientCompactCard,
  DoctorAppointmentCard,
  DoctorTodayCard,
  DoctorCompactCard,
  AdminAppointmentCard,
  AdminDashboardCard,
  AdminBulkCard,
};
