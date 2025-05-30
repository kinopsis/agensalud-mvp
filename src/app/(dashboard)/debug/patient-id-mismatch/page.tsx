'use client';

/**
 * Patient ID Mismatch Investigation Tool
 * Diagnoses patient ID inconsistencies in appointment data
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AppointmentAnalysis {
  appointmentId: string;
  appointmentDate: string;
  patientIdInAppointment: string | null;
  patientEmailInAppointment: string | null;
  patientNameInAppointment: string | null;
  currentUserId: string;
  currentUserEmail: string;
  isMatch: boolean;
  issues: string[];
}

export default function PatientIdMismatchPage() {
  const { user, profile } = useAuth();
  const { organization } = useTenant();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patientProfiles, setPatientProfiles] = useState<PatientProfile[]>([]);
  const [analysis, setAnalysis] = useState<AppointmentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const investigatePatientMismatch = async () => {
      if (!profile?.id || !organization?.id || !user?.email) return;

      const supabase = createClient();

      try {
        // 1. Get all patient profiles with the same email
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .eq('role', 'patient');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        setPatientProfiles(profilesData || []);

        // 2. Get appointments for this organization
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            start_time,
            status,
            patient_id,
            patient:profiles!appointments_patient_id_fkey(
              id,
              first_name,
              last_name,
              email,
              role
            )
          `)
          .eq('organization_id', organization.id)
          .order('appointment_date', { ascending: false });

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError);
          return;
        }

        setAppointments(appointmentsData || []);

        // 3. Analyze each appointment
        const analysisResults: AppointmentAnalysis[] = (appointmentsData || []).map(appointment => {
          const patientData = Array.isArray(appointment.patient) 
            ? appointment.patient[0] 
            : appointment.patient;

          const issues: string[] = [];
          
          // Check if patient data exists
          if (!patientData) {
            issues.push('Datos de paciente completamente faltantes');
          }
          
          // Check if patient ID matches current user
          const patientIdInAppointment = patientData?.id || appointment.patient_id;
          const isMatch = patientIdInAppointment === profile.id;
          
          if (!isMatch && patientIdInAppointment) {
            issues.push(`ID de paciente no coincide: ${patientIdInAppointment} vs ${profile.id}`);
          }
          
          // Check email consistency
          const patientEmailInAppointment = patientData?.email;
          if (patientEmailInAppointment && patientEmailInAppointment !== user.email) {
            issues.push(`Email no coincide: ${patientEmailInAppointment} vs ${user.email}`);
          }
          
          if (!patientEmailInAppointment) {
            issues.push('Email de paciente faltante');
          }

          return {
            appointmentId: appointment.id,
            appointmentDate: appointment.appointment_date,
            patientIdInAppointment,
            patientEmailInAppointment,
            patientNameInAppointment: patientData ? `${patientData.first_name} ${patientData.last_name}` : null,
            currentUserId: profile.id,
            currentUserEmail: user.email,
            isMatch,
            issues
          };
        });

        setAnalysis(analysisResults);
      } catch (error) {
        console.error('Investigation error:', error);
      } finally {
        setLoading(false);
      }
    };

    investigatePatientMismatch();
  }, [profile?.id, organization?.id, user?.email]);

  if (loading) {
    return (
      <DashboardLayout title="Investigación de Desajuste de ID de Paciente">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Investigando desajustes de ID...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const matchingAppointments = analysis.filter(a => a.isMatch);
  const mismatchedAppointments = analysis.filter(a => !a.isMatch);

  return (
    <DashboardLayout title="Investigación de Desajuste de ID de Paciente">
      <div className="space-y-6">
        {/* Current User Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Usuario Actual</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Profile ID:</span> {profile?.id}</div>
            <div><span className="font-medium">User ID:</span> {user?.id}</div>
            <div><span className="font-medium">Email:</span> {user?.email}</div>
            <div><span className="font-medium">Rol:</span> {profile?.role}</div>
            <div><span className="font-medium">Organización:</span> {organization?.id}</div>
            <div><span className="font-medium">Auth Status:</span> {user ? 'Authenticated' : 'Not Authenticated'}</div>
          </div>

          {/* Critical ID Comparison */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-medium text-yellow-900 mb-2">🔍 ID Comparison Analysis</h4>
            <div className="space-y-1 text-xs">
              <div><span className="font-medium">Frontend Profile ID:</span> {profile?.id || 'N/A'}</div>
              <div><span className="font-medium">Expected DB ID:</span> 5b361f1e-04b6-4a40-bb61-bd519c0e9be8</div>
              <div><span className="font-medium">Match Status:</span>
                <span className={profile?.id === '5b361f1e-04b6-4a40-bb61-bd519c0e9be8' ? 'text-green-600' : 'text-red-600'}>
                  {profile?.id === '5b361f1e-04b6-4a40-bb61-bd519c0e9be8' ? ' ✅ MATCH' : ' ❌ MISMATCH'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Profiles Analysis */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfiles de Paciente con Este Email</h3>
          {patientProfiles.length > 1 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-yellow-800 font-medium">⚠️ PROBLEMA: Múltiples perfiles encontrados para el mismo email</p>
            </div>
          )}
          <div className="space-y-2">
            {patientProfiles.map((profile, index) => (
              <div key={profile.id} className={`p-3 rounded border ${
                profile.id === user?.id ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><span className="font-medium">ID:</span> {profile.id}</div>
                  <div><span className="font-medium">Nombre:</span> {profile.first_name} {profile.last_name}</div>
                  <div><span className="font-medium">Email:</span> {profile.email}</div>
                  <div><span className="font-medium">Creado:</span> {new Date(profile.created_at).toLocaleDateString()}</div>
                </div>
                {profile.id === user?.id && (
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    PERFIL ACTUAL
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Análisis</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-2xl font-bold text-gray-900">{analysis.length}</div>
              <div className="text-sm text-gray-600">Total Citas</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{matchingAppointments.length}</div>
              <div className="text-sm text-gray-600">IDs Coinciden</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{mismatchedAppointments.length}</div>
              <div className="text-sm text-gray-600">IDs No Coinciden</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {analysis.filter(a => a.issues.length > 0).length}
              </div>
              <div className="text-sm text-gray-600">Con Problemas</div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis Detallado de Citas</h3>
          
          {mismatchedAppointments.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-red-900 mb-3">🚨 Citas con Problemas de ID</h4>
              <div className="space-y-3">
                {mismatchedAppointments.slice(0, 5).map((appointment, index) => (
                  <div key={appointment.appointmentId} className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-red-900">
                        Cita {appointment.appointmentDate}
                      </h5>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        ID MISMATCH
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                      <div>
                        <span className="font-medium">ID en Cita:</span> {appointment.patientIdInAppointment || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">ID Actual:</span> {appointment.currentUserId}
                      </div>
                      <div>
                        <span className="font-medium">Email en Cita:</span> {appointment.patientEmailInAppointment || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Email Actual:</span> {appointment.currentUserEmail}
                      </div>
                    </div>

                    {appointment.issues.length > 0 && (
                      <div className="bg-red-100 border border-red-200 rounded p-2">
                        <h6 className="font-medium text-red-900 text-xs mb-1">Problemas:</h6>
                        <ul className="list-disc list-inside text-xs text-red-700">
                          {appointment.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                {mismatchedAppointments.length > 5 && (
                  <p className="text-sm text-gray-600">
                    ... y {mismatchedAppointments.length - 5} citas más con problemas similares
                  </p>
                )}
              </div>
            </div>
          )}

          {matchingAppointments.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-green-900 mb-3">✅ Citas Correctas</h4>
              <p className="text-sm text-green-700">
                {matchingAppointments.length} citas tienen IDs de paciente correctos
              </p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">🔧 Recomendaciones</h3>
          <div className="space-y-2 text-sm text-yellow-800">
            {patientProfiles.length > 1 && (
              <p>• <strong>Consolidar perfiles:</strong> Hay múltiples perfiles para el mismo email</p>
            )}
            {mismatchedAppointments.length > 0 && (
              <p>• <strong>Actualizar IDs:</strong> {mismatchedAppointments.length} citas necesitan corrección de patient_id</p>
            )}
            <p>• <strong>Verificar integridad:</strong> Revisar proceso de creación de citas</p>
            <p>• <strong>Implementar validación:</strong> Prevenir futuros desajustes de ID</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
