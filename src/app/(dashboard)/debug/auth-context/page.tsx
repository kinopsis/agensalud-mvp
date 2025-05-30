'use client';

/**
 * Authentication Context Debug Tool
 * Investigates authentication and profile context issues
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface AuthDebugInfo {
  supabaseUser: any;
  contextUser: any;
  contextProfile: any;
  contextOrganization: any;
  databaseProfile: any;
  sessionInfo: any;
  mismatches: string[];
}

export default function AuthContextDebugPage() {
  const { user, profile } = useAuth();
  const { organization } = useTenant();
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const investigateAuthContext = async () => {
      const supabase = createClient();
      const mismatches: string[] = [];

      try {
        // 1. Get Supabase session directly
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // 2. Get Supabase user directly
        const { data: userData, error: userError } = await supabase.auth.getUser();

        // 3. Get profile from database using context user ID
        let databaseProfile = null;
        if (user?.id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!profileError) {
            databaseProfile = profileData;
          }
        }

        // 4. Check for mismatches
        if (sessionData?.session?.user?.id !== user?.id) {
          mismatches.push('Session user ID != Context user ID');
        }

        if (userData?.user?.id !== user?.id) {
          mismatches.push('Supabase user ID != Context user ID');
        }

        if (databaseProfile?.id !== profile?.id) {
          mismatches.push('Database profile ID != Context profile ID');
        }

        if (databaseProfile?.email !== user?.email) {
          mismatches.push('Database email != Context email');
        }

        if (profile?.id && !databaseProfile) {
          mismatches.push('Context profile exists but not found in database');
        }

        setDebugInfo({
          supabaseUser: userData?.user || null,
          contextUser: user,
          contextProfile: profile,
          contextOrganization: organization,
          databaseProfile,
          sessionInfo: sessionData?.session || null,
          mismatches
        });

      } catch (error) {
        console.error('Auth investigation error:', error);
      } finally {
        setLoading(false);
      }
    };

    investigateAuthContext();
  }, [user, profile, organization]);

  if (loading) {
    return (
      <DashboardLayout title="Diagnóstico de Contexto de Autenticación">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Investigando contexto de autenticación...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Diagnóstico de Contexto de Autenticación">
      <div className="space-y-6">
        {/* Mismatch Alert */}
        {debugInfo?.mismatches && debugInfo.mismatches.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-2">🚨 Problemas Detectados</h3>
            <ul className="list-disc list-inside text-sm text-red-700">
              {debugInfo.mismatches.map((mismatch, index) => (
                <li key={index}>{mismatch}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Session Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Sesión</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Session User ID:</span> 
              <code className="ml-2 text-xs bg-gray-100 px-1 rounded">
                {debugInfo?.sessionInfo?.user?.id || 'N/A'}
              </code>
            </div>
            <div>
              <span className="font-medium">Session Email:</span> 
              <code className="ml-2 text-xs bg-gray-100 px-1 rounded">
                {debugInfo?.sessionInfo?.user?.email || 'N/A'}
              </code>
            </div>
            <div>
              <span className="font-medium">Access Token:</span> 
              <code className="ml-2 text-xs bg-gray-100 px-1 rounded">
                {debugInfo?.sessionInfo?.access_token ? 'Present' : 'Missing'}
              </code>
            </div>
            <div>
              <span className="font-medium">Expires At:</span> 
              <code className="ml-2 text-xs bg-gray-100 px-1 rounded">
                {debugInfo?.sessionInfo?.expires_at ? new Date(debugInfo.sessionInfo.expires_at * 1000).toLocaleString() : 'N/A'}
              </code>
            </div>
          </div>
        </div>

        {/* Supabase User vs Context User */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparación de Usuario</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Supabase Auth User</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">ID:</span> 
                  <code className="ml-2 text-xs bg-blue-100 px-1 rounded">
                    {debugInfo?.supabaseUser?.id || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Email:</span> 
                  <code className="ml-2 text-xs bg-blue-100 px-1 rounded">
                    {debugInfo?.supabaseUser?.email || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Created:</span> 
                  <code className="ml-2 text-xs bg-blue-100 px-1 rounded">
                    {debugInfo?.supabaseUser?.created_at ? new Date(debugInfo.supabaseUser.created_at).toLocaleString() : 'N/A'}
                  </code>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Context User</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">ID:</span> 
                  <code className="ml-2 text-xs bg-green-100 px-1 rounded">
                    {debugInfo?.contextUser?.id || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Email:</span> 
                  <code className="ml-2 text-xs bg-green-100 px-1 rounded">
                    {debugInfo?.contextUser?.email || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Source:</span> 
                  <code className="ml-2 text-xs bg-green-100 px-1 rounded">
                    Auth Context
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Comparison */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparación de Perfil</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Database Profile</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">ID:</span> 
                  <code className="ml-2 text-xs bg-blue-100 px-1 rounded">
                    {debugInfo?.databaseProfile?.id || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Email:</span> 
                  <code className="ml-2 text-xs bg-blue-100 px-1 rounded">
                    {debugInfo?.databaseProfile?.email || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Role:</span> 
                  <code className="ml-2 text-xs bg-blue-100 px-1 rounded">
                    {debugInfo?.databaseProfile?.role || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Name:</span> 
                  <code className="ml-2 text-xs bg-blue-100 px-1 rounded">
                    {debugInfo?.databaseProfile ? `${debugInfo.databaseProfile.first_name} ${debugInfo.databaseProfile.last_name}` : 'N/A'}
                  </code>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Context Profile</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">ID:</span> 
                  <code className="ml-2 text-xs bg-green-100 px-1 rounded">
                    {debugInfo?.contextProfile?.id || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Email:</span> 
                  <code className="ml-2 text-xs bg-green-100 px-1 rounded">
                    {debugInfo?.contextProfile?.email || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Role:</span> 
                  <code className="ml-2 text-xs bg-green-100 px-1 rounded">
                    {debugInfo?.contextProfile?.role || 'N/A'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Name:</span> 
                  <code className="ml-2 text-xs bg-green-100 px-1 rounded">
                    {debugInfo?.contextProfile ? `${debugInfo.contextProfile.first_name} ${debugInfo.contextProfile.last_name}` : 'N/A'}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Analysis */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">🔍 Análisis Crítico</h3>
          <div className="space-y-2 text-sm text-yellow-800">
            <div>
              <span className="font-medium">ID Match Status:</span> 
              {debugInfo?.databaseProfile?.id === debugInfo?.contextProfile?.id ? (
                <span className="text-green-600 ml-2">✅ IDs coinciden</span>
              ) : (
                <span className="text-red-600 ml-2">❌ IDs NO coinciden</span>
              )}
            </div>
            <div>
              <span className="font-medium">Expected DB ID:</span> 
              <code className="ml-2 text-xs bg-yellow-100 px-1 rounded">
                5b361f1e-04b6-4a40-bb61-bd519c0e9be8
              </code>
            </div>
            <div>
              <span className="font-medium">Context Profile ID:</span> 
              <code className="ml-2 text-xs bg-yellow-100 px-1 rounded">
                {debugInfo?.contextProfile?.id || 'N/A'}
              </code>
            </div>
            <div>
              <span className="font-medium">Permission Logic Impact:</span> 
              {debugInfo?.contextProfile?.id === '5b361f1e-04b6-4a40-bb61-bd519c0e9be8' ? (
                <span className="text-green-600 ml-2">✅ Buttons should work</span>
              ) : (
                <span className="text-red-600 ml-2">❌ Buttons will be hidden</span>
              )}
            </div>
          </div>
        </div>

        {/* Raw Data */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos Completos (JSON)</h3>
          <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </DashboardLayout>
  );
}
