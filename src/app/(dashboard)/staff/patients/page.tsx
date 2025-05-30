'use client';

/**
 * Enhanced Staff Patient Management Page
 * Advanced patient management capabilities for staff role
 * Includes patient registration, medical history, appointment history, and communication tools
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
  Eye,
  Phone,
  Mail,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Download,
  Upload,
  MoreVertical,
  Clock,
  MapPin
} from 'lucide-react';

interface Patient {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  allergies: string | null;
  medications: string | null;
  insurance_provider: string | null;
  insurance_number: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  last_appointment?: string;
  total_appointments?: number;
  status: 'active' | 'inactive';
}

interface PatientFilters {
  search: string;
  status: string;
  gender: string;
  ageRange: string;
  hasInsurance: string;
  lastAppointment: string;
}

export default function StaffPatientsPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [filters, setFilters] = useState<PatientFilters>({
    search: '',
    status: '',
    gender: '',
    ageRange: '',
    hasInsurance: '',
    lastAppointment: ''
  });

  // Check permissions
  useEffect(() => {
    if (profile && profile.role && !['staff', 'admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    console.log('🔍 STAFF PATIENTS DEBUG: useEffect triggered', {
      hasProfile: !!profile,
      profileRole: profile?.role,
      hasOrganization: !!organization,
      organizationId: organization?.id,
      organizationName: organization?.name,
      roleAllowed: profile?.role && ['staff', 'admin', 'superadmin'].includes(profile.role),
      filters
    });

    if (profile && organization && ['staff', 'admin', 'superadmin'].includes(profile.role)) {
      console.log('🔍 STAFF PATIENTS DEBUG: Calling fetchPatients()');
      fetchPatients();
    } else {
      console.log('🔍 STAFF PATIENTS DEBUG: Not calling fetchPatients - missing requirements', {
        missingProfile: !profile,
        missingOrganization: !organization,
        invalidRole: profile?.role && !['staff', 'admin', 'superadmin'].includes(profile.role)
      });
    }
  }, [profile, organization, filters]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!organization?.id) {
        throw new Error('Organization not found');
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        organizationId: organization.id,
        limit: '50'
      });

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.gender) queryParams.append('gender', filters.gender);
      if (filters.hasInsurance) queryParams.append('hasInsurance', filters.hasInsurance);
      if (filters.lastAppointment) queryParams.append('lastAppointment', filters.lastAppointment);

      const response = await fetch(`/api/patients?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }

      const result = await response.json();
      console.log('🔍 STAFF PATIENTS DEBUG: API response received', {
        hasData: !!result.data,
        hasPatients: !!result.patients,
        dataLength: result.data?.length,
        patientsLength: result.patients?.length,
        fullResult: result
      });

      // Handle both data formats for compatibility
      const patientsData = result.data || result.patients || [];
      console.log('🔍 STAFF PATIENTS DEBUG: Setting patients data', {
        patientsCount: patientsData.length,
        firstPatient: patientsData[0] ? `${patientsData[0].first_name} ${patientsData[0].last_name}` : 'No patients'
      });

      setPatients(patientsData);
    } catch (err) {
      setError('Error al cargar pacientes. Por favor intenta de nuevo.');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  const handleNewPatient = () => {
    setShowNewPatientForm(true);
  };

  const handleExportPatients = async () => {
    try {
      const response = await fetch(`/api/patients/export?organizationId=${organization?.id}`);
      if (!response.ok) {
        throw new Error('Failed to export patients');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `patients-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      setSuccess('Pacientes exportados exitosamente');
    } catch (err) {
      setError('Error al exportar pacientes');
      console.error('Error exporting patients:', err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificado';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return 'No especificado';
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} años`;
    } catch {
      return 'No especificado';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      default:
        return status;
    }
  };

  const filteredPatients = patients.filter(patient => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      if (!fullName.includes(searchTerm) &&
          !patient.email.toLowerCase().includes(searchTerm) &&
          !patient.phone?.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    if (filters.status && patient.status !== filters.status) {
      return false;
    }

    if (filters.gender && patient.gender !== filters.gender) {
      return false;
    }

    if (filters.hasInsurance) {
      const hasInsurance = patient.insurance_provider && patient.insurance_number;
      if (filters.hasInsurance === 'yes' && !hasInsurance) return false;
      if (filters.hasInsurance === 'no' && hasInsurance) return false;
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
        onClick={handleExportPatients}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </button>
      <button
        type="button"
        onClick={handleNewPatient}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nuevo Paciente
      </button>
    </>
  );

  if (!profile || !profile.role || !['staff', 'admin', 'superadmin'].includes(profile.role)) {
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
      title="Gestión Avanzada de Pacientes"
      subtitle={`Organización: ${organization?.name} • ${filteredPatients.length} pacientes`}
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

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros Avanzados</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nombre, email o teléfono..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                title="Filtrar por estado del paciente"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Género</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                title="Filtrar por género del paciente"
              >
                <option value="">Todos los géneros</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seguro Médico</label>
              <select
                value={filters.hasInsurance}
                onChange={(e) => setFilters({ ...filters, hasInsurance: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                title="Filtrar por seguro médico"
              >
                <option value="">Todos</option>
                <option value="yes">Con seguro</option>
                <option value="no">Sin seguro</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setFilters({
                search: '',
                status: '',
                gender: '',
                ageRange: '',
                hasInsurance: '',
                lastAppointment: ''
              })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Patients Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pacientes</dt>
                  <dd className="text-lg font-medium text-gray-900">{patients.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pacientes Activos</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {patients.filter(p => p.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Con Seguro</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {patients.filter(p => p.insurance_provider && p.insurance_number).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Nuevos (30 días)</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {patients.filter(p => {
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return new Date(p.created_at) > thirtyDaysAgo;
                    }).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Pacientes ({filteredPatients.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredPatients.length > 0 ? (
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
                    Edad/Género
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seguro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Cita
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {patient.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.email}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        {patient.phone ? (
                          <>
                            <Phone className="h-3 w-3 mr-1" />
                            {patient.phone}
                          </>
                        ) : (
                          'Sin teléfono'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {calculateAge(patient.date_of_birth)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {patient.gender === 'male' ? 'Masculino' :
                         patient.gender === 'female' ? 'Femenino' :
                         patient.gender === 'other' ? 'Otro' : 'No especificado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.insurance_provider ? (
                        <div className="text-sm text-gray-900">
                          <div>{patient.insurance_provider}</div>
                          <div className="text-gray-500">{patient.insurance_number}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Sin seguro</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(patient.status)}`}>
                        {getStatusLabel(patient.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.last_appointment ? (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(patient.last_appointment)}
                        </div>
                      ) : (
                        'Sin citas'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handlePatientClick(patient)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowNewPatientForm(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {patient.phone && (
                          <a
                            href={`tel:${patient.phone}`}
                            className="text-green-600 hover:text-green-900"
                            title="Llamar"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        <a
                          href={`mailto:${patient.email}`}
                          className="text-purple-600 hover:text-purple-900"
                          title="Enviar email"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pacientes</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status || filters.gender || filters.hasInsurance
                ? 'No se encontraron pacientes que coincidan con los filtros aplicados.'
                : 'Aún no hay pacientes registrados en esta organización.'}
            </p>
            {!filters.search && !filters.status && !filters.gender && !filters.hasInsurance && (
              <button
                type="button"
                onClick={handleNewPatient}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Registrar primer paciente
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
