'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useTenant } from '@/contexts/tenant-context'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import UnifiedAppointmentFlow from '@/components/appointments/UnifiedAppointmentFlow'
import { AlertMessage } from '@/components/appointments/shared'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function BookAppointmentPage() {
  const { user, profile } = useAuth()
  const { organization } = useTenant()
  const [success, setSuccess] = useState<string | null>(null)
  const [showFlow, setShowFlow] = useState(true)

  // Handle successful appointment booking
  const handleAppointmentBooked = (appointmentId: string) => {
    setShowFlow(false)
    setSuccess('¡Cita agendada exitosamente! Recibirás una confirmación por email.')
  }

  // Handle flow cancellation
  const handleCancel = () => {
    window.history.back()
  }

  const actions = (
    <button
      type="button"
      onClick={handleCancel}
      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Volver
    </button>
  );

  return (
    <DashboardLayout
      title="Agendar Cita"
      subtitle={`Nueva cita médica • ${organization?.name || ''}`}
      actions={actions}
    >
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        {success && (
          <AlertMessage
            type="success"
            title="¡Éxito!"
            message={success}
            className="mb-6"
          />
        )}

        {/* Show Unified Flow or Success State */}
        {showFlow && organization && profile ? (
          <UnifiedAppointmentFlow
            organizationId={organization.id}
            userId={profile.id}
            patientName={profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : undefined}
            onAppointmentBooked={handleAppointmentBooked}
            onCancel={handleCancel}
            mode="manual"
          />
        ) : !showFlow ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Cita Agendada Exitosamente!
            </h2>
            <p className="text-gray-600 mb-6">
              Tu cita ha sido confirmada. Recibirás un email con los detalles.
            </p>
            <div className="space-x-4">
              <button
                type="button"
                onClick={() => window.location.href = '/appointments'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                Ver Mis Citas
              </button>
              <button
                type="button"
                onClick={() => setShowFlow(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                Agendar Otra Cita
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600">Cargando...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
