'use client';

/**
 * Debug Component for Patient Data Investigation
 * 
 * CRITICAL DEBUGGING: Investigates why patient information is not showing
 * in appointment cards for administrative roles.
 * 
 * @version 1.0.0 - Patient data debugging
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';

interface DebugAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  patient: any;
  doctor: any;
  service: any;
  location: any;
}

export default function DebugPatientData() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [appointments, setAppointments] = useState<DebugAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const debugAppointmentData = async () => {
      if (!profile?.id || !organization?.id) return;

      console.log('🔍 DEBUG: Starting patient data investigation');
      console.log('👤 Current user profile:', profile);
      console.log('🏢 Current organization:', organization);

      const supabase = createClient();
      setLoading(true);

      try {
        // Exact same query as appointments page
        const { data: appointmentsData, error } = await supabase
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
          .order('start_time', { ascending: true })
          .limit(5); // Limit for debugging

        console.log('📊 Raw appointments data:', appointmentsData);
        console.log('❌ Query error:', error);

        if (appointmentsData) {
          setAppointments(appointmentsData);
          
          // Detailed analysis of each appointment
          const analysis = appointmentsData.map((apt, index) => {
            const patientData = apt.patient;
            const isPatientArray = Array.isArray(patientData);
            const patientInfo = isPatientArray ? patientData[0] : patientData;
            
            return {
              index,
              appointmentId: apt.id,
              patientRaw: patientData,
              patientIsArray: isPatientArray,
              patientLength: isPatientArray ? patientData.length : 'N/A',
              patientFirstElement: patientInfo,
              hasFirstName: !!patientInfo?.first_name,
              hasLastName: !!patientInfo?.last_name,
              fullName: patientInfo ? `${patientInfo.first_name || ''} ${patientInfo.last_name || ''}`.trim() : 'NO NAME',
              doctorData: apt.doctor,
              serviceData: apt.service,
              locationData: apt.location
            };
          });

          console.log('🔬 Detailed patient data analysis:', analysis);
          setDebugInfo({ analysis, userRole: profile.role });
        }

      } catch (err) {
        console.error('💥 Error in debug investigation:', err);
      } finally {
        setLoading(false);
      }
    };

    debugAppointmentData();
  }, [profile?.id, organization?.id]);

  if (loading) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          🔍 Debugging Patient Data...
        </h2>
        <p className="text-yellow-700">Investigating appointment data structure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h1 className="text-xl font-bold text-red-800 mb-4">
          🚨 CRITICAL DEBUG: Patient Data Investigation
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-red-700">Current User:</h3>
            <p className="text-sm text-red-600">Role: {profile?.role}</p>
            <p className="text-sm text-red-600">ID: {profile?.id}</p>
          </div>
          <div>
            <h3 className="font-semibold text-red-700">Organization:</h3>
            <p className="text-sm text-red-600">Name: {organization?.name}</p>
            <p className="text-sm text-red-600">ID: {organization?.id}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-red-700 mb-2">Appointments Found: {appointments.length}</h3>
          
          {debugInfo.analysis?.map((analysis: any, index: number) => (
            <div key={index} className="bg-white border border-red-200 rounded p-4 mb-4">
              <h4 className="font-medium text-red-800 mb-2">
                Appointment #{index + 1} (ID: {analysis.appointmentId})
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Patient Raw Data:</strong></p>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(analysis.patientRaw, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <p><strong>Analysis:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Is Array: {analysis.patientIsArray ? '✅' : '❌'}</li>
                    <li>Array Length: {analysis.patientLength}</li>
                    <li>Has First Name: {analysis.hasFirstName ? '✅' : '❌'}</li>
                    <li>Has Last Name: {analysis.hasLastName ? '✅' : '❌'}</li>
                    <li>Full Name: "{analysis.fullName}"</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4">
                <p><strong>First Element Data:</strong></p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(analysis.patientFirstElement, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="font-semibold text-blue-700 mb-2">Expected Behavior for Role: {profile?.role}</h3>
          <p className="text-sm text-blue-600">
            {['admin', 'staff', 'superadmin'].includes(profile?.role || '') 
              ? '✅ Patient information SHOULD be visible for this role'
              : '⚠️ Patient information visibility depends on showPatient prop for this role'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
