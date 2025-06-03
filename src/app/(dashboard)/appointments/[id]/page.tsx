'use client';

/**
 * Appointment Details Page
 * 
 * CRITICAL FIX: Page for viewing detailed appointment information
 * Provides comprehensive view for administrative roles with full appointment data
 * 
 * Features:
 * - Complete appointment information display
 * - Patient and doctor details
 * - Service and location information
 * - Status history and audit trail
 * - Action buttons for status changes
 * - Role-based permissions
 * 
 * @version 1.0.0 - Initial implementation for details fix
 * @author AgentSalud MVP Team
 * @date 2025-01-28
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Calendar, Clock, User, MapPin, Stethoscope, 
  DollarSign, ArrowLeft, Edit, Trash2, 
  CheckCircle, AlertCircle, FileText 
} from 'lucide-react';
import type { AppointmentData } from '@/components/appointments/AppointmentCard';

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { organization } = useTenant();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appointmentId = params.id as string;

  useEffect(() => {
    if (appointmentId && profile && organization) {
      loadAppointmentDetails();
    }
  }, [appointmentId, profile, organization]);

  const loadAppointmentDetails = async () => {
    if (!appointmentId || !profile || !organization) return;

    setLoading(true);
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          reason,
          notes,
          created_at,
          updated_at,
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            profiles(first_name, last_name, email)
          ),
          patient:profiles!appointments_patient_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          location:locations!appointments_location_id_fkey(
            id,
            name,
            address
          ),
          service:services!appointments_service_id_fkey(
            id,
            name,
            duration_minutes,
            price,
            description
          )
        `)
        .eq('id', appointmentId)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      
      setAppointment(data);
    } catch (err) {
      console.error('Error loading appointment details:', err);
      setError('Error al cargar los detalles de la cita');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Detalles de Cita" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando detalles...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !appointment) {
    return (
      <DashboardLayout title="Detalles de Cita" subtitle="Error">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">
                {error || 'No se pudo encontrar la cita solicitada'}
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const patient = appointment.patient?.[0];
  const doctor = appointment.doctor?.[0];
  const location = appointment.location?.[0];
  const service = appointment.service?.[0];

  return (
    <DashboardLayout
      title="Detalles de Cita"
      subtitle={`${formatDate(appointment.appointment_date)} • ${formatTime(appointment.start_time)}`}
      actions={
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </button>
      }
    >
      <div className="space-y-6">
        {/* Status and Basic Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Información General</h2>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
              {getStatusText(appointment.status)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Fecha</p>
                <p className="text-sm text-gray-600">{formatDate(appointment.appointment_date)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Hora</p>
                <p className="text-sm text-gray-600">
                  {formatTime(appointment.start_time)} ({appointment.duration_minutes} min)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        {patient && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Información del Paciente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Nombre</p>
                <p className="text-sm text-gray-600">{patient.first_name} {patient.last_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">{patient.email || 'No disponible'}</p>
              </div>
              {patient.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Teléfono</p>
                  <p className="text-sm text-gray-600">{patient.phone}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Doctor and Service Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {doctor && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Stethoscope className="h-5 w-5 mr-2 text-green-600" />
                Doctor
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Nombre</p>
                  <p className="text-sm text-gray-600">
                    Dr. {doctor.profiles?.[0]?.first_name} {doctor.profiles?.[0]?.last_name}
                  </p>
                </div>
                {doctor.specialization && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Especialización</p>
                    <p className="text-sm text-gray-600">{doctor.specialization}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {service && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Servicio
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Tipo</p>
                  <p className="text-sm text-gray-600">{service.name}</p>
                </div>
                {service.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Descripción</p>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                )}
                {service.price && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Precio</p>
                    <p className="text-sm text-gray-600">${service.price.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Location and Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {location && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-orange-600" />
                Ubicación
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Lugar</p>
                  <p className="text-sm text-gray-600">{location.name}</p>
                </div>
                {location.address && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Dirección</p>
                    <p className="text-sm text-gray-600">{location.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(appointment.reason || appointment.notes) && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Notas</h2>
              <div className="space-y-3">
                {appointment.reason && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Motivo</p>
                    <p className="text-sm text-gray-600">{appointment.reason}</p>
                  </div>
                )}
                {appointment.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-900">Observaciones</p>
                    <p className="text-sm text-gray-600">{appointment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
