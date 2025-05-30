'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { upsertDoctorSchedule } from '@/app/api/appointments/actions'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Clock, Save, Shield, AlertCircle, CheckCircle, Calendar } from 'lucide-react'

interface DoctorSchedule {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
]

export default function DoctorSchedulePage() {
  const { profile } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadDoctorData()
  }, [profile])

  const loadDoctorData = async () => {
    if (!profile || profile.role !== 'doctor') {
      setError('Acceso denegado. Solo los doctores pueden gestionar horarios.')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Get doctor record
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', profile.id)
        .single()

      if (doctorError || !doctorData) {
        throw new Error('Registro de doctor no encontrado')
      }

      setDoctorId(doctorData.id)

      // Load existing schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .order('day_of_week')

      if (schedulesError) {
        throw new Error('Error cargando horarios')
      }

      // Initialize schedules for all days
      const initialSchedules: DoctorSchedule[] = DAYS_OF_WEEK.map(day => {
        const existingSchedule = schedulesData?.find(s => s.day_of_week === day.value)
        return existingSchedule || {
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '17:00',
          is_available: false
        }
      })

      setSchedules(initialSchedules)
    } catch (err) {
      console.error('Error loading doctor data:', err)
      setError(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScheduleChange = (dayOfWeek: number, field: keyof DoctorSchedule, value: any) => {
    setSchedules(prev => prev.map(schedule =>
      schedule.day_of_week === dayOfWeek
        ? { ...schedule, [field]: value }
        : schedule
    ))
  }

  const handleSaveSchedule = async (dayOfWeek: number) => {
    if (!doctorId) return

    const schedule = schedules.find(s => s.day_of_week === dayOfWeek)
    if (!schedule) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await upsertDoctorSchedule({
        doctor_id: doctorId,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_available: schedule.is_available
      })

      if (result.success) {
        setSuccess(`Horario de ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label} guardado exitosamente`)
        // Update the schedule with the returned data
        setSchedules(prev => prev.map(s =>
          s.day_of_week === dayOfWeek
            ? { ...s, id: result.data.id }
            : s
        ))
      } else {
        setError(result.error || 'Error guardando horario')
      }
    } catch (err) {
      setError('Error guardando horario')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAllSchedules = async () => {
    if (!doctorId) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const promises = schedules.map(schedule =>
        upsertDoctorSchedule({
          doctor_id: doctorId,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_available: schedule.is_available
        })
      )

      const results = await Promise.all(promises)
      const hasError = results.some(result => !result.success)

      if (hasError) {
        setError('Error guardando algunos horarios')
      } else {
        setSuccess('Todos los horarios guardados exitosamente')
        // Update schedules with returned data
        results.forEach((result, index) => {
          if (result.success && schedules[index]) {
            setSchedules(prev => prev.map(s =>
              s.day_of_week === schedules[index]!.day_of_week
                ? { ...s, id: result.data.id }
                : s
            ))
          }
        })
      }
    } catch (err) {
      setError('Error guardando horarios')
    } finally {
      setIsSaving(false)
    }
  }

  const actions = (
    <button
      type="button"
      onClick={handleSaveAllSchedules}
      disabled={isSaving}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
    >
      <Save className="h-4 w-4 mr-2" />
      {isSaving ? 'Guardando...' : 'Guardar Todo'}
    </button>
  );

  if (isLoading) {
    return (
      <DashboardLayout title="Gestión de Horarios" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando horarios...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role !== 'doctor') {
    return (
      <DashboardLayout title="Acceso Denegado">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-600">Solo los doctores pueden acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Gestión de Horarios"
      subtitle={`Configuración de disponibilidad • Dr. ${profile?.first_name} ${profile?.last_name}`}
      actions={actions}
    >
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">

          {/* Alerts */}
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          {success && (
            <div className="mx-6 mt-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Éxito</h3>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Grid */}
          <div className="px-6 py-6">
            <div className="space-y-6">
              {DAYS_OF_WEEK.map((day) => {
                const schedule = schedules.find(s => s.day_of_week === day.value)
                if (!schedule) return null

                return (
                  <div key={day.value} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{day.label}</h3>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={schedule.is_available}
                            onChange={(e) => handleScheduleChange(day.value, 'is_available', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Disponible</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSaveSchedule(day.value)}
                          disabled={isSaving}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                          title={`Guardar horario de ${day.label}`}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>

                    {schedule.is_available && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hora de inicio
                          </label>
                          <input
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) => handleScheduleChange(day.value, 'start_time', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            title={`Hora de inicio para ${day.label}`}
                            aria-label={`Hora de inicio para ${day.label}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hora de fin
                          </label>
                          <input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => handleScheduleChange(day.value, 'end_time', e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            title={`Hora de fin para ${day.label}`}
                            aria-label={`Hora de fin para ${day.label}`}
                          />
                        </div>
                      </div>
                    )}

                    {!schedule.is_available && (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No disponible este día</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Instructions */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Instrucciones:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Marca "Disponible" para los días que quieres trabajar</li>
                <li>• Configura las horas de inicio y fin para cada día</li>
                <li>• Los pacientes podrán agendar citas en intervalos de 30 minutos dentro de tu horario</li>
                <li>• Puedes guardar cada día individualmente o todos a la vez</li>
                <li>• Los cambios se aplicarán inmediatamente para nuevas citas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
