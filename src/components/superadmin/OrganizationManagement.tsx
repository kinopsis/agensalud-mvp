'use client';

/**
 * OrganizationManagement Component
 * Advanced organization management for SuperAdmin
 * 
 * @description Comprehensive CRUD operations for organizations with detailed analytics
 */

import React, { useState, useEffect } from 'react';
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
  Activity,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  MoreVertical
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription_plan: string;
  users_count: number;
  appointments_count: number;
  created_at: string;
  last_activity: string;
  monthly_revenue?: number;
  growth_rate?: number;
}

interface OrganizationStats {
  totalRevenue: number;
  averageUsers: number;
  totalAppointments: number;
  activeOrganizations: number;
  growthRate: number;
}

interface OrganizationManagementProps {
  className?: string;
}

/**
 * OrganizationManagement Component
 * 
 * @param className - Additional CSS classes
 */
export default function OrganizationManagement({ className = '' }: OrganizationManagementProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Fetch organizations data
   */
  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/superadmin/organizations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err.message : 'Error loading organizations');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch organization statistics
   */
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/superadmin/organizations/stats');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching organization stats:', err);
    }
  };

  /**
   * Handle organization status change
   */
  const handleStatusChange = async (organizationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/superadmin/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization status');
      }

      // Refresh organizations list
      await fetchOrganizations();
    } catch (err) {
      console.error('Error updating organization status:', err);
      setError('Error al actualizar el estado de la organización');
    }
  };

  /**
   * Handle organization deletion
   */
  const handleDelete = async (organizationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta organización? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/superadmin/organizations/${organizationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete organization');
      }

      // Refresh organizations list
      await fetchOrganizations();
    } catch (err) {
      console.error('Error deleting organization:', err);
      setError('Error al eliminar la organización');
    }
  };

  /**
   * Filter organizations based on search and status
   */
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  /**
   * Get status color classes
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    fetchOrganizations();
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Organizaciones Activas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeOrganizations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Promedio Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Citas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Crecimiento</p>
                <p className="text-2xl font-bold text-gray-900">{stats.growthRate}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-indigo-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Gestión de Organizaciones
            </h2>
            <button
              onClick={() => window.location.href = '/superadmin/organizations/new'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Organización
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar organizaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
                <option value="suspended">Suspendidas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Organizations List */}
        <div className="divide-y divide-gray-200">
          {filteredOrganizations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron organizaciones</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando tu primera organización'
                }
              </p>
            </div>
          ) : (
            filteredOrganizations.map((org) => (
              <div key={org.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900">{org.name}</h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(org.status)}`}>
                            {org.status === 'active' ? 'Activa' : org.status === 'inactive' ? 'Inactiva' : 'Suspendida'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{org.email}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{org.users_count} usuarios</span>
                          <Calendar className="h-3 w-3 ml-3 mr-1" />
                          <span>{org.appointments_count} citas</span>
                          <Clock className="h-3 w-3 ml-3 mr-1" />
                          <span>Creada: {formatDate(org.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedOrganization(org);
                        setShowDetails(true);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => window.location.href = `/superadmin/organizations/${org.id}/edit`}
                      className="text-gray-400 hover:text-gray-600"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(org.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
