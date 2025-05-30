'use client';

/**
 * Authentication Debug Panel
 * Displays real-time authentication state for debugging purposes
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';

interface AuthDebugInfo {
  authContext: {
    profile: any;
    user: any;
    loading: boolean;
  };
  tenantContext: {
    organization: any;
    loading: boolean;
  };
  supabaseSession: {
    hasSession: boolean;
    userId: string | null;
    accessToken: boolean;
    expiresAt: string | null;
  };
  apiTest: {
    success: boolean;
    status: number;
    data: any;
    error: string | null;
  };
}

export default function AuthDebugPanel() {
  const { profile, user, loading: authLoading } = useAuth();
  const { organization, loading: tenantLoading } = useTenant();
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const collectDebugInfo = async () => {
    setRefreshing(true);
    try {
      const supabase = createClient();
      
      // Get session info
      const { data: session } = await supabase.auth.getSession();
      
      // Test API call
      let apiTest = {
        success: false,
        status: 0,
        data: null,
        error: null as string | null
      };

      try {
        const params = new URLSearchParams();
        if (organization?.id) {
          params.append('organizationId', organization.id);
        }
        
        const response = await fetch(`/api/patients?${params.toString()}`);
        const data = await response.json();
        
        apiTest = {
          success: response.ok,
          status: response.status,
          data: data,
          error: response.ok ? null : data.error || 'Unknown error'
        };
      } catch (err) {
        apiTest.error = err instanceof Error ? err.message : 'Fetch failed';
      }

      const info: AuthDebugInfo = {
        authContext: {
          profile: profile,
          user: user,
          loading: authLoading
        },
        tenantContext: {
          organization: organization,
          loading: tenantLoading
        },
        supabaseSession: {
          hasSession: !!session.session,
          userId: session.session?.user?.id || null,
          accessToken: !!session.session?.access_token,
          expiresAt: session.session?.expires_at ? new Date(session.session.expires_at * 1000).toISOString() : null
        },
        apiTest
      };

      setDebugInfo(info);
    } catch (err) {
      console.error('Error collecting debug info:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !tenantLoading) {
      collectDebugInfo();
    }
  }, [authLoading, tenantLoading, profile, organization]);

  if (!debugInfo) {
    return null;
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg mb-2"
        title="Toggle Auth Debug Panel"
      >
        <Info className="h-5 w-5" />
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Auth Debug Panel</h3>
            <button
              onClick={collectDebugInfo}
              disabled={refreshing}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Auth Context */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(!!debugInfo.authContext.profile)}
                <span className="font-medium">Auth Context</span>
              </div>
              <div className="ml-6 space-y-1 text-gray-600">
                <div>Loading: {debugInfo.authContext.loading ? 'Yes' : 'No'}</div>
                <div>User ID: {debugInfo.authContext.user?.id || 'None'}</div>
                <div>Email: {debugInfo.authContext.profile?.email || 'None'}</div>
                <div>Role: {debugInfo.authContext.profile?.role || 'None'}</div>
                <div>Org ID: {debugInfo.authContext.profile?.organization_id || 'None'}</div>
              </div>
            </div>

            {/* Tenant Context */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(!!debugInfo.tenantContext.organization)}
                <span className="font-medium">Tenant Context</span>
              </div>
              <div className="ml-6 space-y-1 text-gray-600">
                <div>Loading: {debugInfo.tenantContext.loading ? 'Yes' : 'No'}</div>
                <div>Org Name: {debugInfo.tenantContext.organization?.name || 'None'}</div>
                <div>Org ID: {debugInfo.tenantContext.organization?.id || 'None'}</div>
              </div>
            </div>

            {/* Supabase Session */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(debugInfo.supabaseSession.hasSession)}
                <span className="font-medium">Supabase Session</span>
              </div>
              <div className="ml-6 space-y-1 text-gray-600">
                <div>Has Session: {debugInfo.supabaseSession.hasSession ? 'Yes' : 'No'}</div>
                <div>User ID: {debugInfo.supabaseSession.userId || 'None'}</div>
                <div>Access Token: {debugInfo.supabaseSession.accessToken ? 'Present' : 'Missing'}</div>
                <div>Expires: {debugInfo.supabaseSession.expiresAt ? new Date(debugInfo.supabaseSession.expiresAt).toLocaleTimeString() : 'None'}</div>
              </div>
            </div>

            {/* API Test */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(debugInfo.apiTest.success)}
                <span className="font-medium">API Test (/api/patients)</span>
              </div>
              <div className="ml-6 space-y-1 text-gray-600">
                <div>Status: {debugInfo.apiTest.status}</div>
                <div>Success: {debugInfo.apiTest.success ? 'Yes' : 'No'}</div>
                {debugInfo.apiTest.error && (
                  <div className="text-red-600">Error: {debugInfo.apiTest.error}</div>
                )}
                {debugInfo.apiTest.success && debugInfo.apiTest.data && (
                  <div>Patients Count: {debugInfo.apiTest.data.data?.length || 0}</div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t pt-2">
              <div className="font-medium text-gray-900 mb-1">Summary</div>
              <div className="space-y-1 text-gray-600">
                {!debugInfo.authContext.profile && (
                  <div className="text-red-600">❌ No auth profile</div>
                )}
                {!debugInfo.tenantContext.organization && (
                  <div className="text-red-600">❌ No organization</div>
                )}
                {!debugInfo.supabaseSession.hasSession && (
                  <div className="text-red-600">❌ No Supabase session</div>
                )}
                {!debugInfo.apiTest.success && (
                  <div className="text-red-600">❌ API call failed</div>
                )}
                {debugInfo.authContext.profile && 
                 debugInfo.tenantContext.organization && 
                 debugInfo.supabaseSession.hasSession && 
                 debugInfo.apiTest.success && (
                  <div className="text-green-600">✅ All systems working</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
