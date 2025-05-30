'use client';

/**
 * Edit User Page
 * Page for editing existing users with role-based permissions
 * Supports Admin and SuperAdmin user editing with proper validation
 * 
 * @page EditUserPage
 * @description Comprehensive user editing page with multi-tenant support
 */

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import UserForm from '@/components/users/UserForm';
import {
  Edit,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';

// Types
interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'doctor' | 'staff' | 'patient';
  organization_id: string;
  organization_name?: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

interface UserFormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'doctor' | 'staff' | 'patient';
  organization_id?: string;
  is_active: boolean;
}

/**
 * EditUserPage - Page for editing existing users
 */
export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
   * Fetch user data for editing
   */
  const fetchUserData = async () => {
    try {
      setFetchLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar datos del usuario');
      }

      setUserData(result.data);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuario');
    } finally {
      setFetchLoading(false);
    }
  };

  /**
   * Handle user update
   */
  const handleUpdateUser = async (formData: UserFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare data for API (exclude password fields for edit)
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: formData.role,
        is_active: formData.is_active
      };

      // Call API to update user
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar usuario');
      }

      // Success
      setSuccess(`Usuario ${formData.first_name} ${formData.last_name} actualizado exitosamente`);
      
      // Refresh user data
      await fetchUserData();
      
      // Redirect to users list after 2 seconds
      setTimeout(() => {
        router.push('/users');
      }, 2000);

    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Error inesperado al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    router.push('/users');
  };

  // Page actions
  const actions = (
    <div className="flex space-x-3">
      <button
        type="button"
        onClick={() => router.push(`/users/${userId}`)}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        Ver Detalles
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Usuarios
      </button>
    </div>
  );

  // Loading state
  if (fetchLoading) {
    return (
      <DashboardLayout
        title="Editar Usuario"
        subtitle="Cargando datos del usuario..."
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
        title="Editar Usuario"
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

  return (
    <DashboardLayout
      title="Editar Usuario"
      subtitle={`Modificar información de ${userData?.first_name} ${userData?.last_name}`}
      actions={actions}
    >
      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Usuario Actualizado</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
              <p className="text-sm text-green-600 mt-1">Redirigiendo a la lista de usuarios...</p>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Form */}
      {userData && (
        <div className="max-w-4xl mx-auto">
          <UserForm
            mode="edit"
            initialData={{
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              phone: userData.phone,
              role: userData.role,
              organization_id: userData.organization_id,
              is_active: userData.is_active
            }}
            onSubmit={handleUpdateUser}
            onCancel={handleCancel}
            loading={loading}
            error={error}
          />
        </div>
      )}

      {/* User Information */}
      {userData && (
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">Información del Usuario</h3>
                <div className="text-sm text-gray-600 mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <strong>Email:</strong> {userData.email}
                  </div>
                  <div>
                    <strong>Organización:</strong> {userData.organization_name}
                  </div>
                  <div>
                    <strong>Creado:</strong> {new Date(userData.created_at).toLocaleDateString()}
                  </div>
                  {userData.last_sign_in_at && (
                    <div>
                      <strong>Último acceso:</strong> {new Date(userData.last_sign_in_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notes */}
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Notas sobre Edición</h3>
              <div className="text-sm text-blue-700 mt-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>El email del usuario no puede ser modificado</li>
                  <li>Para cambiar la contraseña, use la función de reseteo</li>
                  <li>Los cambios de rol toman efecto en el próximo inicio de sesión</li>
                  <li>Desactivar un usuario impide su acceso al sistema</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
