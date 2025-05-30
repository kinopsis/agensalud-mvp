'use client';

/**
 * Patients Management Page
 * Patient management functionality for Staff, Admin, and Doctor users
 * Provides comprehensive patient administration with appointment history
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
// import AuthDebugPanel from '@/components/debug/AuthDebugPanel';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  UserPlus,
  Shield,
  AlertCircle,
  CheckCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Activity,
  FileText,
  Heart
} from 'lucide-react';

interface Patient {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  created_at: string;
  last_appointment?: string;
  total_appointments: number;
  upcoming_appointments: number;
  is_active: boolean;
}

interface PatientFilters {
  status: string;
  search: string;
  ageRange: string;
  lastVisit: string;
}

export default function PatientsPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PatientFilters>({
    status: '',
    search: '',
    ageRange: '',
    lastVisit: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    newThisMonth: 0,
    withUpcomingAppointments: 0
  });

  // Check permissions
  useEffect(() => {
    if (profile && profile.role && !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    console.log('🔍 PATIENTS DEBUG: useEffect triggered', {
      hasProfile: !!profile,
      profileRole: profile?.role,
      hasOrganization: !!organization,
      organizationId: organization?.id,
      organizationName: organization?.name,
      filters
    });

    if (profile && organization?.id) {
      console.log('🔍 PATIENTS DEBUG: Calling fetchPatients()');
      fetchPatients();
    } else {
      console.log('🔍 PATIENTS DEBUG: Not calling fetchPatients - missing requirements', {
        missingProfile: !profile,
        missingOrgId: !organization?.id
      });
    }
  }, [profile, organization, filters]);

  const fetchPatients = async () => {
    try {
      console.log('🔍 PATIENTS DEBUG: fetchPatients() started');
      setLoading(true);
      setError(null);

      // Validate authentication and organization
      if (!profile) {
        console.log('🔍 PATIENTS DEBUG: No profile found');
        setError('Usuario no autenticado. Por favor inicia sesión nuevamente.');
        return;
      }

      if (!organization?.id) {
        console.log('🔍 PATIENTS DEBUG: No organization ID found');
        setError('Organización no encontrada. Por favor contacta al administrador.');
        return;
      }

      console.log('🔍 PATIENTS DEBUG: Fetching patients with:', {
        profile: { id: profile.id, email: profile.email, role: profile.role },
        organization: { id: organization.id, name: organization.name }
      });

      const params = new URLSearchParams();
      params.append('organizationId', organization.id);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.ageRange) params.append('ageRange', filters.ageRange);
      if (filters.lastVisit) params.append('lastVisit', filters.lastVisit);

      const apiUrl = `/api/patients?${params.toString()}`;
      console.log('🔍 PATIENTS DEBUG: Making API call to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 PATIENTS DEBUG: API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 PATIENTS DEBUG: API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || 'Unknown error',
          url: apiUrl
        });
        throw new Error(`Failed to fetch patients: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('🔍 PATIENTS DEBUG: API response received:', {
        hasData: !!result.data,
        dataType: typeof result.data,
        dataLength: result.data?.length,
        fullResult: result
      });

      const patientsData = result.data || [];
      console.log('🔍 PATIENTS DEBUG: Setting patients data:', {
        patientsCount: patientsData.length,
        firstPatient: patientsData[0] || 'No patients',
        firstPatientStructure: patientsData[0] ? Object.keys(patientsData[0]) : 'No patient to analyze',
        firstPatientName: patientsData[0] ? `${patientsData[0].first_name} ${patientsData[0].last_name}` : 'No name available'
      });

      setPatients(patientsData);

      // Calculate stats
      const total = result.data?.length || 0;
      const active = result.data?.filter((p: Patient) => p.is_active).length || 0;
      const newThisMonth = result.data?.filter((p: Patient) => {
        const createdDate = new Date(p.created_at);
        const now = new Date();
        return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
      }).length || 0;
      const withUpcomingAppointments = result.data?.filter((p: Patient) => p.upcoming_appointments > 0).length || 0;

      setStats({ total, active, newThisMonth, withUpcomingAppointments });
    } catch (err) {
      setError('Error al cargar pacientes. Por favor intenta de nuevo.');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientAction = async (action: string, patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} patient`);
      }

      await fetchPatients(); // Refresh the list
    } catch (err) {
      setError(`Error al ${action} paciente. Por favor intenta de nuevo.`);
      console.error(`Error ${action} patient:`, err);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} años`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getLastVisitStatus = (lastAppointment: string) => {
    if (!lastAppointment) return { label: 'Sin citas', color: 'text-gray-500' };

    const daysSince = Math.floor((Date.now() - new Date(lastAppointment).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince <= 30) return { label: 'Reciente', color: 'text-green-600' };
    if (daysSince <= 90) return { label: 'Regular', color: 'text-blue-600' };
    if (daysSince <= 180) return { label: 'Hace tiempo', color: 'text-yellow-600' };
    return { label: 'Inactivo', color: 'text-red-600' };
  };

  const filteredPatients = patients.filter(patient => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        patient.first_name?.toLowerCase().includes(searchTerm) ||
        patient.last_name?.toLowerCase().includes(searchTerm) ||
        patient.email.toLowerCase().includes(searchTerm) ||
        patient.phone?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  // Debug log for filtering
  console.log('🔍 PATIENTS DEBUG: Filtering results:', {
    totalPatients: patients.length,
    filteredPatients: filteredPatients.length,
    activeFilters: {
      search: !!filters.search,
      status: !!filters.status,
      ageRange: !!filters.ageRange,
      lastVisit: !!filters.lastVisit
    },
    firstFilteredPatient: filteredPatients[0] ? `${filteredPatients[0].first_name} ${filteredPatients[0].last_name}` : 'No filtered patients'
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
        onClick={() => router.push('/patients/new')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Nuevo Paciente
      </button>
    </>
  );

  if (!profile || !profile.role || !['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)) {
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
      title="Gestión de Pacientes"
      subtitle={`${organization?.name} • ${stats.total} pacientes registrados`}
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
              <p className="text-sm font-medium text-gray-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pacientes Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <UserPlus className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Nuevos Este Mes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Con Citas Próximas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withUpcomingAppointments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Rango de Edad</label>
              <select
                value={filters.ageRange}
                onChange={(e) => setFilters({ ...filters, ageRange: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todas las edades</option>
                <option value="0-18">0-18 años</option>
                <option value="19-35">19-35 años</option>
                <option value="36-50">36-50 años</option>
                <option value="51-65">51-65 años</option>
                <option value="65+">65+ años</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Última Visita</label>
              <select
                value={filters.lastVisit}
                onChange={(e) => setFilters({ ...filters, lastVisit: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Cualquier fecha</option>
                <option value="30d">Últimos 30 días</option>
                <option value="90d">Últimos 90 días</option>
                <option value="180d">Últimos 6 meses</option>
                <option value="1y">Último año</option>
                <option value="never">Sin citas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patients Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Pacientes ({filteredPatients.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Cargando pacientes...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pacientes</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status || filters.ageRange || filters.lastVisit
                ? 'No se encontraron pacientes con los filtros aplicados.'
                : 'Aún no hay pacientes registrados.'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/patients/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Registrar primer paciente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Edad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Citas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Visita
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
                {filteredPatients.map((patient) => {
                  const lastVisitStatus = getLastVisitStatus(patient.last_appointment || '');
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Heart className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.first_name} {patient.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{patient.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.phone && (
                            <div className="flex items-center mb-1">
                              <Phone className="h-3 w-3 text-gray-400 mr-1" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.city && (
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                              {patient.city}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateAge(patient.date_of_birth || '')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Total: {patient.total_appointments}
                        </div>
                        {patient.upcoming_appointments > 0 && (
                          <div className="text-sm text-blue-600">
                            Próximas: {patient.upcoming_appointments}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${lastVisitStatus.color}`}>
                          {lastVisitStatus.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(patient.last_appointment || '')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          patient.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {patient.is_active ? (
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
                            onClick={() => router.push(`/patients/${patient.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/patients/${patient.id}/edit`)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/appointments/book?patientId=${patient.id}`)}
                            className="text-green-600 hover:text-green-900"
                            title="Agendar cita"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/patients/${patient.id}/history`)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Historial médico"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
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

      {/* Debug Panel - Temporary for investigation */}
      {/* <AuthDebugPanel /> */}
    </DashboardLayout>
  );
}
