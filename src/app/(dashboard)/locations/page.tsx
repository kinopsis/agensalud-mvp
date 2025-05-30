'use client';

/**
 * Locations Management Page
 * Admin interface for managing organization locations/sedes
 * Provides CRUD operations with proper multi-tenant isolation
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Building
} from 'lucide-react';

interface Location {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  operating_hours: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LocationFilters {
  city: string;
  status: string;
  search: string;
}

interface LocationFormData {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  description: string;
  is_active: boolean;
}

export default function LocationsPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<LocationFilters>({
    city: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    description: '',
    is_active: true
  });
  const [formLoading, setFormLoading] = useState(false);

  // Check permissions
  useEffect(() => {
    if (profile && profile.role && !['admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile && organization && ['admin', 'superadmin'].includes(profile.role)) {
      fetchLocations();
    }
  }, [profile, organization, filters]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!organization?.id) {
        throw new Error('Organization not found');
      }

      const params = new URLSearchParams();
      params.append('organizationId', organization.id);
      if (filters.city) params.append('city', filters.city);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/locations?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const result = await response.json();
      setLocations(result.locations || []);
    } catch (err) {
      setError('Error al cargar ubicaciones. Por favor intenta de nuevo.');
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) {
      setError('Organization not found');
      return;
    }

    try {
      setFormLoading(true);
      setError(null);

      const url = editingLocation
        ? `/api/locations/${editingLocation.id}`
        : '/api/locations';

      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organization_id: organization.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save location');
      }

      setSuccess(editingLocation ? 'Ubicación actualizada exitosamente' : 'Ubicación creada exitosamente');
      setShowForm(false);
      setEditingLocation(null);
      resetForm();
      await fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar ubicación');
      console.error('Error saving location:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      city: location.city || '',
      postal_code: location.postal_code || '',
      phone: location.phone || '',
      email: location.email || '',
      description: location.description || '',
      is_active: location.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta ubicación?')) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      setSuccess('Ubicación eliminada exitosamente');
      await fetchLocations();
    } catch (err) {
      setError('Error al eliminar ubicación. Por favor intenta de nuevo.');
      console.error('Error deleting location:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: '',
      description: '',
      is_active: true
    });
    setEditingLocation(null);
  };

  const getUniqueCities = () => {
    const cities = locations
      .map(location => location.city)
      .filter((city): city is string => city !== null && city !== '');
    return [...new Set(cities)].sort();
  };

  const filteredLocations = locations.filter(location => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        location.name.toLowerCase().includes(searchTerm) ||
        location.address.toLowerCase().includes(searchTerm) ||
        location.city?.toLowerCase().includes(searchTerm) ||
        location.description?.toLowerCase().includes(searchTerm)
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
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nueva Ubicación
      </button>
    </>
  );

  if (!profile || !profile.role || !['admin', 'superadmin'].includes(profile.role)) {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Gestión de Ubicaciones"
      subtitle={`Organización: ${organization?.name}`}
      actions={actions}
    >
      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todas las ciudades</option>
                {getUniqueCities().map(city => (
                  <option key={city} value={city}>{city}</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar ubicaciones..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Ubicación *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Ej: Sede Principal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Dirección completa..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Ciudad"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="12345"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="+34 123 456 789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="sede@ejemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Descripción adicional..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Ubicación activa
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingLocation(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  >
                    {formLoading ? 'Guardando...' : (editingLocation ? 'Actualizar' : 'Crear')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Locations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Ubicaciones ({filteredLocations.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Cargando ubicaciones...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="p-6 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ubicaciones</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.city || filters.status
                ? 'No se encontraron ubicaciones con los filtros aplicados.'
                : 'Aún no hay ubicaciones registradas.'}
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Crear primera ubicación
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
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
                {filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {location.name}
                          </div>
                          {location.description && (
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {location.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{location.address}</div>
                      {location.city && (
                        <div className="text-sm text-gray-500">
                          {location.city}{location.postal_code && `, ${location.postal_code}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {location.phone && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {location.phone}
                          </div>
                        )}
                        {location.email && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-3 w-3 mr-1 text-gray-400" />
                            {location.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        location.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {location.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/locations/${location.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(location)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(location.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
