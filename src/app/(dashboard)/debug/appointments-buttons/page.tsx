'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useTenant } from '@/contexts/tenant-context'

/**
 * DEBUG PAGE FOR APPOINTMENT BUTTONS
 * Esta página permite verificar visualmente que los botones de gestión
 * se muestran correctamente para diferentes roles y estados de citas
 */

interface MockAppointment {
  id: string
  appointment_date: string
  start_time: string
  status: string
  patient: Array<{ id: string; first_name: string; last_name: string }>
  doctor: Array<{ profiles: Array<{ first_name: string; last_name: string }> }>
}

export default function AppointmentButtonsDebugPage() {
  const { profile } = useAuth()
  const { organization } = useTenant()
  const [debugResults, setDebugResults] = useState<any[]>([])

  // Mock appointments for testing
  const mockAppointments: MockAppointment[] = [
    {
      id: 'apt-future-confirmed',
      appointment_date: '2025-06-15',
      start_time: '10:00:00',
      status: 'confirmed',
      patient: [{ id: 'patient-123', first_name: 'Juan', last_name: 'Pérez' }],
      doctor: [{ profiles: [{ first_name: 'Ana', last_name: 'García' }] }]
    },
    {
      id: 'apt-future-pending',
      appointment_date: '2025-06-16',
      start_time: '14:00:00',
      status: 'pending',
      patient: [{ id: 'patient-123', first_name: 'Juan', last_name: 'Pérez' }],
      doctor: [{ profiles: [{ first_name: 'Carlos', last_name: 'López' }] }]
    },
    {
      id: 'apt-past-confirmed',
      appointment_date: '2025-01-15',
      start_time: '10:00:00',
      status: 'confirmed',
      patient: [{ id: 'patient-123', first_name: 'Juan', last_name: 'Pérez' }],
      doctor: [{ profiles: [{ first_name: 'Ana', last_name: 'García' }] }]
    },
    {
      id: 'apt-future-cancelled',
      appointment_date: '2025-06-17',
      start_time: '11:00:00',
      status: 'cancelled',
      patient: [{ id: 'patient-123', first_name: 'Juan', last_name: 'Pérez' }],
      doctor: [{ profiles: [{ first_name: 'Ana', last_name: 'García' }] }]
    },
    {
      id: 'apt-other-patient',
      appointment_date: '2025-06-18',
      start_time: '15:00:00',
      status: 'confirmed',
      patient: [{ id: 'patient-456', first_name: 'María', last_name: 'López' }],
      doctor: [{ profiles: [{ first_name: 'Ana', last_name: 'García' }] }]
    }
  ]

  // Permission functions (copied from appointments page)
  const canCancelAppointment = (appointment: MockAppointment) => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    const isFuture = appointmentDateTime > now

    const cancellableStatuses = ['scheduled', 'confirmed', 'pending']
    const isStatusCancellable = cancellableStatuses.includes(appointment.status)

    let hasPermission = false

    if (profile?.role === 'patient') {
      hasPermission = appointment.patient[0]?.id === profile.id
    } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
      hasPermission = true
    } else if (profile?.role === 'superadmin') {
      hasPermission = true
    }

    return isFuture && isStatusCancellable && hasPermission
  }

  const canRescheduleAppointment = (appointment: MockAppointment) => {
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    const isFuture = appointmentDateTime > now

    const reschedulableStatuses = ['scheduled', 'confirmed', 'pending']
    const isStatusReschedulable = reschedulableStatuses.includes(appointment.status)

    let hasPermission = false

    if (profile?.role === 'patient') {
      hasPermission = appointment.patient[0]?.id === profile.id
    } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
      hasPermission = true
    } else if (profile?.role === 'superadmin') {
      hasPermission = true
    }

    return isFuture && isStatusReschedulable && hasPermission
  }

  const canChangeStatus = (appointment: MockAppointment) => {
    return profile?.role && ['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)
  }

  useEffect(() => {
    if (profile) {
      const results = mockAppointments.map(appointment => ({
        appointment,
        canCancel: canCancelAppointment(appointment),
        canReschedule: canRescheduleAppointment(appointment),
        canChangeStatus: canChangeStatus(appointment)
      }))
      setDebugResults(results)
    }
  }, [profile])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'no_show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'scheduled':
        return 'Programada'
      case 'confirmed':
        return 'Confirmada'
      case 'cancelled':
        return 'Cancelada'
      case 'completed':
        return 'Completada'
      case 'no_show':
        return 'No asistió'
      default:
        return status
    }
  }

  if (!profile) {
    return <div>Cargando perfil de usuario...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Debug: Botones de Gestión de Citas
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">Información del Usuario</h2>
          <p><strong>ID:</strong> {profile.id}</p>
          <p><strong>Rol:</strong> {profile.role}</p>
          <p><strong>Organización:</strong> {organization?.name || 'N/A'}</p>
        </div>
      </div>

      <div className="space-y-4">
        {debugResults.map((result, index) => (
          <div key={result.appointment.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Cita #{index + 1}: {result.appointment.id}
                </h3>
                <p className="text-sm text-gray-600">
                  {result.appointment.appointment_date} a las {result.appointment.start_time}
                </p>
                <p className="text-sm text-gray-600">
                  Paciente: {result.appointment.patient[0]?.first_name} {result.appointment.patient[0]?.last_name}
                </p>
                <p className="text-sm text-gray-600">
                  Doctor: Dr. {result.appointment.doctor[0]?.profiles[0]?.first_name} {result.appointment.doctor[0]?.profiles[0]?.last_name}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.appointment.status)}`}>
                {getStatusText(result.appointment.status)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <strong>Permisos:</strong>
                  <span className={`ml-2 ${result.canCancel ? 'text-green-600' : 'text-red-600'}`}>
                    Cancelar: {result.canCancel ? '✅' : '❌'}
                  </span>
                  <span className={`ml-2 ${result.canReschedule ? 'text-green-600' : 'text-red-600'}`}>
                    Reagendar: {result.canReschedule ? '✅' : '❌'}
                  </span>
                  <span className={`ml-2 ${result.canChangeStatus ? 'text-green-600' : 'text-red-600'}`}>
                    Cambiar Estado: {result.canChangeStatus ? '✅' : '❌'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Status Change Dropdown */}
                {result.canChangeStatus && (
                  <select
                    value={result.appointment.status}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                    disabled
                  >
                    <option value="pending">Pendiente</option>
                    <option value="scheduled">Programada</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="completed">Completada</option>
                    <option value="no_show">No asistió</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Reschedule Button */}
                  {result.canReschedule && (
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      title="Reagendar cita"
                      onClick={() => alert(`Reagendar cita ${result.appointment.id}`)}
                    >
                      Reagendar
                    </button>
                  )}

                  {/* Cancel Button */}
                  {result.canCancel && (
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                      title="Cancelar cita"
                      onClick={() => alert(`Cancelar cita ${result.appointment.id}`)}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Resumen de Resultados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <strong>Total de citas:</strong> {debugResults.length}
          </div>
          <div>
            <strong>Pueden cancelarse:</strong> {debugResults.filter(r => r.canCancel).length}
          </div>
          <div>
            <strong>Pueden reagendarse:</strong> {debugResults.filter(r => r.canReschedule).length}
          </div>
          <div>
            <strong>Pueden cambiar estado:</strong> {debugResults.filter(r => r.canChangeStatus).length}
          </div>
        </div>
      </div>
    </div>
  )
}
