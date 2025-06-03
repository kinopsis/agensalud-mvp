/**
 * Appointment Cards Integration Examples
 * 
 * Demonstrates how to integrate the new appointment card components
 * into existing dashboards and views
 * 
 * @version 1.0.0 - Integration examples
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React from 'react';
import {
  PatientDashboardCard,
  DoctorTodayCard,
  AdminDashboardCard,
  getAppointmentCardForRole,
  getDashboardCardForRole
} from '@/components/appointments/cards';
import type { AppointmentData } from '@/components/appointments/AppointmentCard';
import type { UserRole } from '@/types/database';

// Example appointment data
const exampleAppointment: AppointmentData = {
  id: 'example-appointment-1',
  appointment_date: '2025-01-29',
  start_time: '10:30:00',
  duration_minutes: 30,
  status: 'confirmed',
  reason: 'Consulta de seguimiento',
  notes: 'Paciente con historial de hipertensión',
  doctor: [{
    id: 'doctor-1',
    specialization: 'Cardiología',
    profiles: [{
      first_name: 'Juan',
      last_name: 'Pérez'
    }]
  }],
  patient: [{
    id: 'patient-1',
    first_name: 'María',
    last_name: 'González'
  }],
  location: [{
    id: 'location-1',
    name: 'Consultorio 1',
    address: 'Calle 123 #45-67'
  }],
  service: [{
    id: 'service-1',
    name: 'Consulta Cardiológica',
    duration_minutes: 30,
    price: 150000
  }]
};

/**
 * Example 1: Patient Dashboard Integration
 * Shows how to integrate PatientDashboardCard into existing patient dashboard
 */
export function PatientDashboardExample() {
  const handleReschedule = (appointmentId: string) => {
    console.log('Rescheduling appointment:', appointmentId);
    // Implement reschedule logic
  };

  const handleCancel = (appointmentId: string) => {
    console.log('Cancelling appointment:', appointmentId);
    // Implement cancel logic
  };

  const handleViewDetails = (appointmentId: string) => {
    console.log('Viewing appointment details:', appointmentId);
    // Implement view details logic
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Mis Próximas Citas</h2>
      
      {/* Enhanced Patient Card */}
      <PatientDashboardCard
        appointment={exampleAppointment}
        onReschedule={handleReschedule}
        onCancel={handleCancel}
        onViewDetails={handleViewDetails}
        showUpcomingPriority={true}
        showHistoryContext={true}
        enableQuickActions={true}
      />
    </div>
  );
}

/**
 * Example 2: Doctor Dashboard Integration
 * Shows how to integrate DoctorTodayCard for clinical workflow
 */
export function DoctorDashboardExample() {
  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    console.log('Changing appointment status:', { appointmentId, newStatus });
    // Implement status change logic
  };

  const handleViewPatient = (appointmentId: string) => {
    console.log('Viewing patient details:', appointmentId);
    // Implement patient details logic
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Agenda de Hoy</h2>
      
      {/* Enhanced Doctor Card */}
      <DoctorTodayCard
        appointment={exampleAppointment}
        onStatusChange={handleStatusChange}
        onViewDetails={handleViewPatient}
        showClinicalPriority={true}
        showPatientHistory={true}
        enableClinicalActions={true}
        canChangeStatus={true}
      />
    </div>
  );
}

/**
 * Example 3: Admin Dashboard Integration
 * Shows how to integrate AdminDashboardCard for management view
 */
export function AdminDashboardExample() {
  const [selectedAppointments, setSelectedAppointments] = React.useState<string[]>([]);

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    console.log('Admin changing status:', { appointmentId, newStatus });
    // Implement admin status change logic
  };

  const handleBulkSelection = (appointmentId: string, selected: boolean) => {
    setSelectedAppointments(prev => 
      selected 
        ? [...prev, appointmentId]
        : prev.filter(id => id !== appointmentId)
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Gestión de Citas</h2>
      
      {/* Enhanced Admin Card */}
      <AdminDashboardCard
        appointment={exampleAppointment}
        onStatusChange={handleStatusChange}
        onSelectionChange={handleBulkSelection}
        isSelected={selectedAppointments.includes(exampleAppointment.id)}
        showOperationalPriority={true}
        showFinancialInfo={true}
        enableBulkSelection={true}
        canChangeStatus={true}
      />
    </div>
  );
}

/**
 * Example 4: Dynamic Role-Based Component Selection
 * Shows how to use factory functions for automatic component selection
 */
export function DynamicAppointmentCardExample({ userRole }: { userRole: UserRole }) {
  // Automatically select the appropriate card component based on user role
  const AppointmentCardComponent = getDashboardCardForRole(userRole);

  const handleReschedule = (appointmentId: string) => {
    console.log('Rescheduling:', appointmentId);
  };

  const handleCancel = (appointmentId: string) => {
    console.log('Cancelling:', appointmentId);
  };

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    console.log('Status change:', { appointmentId, newStatus });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Citas - Vista {userRole}
      </h2>
      
      {/* Dynamic component based on user role */}
      <AppointmentCardComponent
        appointment={exampleAppointment}
        onReschedule={handleReschedule}
        onCancel={handleCancel}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

/**
 * Example 5: Migration from Legacy Component
 * Shows backward compatibility and gradual migration path
 */
export function LegacyMigrationExample() {
  // This still works - no breaking changes
  const LegacyAppointmentCard = React.lazy(() => 
    import('@/components/appointments/AppointmentCard')
  );

  // New enhanced components
  const EnhancedPatientCard = PatientDashboardCard;

  const [useLegacy, setUseLegacy] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-gray-900">Migration Example</h2>
        <button
          onClick={() => setUseLegacy(!useLegacy)}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded"
        >
          {useLegacy ? 'Use Enhanced' : 'Use Legacy'}
        </button>
      </div>
      
      {useLegacy ? (
        <React.Suspense fallback={<div>Loading...</div>}>
          <LegacyAppointmentCard
            appointment={exampleAppointment}
            userRole="patient"
            canReschedule={true}
            canCancel={true}
          />
        </React.Suspense>
      ) : (
        <EnhancedPatientCard
          appointment={exampleAppointment}
          onReschedule={(id) => console.log('Enhanced reschedule:', id)}
          onCancel={(id) => console.log('Enhanced cancel:', id)}
        />
      )}
    </div>
  );
}

/**
 * Example 6: Appointment List with Mixed Variants
 * Shows how to use different variants in a list view
 */
export function AppointmentListExample({ appointments, userRole }: { 
  appointments: AppointmentData[], 
  userRole: UserRole 
}) {
  const CompactCardComponent = getAppointmentCardForRole(userRole);

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-gray-900">Lista de Citas</h2>
      
      {appointments.map((appointment, index) => (
        <CompactCardComponent
          key={appointment.id}
          appointment={appointment}
          variant="compact"
          onReschedule={(id) => console.log('Reschedule:', id)}
          onCancel={(id) => console.log('Cancel:', id)}
          className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
        />
      ))}
    </div>
  );
}

// Export all examples for documentation
export const examples = {
  PatientDashboardExample,
  DoctorDashboardExample,
  AdminDashboardExample,
  DynamicAppointmentCardExample,
  LegacyMigrationExample,
  AppointmentListExample
};
