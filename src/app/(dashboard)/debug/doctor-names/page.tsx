'use client';

/**
 * Debug Page for Doctor Names Issue
 * 
 * Investigates why doctor names are not showing correctly in appointments
 * Tests different query patterns and data structures
 * 
 * @author AgentSalud MVP Team - Technical Investigation
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { AlertCircle, CheckCircle, Database, User, Stethoscope } from 'lucide-react';

interface DebugResult {
  test: string;
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
}

export default function DoctorNamesDebugPage() {
  const { profile } = useAuth();
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDoctorNamesTests = async () => {
    if (!profile) {
      alert('Profile not loaded');
      return;
    }

    const organizationId = profile.organization_id;
    if (!organizationId) {
      alert('Organization ID not found in profile');
      return;
    }

    setIsRunning(true);
    const testResults: DebugResult[] = [];
    const supabase = createClient();

    try {
      // Test 1: Direct appointments query (current implementation)
      console.log('🔍 Test 1: Current appointments query');
      try {
        const { data: appointments, error } = await supabase
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
          .eq('organization_id', organizationId)
          .limit(5);

        testResults.push({
          test: 'Current Appointments Query',
          success: !error,
          data: appointments?.slice(0, 2),
          error: error?.message,
          count: appointments?.length || 0
        });

        if (appointments && appointments.length > 0) {
          console.log('📊 Sample appointment data:', appointments[0]);
        }
      } catch (err) {
        testResults.push({
          test: 'Current Appointments Query',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // Test 2: Direct doctors query
      console.log('🔍 Test 2: Direct doctors query');
      try {
        const { data: doctors, error } = await supabase
          .from('doctors')
          .select(`
            id,
            specialization,
            profiles(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('organization_id', organizationId)
          .limit(5);

        testResults.push({
          test: 'Direct Doctors Query',
          success: !error,
          data: doctors?.slice(0, 2),
          error: error?.message,
          count: doctors?.length || 0
        });

        if (doctors && doctors.length > 0) {
          console.log('👨‍⚕️ Sample doctor data:', doctors[0]);
        }
      } catch (err) {
        testResults.push({
          test: 'Direct Doctors Query',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // Test 3: Alternative appointments query with explicit join
      console.log('🔍 Test 3: Alternative appointments query');
      try {
        const { data: altAppointments, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            start_time,
            status,
            doctors!inner(
              id,
              specialization,
              profiles!inner(
                first_name,
                last_name
              )
            )
          `)
          .eq('organization_id', organizationId)
          .limit(5);

        testResults.push({
          test: 'Alternative Appointments Query (inner joins)',
          success: !error,
          data: altAppointments?.slice(0, 2),
          error: error?.message,
          count: altAppointments?.length || 0
        });

        if (altAppointments && altAppointments.length > 0) {
          console.log('🔄 Alternative appointment data:', altAppointments[0]);
        }
      } catch (err) {
        testResults.push({
          test: 'Alternative Appointments Query (inner joins)',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

      // Test 4: Raw SQL approach
      console.log('🔍 Test 4: Raw SQL approach');
      try {
        const { data: rawData, error } = await supabase.rpc('get_appointments_with_doctor_names', {
          org_id: organizationId
        });

        testResults.push({
          test: 'Raw SQL Function (if exists)',
          success: !error,
          data: rawData?.slice(0, 2),
          error: error?.message,
          count: rawData?.length || 0
        });
      } catch (err) {
        testResults.push({
          test: 'Raw SQL Function (if exists)',
          success: false,
          error: err instanceof Error ? err.message : 'Function may not exist'
        });
      }

      // Test 5: Check profiles table directly
      console.log('🔍 Test 5: Check profiles table');
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .eq('organization_id', organizationId)
          .eq('role', 'doctor')
          .limit(5);

        testResults.push({
          test: 'Direct Profiles Query (doctors)',
          success: !error,
          data: profiles?.slice(0, 2),
          error: error?.message,
          count: profiles?.length || 0
        });

        if (profiles && profiles.length > 0) {
          console.log('👤 Sample profile data:', profiles[0]);
        }
      } catch (err) {
        testResults.push({
          test: 'Direct Profiles Query (doctors)',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }

    } catch (globalErr) {
      console.error('Global error in tests:', globalErr);
    }

    setResults(testResults);
    setIsRunning(false);
  };

  return (
    <DashboardLayout
      title="Debug: Doctor Names Issue"
      subtitle="Technical investigation of doctor name display problem"
    >
      <div className="space-y-6">
        {/* Control Panel */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Debug Control Panel</h3>
            <button
              type="button"
              onClick={runDoctorNamesTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running Tests...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Run Doctor Names Tests
                </>
              )}
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p><strong>Organization ID:</strong> {profile?.organization_id || 'Not loaded'}</p>
            <p><strong>User Role:</strong> {profile?.role || 'Not loaded'}</p>
            <p><strong>Tests:</strong> 5 different query patterns to identify the issue</p>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
            
            {results.map((result, index) => (
              <div key={index} className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <h4 className="text-md font-medium text-gray-900">{result.test}</h4>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>

                {result.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700"><strong>Error:</strong> {result.error}</p>
                  </div>
                )}

                {result.count !== undefined && (
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Records found:</strong> {result.count}
                  </p>
                )}

                {result.data && (
                  <div className="bg-gray-50 rounded-md p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Sample Data:</p>
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-2">Investigation Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Run the tests to see which queries work</li>
                <li>Check browser console for detailed logs</li>
                <li>Compare data structures between working and failing queries</li>
                <li>Identify if the issue is in the query or data processing</li>
                <li>Apply the fix based on findings</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
