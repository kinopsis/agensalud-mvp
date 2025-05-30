'use client';

/**
 * Users Management Page
 * Role-based user management for Admin and SuperAdmin users
 * Provides CRUD operations with proper multi-tenant isolation
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'doctor' | 'staff' | 'patient' | 'superadmin';
  organization_id: string;
  organization_name?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_active: boolean;
}

interface UserFilters {
  role: string;
  organization: string;
  status: string;
  search: string;
}

export default function UsersPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    role: '',
    organization: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Check permissions
  useEffect(() => {
    if (profile && profile.role && !['admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile && profile.role && ['admin', 'superadmin'].includes(profile.role)) {
      fetchUsers();
    }
  }, [profile, organization, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (organization?.id && profile?.role === 'admin') {
        params.append('organizationId', organization.id);
      }
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.organization && profile?.role === 'superadmin') {
        params.append('organizationId', filters.organization);
      }

      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      setUsers(result.data || []);
    } catch (err) {
      setError('Error al cargar usuarios. Por favor intenta de nuevo.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: string, userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      await fetchUsers(); // Refresh the list
    } catch (err) {
      setError(`Error al ${action} usuario. Por favor intenta de nuevo.`);
      console.error(`Error ${action} user:`, err);
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      superadmin: 'bg-red-100 text-red-800',
      admin: 'bg-blue-100 text-blue-800',
      doctor: 'bg-green-100 text-green-800',
      staff: 'bg-yellow-100 text-yellow-800',
      patient: 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      doctor: 'Doctor',
      staff: 'Personal',
      patient: 'Paciente'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        user.first_name?.toLowerCase().includes(searchTerm) ||
        user.last_name?.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  const actions = (
    <>
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filtros
      </button>
      <button
        type="button"
        onClick={() => router.push('/users/new')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Nuevo Usuario
      </button>
    </>
  );

  if (!profile || !profile.role || !['admin', 'superadmin'].includes(profile.role)) {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Gestión de Usuarios"
      subtitle={profile.role === 'superadmin' ? 'Sistema completo' : `Organización: ${organization?.name}`}
      actions={actions}
    >
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

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos los roles</option>
                <option value="admin">Administrador</option>
                <option value="doctor">Doctor</option>
                <option value="staff">Personal</option>
                <option value="patient">Paciente</option>
                {profile.role === 'superadmin' && (
                  <option value="superadmin">Super Admin</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Usuarios ({filteredUsers.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.role || filters.status
                ? 'No se encontraron usuarios con los filtros aplicados.'
                : 'Aún no hay usuarios registrados.'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/users/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Crear primer usuario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  {profile.role === 'superadmin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organización
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último acceso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    {profile.role === 'superadmin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.organization_name || 'Sin organización'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_sign_in_at || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/users/${user.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/users/${user.id}/edit`)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user.role !== 'superadmin' && (
                          <button
                            type="button"
                            onClick={() => handleUserAction(user.is_active ? 'deactivate' : 'activate', user.id)}
                            className={`${
                              user.is_active
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={user.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {user.is_active ? <Trash2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
