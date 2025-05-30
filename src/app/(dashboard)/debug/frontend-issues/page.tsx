'use client';

/**
 * @fileoverview Frontend Issues Debug Page
 * Real-time debugging tool for frontend data display issues
 * Runs in browser context with proper authentication
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Users,
  Stethoscope,
  Calendar,
  Database,
  Globe,
  Eye,
  XCircle
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'passed' | 'failed';
  details?: string;
  error?: string;
  data?: any;
}

interface DebugStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
}

export default function FrontendIssuesDebugPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [stats, setStats] = useState<DebugStats>({ total: 0, passed: 0, failed: 0, pending: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const updateTest = (name: string, status: 'passed' | 'failed', details?: string, error?: string, data?: any) => {
    setTests(prev => prev.map(test => 
      test.name === name 
        ? { ...test, status, details, error, data }
        : test
    ));
  };

  const calculateStats = (testResults: TestResult[]) => {
    const total = testResults.length;
    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;
    const pending = testResults.filter(t => t.status === 'pending').length;
    return { total, passed, failed, pending };
  };

  useEffect(() => {
    const newStats = calculateStats(tests);
    setStats(newStats);
  }, [tests]);

  const runTest = async (name: string, testFn: () => Promise<{ details: string; data?: any }>) => {
    setCurrentTest(name);
    try {
      const result = await testFn();
      updateTest(name, 'passed', result.details, undefined, result.data);
    } catch (error) {
      updateTest(name, 'failed', undefined, error instanceof Error ? error.message : String(error));
    }
  };

  const testAuthenticationContext = async () => {
    if (!profile) {
      throw new Error('No profile found in auth context');
    }
    if (!organization) {
      throw new Error('No organization found in tenant context');
    }
    return {
      details: `✓ Auth: ${profile.email} (${profile.role}) @ ${organization.name}`,
      data: { profile, organization }
    };
  };

  const testPatientsAPI = async () => {
    if (!organization?.id) {
      throw new Error('No organization ID available');
    }

    const params = new URLSearchParams();
    params.append('organizationId', organization.id);

    const response = await fetch(`/api/patients?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    const count = result.data?.length || 0;

    return {
      details: `✓ Patients API: ${count} patients returned`,
      data: { count, patients: result.data || [] }
    };
  };

  const testDoctorsAPI = async () => {
    if (!organization?.id) {
      throw new Error('No organization ID available');
    }

    const params = new URLSearchParams();
    params.append('organizationId', organization.id);

    const response = await fetch(`/api/doctors?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    const count = result.data?.length || 0;

    return {
      details: `✓ Doctors API: ${count} doctors returned`,
      data: { count, doctors: result.data || [] }
    };
  };

  const testAppointmentsAPI = async () => {
    if (!organization?.id) {
      throw new Error('No organization ID available');
    }

    const params = new URLSearchParams();
    params.append('organizationId', organization.id);

    const response = await fetch(`/api/appointments?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API call failed: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    const count = result.data?.length || 0;

    return {
      details: `✓ Appointments API: ${count} appointments returned`,
      data: { count, appointments: result.data || [] }
    };
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setCurrentTest('');

    // Initialize tests
    const initialTests: TestResult[] = [
      { name: 'Authentication Context', status: 'pending' },
      { name: 'Patients API', status: 'pending' },
      { name: 'Doctors API', status: 'pending' },
      { name: 'Appointments API', status: 'pending' }
    ];
    setTests(initialTests);

    try {
      await runTest('Authentication Context', testAuthenticationContext);
      await runTest('Patients API', testPatientsAPI);
      await runTest('Doctors API', testDoctorsAPI);
      await runTest('Appointments API', testAppointmentsAPI);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <RefreshCw className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTestIcon = (name: string) => {
    switch (name) {
      case 'Authentication Context':
        return <Eye className="h-4 w-4" />;
      case 'Patients API':
        return <Users className="h-4 w-4" />;
      case 'Doctors API':
        return <Stethoscope className="h-4 w-4" />;
      case 'Appointments API':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout
      title="Frontend Issues Debug"
      subtitle="Real-time debugging of frontend data display issues"
    >
      <div className="space-y-6">
        {/* Control Panel */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Debug Control Panel</h3>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </button>
          </div>

          {currentTest && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                Currently testing: {currentTest}
              </p>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        {tests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <Database className="h-6 w-6 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Tests</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Passed</p>
                  <p className="text-xl font-bold text-gray-900">{stats.passed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <XCircle className="h-6 w-6 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-xl font-bold text-gray-900">{stats.failed}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <RefreshCw className="h-6 w-6 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Results */}
        {tests.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {tests.map((test, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {getStatusIcon(test.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {getTestIcon(test.name)}
                        <h4 className="ml-2 text-sm font-medium text-gray-900">{test.name}</h4>
                      </div>
                      {test.details && (
                        <p className="text-sm text-green-700 mb-2">{test.details}</p>
                      )}
                      {test.error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm text-red-800">{test.error}</p>
                        </div>
                      )}
                      {test.data && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">View raw data</summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(test.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Debug Instructions</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>This tool tests the exact same API calls that the frontend pages make.</p>
                <p className="mt-1">If tests pass here but pages show no data, the issue is in component rendering logic.</p>
                <p className="mt-1">If tests fail here, the issue is in API authentication or data access.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
