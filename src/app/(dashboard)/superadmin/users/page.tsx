'use client';

/**
 * SuperAdmin Users Management Page
 * System-wide user administration for SuperAdmin users
 * Provides comprehensive user management across all organizations
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
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
  Clock,
  Building2,
  Mail,
  Phone,
  Calendar,
  Activity
} from 'lucide-react';

interface SystemUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'doctor' | 'staff' | 'patient' | 'superadmin';
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  created_at: string;
  last_sign_in_at?: string;
  is_active: boolean;
  phone?: string;
  appointment_count?: number;
  last_activity?: string;
}

interface UserFilters {
  role: string;
  organization: string;
  status: string;
  search: string;
  activity: string;
}

export default function SuperAdminUsersPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    role: '',
    organization: '',
    status: '',
    search: '',
    activity: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    byRole: {} as Record<string, number>,
    byOrganization: {} as Record<string, number>
  });

  // Check SuperAdmin permissions
  useEffect(() => {
    if (profile && profile.role && profile.role !== 'superadmin') {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      fetchUsers();
      fetchOrganizations();
    }
  }, [profile, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.role) params.append('role', filters.role);
      if (filters.organization) params.append('organizationId', filters.organization);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.activity) params.append('activity', filters.activity);

      const response = await fetch(`/api/superadmin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      setUsers(result.data || []);

      // Calculate stats
      const total = result.data?.length || 0;
      const active = result.data?.filter((u: SystemUser) => u.is_active).length || 0;
      const byRole = result.data?.reduce((acc: Record<string, number>, user: SystemUser) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}) || {};
      const byOrganization = result.data?.reduce((acc: Record<string, number>, user: SystemUser) => {
        acc[user.organization_name] = (acc[user.organization_name] || 0) + 1;
        return acc;
      }, {}) || {};

      setStats({ total, active, byRole, byOrganization });
    } catch (err) {
      setError('Error al cargar usuarios. Por favor intenta de nuevo.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/superadmin/organizations?limit=100');
      if (response.ok) {
        const result = await response.json();
        setOrganizations(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const handleUserAction = async (action: string, userId: string) => {
    try {
      const response = await fetch(`/api/superadmin/users/${userId}`, {
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

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      const response = await fetch('/api/superadmin/users/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userIds: selectedUsers })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} users`);
      }

      setSelectedUsers([]);
      await fetchUsers(); // Refresh the list
    } catch (err) {
      setError(`Error al ${action} usuarios. Por favor intenta de nuevo.`);
      console.error(`Error ${action} users:`, err);
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

  const getActivityStatus = (lastSignIn: string) => {
    if (!lastSignIn) return { label: 'Nunca', color: 'text-gray-500' };

    const daysSince = Math.floor((Date.now() - new Date(lastSignIn).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince === 0) return { label: 'Hoy', color: 'text-green-600' };
    if (daysSince <= 7) return { label: `${daysSince}d`, color: 'text-blue-600' };
    if (daysSince <= 30) return { label: `${daysSince}d`, color: 'text-yellow-600' };
    return { label: `${daysSince}d`, color: 'text-red-600' };
  };

  const filteredUsers = users.filter(user => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        user.first_name?.toLowerCase().includes(searchTerm) ||
        user.last_name?.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.organization_name.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  const actions = (
    <>
      {selectedUsers.length > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{selectedUsers.length} seleccionados</span>
          <button
            type="button"
            onClick={() => handleBulkAction('activate')}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            Activar
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('deactivate')}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Desactivar
          </button>
        </div>
      )}
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
        onClick={() => router.push('/superadmin/users/new')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Nuevo Usuario
      </button>
    </>
  );

  if (!profile || !profile.role || profile.role !== 'superadmin') {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">Solo los SuperAdmins pueden acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Gestión de Usuarios del Sistema"
      subtitle="Administración de usuarios en todas las organizaciones"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Organizaciones</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byOrganization).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doctores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byRole.doctor || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos los roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Administrador</option>
                <option value="doctor">Doctor</option>
                <option value="staff">Personal</option>
                <option value="patient">Paciente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organización</label>
              <select
                value={filters.organization}
                onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todas las organizaciones</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Actividad</label>
              <select
                value={filters.activity}
                onChange={(e) => setFilters({ ...filters, activity: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Toda actividad</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="inactive">Inactivos 30+ días</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar..."
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
            Usuarios del Sistema ({filteredUsers.length})
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
              {filters.search || filters.role || filters.status || filters.organization
                ? 'No se encontraron usuarios con los filtros aplicados.'
                : 'Aún no hay usuarios registrados en el sistema.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organización
                  </th>
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
                {filteredUsers.map((user) => {
                  const activity = getActivityStatus(user.last_sign_in_at || '');
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.organization_name}</div>
                        <div className="text-sm text-gray-500">@{user.organization_slug}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${activity.color}`}>
                          {activity.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(user.last_sign_in_at || '')}
                        </div>
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
                            onClick={() => router.push(`/superadmin/users/${user.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/superadmin/users/${user.id}/edit`)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
