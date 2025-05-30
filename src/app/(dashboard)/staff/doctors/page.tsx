'use client';

/**
 * Staff Doctor Management Page
 * Allows Staff role to manage doctor availability and schedules per PRD2.md Section 5.5
 * Provides read-only doctor information with availability management capabilities
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Users,
  Calendar,
  Clock,
  Eye,
  Settings,
  Shield,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Activity,
  Phone,
  Mail,
  MapPin,
  Stethoscope
} from 'lucide-react';

interface Doctor {
  id: string;
  profile_id: string;
  specialization: string;
  consultation_fee?: number;
  is_available: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  total_appointments?: number;
  upcoming_appointments?: number;
  availability_status?: 'available' | 'busy' | 'offline';
}

export default function StaffDoctorsPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    busy: 0,
    offline: 0
  });

  // Check permissions - Only Staff, Admin, and SuperAdmin
  useEffect(() => {
    if (profile && profile.role && !['staff', 'admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile && organization?.id) {
      fetchDoctors();
    }
  }, [profile, organization]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/doctors?organizationId=${organization?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const result = await response.json();
      const doctorsData = result.doctors || [];
      setDoctors(doctorsData);

      // Calculate stats
      const total = doctorsData.length;
      const available = doctorsData.filter((d: Doctor) => d.is_available).length;
      const offline = doctorsData.filter((d: Doctor) => !d.is_available).length;
      
      setStats({ 
        total, 
        available, 
        busy: 0, // TODO: Calculate based on current appointments
        offline 
      });
    } catch (err) {
      setError('Error al cargar doctores. Por favor intenta de nuevo.');
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityToggle = async (doctorId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/staff/doctors/${doctorId}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update doctor availability');
      }

      await fetchDoctors(); // Refresh the list
    } catch (err) {
      setError('Error al actualizar disponibilidad. Por favor intenta de nuevo.');
      console.error('Error updating doctor availability:', err);
    }
  };

  const getAvailabilityColor = (isAvailable: boolean) => {
    return isAvailable 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const actions = (
    <div className="text-sm text-gray-600">
      <span className="flex items-center">
        <Activity className="h-4 w-4 mr-1" />
        Gestión de Disponibilidad
      </span>
    </div>
  );

  if (!profile || !profile.role || !['staff', 'admin', 'superadmin'].includes(profile.role)) {
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
      title="Gestión de Doctores"
      subtitle={`${organization?.name} • Disponibilidad y Horarios`}
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
              <p className="text-sm font-medium text-gray-600">Total Doctores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Disponibles</p>
              <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ocupados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.busy}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">No Disponibles</p>
              <p className="text-2xl font-bold text-gray-900">{stats.offline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Doctores ({doctors.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona la disponibilidad y horarios de los doctores
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Cargando doctores...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-6 text-center">
            <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay doctores</h3>
            <p className="text-gray-600">
              Aún no hay doctores registrados en esta organización.
            </p>
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
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disponibilidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            Dr. {doctor.profiles.first_name} {doctor.profiles.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{doctor.profiles.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{doctor.specialization}</div>
                      {doctor.consultation_fee && (
                        <div className="text-sm text-gray-500">
                          ${doctor.consultation_fee.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {doctor.profiles.phone && (
                          <div className="flex items-center mb-1">
                            <Phone className="h-3 w-3 text-gray-400 mr-1" />
                            {doctor.profiles.phone}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 text-gray-400 mr-1" />
                          {doctor.profiles.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getAvailabilityColor(doctor.is_available)}`}>
                        {doctor.is_available ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Disponible
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            No Disponible
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/staff/doctors/${doctor.id}/schedule`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Gestionar horarios"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAvailabilityToggle(doctor.id, doctor.is_available)}
                          className={`${
                            doctor.is_available
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={doctor.is_available ? 'Marcar como no disponible' : 'Marcar como disponible'}
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/staff/doctors/${doctor.id}`)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
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
