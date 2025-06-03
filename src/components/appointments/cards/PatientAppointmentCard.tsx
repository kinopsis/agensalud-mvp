'use client';

/**
 * PatientAppointmentCard Component
 *
 * Specialized appointment card for patient role with optimized UX
 * Focuses on essential information and patient-specific actions
 *
 * Features:
 * - Simplified view with doctor and service information
 * - Clear date/time display with relative formatting
 * - Patient-specific actions (reschedule, cancel)
 * - Enhanced status visibility
 * - Mobile-optimized layout
 *
 * @version 1.0.0 - Patient-specific implementation
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { AppointmentCardBase, AppointmentCardBaseProps } from '../AppointmentCard';

/**
 * Patient-specific appointment card props
 */
export interface PatientAppointmentCardProps extends Omit<AppointmentCardBaseProps, 'userRole' | 'showPatient' | 'showDoctor'> {
  /** Show upcoming appointment priority indicator */
  showUpcomingPriority?: boolean;
  /** Show appointment history context */
  showHistoryContext?: boolean;
  /** Enable quick actions */
  enableQuickActions?: boolean;
}

/**
 * PatientAppointmentCard Component
 * 
 * Optimized for patient dashboard with focus on:
 * - Clear appointment information
 * - Easy rescheduling and cancellation
 * - Doctor and service details
 * - Location information
 * - Upcoming appointment priority
 */
export default function PatientAppointmentCard({
  appointment,
  onReschedule,
  onCancel,
  onStatusChange,
  onViewDetails,
  canReschedule = true,
  canCancel = true,
  canChangeStatus = false,
  canViewDetails = false,
  showLocation = true,
  showCost = false,
  showDuration = true,
  showUpcomingPriority = true,
  showHistoryContext = false,
  enableQuickActions = true,
  variant = 'default',
  className = '',
  ...props
}: PatientAppointmentCardProps) {
  
  /**
   * Determine if appointment is upcoming (within next 24 hours)
   */
  const isUpcoming = React.useMemo(() => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 24;
  }, [appointment.appointment_date, appointment.start_time]);

  /**
   * Determine if appointment is in history
   */
  const isHistory = React.useMemo(() => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    return appointmentDateTime < now || ['completed', 'cancelled', 'no_show'].includes(appointment.status);
  }, [appointment.appointment_date, appointment.start_time, appointment.status]);

  /**
   * Get patient-specific variant
   */
  const getPatientVariant = (): 'default' | 'compact' | 'detailed' => {
    if (isHistory && showHistoryContext) return 'compact';
    if (isUpcoming && showUpcomingPriority) return 'detailed';
    return variant;
  };

  /**
   * Get patient-specific className
   */
  const getPatientClassName = (): string => {
    let classes = className;
    
    // Add priority styling for upcoming appointments
    if (isUpcoming && showUpcomingPriority) {
      classes += ' ring-2 ring-blue-200 bg-blue-50/30';
    }
    
    // Add subtle styling for history
    if (isHistory && showHistoryContext) {
      classes += ' opacity-75 hover:opacity-100';
    }
    
    return classes;
  };

  return (
    <AppointmentCardBase
      appointment={appointment}
      userRole="patient"
      onReschedule={onReschedule}
      onCancel={onCancel}
      onStatusChange={onStatusChange}
      onViewDetails={onViewDetails}
      canReschedule={canReschedule && !isHistory}
      canCancel={canCancel && !isHistory}
      canChangeStatus={canChangeStatus}
      canViewDetails={canViewDetails}
      showLocation={showLocation}
      showCost={showCost}
      showDuration={showDuration}
      showPatient={false} // Patients don't need to see their own name
      showDoctor={true}   // Always show doctor for patients
      showPriority={showUpcomingPriority && isUpcoming}
      variant={getPatientVariant()}
      className={getPatientClassName()}
      {...props}
    />
  );
}

/**
 * PatientAppointmentCard with enhanced features for dashboard
 */
export function PatientDashboardCard(props: PatientAppointmentCardProps) {
  return (
    <PatientAppointmentCard
      {...props}
      showUpcomingPriority={true}
      showHistoryContext={true}
      enableQuickActions={true}
      canViewDetails={true}
    />
  );
}

/**
 * Compact PatientAppointmentCard for lists
 */
export function PatientCompactCard(props: PatientAppointmentCardProps) {
  return (
    <PatientAppointmentCard
      {...props}
      variant="compact"
      showUpcomingPriority={false}
      showHistoryContext={false}
      showLocation={false}
      showDuration={false}
    />
  );
}
