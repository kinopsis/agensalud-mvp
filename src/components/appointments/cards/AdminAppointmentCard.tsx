'use client';

/**
 * AdminAppointmentCard Component
 *
 * Specialized appointment card for admin/staff roles with management focus
 * Provides comprehensive view and administrative controls
 *
 * Features:
 * - Complete appointment information display
 * - Administrative status management
 * - Patient and doctor information
 * - Financial information (cost/pricing)
 * - Operational priority indicators
 * - Bulk action support
 *
 * @version 1.0.0 - Admin-specific implementation
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import { AppointmentCardBase, AppointmentCardBaseProps } from '../AppointmentCard';
import { AlertTriangle, DollarSign, Users, Clock } from 'lucide-react';

/**
 * Admin-specific appointment card props
 */
export interface AdminAppointmentCardProps extends Omit<AppointmentCardBaseProps, 'userRole'> {
  /** Show operational priority indicators */
  showOperationalPriority?: boolean;
  /** Show financial information */
  showFinancialInfo?: boolean;
  /** Enable bulk selection */
  enableBulkSelection?: boolean;
  /** Show administrative metrics */
  showAdminMetrics?: boolean;
  /** Bulk selection state */
  isSelected?: boolean;
  /** Bulk selection handler */
  onSelectionChange?: (appointmentId: string, selected: boolean) => void;
}

/**
 * AdminAppointmentCard Component
 *
 * Optimized for administrative workflow with focus on:
 * - Complete appointment oversight
 * - Patient and doctor management (ALWAYS visible)
 * - Financial tracking
 * - Operational efficiency
 * - Status management and reporting
 *
 * CRITICAL: Patient information is ALWAYS visible for administrative roles
 * to ensure operational efficiency and proper patient identification.
 */
export default function AdminAppointmentCard({
  appointment,
  onReschedule,
  onCancel,
  onStatusChange,
  onViewDetails,
  canReschedule = true,
  canCancel = true,
  canChangeStatus = true,
  canViewDetails = true,
  showLocation = true,
  showCost = true,
  showDuration = true,
  showPatient = true, // Always true for admin roles - overridden below
  showDoctor = true,
  showOperationalPriority = true,
  showFinancialInfo = true,
  enableBulkSelection = false,
  showAdminMetrics = false,
  isSelected = false,
  onSelectionChange,
  variant = 'default',
  className = '',
  ...props
}: AdminAppointmentCardProps) {
  
  /**
   * Determine operational priority for admin view
   */
  const getOperationalPriority = React.useMemo(() => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // High priority: pending confirmations or issues
    if (appointment.status === 'pending') {
      return { level: 'high', label: 'Requiere confirmación', color: 'text-amber-600', icon: AlertTriangle };
    }
    
    // Medium priority: today's appointments
    if (hoursUntil <= 24 && hoursUntil > 0) {
      return { level: 'medium', label: 'Hoy', color: 'text-blue-600', icon: Clock };
    }
    
    // Financial priority: unpaid appointments
    if (appointment.service?.[0]?.price && !['completed', 'cancelled'].includes(appointment.status)) {
      return { level: 'financial', label: 'Pendiente pago', color: 'text-green-600', icon: DollarSign };
    }
    
    return { level: 'normal', label: 'Normal', color: 'text-gray-600', icon: Users };
  }, [appointment.appointment_date, appointment.start_time, appointment.status, appointment.service]);

  /**
   * Calculate financial metrics
   */
  const getFinancialMetrics = React.useMemo(() => {
    const service = appointment.service?.[0];
    if (!service?.price) return null;
    
    return {
      amount: service.price,
      status: appointment.status === 'completed' ? 'paid' : 'pending',
      currency: 'COP'
    };
  }, [appointment.service, appointment.status]);

  /**
   * Get admin-specific variant
   */
  const getAdminVariant = (): 'default' | 'compact' | 'detailed' => {
    if (getOperationalPriority.level === 'high') return 'detailed';
    if (showAdminMetrics) return 'detailed';
    return variant;
  };

  /**
   * Get admin-specific className
   */
  const getAdminClassName = (): string => {
    let classes = className;
    
    // Add selection styling
    if (enableBulkSelection && isSelected) {
      classes += ' ring-2 ring-blue-500 bg-blue-50/30';
    }
    
    // Add priority styling
    if (showOperationalPriority) {
      switch (getOperationalPriority.level) {
        case 'high':
          classes += ' border-l-4 border-l-amber-500';
          break;
        case 'financial':
          classes += ' border-l-4 border-l-green-500';
          break;
      }
    }
    
    return classes;
  };

  /**
   * Handle administrative status changes
   */
  const handleAdminStatusChange = (appointmentId: string, newStatus: string) => {
    console.log(`🏥 Admin status change: ${appointment.status} → ${newStatus}`, {
      appointmentId,
      patientId: appointment.patient?.[0]?.id,
      doctorId: appointment.doctor?.[0]?.id,
      operationalPriority: getOperationalPriority.level,
      financialImpact: getFinancialMetrics?.amount
    });
    onStatusChange?.(appointmentId, newStatus);
  };

  /**
   * Handle bulk selection
   */
  const handleSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange?.(appointment.id, event.target.checked);
  };

  return (
    <div className="relative">
      {/* Bulk Selection Checkbox */}
      {enableBulkSelection && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            aria-label={`Seleccionar cita de ${appointment.patient?.[0]?.first_name}`}
          />
        </div>
      )}

      {/* Operational Priority Indicator */}
      {showOperationalPriority && getOperationalPriority.level !== 'normal' && (
        <div className={`absolute -top-2 -right-2 z-10 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-white border shadow-sm ${getOperationalPriority.color}`}>
          <getOperationalPriority.icon className="h-3 w-3" />
          <span>{getOperationalPriority.label}</span>
        </div>
      )}

      <AppointmentCardBase
        appointment={appointment}
        userRole="admin"
        onReschedule={onReschedule}
        onCancel={onCancel}
        onStatusChange={handleAdminStatusChange}
        onViewDetails={onViewDetails}
        canReschedule={canReschedule}
        canCancel={canCancel}
        canChangeStatus={canChangeStatus}
        canViewDetails={canViewDetails}
        showLocation={showLocation}
        showCost={showCost && showFinancialInfo}
        showDuration={showDuration}
        showPatient={true} // ALWAYS show patient for admin roles
        showDoctor={showDoctor}
        showPriority={showOperationalPriority}
        variant={getAdminVariant()}
        className={getAdminClassName()}
        {...props}
      />

      {/* Financial Information Overlay */}
      {showFinancialInfo && getFinancialMetrics && (
        <div className="absolute bottom-2 right-2 flex items-center space-x-1 px-2 py-1 bg-white/90 rounded text-xs">
          <DollarSign className="h-3 w-3 text-green-600" />
          <span className={getFinancialMetrics.status === 'paid' ? 'text-green-600' : 'text-amber-600'}>
            {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: getFinancialMetrics.currency,
              minimumFractionDigits: 0
            }).format(getFinancialMetrics.amount)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * AdminAppointmentCard optimized for dashboard overview
 * CRITICAL: Patient information is ALWAYS visible for administrative efficiency
 */
export function AdminDashboardCard(props: AdminAppointmentCardProps) {
  return (
    <AdminAppointmentCard
      {...props}
      showOperationalPriority={true}
      showFinancialInfo={true}
      showAdminMetrics={true}
      canChangeStatus={true}
      canViewDetails={true}
      showPatient={true} // FORCE patient visibility for admin dashboard
    />
  );
}

/**
 * AdminAppointmentCard with bulk selection for management
 * CRITICAL: Patient information is ALWAYS visible for administrative efficiency
 */
export function AdminBulkCard(props: AdminAppointmentCardProps) {
  return (
    <AdminAppointmentCard
      {...props}
      enableBulkSelection={true}
      variant="compact"
      showOperationalPriority={true}
      showFinancialInfo={false}
      showPatient={true} // FORCE patient visibility for bulk operations
    />
  );
}
