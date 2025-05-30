'use client';

/**
 * Create User Page
 * Page for creating new users with role-based permissions
 * Supports Admin and SuperAdmin user creation with proper validation
 * 
 * @page CreateUserPage
 * @description Comprehensive user creation page with multi-tenant support
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import UserForm from '@/components/users/UserForm';
import {
  UserPlus,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Types
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
 * CreateUserPage - Page for creating new users
 */
export default function CreateUserPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if user doesn't have permission
  React.useEffect(() => {
    if (profile && !['admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
    }
  }, [profile, router]);

  /**
   * Handle user creation
   */
  const handleCreateUser = async (userData: UserFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare data for API
      const createData = {
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        role: userData.role,
        organization_id: userData.organization_id || organization?.id,
        is_active: userData.is_active
      };

      // Call API to create user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }

      // Success
      setSuccess(`Usuario ${userData.first_name} ${userData.last_name} creado exitosamente`);
      
      // Redirect to users list after 2 seconds
      setTimeout(() => {
        router.push('/users');
      }, 2000);

    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Error inesperado al crear usuario');
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
    <button
      type="button"
      onClick={handleCancel}
      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Volver a Usuarios
    </button>
  );

  return (
    <DashboardLayout
      title="Crear Nuevo Usuario"
      subtitle="Agregue un nuevo usuario al sistema con los permisos apropiados"
      actions={actions}
    >
      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Usuario Creado</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
              <p className="text-sm text-green-600 mt-1">Redirigiendo a la lista de usuarios...</p>
            </div>
          </div>
        </div>
      )}

      {/* User Creation Form */}
      <div className="max-w-4xl mx-auto">
        <UserForm
          mode="create"
          onSubmit={handleCreateUser}
          onCancel={handleCancel}
          loading={loading}
          error={error}
        />
      </div>

      {/* Help Section */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Información Importante</h3>
              <div className="text-sm text-blue-700 mt-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>El usuario recibirá las credenciales por email automáticamente</li>
                  <li>Los usuarios pueden cambiar su contraseña en su primer acceso</li>
                  <li>Los permisos se asignan según el rol seleccionado</li>
                  {profile?.role === 'admin' && (
                    <li>Como Admin, solo puedes crear usuarios en tu organización</li>
                  )}
                  {profile?.role === 'superadmin' && (
                    <li>Como SuperAdmin, puedes crear usuarios en cualquier organización</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Permissions Reference */}
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Permisos por Rol</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Patient Role */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Paciente</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Agendar citas</li>
                <li>• Ver sus citas</li>
                <li>• Actualizar perfil</li>
                <li>• Cancelar citas</li>
              </ul>
            </div>

            {/* Staff Role */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Personal</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Gestionar citas</li>
                <li>• Registrar pacientes</li>
                <li>• Ver horarios</li>
                <li>• Generar reportes</li>
              </ul>
            </div>

            {/* Doctor Role */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Doctor</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Gestionar horarios</li>
                <li>• Ver pacientes</li>
                <li>• Gestionar citas</li>
                <li>• Acceso a historiales</li>
              </ul>
            </div>

            {/* Admin Role */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Administrador</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Gestión completa</li>
                <li>• Crear usuarios</li>
                <li>• Configurar sistema</li>
                <li>• Ver reportes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
