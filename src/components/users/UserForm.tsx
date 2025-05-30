'use client';

/**
 * UserForm Component
 * Reusable form component for creating and editing users
 * Supports Admin and SuperAdmin user management with proper validation
 * 
 * @component UserForm
 * @description Comprehensive user form with role-based permissions and multi-tenant support
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
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

interface UserFormProps {
  /** Existing user data for edit mode */
  initialData?: Partial<UserFormData>;
  /** Form mode - create or edit */
  mode: 'create' | 'edit';
  /** Callback when form is submitted successfully */
  onSubmit: (data: UserFormData) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

const USER_ROLES = [
  { value: 'patient', label: 'Paciente', description: 'Usuario que agenda citas' },
  { value: 'staff', label: 'Personal', description: 'Personal administrativo' },
  { value: 'doctor', label: 'Doctor', description: 'Profesional médico' },
  { value: 'admin', label: 'Administrador', description: 'Administrador de organización' }
] as const;

/**
 * UserForm - Reusable form component for user management
 */
export default function UserForm({
  initialData,
  mode,
  onSubmit,
  onCancel,
  loading = false,
  error = null
}: UserFormProps) {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    email: initialData?.email || '',
    password: '',
    confirmPassword: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone: initialData?.phone || '',
    role: initialData?.role || 'patient',
    organization_id: initialData?.organization_id || organization?.id || '',
    is_active: initialData?.is_active ?? true
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch organizations for SuperAdmin
  useEffect(() => {
    if (profile?.role === 'superadmin') {
      fetchOrganizations();
    }
  }, [profile]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/superadmin/organizations');
      if (response.ok) {
        const result = await response.json();
        setOrganizations(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email debe tener formato válido';
    }

    // Password validation (only for create mode)
    if (mode === 'create') {
      if (!formData.password) {
        errors.password = 'Contraseña es requerida';
      } else if (formData.password.length < 8) {
        errors.password = 'Contraseña debe tener al menos 8 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    // Name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'Nombre es requerido';
    }
    if (!formData.last_name.trim()) {
      errors.last_name = 'Apellido es requerido';
    }

    // Phone validation
    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      errors.phone = 'Teléfono debe tener formato válido';
    }

    // Organization validation
    if (!formData.organization_id) {
      errors.organization_id = 'Organización es requerida';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getAvailableRoles = () => {
    if (profile?.role === 'superadmin') {
      return USER_ROLES;
    }
    // Admin can create all roles except superadmin
    return USER_ROLES.filter(role => role.value !== 'admin');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <User className="h-6 w-6 mr-2 text-blue-600" />
          {mode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
        </h2>
        <p className="text-gray-600 mt-1">
          {mode === 'create' 
            ? 'Complete la información para crear un nuevo usuario en el sistema'
            : 'Modifique la información del usuario'
          }
        </p>
      </div>

      {/* Error Alert */}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-gray-600" />
            Información Personal
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  validationErrors.first_name ? 'border-red-300' : ''
                }`}
                placeholder="Ingrese el nombre"
              />
              {validationErrors.first_name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Apellido *
              </label>
              <input
                type="text"
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  validationErrors.last_name ? 'border-red-300' : ''
                }`}
                placeholder="Ingrese el apellido"
              />
              {validationErrors.last_name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.last_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-gray-600" />
            Información de Contacto
          </h3>
          
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  validationErrors.email ? 'border-red-300' : ''
                }`}
                placeholder="usuario@ejemplo.com"
                disabled={mode === 'edit'} // Email cannot be changed in edit mode
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  validationErrors.phone ? 'border-red-300' : ''
                }`}
                placeholder="+57 300 123 4567"
              />
              {validationErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Password Section (Create mode only) */}
        {mode === 'create' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-gray-600" />
              Credenciales de Acceso
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10 ${
                      validationErrors.password ? 'border-red-300' : ''
                    }`}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10 ${
                      validationErrors.confirmPassword ? 'border-red-300' : ''
                    }`}
                    placeholder="Repita la contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Role and Organization */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building2 className="h-5 w-5 mr-2 text-gray-600" />
            Rol y Organización
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Rol *
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {getAvailableRoles().map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organization_id" className="block text-sm font-medium text-gray-700">
                Organización *
              </label>
              {profile?.role === 'superadmin' ? (
                <select
                  id="organization_id"
                  value={formData.organization_id}
                  onChange={(e) => handleInputChange('organization_id', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    validationErrors.organization_id ? 'border-red-300' : ''
                  }`}
                >
                  <option value="">Seleccione una organización</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={organization?.name || 'Organización actual'}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
              )}
              {validationErrors.organization_id && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.organization_id}</p>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="mt-4">
            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Usuario activo
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Los usuarios inactivos no pueden acceder al sistema
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <X className="h-4 w-4 mr-2 inline" />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
