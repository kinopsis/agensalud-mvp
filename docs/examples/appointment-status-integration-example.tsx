/**
 * Appointment Status Integration Example
 * 
 * Demonstrates complete integration of AppointmentStatusBadge
 * in a typical dashboard component with role-based permissions
 * 
 * @version 1.0.0 - MVP Implementation
 * @date 2025-01-28
 */

import React, { useState, useCallback } from 'react';
import AppointmentCard from '@/components/appointments/AppointmentCard';
import AppointmentStatusBadge from '@/components/appointments/AppointmentStatusBadge';
import { UserRole } from '@/types/database';
import { UserRole as AppointmentUserRole } from '@/types/appointment-states';

// =====================================================
// EXAMPLE 1: DASHBOARD INTEGRATION
// =====================================================

interface DashboardExampleProps {
  userRole: UserRole;
  appointments: any[];
}

/**
 * Example dashboard component showing appointment status integration
 */
export function AppointmentDashboardExample({ userRole, appointments }: DashboardExampleProps) {
  const [appointmentList, setAppointmentList] = useState(appointments);
  const [loading, setLoading] = useState(false);

  /**
   * Handle status change with optimistic updates
   */
  const handleStatusChange = useCallback(async (appointmentId: string, newStatus: string) => {
    try {
      setLoading(true);

      // Optimistic update
      setAppointmentList(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus }
            : apt
        )
      );

      // API call would happen here in real implementation
      console.log(`✅ Status updated: ${appointmentId} → ${newStatus}`);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('❌ Failed to update status:', error);
      
      // Revert optimistic update on error
      setAppointmentList(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: appointments.find(a => a.id === appointmentId)?.status }
            : apt
        )
      );
    } finally {
      setLoading(false);
    }
  }, [appointments]);

  /**
   * Determine permissions based on user role
   */
  const getPermissions = (appointment: any) => {
    const isOwnAppointment = appointment.patient_id === 'current-user-id' || 
                            appointment.doctor_id === 'current-user-id';
    
    switch (userRole) {
      case 'patient':
        return {
          canChangeStatus: isOwnAppointment && ['confirmed', 'pending'].includes(appointment.status),
          canReschedule: isOwnAppointment && appointment.status === 'confirmed',
          canCancel: isOwnAppointment && ['confirmed', 'pending'].includes(appointment.status)
        };
      
      case 'doctor':
        return {
          canChangeStatus: isOwnAppointment && ['confirmed', 'en_curso'].includes(appointment.status),
          canReschedule: false,
          canCancel: false
        };
      
      case 'staff':
      case 'admin':
        return {
          canChangeStatus: true,
          canReschedule: true,
          canCancel: true
        };
      
      default:
        return {
          canChangeStatus: false,
          canReschedule: false,
          canCancel: false
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Citas Médicas</h2>
        <div className="text-sm text-gray-500">
          Rol: {userRole} | Total: {appointmentList.length}
        </div>
      </div>

      {/* Appointment List */}
      <div className="space-y-3">
        {appointmentList.map((appointment) => {
          const permissions = getPermissions(appointment);
          
          return (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              userRole={userRole}
              onStatusChange={handleStatusChange}
              onReschedule={(id) => console.log('Reschedule:', id)}
              onCancel={(id) => console.log('Cancel:', id)}
              canChangeStatus={permissions.canChangeStatus}
              canReschedule={permissions.canReschedule}
              canCancel={permissions.canCancel}
              showLocation={true}
              showCost={userRole === 'admin'}
              className={loading ? 'opacity-50 pointer-events-none' : ''}
            />
          );
        })}
      </div>

      {appointmentList.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay citas programadas
        </div>
      )}
    </div>
  );
}

// =====================================================
// EXAMPLE 2: STANDALONE STATUS BADGE
// =====================================================

/**
 * Example of standalone status badge usage
 */
export function StandaloneStatusBadgeExample() {
  const [status, setStatus] = useState('confirmed');

  const handleStatusChange = (newStatus: string, reason?: string) => {
    console.log(`Status changed: ${status} → ${newStatus}`, { reason });
    setStatus(newStatus);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Status Badge Examples</h3>
      
      <div className="space-y-4">
        {/* Different sizes */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-20">Small:</span>
          <AppointmentStatusBadge
            appointmentId="example-1"
            status={status}
            userRole="staff"
            canChangeStatus={true}
            onStatusChange={handleStatusChange}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-20">Medium:</span>
          <AppointmentStatusBadge
            appointmentId="example-2"
            status={status}
            userRole="staff"
            canChangeStatus={true}
            onStatusChange={handleStatusChange}
            size="md"
          />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-20">Large:</span>
          <AppointmentStatusBadge
            appointmentId="example-3"
            status={status}
            userRole="staff"
            canChangeStatus={true}
            onStatusChange={handleStatusChange}
            size="lg"
          />
        </div>

        {/* Read-only examples */}
        <div className="pt-4 border-t">
          <h4 className="text-md font-medium mb-2">Read-only (Patient view)</h4>
          <div className="flex items-center gap-4">
            <AppointmentStatusBadge
              appointmentId="readonly-1"
              status="completed"
              userRole="patient"
              canChangeStatus={false}
              showTooltip={true}
              size="md"
            />
            <AppointmentStatusBadge
              appointmentId="readonly-2"
              status="cancelled"
              userRole="patient"
              canChangeStatus={false}
              showTooltip={true}
              size="md"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EXAMPLE 3: ROLE-BASED PERMISSIONS DEMO
// =====================================================

/**
 * Example demonstrating role-based permissions
 */
export function RoleBasedPermissionsExample() {
  const roles: UserRole[] = ['patient', 'doctor', 'staff', 'admin'];
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');

  const sampleAppointment = {
    id: 'demo-appointment',
    status: 'confirmed',
    patient_id: 'current-user-id' // Simulate own appointment
  };

  const handleStatusChange = (newStatus: string, reason?: string) => {
    console.log(`Role ${selectedRole} changed status to: ${newStatus}`, { reason });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Role-based Permissions Demo</h3>
      
      {/* Role Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Role:</label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          {roles.map(role => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Status Badge with Current Role */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">
          Current role: <span className="font-medium">{selectedRole}</span>
        </div>
        <AppointmentStatusBadge
          appointmentId={sampleAppointment.id}
          status={sampleAppointment.status}
          userRole={selectedRole as AppointmentUserRole}
          canChangeStatus={true}
          onStatusChange={handleStatusChange}
          size="md"
          showTooltip={true}
        />
      </div>

      {/* Permission Matrix */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Permission Matrix</h4>
        <div className="text-xs space-y-1">
          <div><strong>Patient:</strong> Can cancel own appointments</div>
          <div><strong>Doctor:</strong> Can mark appointments as completed/in-progress</div>
          <div><strong>Staff:</strong> Can change most statuses</div>
          <div><strong>Admin:</strong> Full status management permissions</div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EXAMPLE 4: ERROR HANDLING DEMO
// =====================================================

/**
 * Example demonstrating error handling
 */
export function ErrorHandlingExample() {
  const [simulateError, setSimulateError] = useState(false);

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (simulateError) {
      throw new Error('Simulated API error - insufficient permissions');
    }
    
    console.log(`Status changed successfully: ${newStatus}`, { reason });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Error Handling Demo</h3>
      
      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={simulateError}
            onChange={(e) => setSimulateError(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Simulate API Error</span>
        </label>
      </div>

      <AppointmentStatusBadge
        appointmentId="error-demo"
        status="confirmed"
        userRole="staff"
        canChangeStatus={true}
        onStatusChange={handleStatusChange}
        size="md"
        showTooltip={true}
      />

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
        <strong>Try this:</strong> Toggle the error simulation and try changing the status 
        to see how errors are handled gracefully.
      </div>
    </div>
  );
}

// =====================================================
// MAIN EXAMPLE COMPONENT
// =====================================================

/**
 * Main example component showcasing all features
 */
export default function AppointmentStatusIntegrationExample() {
  const sampleAppointments = [
    {
      id: '1',
      status: 'confirmed',
      appointment_date: '2025-01-29',
      start_time: '10:00:00',
      duration_minutes: 30,
      patient_id: 'patient-1',
      doctor_id: 'doctor-1',
      service: [{ name: 'Consulta General' }],
      doctor: [{ 
        profiles: [{ first_name: 'Dr. Juan', last_name: 'Pérez' }],
        specialization: 'Medicina General'
      }],
      location: [{ name: 'Consultorio 1', address: 'Calle 123' }]
    },
    {
      id: '2',
      status: 'pending',
      appointment_date: '2025-01-30',
      start_time: '14:00:00',
      duration_minutes: 45,
      patient_id: 'patient-2',
      doctor_id: 'doctor-2',
      service: [{ name: 'Cardiología' }],
      doctor: [{ 
        profiles: [{ first_name: 'Dra. María', last_name: 'González' }],
        specialization: 'Cardiología'
      }],
      location: [{ name: 'Consultorio 2', address: 'Calle 456' }]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          Appointment Status Components Integration
        </h1>
        <p className="text-gray-600">
          Complete examples of AppointmentStatusBadge integration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AppointmentDashboardExample 
          userRole="staff" 
          appointments={sampleAppointments} 
        />
        <StandaloneStatusBadgeExample />
        <RoleBasedPermissionsExample />
        <ErrorHandlingExample />
      </div>
    </div>
  );
}
