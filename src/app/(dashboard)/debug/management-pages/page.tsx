'use client';

/**
 * Management Pages Debug Tool
 * Comprehensive debugging for management pages data inconsistencies
 * Tests authentication, APIs, and data flow in real browser context
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Users,
  Heart,
  Stethoscope,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader,
  RefreshCw,
  Bug,
  Database,
  Globe,
  Key
} from 'lucide-react';

interface APITestResult {
  name: string;
  url: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
  count?: number;
  expectedCount?: number;
}

interface DebugInfo {
  authContext: any;
  tenantContext: any;
  apiTests: APITestResult[];
  browserInfo: any;
}

export default function ManagementPagesDebugPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { organization, loading: tenantLoading } = useTenant();
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    authContext: null,
    tenantContext: null,
    apiTests: [],
    browserInfo: null
  });
  const [testing, setTesting] = useState(false);

  const expectedCounts = {
    users: 13,
    patients: 3,
    doctors: 5,
    appointments: 10
  };

  useEffect(() => {
    // Gather initial debug info
    setDebugInfo(prev => ({
      ...prev,
      authContext: {
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : null,
        profile: profile ? {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          organization_id: profile.organization_id,
          is_active: profile.is_active
        } : null,
        loading: authLoading
      },
      tenantContext: {
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        } : null,
        loading: tenantLoading
      },
      browserInfo: {
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        currentURL: window.location.href,
        timestamp: new Date().toISOString()
      }
    }));
  }, [user, profile, organization, authLoading, tenantLoading]);

  const testAPI = async (name: string, endpoint: string, expectedCount: number): Promise<APITestResult> => {
    const url = organization?.id 
      ? `${endpoint}?organizationId=${organization.id}`
      : endpoint;

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          name,
          url,
          status: 'error',
          error: `${response.status} ${response.statusText}: ${errorText}`,
          expectedCount
        };
      }

      const result = await response.json();
      const actualCount = result.data ? result.data.length : 0;

      return {
        name,
        url,
        status: actualCount === expectedCount ? 'success' : 'error',
        data: result.data ? result.data.slice(0, 2) : null, // First 2 items for preview
        count: actualCount,
        expectedCount,
        error: actualCount !== expectedCount ? `Count mismatch: got ${actualCount}, expected ${expectedCount}` : undefined
      };

    } catch (error) {
      return {
        name,
        url,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        expectedCount
      };
    }
  };

  const runAllTests = async () => {
    if (!organization?.id) {
      alert('Organization not available. Cannot run tests.');
      return;
    }

    setTesting(true);

    const tests = [
      { name: 'Users API', endpoint: '/api/users', expected: expectedCounts.users },
      { name: 'Patients API', endpoint: '/api/patients', expected: expectedCounts.patients },
      { name: 'Doctors API', endpoint: '/api/doctors', expected: expectedCounts.doctors },
      { name: 'Appointments API', endpoint: '/api/appointments', expected: expectedCounts.appointments }
    ];

    const results: APITestResult[] = [];

    for (const test of tests) {
      const result = await testAPI(test.name, test.endpoint, test.expected);
      results.push(result);
      
      // Update state incrementally
      setDebugInfo(prev => ({
        ...prev,
        apiTests: [...results]
      }));
    }

    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Loader className="h-5 w-5 text-gray-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <DashboardLayout
      title="Management Pages Debug Tool"
      subtitle="Comprehensive debugging for data inconsistencies"
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Bug className="h-5 w-5 mr-2" />
            Debug Actions
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={runAllTests}
              disabled={testing || !organization?.id}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              {testing ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {testing ? 'Testing APIs...' : 'Test All APIs'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>

        {/* Authentication Context */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Authentication Context
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">User Info</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(debugInfo.authContext?.user, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Profile Info</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(debugInfo.authContext?.profile, null, 2)}
              </pre>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-2">Organization Info</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(debugInfo.tenantContext?.organization, null, 2)}
            </pre>
          </div>
        </div>

        {/* API Test Results */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            API Test Results
          </h3>
          
          {debugInfo.apiTests.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No API tests run yet. Click "Test All APIs" to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debugInfo.apiTests.map((test, index) => (
                <div key={index} className={`border rounded-lg p-4 ${getStatusColor(test.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getStatusIcon(test.status)}
                      <span className="ml-2 font-medium">{test.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {test.count !== undefined && (
                        <span>
                          {test.count} / {test.expectedCount} items
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>URL:</strong> {test.url}
                  </div>
                  
                  {test.error && (
                    <div className="text-sm text-red-600 mb-2">
                      <strong>Error:</strong> {test.error}
                    </div>
                  )}
                  
                  {test.data && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Sample Data:</h5>
                      <pre className="bg-white p-2 rounded text-xs overflow-x-auto border">
                        {JSON.stringify(test.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Browser Environment */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Browser Environment</h3>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
            {JSON.stringify(debugInfo.browserInfo, null, 2)}
          </pre>
        </div>

        {/* Quick Links */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/users"
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
            >
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              <span>Users Page</span>
            </a>
            <a
              href="/patients"
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
            >
              <Heart className="h-5 w-5 mr-2 text-red-600" />
              <span>Patients Page</span>
            </a>
            <a
              href="/staff/doctors"
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
            >
              <Stethoscope className="h-5 w-5 mr-2 text-green-600" />
              <span>Doctors Page</span>
            </a>
            <a
              href="/appointments"
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
            >
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              <span>Appointments Page</span>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
