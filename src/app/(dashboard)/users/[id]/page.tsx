'use client';

/**
 * User Details Page
 * Page for viewing detailed user information with role-based permissions
 * Supports Admin and SuperAdmin user viewing with proper validation
 * 
 * @page UserDetailsPage
 * @description Comprehensive user details page with multi-tenant support
 */

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Calendar,
  Clock,
  Edit,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Activity
} from 'lucide-react';

// Types
interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'doctor' | 'staff' | 'patient' | 'superadmin';
  organization_id: string;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

interface UserStats {
  totalAppointments?: number;
  completedAppointments?: number;
  cancelledAppointments?: number;
  lastActivity?: string;
}

/**
 * UserDetailsPage - Page for viewing detailed user information
 */
export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userId = params.id as string;

  // Redirect if user doesn't have permission
  useEffect(() => {
    if (profile && !['admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  // Fetch user data
  useEffect(() => {
    if (userId && profile) {
      fetchUserData();
    }
  }, [userId, profile]);

  /**
   * Fetch user data and stats
   */
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user details
      const userResponse = await fetch(`/api/users/${userId}`);
      const userResult = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(userResult.error || 'Error al cargar datos del usuario');
      }

      setUserData(userResult.data);

      // Fetch user stats (optional, may not exist for all roles)
      try {
        const statsResponse = await fetch(`/api/users/${userId}/stats`);
        if (statsResponse.ok) {
          const statsResult = await statsResponse.json();
          setUserStats(statsResult.data);
        }
      } catch (statsErr) {
        // Stats are optional, don't fail if not available
        console.log('User stats not available:', statsErr);
      }

    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuario');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle user active status
   */
  const toggleUserStatus = async () => {
    if (!userData) return;

    try {
      setActionLoading(true);
      const newStatus = !userData.is_active;

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar estado del usuario');
      }

      // Update local state
      setUserData(prev => prev ? { ...prev, is_active: newStatus } : null);

    } catch (err) {
      console.error('Error toggling user status:', err);
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Get role display information
   */
  const getRoleInfo = (role: string) => {
    const roleMap = {
      patient: { label: 'Paciente', color: 'bg-blue-100 text-blue-800', icon: User },
      staff: { label: 'Personal', color: 'bg-green-100 text-green-800', icon: User },
      doctor: { label: 'Doctor', color: 'bg-purple-100 text-purple-800', icon: User },
      admin: { label: 'Administrador', color: 'bg-orange-100 text-orange-800', icon: Shield },
      superadmin: { label: 'Super Admin', color: 'bg-red-100 text-red-800', icon: Shield }
    };
    return roleMap[role as keyof typeof roleMap] || { label: role, color: 'bg-gray-100 text-gray-800', icon: User };
  };

  // Page actions
  const actions = (
    <div className="flex space-x-3">
      <button
        type="button"
        onClick={() => router.push(`/users/${userId}/edit`)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Edit className="h-4 w-4 mr-2" />
        Editar Usuario
      </button>
      <button
        type="button"
        onClick={() => router.push('/users')}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Usuarios
      </button>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <DashboardLayout
        title="Detalles del Usuario"
        subtitle="Cargando información del usuario..."
        actions={actions}
      >
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando información del usuario...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error && !userData) {
    return (
      <DashboardLayout
        title="Detalles del Usuario"
        subtitle="Error al cargar usuario"
        actions={actions}
      >
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchUserData}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!userData) {
    return (
      <DashboardLayout
        title="Detalles del Usuario"
        subtitle="Usuario no encontrado"
        actions={actions}
      >
        <div className="text-center py-12">
          <p className="text-gray-600">Usuario no encontrado</p>
        </div>
      </DashboardLayout>
    );
  }

  const roleInfo = getRoleInfo(userData.role);
  const RoleIcon = roleInfo.icon;

  return (
    <DashboardLayout
      title="Detalles del Usuario"
      subtitle={`Información completa de ${userData.first_name} ${userData.last_name}`}
      actions={actions}
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* User Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {userData.first_name} {userData.last_name}
                </h2>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {roleInfo.label}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {userData.is_active ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Activo
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactivo
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Status Toggle */}
            <button
              onClick={toggleUserStatus}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                userData.is_active
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50`}
            >
              {actionLoading ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : userData.is_active ? (
                <XCircle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {userData.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-gray-600" />
            Información de Contacto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{userData.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <p className="mt-1 text-sm text-gray-900">{userData.phone || 'No especificado'}</p>
            </div>
          </div>
        </div>

        {/* Organization Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building2 className="h-5 w-5 mr-2 text-gray-600" />
            Información de Organización
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Organización</label>
              <p className="mt-1 text-sm text-gray-900">{userData.organization_name || 'No especificada'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <p className="mt-1 text-sm text-gray-900">{roleInfo.label}</p>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-gray-600" />
            Información de Cuenta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Creación</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(userData.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Último Acceso</label>
              <p className="mt-1 text-sm text-gray-900">
                {userData.last_sign_in_at 
                  ? new Date(userData.last_sign_in_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Nunca'
                }
              </p>
            </div>
          </div>
        </div>

        {/* User Statistics (if available) */}
        {userStats && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-gray-600" />
              Estadísticas de Actividad
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userStats.totalAppointments !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total de Citas</label>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{userStats.totalAppointments}</p>
                </div>
              )}
              {userStats.completedAppointments !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Citas Completadas</label>
                  <p className="mt-1 text-2xl font-semibold text-green-600">{userStats.completedAppointments}</p>
                </div>
              )}
              {userStats.cancelledAppointments !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Citas Canceladas</label>
                  <p className="mt-1 text-2xl font-semibold text-red-600">{userStats.cancelledAppointments}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
