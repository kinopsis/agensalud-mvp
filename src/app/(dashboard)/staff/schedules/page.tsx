'use client';

/**
 * Staff Doctor Schedule Management Page
 * Interface for staff to manage doctor schedules within their organization
 * Provides comprehensive schedule management with multi-tenant isolation
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Save,
  X
} from 'lucide-react';

interface Doctor {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  specialization: string | null;
  is_available: boolean;
  organization_id: string;
}

interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
];

export default function StaffSchedulesPage() {
  const { profile } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Check permissions
  useEffect(() => {
    if (profile && profile.role && !['staff', 'admin', 'superadmin'].includes(profile.role)) {
      router.push('/dashboard');
      return;
    }
  }, [profile, router]);

  useEffect(() => {
    console.log('🔍 SCHEDULES DEBUG: useEffect triggered', {
      hasProfile: !!profile,
      profileRole: profile?.role,
      hasOrganization: !!organization,
      organizationId: organization?.id,
      organizationName: organization?.name,
      roleAllowed: profile?.role && ['staff', 'admin', 'superadmin'].includes(profile.role)
    });

    if (profile && organization && ['staff', 'admin', 'superadmin'].includes(profile.role)) {
      console.log('🔍 SCHEDULES DEBUG: Calling fetchDoctors()');
      fetchDoctors();
    } else {
      console.log('🔍 SCHEDULES DEBUG: Not calling fetchDoctors - missing requirements', {
        missingProfile: !profile,
        missingOrganization: !organization,
        invalidRole: profile?.role && !['staff', 'admin', 'superadmin'].includes(profile.role)
      });
    }
  }, [profile, organization]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchDoctorSchedules(selectedDoctor.id);
    }
  }, [selectedDoctor]);

  const fetchDoctors = async () => {
    try {
      console.log('🔍 SCHEDULES DEBUG: fetchDoctors() started');
      setLoading(true);
      setError(null);

      if (!organization?.id) {
        console.log('🔍 SCHEDULES DEBUG: No organization ID found');
        throw new Error('Organization not found');
      }

      const apiUrl = `/api/doctors?organizationId=${organization.id}`;
      console.log('🔍 SCHEDULES DEBUG: Making API call to:', apiUrl);

      const response = await fetch(apiUrl);
      console.log('🔍 SCHEDULES DEBUG: API response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const result = await response.json();
      console.log('🔍 SCHEDULES DEBUG: API response received:', {
        hasData: !!result.data,
        hasDoctors: !!result.doctors,
        dataType: typeof result.data,
        doctorsType: typeof result.doctors,
        dataLength: result.data?.length,
        doctorsLength: result.doctors?.length,
        fullResult: result
      });

      // ⚠️ PROBLEMA POTENCIAL: La API puede retornar 'data' pero el código busca 'doctors'
      const doctorsData = result.data || result.doctors || [];
      console.log('🔍 SCHEDULES DEBUG: Setting doctors data:', {
        doctorsCount: doctorsData.length,
        firstDoctor: doctorsData[0] || 'No doctors'
      });

      setDoctors(doctorsData);

      // Auto-select first doctor if available
      if (doctorsData && doctorsData.length > 0) {
        console.log('🔍 SCHEDULES DEBUG: Auto-selecting first doctor:', doctorsData[0]);
        setSelectedDoctor(doctorsData[0]);
      } else {
        console.log('🔍 SCHEDULES DEBUG: No doctors to auto-select');
      }
    } catch (err) {
      console.log('🔍 SCHEDULES DEBUG: Error in fetchDoctors:', err);
      setError('Error al cargar doctores. Por favor intenta de nuevo.');
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorSchedules = async (doctorId: string) => {
    try {
      setError(null);

      console.log('DEBUG: Fetching schedules for doctor ID:', doctorId);

      if (!doctorId || doctorId === 'undefined') {
        throw new Error('Doctor ID is undefined or invalid');
      }

      const response = await fetch(`/api/doctors/${doctorId}/schedule`);

      console.log('DEBUG: Schedule API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('DEBUG: Schedule API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch doctor schedules');
      }

      const result = await response.json();
      console.log('DEBUG: Schedule API result:', result);
      setSchedules(result.data || []);
    } catch (err) {
      setError('Error al cargar horarios del doctor.');
      console.error('Error fetching doctor schedules:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctor) {
      setError('Por favor selecciona un doctor');
      return;
    }

    // Validate time range
    if (formData.start_time >= formData.end_time) {
      setError('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }

    try {
      setFormLoading(true);
      setError(null);

      const url = editingSchedule
        ? `/api/doctors/${selectedDoctor.profile_id}/schedule/${editingSchedule.id}`
        : `/api/doctors/${selectedDoctor.profile_id}/schedule`;

      const method = editingSchedule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save schedule');
      }

      setSuccess(editingSchedule ? 'Horario actualizado exitosamente' : 'Horario creado exitosamente');
      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      await fetchDoctorSchedules(selectedDoctor.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar horario');
      console.error('Error saving schedule:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time.substring(0, 5), // Remove seconds
      end_time: schedule.end_time.substring(0, 5), // Remove seconds
      is_available: schedule.is_available,
      notes: schedule.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!selectedDoctor || !confirm('¿Estás seguro de que quieres eliminar este horario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/doctors/${selectedDoctor.profile_id}/schedule/${scheduleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setSuccess('Horario eliminado exitosamente');
      await fetchDoctorSchedules(selectedDoctor.profile_id);
    } catch (err) {
      setError('Error al eliminar horario. Por favor intenta de nuevo.');
      console.error('Error deleting schedule:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_available: true,
      notes: ''
    });
    setEditingSchedule(null);
  };

  const formatTime = (timeString: string) => {
    try {
      const time = timeString.substring(0, 5); // Get HH:MM
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(day => day.value === dayOfWeek)?.label || 'Desconocido';
  };

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSchedulesByDay = () => {
    const schedulesByDay: { [key: number]: DoctorSchedule[] } = {};
    schedules.forEach(schedule => {
      if (!schedulesByDay[schedule.day_of_week]) {
        schedulesByDay[schedule.day_of_week] = [];
      }
      schedulesByDay[schedule.day_of_week].push(schedule);
    });
    return schedulesByDay;
  };

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
      {selectedDoctor && (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Horario
        </button>
      )}
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
      title="Gestión de Horarios de Doctores"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Doctor</label>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o especialización..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctors List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Doctores ({filteredDoctors.length})
            </h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : filteredDoctors.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDoctors.map((doctor) => (
                  <button
                    type="button"
                    key={doctor.profile_id}
                    onClick={() => setSelectedDoctor(doctor)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedDoctor?.profile_id === doctor.profile_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    title={`Seleccionar doctor ${doctor.name}`}
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <UserCheck className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {doctor.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {doctor.specialization || 'Sin especialización'}
                        </div>
                      </div>
                      <div className={`h-2 w-2 rounded-full ${
                        doctor.is_available ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay doctores disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Management */}
        <div className="lg:col-span-2">
          {selectedDoctor ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Horarios de {selectedDoctor.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedDoctor.specialization || 'Sin especialización'}
                </p>
              </div>
              <div className="p-6">
                {schedules.length > 0 ? (
                  <div className="space-y-4">
                    {DAYS_OF_WEEK.map((day) => {
                      const daySchedules = getSchedulesByDay()[day.value] || [];
                      return (
                        <div key={day.value} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{day.label}</h4>
                            {daySchedules.length === 0 && (
                              <span className="text-sm text-gray-500">Sin horarios</span>
                            )}
                          </div>
                          {daySchedules.length > 0 ? (
                            <div className="space-y-2">
                              {daySchedules.map((schedule) => (
                                <div key={schedule.id} className="flex items-center justify-between bg-gray-50 rounded-md p-3">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-900">
                                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                    </span>
                                    <span className={`ml-3 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                      schedule.is_available
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {schedule.is_available ? 'Disponible' : 'No disponible'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(schedule)}
                                      className="text-gray-600 hover:text-gray-900"
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(schedule.id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No hay horarios configurados para este día
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay horarios configurados</h3>
                    <p className="text-gray-600 mb-4">
                      Este doctor aún no tiene horarios configurados.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setShowForm(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Configurar primer horario
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un Doctor</h3>
                <p className="text-gray-600">
                  Selecciona un doctor de la lista para gestionar sus horarios.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSchedule ? 'Editar Horario' : 'Nuevo Horario'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSchedule(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Cerrar formulario"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día de la Semana *
                  </label>
                  <select
                    required
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    title="Seleccionar día de la semana"
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Inicio *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      title="Seleccionar hora de inicio"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Fin *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      title="Seleccionar hora de fin"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Notas adicionales sobre este horario..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                    Doctor disponible en este horario
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingSchedule(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 flex items-center"
                  >
                    {formLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingSchedule ? 'Actualizar' : 'Crear'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
