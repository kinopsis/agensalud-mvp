'use client';

/**
 * DoctorAppointmentCard Component
 *
 * Specialized appointment card for doctor role with clinical focus
 * Emphasizes patient information and medical workflow
 *
 * Features:
 * - Patient-focused information display
 * - Clinical status management
 * - Quick access to patient details
 * - Medical workflow actions
 * - Time-sensitive priority indicators
 *
 * @version 1.0.0 - Doctor-specific implementation
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { AppointmentCardBase, AppointmentCardBaseProps } from '../AppointmentCard';
import { Clock, User, AlertTriangle } from 'lucide-react';

/**
 * Doctor-specific appointment card props
 */
export interface DoctorAppointmentCardProps extends Omit<AppointmentCardBaseProps, 'userRole' | 'showPatient' | 'showDoctor'> {
  /** Show patient medical history context */
  showPatientHistory?: boolean;
  /** Show clinical priority indicators */
  showClinicalPriority?: boolean;
  /** Enable clinical workflow actions */
  enableClinicalActions?: boolean;
  /** Show appointment preparation status */
  showPreparationStatus?: boolean;
}

/**
 * DoctorAppointmentCard Component
 * 
 * Optimized for doctor workflow with focus on:
 * - Patient identification and information
 * - Clinical status and priority
 * - Medical workflow actions
 * - Time management for consultations
 * - Service and location context
 */
export default function DoctorAppointmentCard({
  appointment,
  onReschedule,
  onCancel,
  onStatusChange,
  onViewDetails,
  canReschedule = false,
  canCancel = false,
  canChangeStatus = true,
  canViewDetails = true,
  showLocation = true,
  showCost = false,
  showDuration = true,
  showPatientHistory = true,
  showClinicalPriority = true,
  enableClinicalActions = true,
  showPreparationStatus = false,
  variant = 'default',
  className = '',
  ...props
}: DoctorAppointmentCardProps) {
  
  /**
   * Determine clinical priority based on appointment timing and status
   */
  const getClinicalPriority = React.useMemo(() => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const minutesUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);
    
    // High priority: next appointment or overdue
    if (minutesUntil <= 15 && minutesUntil >= -30) {
      return { level: 'high', label: 'Próxima consulta', color: 'text-red-600' };
    }
    
    // Medium priority: within next hour
    if (minutesUntil <= 60 && minutesUntil > 15) {
      return { level: 'medium', label: 'Próxima hora', color: 'text-amber-600' };
    }
    
    // In progress
    if (appointment.status === 'in_progress' || appointment.status === 'en_curso') {
      return { level: 'urgent', label: 'En consulta', color: 'text-blue-600' };
    }
    
    return { level: 'normal', label: 'Programada', color: 'text-gray-600' };
  }, [appointment.appointment_date, appointment.start_time, appointment.status]);

  /**
   * Check if appointment is today
   */
  const isToday = React.useMemo(() => {
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString();
  }, [appointment.appointment_date]);

  /**
   * Get doctor-specific variant
   */
  const getDoctorVariant = (): 'default' | 'compact' | 'detailed' => {
    if (getClinicalPriority.level === 'urgent') return 'detailed';
    if (getClinicalPriority.level === 'high') return 'detailed';
    if (!isToday) return 'compact';
    return variant;
  };

  /**
   * Get doctor-specific className
   */
  const getDoctorClassName = (): string => {
    let classes = className;
    
    // Add priority styling
    if (showClinicalPriority) {
      switch (getClinicalPriority.level) {
        case 'urgent':
          classes += ' ring-2 ring-blue-300 bg-blue-50/50';
          break;
        case 'high':
          classes += ' ring-2 ring-red-200 bg-red-50/30';
          break;
        case 'medium':
          classes += ' ring-1 ring-amber-200 bg-amber-50/20';
          break;
      }
    }
    
    return classes;
  };

  /**
   * Handle clinical status changes
   */
  const handleClinicalStatusChange = (appointmentId: string, newStatus: string) => {
    console.log(`🩺 Clinical status change: ${appointment.status} → ${newStatus}`, {
      appointmentId,
      patientId: appointment.patient?.[0]?.id,
      clinicalPriority: getClinicalPriority.level
    });
    onStatusChange?.(appointmentId, newStatus);
  };

  /**
   * Handle view patient details
   */
  const handleViewPatientDetails = (appointmentId: string) => {
    console.log(`👤 View patient details for appointment: ${appointmentId}`);
    onViewDetails?.(appointmentId);
  };

  return (
    <div className="relative">
      {/* Clinical Priority Indicator */}
      {showClinicalPriority && getClinicalPriority.level !== 'normal' && (
        <div className={`absolute -top-2 -right-2 z-10 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-white border shadow-sm ${getClinicalPriority.color}`}>
          {getClinicalPriority.level === 'urgent' && <Clock className="h-3 w-3" />}
          {getClinicalPriority.level === 'high' && <AlertTriangle className="h-3 w-3" />}
          <span>{getClinicalPriority.label}</span>
        </div>
      )}

      <AppointmentCardBase
        appointment={appointment}
        userRole="doctor"
        onReschedule={onReschedule}
        onCancel={onCancel}
        onStatusChange={handleClinicalStatusChange}
        onViewDetails={handleViewPatientDetails}
        canReschedule={canReschedule}
        canCancel={canCancel}
        canChangeStatus={canChangeStatus}
        canViewDetails={canViewDetails}
        showLocation={showLocation}
        showCost={showCost}
        showDuration={showDuration}
        showPatient={true}  // Always show patient for doctors
        showDoctor={false} // Doctors don't need to see their own name
        showPriority={showClinicalPriority}
        variant={getDoctorVariant()}
        className={getDoctorClassName()}
        {...props}
      />
    </div>
  );
}

/**
 * DoctorAppointmentCard optimized for today's schedule
 */
export function DoctorTodayCard(props: DoctorAppointmentCardProps) {
  return (
    <DoctorAppointmentCard
      {...props}
      showClinicalPriority={true}
      showPatientHistory={true}
      enableClinicalActions={true}
      showPreparationStatus={true}
      canChangeStatus={true}
    />
  );
}

/**
 * Compact DoctorAppointmentCard for weekly/monthly views
 */
export function DoctorCompactCard(props: DoctorAppointmentCardProps) {
  return (
    <DoctorAppointmentCard
      {...props}
      variant="compact"
      showClinicalPriority={false}
      showPatientHistory={false}
      showLocation={false}
      showDuration={false}
    />
  );
}
