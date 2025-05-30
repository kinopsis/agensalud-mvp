'use client';

/**
 * Service Detail Page with Doctor Association Management
 * Admin interface for viewing service details and managing doctor associations
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Stethoscope,
  Users,
  Plus,
  Trash2,
  ArrowLeft,
  Clock,
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle,
  UserCheck
} from 'lucide-react';

interface Service {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Doctor {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  specialization: string | null;
  consultation_fee: number | null;
  is_available: boolean;
  organization_id: string;
}

interface AvailableDoctor {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  specialization: string | null;
  consultation_fee: number | null;
  is_available: boolean;
}

export default function ServiceDetailPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [associatedDoctors, setAssociatedDoctors] = useState<Doctor[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<AvailableDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Check permissions
  useEffect(() => {
    if (profile && profile.role && !['admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile && organization && serviceId && ['admin', 'superadmin'].includes(profile.role)) {
      fetchServiceDetails();
      fetchAssociatedDoctors();
      fetchAvailableDoctors();
    }
  }, [profile, organization, serviceId]);

  const fetchServiceDetails = async () => {
    try {
      const response = await fetch(`/api/services/${serviceId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch service details');
      }

      const result = await response.json();
      setService(result.service);
    } catch (err) {
      setError('Error al cargar detalles del servicio.');
      console.error('Error fetching service details:', err);
    }
  };

  const fetchAssociatedDoctors = async () => {
    try {
      const response = await fetch(`/api/services/${serviceId}/doctors`);
      if (!response.ok) {
        throw new Error('Failed to fetch associated doctors');
      }

      const result = await response.json();
      setAssociatedDoctors(result.doctors || []);
    } catch (err) {
      console.error('Error fetching associated doctors:', err);
    }
  };

  const fetchAvailableDoctors = async () => {
    try {
      if (!organization?.id) return;

      const response = await fetch(`/api/doctors?organizationId=${organization.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available doctors');
      }

      const result = await response.json();
      setAvailableDoctors(result.doctors || []);
    } catch (err) {
      console.error('Error fetching available doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async () => {
    if (!selectedDoctorId) {
      setError('Por favor selecciona un doctor.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/services/${serviceId}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: selectedDoctorId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to associate doctor');
      }

      setSuccess('Doctor asociado exitosamente al servicio.');
      setShowAddDoctor(false);
      setSelectedDoctorId('');
      await fetchAssociatedDoctors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asociar doctor.');
      console.error('Error adding doctor:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDoctor = async (doctorId: string) => {
    if (!confirm('¿Estás seguro de que quieres desasociar este doctor del servicio?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/services/${serviceId}/doctors?doctorId=${doctorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove doctor association');
      }

      setSuccess('Doctor desasociado exitosamente del servicio.');
      await fetchAssociatedDoctors();
    } catch (err) {
      setError('Error al desasociar doctor. Por favor intenta de nuevo.');
      console.error('Error removing doctor:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return 'Gratis';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getUnassociatedDoctors = () => {
    const associatedIds = new Set(associatedDoctors.map(d => d.profile_id));
    return availableDoctors.filter(doctor => !associatedIds.has(doctor.profile_id));
  };

  const actions = (
    <button
      type="button"
      onClick={() => router.push('/services')}
      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Volver a Servicios
    </button>
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

  if (loading) {
    return (
      <DashboardLayout title="Cargando..." actions={actions}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Cargando detalles del servicio...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!service) {
    return (
      <DashboardLayout title="Servicio no encontrado" actions={actions}>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Servicio no encontrado</h3>
          <p className="text-gray-600">El servicio solicitado no existe o no tienes permisos para verlo.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Servicio: ${service.name}`}
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

      {/* Service Details Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Stethoscope className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">{service.name}</h2>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              service.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {service.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {service.description && (
          <p className="text-gray-600 mb-4">{service.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Duración</p>
              <p className="font-medium">{formatDuration(service.duration_minutes)}</p>
            </div>
          </div>

          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Precio</p>
              <p className="font-medium">{formatPrice(service.price)}</p>
            </div>
          </div>

          {service.category && (
            <div className="flex items-center">
              <Tag className="h-5 w-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Categoría</p>
                <p className="font-medium">{service.category}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Associated Doctors Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Doctores Asociados ({associatedDoctors.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDoctor(true)}
            disabled={getUnassociatedDoctors().length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Asociar Doctor
          </button>
        </div>

        {associatedDoctors.length === 0 ? (
          <div className="p-6 text-center">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay doctores asociados</h3>
            <p className="text-gray-600 mb-4">
              Este servicio aún no tiene doctores asociados. Asocia doctores para que puedan ofrecer este servicio.
            </p>
            {getUnassociatedDoctors().length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddDoctor(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Asociar primer doctor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarifa
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
                {associatedDoctors.map((doctor) => (
                  <tr key={doctor.profile_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {doctor.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doctor.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {doctor.specialization || 'No especificada'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPrice(doctor.consultation_fee)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        doctor.is_available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {doctor.is_available ? 'Disponible' : 'No disponible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleRemoveDoctor(doctor.profile_id)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Desasociar doctor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Asociar Doctor al Servicio
              </h3>

              {getUnassociatedDoctors().length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">
                    Todos los doctores disponibles ya están asociados a este servicio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddDoctor(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Doctor
                    </label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Selecciona un doctor...</option>
                      {getUnassociatedDoctors().map(doctor => (
                        <option key={doctor.profile_id} value={doctor.profile_id}>
                          {doctor.name} - {doctor.specialization || 'Sin especialización'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDoctor(false);
                        setSelectedDoctorId('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDoctor}
                      disabled={!selectedDoctorId || actionLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                    >
                      {actionLoading ? 'Asociando...' : 'Asociar Doctor'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
