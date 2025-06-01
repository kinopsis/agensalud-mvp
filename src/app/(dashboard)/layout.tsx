'use client'

import { useAuth } from '@/contexts/auth-context'
import { useTenant } from '@/contexts/tenant-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DateDisplacementDebugger from '@/components/debug/DateDisplacementDebugger'
import DateValidationMonitor from '@/components/debug/DateValidationMonitor'
import PerformanceMonitoringDashboard, { PerformanceIndicator } from '@/components/debug/PerformanceMonitoringDashboard'
import { AppointmentDataProvider } from '@/contexts/AppointmentDataProvider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const { organization } = useTenant()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AppointmentDataProvider>
      <div className="min-h-screen bg-gray-50">
        {children}

        {/* TEMPORARILY DISABLED - Debug components causing excessive API calls */}
        {/*
        <DateDisplacementDebugger
          enabled={false}
          autoStart={false}
          showUI={false}
        />
        <DateValidationMonitor />
        <PerformanceMonitoringDashboard
          refreshInterval={30000}
          showDetails={process.env.NODE_ENV === 'development'}
        />
        <PerformanceIndicator />
        */}
      </div>
    </AppointmentDataProvider>
  )
}
