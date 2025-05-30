'use client';

/**
 * Patient Buttons Debug Page
 * Diagnostic tool to identify why buttons might not appear for patients
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import AppointmentCard from '@/components/appointments/AppointmentCard';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface DiagnosticResult {
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  patientId: string;
  currentUserId: string;
  isOwnAppointment: boolean;
  isFutureAppointment: boolean;
  isValidStatus: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  issues: string[];
}

export default function PatientButtonsDebugPage() {
  const { user, profile } = useAuth();
  const { organization } = useTenant();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Permission functions (exact copies from appointments page)
  const canCancelAppointment = (appointment: any) => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const isFuture = appointmentDateTime > now;

    const cancellableStatuses = ['confirmed', 'pending'];
    const isStatusCancellable = cancellableStatuses.includes(appointment.status);

    let hasPermission = false;

    if (profile?.role === 'patient') {
      hasPermission = appointment.patient[0]?.id === profile.id;
    } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
      hasPermission = true;
    } else if (profile?.role === 'superadmin') {
      hasPermission = true;
    }

    return isFuture && isStatusCancellable && hasPermission;
  };

  const canRescheduleAppointment = (appointment: any) => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const isFuture = appointmentDateTime > now;

    const reschedulableStatuses = ['confirmed', 'pending'];
    const isStatusReschedulable = reschedulableStatuses.includes(appointment.status);

    let hasPermission = false;

    if (profile?.role === 'patient') {
      hasPermission = appointment.patient[0]?.id === profile.id;
    } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
      hasPermission = true;
    } else if (profile?.role === 'superadmin') {
      hasPermission = true;
    }

    return isFuture && isStatusReschedulable && hasPermission;
  };

  const runDiagnostics = (appointments: any[]) => {
    const results: DiagnosticResult[] = appointments.map(appointment => {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const now = new Date();
      const isFuture = appointmentDateTime > now;
      const isOwnAppointment = appointment.patient[0]?.id === profile?.id;
      const isValidStatus = ['confirmed', 'pending'].includes(appointment.status);
      const canReschedule = canRescheduleAppointment(appointment);
      const canCancel = canCancelAppointment(appointment);

      const issues: string[] = [];
      
      if (!isFuture) {
        issues.push('Cita en el pasado');
      }
      if (!isOwnAppointment) {
        issues.push('No es cita propia del paciente');
      }
      if (!isValidStatus) {
        issues.push(`Estado '${appointment.status}' no permite acciones`);
      }
      if (!appointment.patient[0]) {
        issues.push('Datos de paciente faltantes');
      }
      if (!profile?.id) {
        issues.push('ID de usuario no disponible');
      }

      return {
        appointmentId: appointment.id,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.start_time,
        status: appointment.status,
        patientId: appointment.patient[0]?.id || 'N/A',
        currentUserId: profile?.id || 'N/A',
        isOwnAppointment,
        isFutureAppointment: isFuture,
        isValidStatus,
        canReschedule,
        canCancel,
        issues
      };
    });

    setDiagnostics(results);
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!profile?.id || !organization?.id) return;

      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          reason,
          notes,
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            profiles(first_name, last_name)
          ),
          patient:profiles!appointments_patient_id_fkey(
            id,
            first_name,
            last_name
          ),
          location:locations!appointments_location_id_fkey(
            id,
            name,
            address
          ),
          service:services!appointments_service_id_fkey(
            id,
            name,
            duration_minutes,
            price
          )
        `)
        .eq('organization_id', organization.id)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
      } else {
        setAppointments(data || []);
        runDiagnostics(data || []);
      }
      
      setLoading(false);
    };

    fetchAppointments();
  }, [profile?.id, organization?.id]);

  if (loading) {
    return (
      <DashboardLayout title="Diagnóstico de Botones de Paciente">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando diagnóstico...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Diagnóstico de Botones de Paciente">
      <div className="space-y-6">
        {/* User Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Información del Usuario</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">ID:</span> {profile?.id || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Rol:</span> {profile?.role || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Organización:</span> {organization?.id || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Email:</span> {user?.email || 'N/A'}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Diagnóstico</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-2xl font-bold text-gray-900">{appointments.length}</div>
              <div className="text-sm text-gray-600">Total Citas</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">
                {diagnostics.filter(d => d.canReschedule).length}
              </div>
              <div className="text-sm text-gray-600">Pueden Reagendar</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">
                {diagnostics.filter(d => d.canCancel).length}
              </div>
              <div className="text-sm text-gray-600">Pueden Cancelar</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {diagnostics.filter(d => d.issues.length > 0).length}
              </div>
              <div className="text-sm text-gray-600">Con Problemas</div>
            </div>
          </div>
        </div>

        {/* Detailed Diagnostics */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagnóstico Detallado</h3>
          <div className="space-y-4">
            {diagnostics.map((diagnostic, index) => (
              <div key={diagnostic.appointmentId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-900">
                    Cita #{index + 1} - {diagnostic.appointmentDate} {diagnostic.appointmentTime}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    diagnostic.canReschedule && diagnostic.canCancel
                      ? 'bg-green-100 text-green-800'
                      : diagnostic.issues.length > 0
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {diagnostic.canReschedule && diagnostic.canCancel
                      ? 'BOTONES VISIBLES'
                      : 'BOTONES OCULTOS'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="font-medium">Estado:</span> {diagnostic.status}
                  </div>
                  <div>
                    <span className="font-medium">Es cita propia:</span> {diagnostic.isOwnAppointment ? 'Sí' : 'No'}
                  </div>
                  <div>
                    <span className="font-medium">Es futura:</span> {diagnostic.isFutureAppointment ? 'Sí' : 'No'}
                  </div>
                </div>

                {diagnostic.issues.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <h5 className="font-medium text-red-900 mb-2">Problemas Identificados:</h5>
                    <ul className="list-disc list-inside text-sm text-red-700">
                      {diagnostic.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Test */}
        {appointments.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prueba en Vivo - Primer Cita</h3>
            <AppointmentCard
              appointment={appointments[0]}
              userRole={profile?.role || 'patient'}
              canReschedule={canRescheduleAppointment(appointments[0])}
              canCancel={canCancelAppointment(appointments[0])}
              canChangeStatus={false}
              onReschedule={(id) => alert(`Reagendar cita ${id}`)}
              onCancel={(id) => alert(`Cancelar cita ${id}`)}
              showLocation={true}
              showCost={false}
              showDuration={true}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
