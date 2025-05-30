'use client';

/**
 * SuperAdmin Organizations Management Page
 * CRUD operations for organization management with system-wide oversight
 * Provides comprehensive organization administration for SuperAdmin users
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Calendar,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  MapPin,
  Phone,
  Mail,
  Settings
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
  appointment_count: number;
  subscription_plan?: string;
  subscription_status?: string;
}

interface OrganizationFilters {
  status: string;
  plan: string;
  search: string;
}

export default function SuperAdminOrganizationsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrganizationFilters>({
    status: '',
    plan: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  // Check SuperAdmin permissions
  useEffect(() => {
    if (profile && profile.role && profile.role !== 'superadmin') {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      fetchOrganizations();
    }
  }, [profile, filters]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.plan) params.append('plan', filters.plan);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/superadmin/organizations?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const result = await response.json();
      setOrganizations(result.data || []);
    } catch (err) {
      setError('Error al cargar organizaciones. Por favor intenta de nuevo.');
      console.error('Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationAction = async (action: string, orgId: string) => {
    try {
      const response = await fetch(`/api/superadmin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} organization`);
      }

      await fetchOrganizations(); // Refresh the list
    } catch (err) {
      setError(`Error al ${action} organización. Por favor intenta de nuevo.`);
      console.error(`Error ${action} organization:`, err);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getPlanColor = (plan: string) => {
    const colors = {
      basic: 'bg-gray-100 text-gray-800',
      professional: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredOrganizations = organizations.filter(org => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        org.name.toLowerCase().includes(searchTerm) ||
        org.slug.toLowerCase().includes(searchTerm) ||
        org.email?.toLowerCase().includes(searchTerm)
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
        onClick={() => router.push('/superadmin/organizations/new')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nueva Organización
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
      title="Gestión de Organizaciones"
      subtitle="Administración del sistema completo"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
              <select
                value={filters.plan}
                onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos los planes</option>
                <option value="basic">Básico</option>
                <option value="professional">Profesional</option>
                <option value="enterprise">Empresarial</option>
              </select>
            </div>
            <div>
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

      {/* Organizations Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Organizaciones ({filteredOrganizations.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Cargando organizaciones...</p>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="p-6 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay organizaciones</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status || filters.plan
                ? 'No se encontraron organizaciones con los filtros aplicados.'
                : 'Aún no hay organizaciones registradas.'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/superadmin/organizations/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Crear primera organización
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
            {filteredOrganizations.map((org) => (
              <div key={org.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-lg font-medium text-gray-900">{org.name}</h4>
                      <p className="text-sm text-gray-500">@{org.slug}</p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.is_active)}`}>
                    {org.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {org.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{org.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  {org.email && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="h-4 w-4 mr-2" />
                      {org.email}
                    </div>
                  )}
                  {org.phone && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-2" />
                      {org.phone}
                    </div>
                  )}
                  {org.city && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      {org.city}, {org.country}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {org.user_count} usuarios
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {org.appointment_count} citas
                  </div>
                </div>

                {org.subscription_plan && (
                  <div className="mb-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanColor(org.subscription_plan)}`}>
                      Plan {org.subscription_plan}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Creada: {formatDate(org.created_at)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/superadmin/organizations/${org.id}/edit`)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/superadmin/organizations/${org.id}/settings`)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Configuración"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOrganizationAction(org.is_active ? 'deactivate' : 'activate', org.id)}
                      className={`${
                        org.is_active
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      }`}
                      title={org.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {org.is_active ? <Trash2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
