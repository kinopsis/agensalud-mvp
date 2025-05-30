'use client';

/**
 * Calendar Page
 * Integrated calendar view for appointment management
 * Role-based functionality and multi-view support
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import Calendar, { CalendarAppointment, CalendarView } from '@/components/calendar/Calendar';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Calendar as CalendarIcon,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  User,
  Stethoscope
} from 'lucide-react';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

export default function CalendarPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filters, setFilters] = useState({
    doctor: '',
    service: '',
    status: ''
  });

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !profile)) {
      router.push('/auth/login');
      return;
    }

    if (organization?.id) {
      loadInitialData();
    }
  }, [user, profile, organization, authLoading, router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load doctors and services for filters
      await Promise.all([
        loadDoctors(),
        loadServices()
      ]);

    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Error al cargar los datos del calendario');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await fetch(`/api/doctors?organizationId=${organization!.id}`);
      if (!response.ok) throw new Error('Failed to fetch doctors');
      
      const data = await response.json();
      setDoctors(data.data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch(`/api/services?organizationId=${organization!.id}`);
      if (!response.ok) throw new Error('Failed to fetch services');
      
      const data = await response.json();
      setServices(data.data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (currentView !== 'day') {
      setCurrentView('day');
    }
  };

  const handleAppointmentSelect = (appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment);
    // Could open a modal or navigate to appointment details
  };

  const handleTimeSlotSelect = (date: Date, time: string) => {
    // Navigate to booking page with pre-selected date and time
    const dateStr = date.toISOString().split('T')[0];
    router.push(`/appointments/book?date=${dateStr}&time=${time}`);
  };

  const handleNewAppointment = () => {
    router.push('/appointments/book');
  };

  const handleEditAppointment = () => {
    if (selectedAppointment) {
      router.push(`/appointments/${selectedAppointment.id}/edit`);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment) return;

    if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
      try {
        const response = await fetch(`/api/appointments/${selectedAppointment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });

        if (response.ok) {
          setSelectedAppointment(null);
          // Refresh calendar data
          window.location.reload();
        } else {
          alert('Error al cancelar la cita');
        }
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Error al cancelar la cita');
      }
    }
  };

  // Determine calendar permissions based on role
  const canBook = ['admin', 'staff', 'doctor', 'superadmin'].includes(profile?.role || '');
  const showAvailability = ['admin', 'staff', 'doctor', 'superadmin'].includes(profile?.role || '');
  const doctorFilter = profile?.role === 'doctor' ? profile.id : filters.doctor;

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Calendario" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Calendario" subtitle="Error">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const actions = (
    <div className="flex items-center space-x-3">
      {/* Filters Toggle */}
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className={`px-3 py-2 text-sm font-medium rounded-md border ${
          showFilters 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Filter className="h-4 w-4 mr-2 inline" />
        Filtros
      </button>

      {/* New Appointment */}
      {canBook && (
        <button
          type="button"
          onClick={handleNewAppointment}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cita
        </button>
      )}
    </div>
  );

  return (
    <DashboardLayout
      title="Calendario"
      subtitle="Gestión de citas y disponibilidad"
      actions={actions}
    >
      <div className="space-y-6">
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Doctor Filter */}
              {profile?.role !== 'doctor' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Doctor
                  </label>
                  <select
                    value={filters.doctor}
                    onChange={(e) => setFilters({ ...filters, doctor: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Todos los doctores</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Service Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Servicio
                </label>
                <select
                  value={filters.service}
                  onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Todos los servicios</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Component */}
        <Calendar
          view={currentView}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onAppointmentSelect={handleAppointmentSelect}
          onTimeSlotSelect={handleTimeSlotSelect}
          doctorId={doctorFilter}
          showAvailability={showAvailability}
          allowBooking={canBook}
          className="min-h-[600px]"
        />

        {/* Selected Appointment Details */}
        {selectedAppointment && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Detalles de la Cita</h3>
              <div className="flex items-center space-x-2">
                {canBook && (
                  <>
                    <button
                      type="button"
                      onClick={handleEditAppointment}
                      className="text-blue-600 hover:text-blue-700 p-2"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAppointment}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Paciente:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {selectedAppointment.patient_name}
                  </span>
                </div>
                <div className="flex items-center">
                  <Stethoscope className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Doctor:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    Dr. {selectedAppointment.doctor_name}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Horario:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {selectedAppointment.start_time} - {selectedAppointment.end_time}
                  </span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Servicio:</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    {selectedAppointment.service_name}
                  </span>
                </div>
              </div>
            </div>

            {selectedAppointment.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">Notas:</span>
                <p className="text-sm text-gray-900 mt-1">{selectedAppointment.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
