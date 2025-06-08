/**
 * Unified Channels Admin Page
 * 
 * Main admin page for managing all communication channels using the unified
 * ChannelDashboard component integrated with DashboardLayout.
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { createClient } from '@/lib/supabase/client';

// Simplified import to prevent webpack module loading issues
let ChannelDashboard: any = null;

// Simple fallback component
const ChannelDashboardFallback = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 w-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-6 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>

    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-2 text-gray-600">Cargando dashboard de canales...</p>
    </div>
  </div>
);

// =====================================================
// TYPES
// =====================================================

interface UserProfile {
  id: string;
  organization_id: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * ChannelsAdminPage Component
 * 
 * @description Main admin page for unified channel management.
 * Integrates ChannelDashboard with existing DashboardLayout.
 */
export default function ChannelsAdminPage() {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Load ChannelDashboard component dynamically with cleanup
  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const module = await import('@/components/channels/ChannelDashboard');
        if (isMounted) {
          ChannelDashboard = module.ChannelDashboard;
          setDashboardLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load ChannelDashboard:', error);
        if (isMounted) {
          setDashboardLoaded(true); // Still set to true to show fallback
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  // =====================================================
  // AUTHENTICATION & PROFILE
  // =====================================================

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/auth/login');
          return;
        }

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, organization_id, role, first_name, last_name')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          setError('Failed to load user profile');
          return;
        }

        // Check admin permissions
        if (!['admin', 'superadmin'].includes(profileData.role)) {
          router.push('/dashboard');
          return;
        }

        setProfile(profileData);
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  // =====================================================
  // LOADING & ERROR STATES
  // =====================================================

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando canales...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            Reintentar
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Acceso Denegado</h3>
          <p className="text-yellow-700">No tienes permisos para acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Canales de Comunicación</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona todos tus canales de comunicación desde un solo lugar
          </p>
        </div>

        {/* Channel Dashboard */}
        {ChannelDashboard && dashboardLoaded ? (
          <ChannelDashboard
            organizationId={profile.organization_id}
            userRole={profile.role}
          />
        ) : (
          <ChannelDashboardFallback />
        )}
      </div>
    </DashboardLayout>
  );
}
