'use client'

/**
 * Dashboard Layout Component
 *
 * Provides authentication-aware layout for dashboard pages with proper
 * hydration safety and error boundary protection.
 *
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import { useAuth } from '@/contexts/auth-context'
import { useTenant } from '@/contexts/tenant-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { AppointmentDataProvider } from '@/contexts/AppointmentDataProvider'
import { useIsClient } from '@/utils/hydration-safe'
import { DashboardErrorBoundary } from '@/components/error-boundary/DashboardErrorBoundary'

/**
 * Loading component for dashboard
 */
function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Cargando Dashboard...</h2>
        <p className="text-gray-600">Verificando autenticación</p>
      </div>
    </div>
  )
}

/**
 * Dashboard Layout with hydration safety and error boundaries
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const { organization, loading: tenantLoading } = useTenant()
  const router = useRouter()
  const isClient = useIsClient()
  const [isNavigating, setIsNavigating] = useState(false)

  // Prevent hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    if (!isClient) return

    // Handle authentication redirect with proper state management
    if (!authLoading && !user && !isNavigating) {
      setIsNavigating(true)
      router.push('/login')
    }
  }, [user, authLoading, router, isClient, isNavigating])

  // Show loading state during SSR or while auth is loading
  if (!isClient || authLoading || tenantLoading) {
    return <DashboardLoading />
  }

  // Show loading if navigating to login
  if (isNavigating || !user) {
    return <DashboardLoading />
  }

  return (
    <DashboardErrorBoundary>
      <Suspense fallback={<DashboardLoading />}>
        <AppointmentDataProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </AppointmentDataProvider>
      </Suspense>
    </DashboardErrorBoundary>
  )
}
