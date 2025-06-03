'use client'

import * as React from 'react'
const { useState, useEffect } = React
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useTenant } from '@/contexts/tenant-context'
// Removed direct import of server actions - will use API routes instead
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import AppointmentCard, { type AppointmentData } from '@/components/appointments/AppointmentCard'
import { getAppointmentCardForRole } from '@/components/appointments/cards/factory'
import AppointmentTabs, {
  type TabType,
  filterAppointmentsByTab,
  useAppointmentTabs,
  EmptyTabMessage
} from '@/components/appointments/AppointmentTabs'
import DateGroupHeader from '@/components/appointments/DateGroupHeader'
import AIEnhancedRescheduleModal from '@/components/appointments/AIEnhancedRescheduleModal'
import CancelAppointmentModal from '@/components/appointments/CancelAppointmentModal'
import AppointmentStatsCards from '@/components/appointments/AppointmentStatsCards'
import { groupAppointmentsByDate, getSortedGroupKeys, getDateHeader } from '@/utils/dateGrouping'
import { Calendar, Plus, Filter, AlertCircle } from 'lucide-react'
import AppointmentsErrorBoundary from '@/components/error-boundary/AppointmentsErrorBoundary'
import {
  useIsClient,
  useClientDate,
  useHydrationSafeNavigation,
  useTimeCalculation,
  useAppointmentStatus,
  HydrationSafe
} from '@/utils/hydration-safe'

// Use the AppointmentData type from the component
type Appointment = AppointmentData;

function AppointmentsPageContent() {
  // Defensive check for React hooks availability
  if (typeof useState !== 'function') {
    throw new Error('React hooks are not available. This might be a module loading issue.');
  }

  const { user, profile } = useAuth()
  const { organization } = useTenant()
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hydration-safe hooks
  const isClient = useIsClient()
  const currentDate = useClientDate()
  const { navigateTo } = useHydrationSafeNavigation()

  // Initialize tab based on URL parameter 'view' for backward compatibility
  const getInitialTab = (): TabType => {
    const viewParam = searchParams.get('view')
    if (viewParam === 'history') return 'historial'
    return 'vigentes' // default
  }

  // Use the custom hook for tab management with user role support
  const { activeTab, handleTabChange } = useAppointmentTabs(getInitialTab(), profile?.role)

  // Modal states
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
  }>({ isOpen: false, appointment: null })

  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
  }>({ isOpen: false, appointment: null })

  useEffect(() => {
    if (isClient) {
      loadAppointments()
    }
  }, [profile, organization, isClient])

  const loadAppointments = async () => {
    if (!profile || !organization) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          reason,
          notes,
          doctor:doctors!appointments_doctor_id_fkey(
            id,
            specialization,
            profiles(first_name, last_name)
          ),
          patient:profiles!appointments_patient_id_fkey(
            id,
            first_name,
            last_name
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
            price
          )
        `)
        .eq('organization_id', organization.id)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      // Filter based on user role
      if (profile.role === 'patient') {
        // Use profile.id directly as patient_id (appointments.patient_id references profiles.id)
        query = query.eq('patient_id', profile.id)
      } else if (profile.role === 'doctor') {
        // Get doctor record first
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('id')
          .eq('profile_id', profile.id)
          .single()

        if (doctorError || !doctorData) {
          setAppointments([])
          return
        }

        query = query.eq('doctor_id', doctorData.id)
      }

      // Load all appointments - filtering will be done in frontend by tabs

      const { data, error } = await query

      if (error) throw error

      // Debug: Log appointment data structure to identify doctor name issue
      if (data && data.length > 0) {
        console.log('🔍 DEBUG - Appointments data structure:', {
          totalAppointments: data.length,
          firstAppointment: data[0],
          doctorStructure: data[0]?.doctor,
          doctorProfiles: data[0]?.doctor?.[0]?.profiles,
          doctorFirstName: data[0]?.doctor?.[0]?.profiles?.[0]?.first_name,
          doctorLastName: data[0]?.doctor?.[0]?.profiles?.[0]?.last_name
        });
      }

      setAppointments(data || [])
    } catch (err) {
      console.error('Error loading appointments:', err)
      setError('Error al cargar las citas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAppointment = (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (appointment) {
      setCancelModal({ isOpen: true, appointment })
    }
  }

  const handleRescheduleAppointment = (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (appointment) {
      setRescheduleModal({ isOpen: true, appointment })
    }
  }

  // Modal handlers
  const handleConfirmCancellation = async (appointmentId: string, reason: string, customReason?: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      })

      const result = await response.json()

      if (result.success) {
        // Store cancellation analytics
        await storeCancellationAnalytics(appointmentId, reason, customReason)

        setCancelModal({ isOpen: false, appointment: null })
        loadAppointments() // Reload appointments
        setError(null) // Clear any previous errors
      } else {
        setError(result.error || 'Error al cancelar la cita')
      }
    } catch (err) {
      setError('Error al cancelar la cita')
    }
  }

  const storeCancellationAnalytics = async (appointmentId: string, reason: string, customReason?: string) => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId)
      if (!appointment || !profile || !organization) return

      const supabase = createClient()
      await supabase.from('appointment_analytics').insert({
        appointment_id: appointmentId,
        organization_id: organization.id,
        action_type: 'cancelled',
        reason_category: reason,
        reason_text: customReason || null,
        original_date: appointment.appointment_date,
        original_time: appointment.start_time,
        user_id: profile.id,
        user_role: profile.role,
        time_to_action: currentDate ? `${Math.floor((currentDate.getTime() - new Date(appointment.appointment_date).getTime()) / (1000 * 60 * 60 * 24))} days` : '0 days'
      })
    } catch (error) {
      console.error('Error storing cancellation analytics:', error)
      // Don't throw error to avoid disrupting the cancellation flow
    }
  }

  const handleConfirmReschedule = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_date: newDate,
          start_time: newTime
        })
      })

      const result = await response.json()

      if (result.success) {
        // Store reschedule analytics
        await storeRescheduleAnalytics(appointmentId, newDate, newTime)

        setRescheduleModal({ isOpen: false, appointment: null })
        loadAppointments() // Reload appointments
        setError(null) // Clear any previous errors
      } else {
        setError(result.error || 'Error al reagendar la cita')
      }
    } catch (err) {
      setError('Error al reagendar la cita')
    }
  }

  const storeRescheduleAnalytics = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      const appointment = appointments.find(apt => apt.id === appointmentId)
      if (!appointment || !profile || !organization) return

      const supabase = createClient()
      await supabase.from('appointment_analytics').insert({
        appointment_id: appointmentId,
        organization_id: organization.id,
        action_type: 'rescheduled',
        original_date: appointment.appointment_date,
        original_time: appointment.start_time,
        new_date: newDate,
        new_time: newTime,
        user_id: profile.id,
        user_role: profile.role,
        time_to_action: currentDate ? `${Math.floor((currentDate.getTime() - new Date(appointment.appointment_date).getTime()) / (1000 * 60 * 60 * 24))} days` : '0 days'
      })
    } catch (error) {
      console.error('Error storing reschedule analytics:', error)
      // Don't throw error to avoid disrupting the reschedule flow
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      const result = await response.json()

      if (result.success) {
        loadAppointments() // Reload appointments
      } else {
        setError(result.error || 'Error al actualizar la cita')
      }
    } catch (err) {
      setError('Error al actualizar la cita')
    }
  }

  // 🔧 CRITICAL FIX: Add missing onViewDetails handler
  const handleViewDetails = (appointmentId: string) => {
    console.log('👁️ Viewing appointment details:', appointmentId);

    // Navigate to appointment details page using hydration-safe navigation
    navigateTo(`/appointments/${appointmentId}`);
  }

  // Status functions moved to AppointmentCard component

  const canCancelAppointment = (appointment: Appointment) => {
    // Check if appointment is in the future using hydration-safe date
    if (!currentDate) return false; // Can't determine status without current date

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const isFuture = appointmentDateTime > currentDate

    // Check if status allows cancellation (simplified states)
    const cancellableStatuses = ['confirmed', 'pending']
    const isStatusCancellable = cancellableStatuses.includes(appointment.status)

    // Check user permissions
    let hasPermission = false

    if (profile?.role === 'patient') {
      // For patients: appointments are already filtered by patient_id = profile.id in loadAppointments()
      // So if the appointment is loaded, the patient owns it and has permission
      hasPermission = true
    } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
      // Admin, staff, and doctors can cancel appointments in their organization
      hasPermission = true // Already filtered by organization in query
    } else if (profile?.role === 'superadmin') {
      // SuperAdmin can cancel any appointment
      hasPermission = true
    }

    return isFuture && isStatusCancellable && hasPermission
  }

  const canRescheduleAppointment = (appointment: Appointment) => {
    // Check if appointment is in the future using hydration-safe date
    if (!currentDate) return false; // Can't determine status without current date

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const isFuture = appointmentDateTime > currentDate

    // Check if status allows rescheduling (simplified states)
    const reschedulableStatuses = ['confirmed', 'pending']
    const isStatusReschedulable = reschedulableStatuses.includes(appointment.status)

    // Check user permissions (same as cancellation)
    let hasPermission = false

    if (profile?.role === 'patient') {
      // For patients: appointments are already filtered by patient_id = profile.id in loadAppointments()
      // So if the appointment is loaded, the patient owns it and has permission
      hasPermission = true
    } else if (['admin', 'staff', 'doctor'].includes(profile?.role || '')) {
      hasPermission = true
    } else if (profile?.role === 'superadmin') {
      hasPermission = true
    }

    return isFuture && isStatusReschedulable && hasPermission
  }

  const canChangeStatus = (appointment: Appointment) => {
    return profile?.role && ['admin', 'staff', 'doctor', 'superadmin'].includes(profile.role)
  }

  // Determine page title and actions based on role
  const getPageTitle = () => {
    switch (profile?.role) {
      case 'patient':
        return 'Mis Citas';
      case 'doctor':
        return 'Agenda de Citas';
      case 'admin':
      case 'staff':
        return 'Gestión de Citas';
      default:
        return 'Citas';
    }
  };

  const getPageSubtitle = () => {
    const filteredAppointments = filterAppointmentsByTab(appointments, activeTab);
    const tabText = activeTab === 'vigentes' ? 'vigentes' : 'en historial';
    return `${filteredAppointments.length} citas ${tabText} • ${organization?.name || ''}`;
  };

  const actions = (
    <div className="flex items-center space-x-3">
      {/* New Appointment Button */}
      {(profile?.role === 'patient' || ['admin', 'staff', 'doctor'].includes(profile?.role || '')) && (
        <Link
          href="/appointments/book"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          {profile?.role === 'patient' ? 'Agendar Cita' : 'Nueva Cita'}
        </Link>
      )}
    </div>
  );

  // Show loading state during hydration or data loading
  if (!isClient || isLoading) {
    return (
      <DashboardLayout title={getPageTitle()} subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {!isClient ? 'Inicializando...' : 'Cargando citas...'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <HydrationSafe fallback={
      <DashboardLayout title={getPageTitle()} subtitle="Inicializando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Inicializando...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <DashboardLayout
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        actions={actions}
      >
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards - Unified for all roles */}
        <AppointmentStatsCards
          appointments={appointments}
          userRole={profile?.role || 'patient'}
          loading={isLoading}
          organizationName={organization?.name}
        />

        {/* Appointment Tabs - Available for all roles */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <AppointmentTabs
            appointments={appointments}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            userRole={profile?.role}
            loading={isLoading}
          />
        </div>

        {/* Appointments List */}
        {(() => {
          // Filter appointments based on active tab for all roles
          const filteredAppointments = filterAppointmentsByTab(appointments, activeTab);

          if (appointments.length === 0) {
            return (
              <div className="bg-white shadow rounded-lg px-6 py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay citas registradas
                </h3>
                <p className="text-gray-500 mb-4">
                  Aún no tienes citas registradas en el sistema.
                </p>
                {(profile?.role === 'patient' || ['admin', 'staff', 'doctor'].includes(profile?.role || '')) && (
                  <Link
                    href="/appointments/book"
                    className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {profile?.role === 'patient' ? 'Agendar Primera Cita' : 'Crear Nueva Cita'}
                  </Link>
                )}
              </div>
            );
          }

          if (filteredAppointments.length === 0) {
            return (
              <EmptyTabMessage
                tabType={activeTab}
                onCreateAppointment={
                  profile?.role === 'patient'
                    ? () => navigateTo('/appointments/book')
                    : undefined
                }
              />
            );
          }

          return (
            <div className="space-y-6">
              {(() => {
                const groupedAppointments = groupAppointmentsByDate(filteredAppointments);
                const sortedGroupKeys = getSortedGroupKeys(groupedAppointments);

              return sortedGroupKeys.map((groupKey) => {
                const group = groupedAppointments[groupKey];
                const headerInfo = getDateHeader(groupKey, group.label);

                return (
                  <div key={groupKey} className="space-y-4">
                    <DateGroupHeader
                      title={headerInfo.title}
                      subtitle={headerInfo.subtitle}
                      icon={headerInfo.icon}
                      appointmentCount={group.appointments.length}
                    />

                    <div className="space-y-4">
                      {group.appointments.map((appointment) => {
                        // 🚨 CRITICAL FIX: Use role-specific component to ensure patient visibility
                        const AppointmentCardComponent = getAppointmentCardForRole(profile?.role || 'patient');

                        return (
                          <AppointmentCardComponent
                            key={appointment.id}
                            appointment={appointment}
                            userRole={profile?.role || 'patient'}
                            onReschedule={handleRescheduleAppointment}
                            onCancel={handleCancelAppointment}
                            onStatusChange={handleStatusChange}
                            onViewDetails={handleViewDetails} // 🔧 CRITICAL FIX: Add missing onViewDetails
                            canReschedule={canRescheduleAppointment(appointment)}
                            canCancel={canCancelAppointment(appointment)}
                            canChangeStatus={canChangeStatus(appointment)}
                            canViewDetails={profile?.role !== 'patient'} // 🔧 Enable for non-patient roles
                            showLocation={true}
                            showCost={profile?.role !== 'patient'}
                            showDuration={true}
                            // 🔧 CRITICAL: AdminAppointmentCard forces showPatient={true} internally
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      <AIEnhancedRescheduleModal
        isOpen={rescheduleModal.isOpen}
        appointment={rescheduleModal.appointment}
        organizationId={organization?.id || ''}
        onConfirm={handleConfirmReschedule}
        onCancel={() => setRescheduleModal({ isOpen: false, appointment: null })}
        onCancelAppointment={handleConfirmCancellation}
        loading={isLoading}
        error={error}
      />

      <CancelAppointmentModal
        isOpen={cancelModal.isOpen}
        appointment={cancelModal.appointment}
        onConfirm={handleConfirmCancellation}
        onCancel={() => setCancelModal({ isOpen: false, appointment: null })}
        loading={isLoading}
        error={error}
      />
      </DashboardLayout>
    </HydrationSafe>
  )
}

// Main component wrapped with error boundary
export default function AppointmentsPage() {
  return (
    <AppointmentsErrorBoundary>
      <AppointmentsPageContent />
    </AppointmentsErrorBoundary>
  )
}
