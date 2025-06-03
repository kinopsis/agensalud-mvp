'use client';

import React, { useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';

// Lazy load dashboard components with error handling to prevent webpack module loading issues
const AdminDashboard = React.lazy(() =>
  import('@/components/dashboard/AdminDashboard').catch(error => {
    console.error('Failed to load AdminDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">Error loading admin dashboard</div> };
  })
);

const DoctorDashboard = React.lazy(() =>
  import('@/components/dashboard/DoctorDashboard').catch(error => {
    console.error('Failed to load DoctorDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">Error loading doctor dashboard</div> };
  })
);

const PatientDashboard = React.lazy(() =>
  import('@/components/dashboard/PatientDashboard').catch(error => {
    console.error('Failed to load PatientDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">Error loading patient dashboard</div> };
  })
);

const StaffDashboard = React.lazy(() =>
  import('@/components/dashboard/StaffDashboard').catch(error => {
    console.error('Failed to load StaffDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">Error loading staff dashboard</div> };
  })
);

const SuperAdminDashboard = React.lazy(() =>
  import('@/components/dashboard/SuperAdminDashboard').catch(error => {
    console.error('Failed to load SuperAdminDashboard:', error);
    return { default: () => <div className="p-4 text-red-600">Error loading super admin dashboard</div> };
  })
);

/**
 * Dashboard Loading Component with webpack module loading error detection
 */
function DashboardLoading() {
  const [loadingTime, setLoadingTime] = React.useState(0);
  const [showRetry, setShowRetry] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    // Show retry option after 10 seconds
    const retryTimer = setTimeout(() => {
      setShowRetry(true);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(retryTimer);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Cargando Dashboard...</h2>
        <p className="text-gray-600 mb-4">Preparando tu espacio de trabajo</p>

        {loadingTime > 5 && (
          <p className="text-sm text-gray-500">
            Tiempo de carga: {loadingTime}s
          </p>
        )}

        {showRetry && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-3">
              La carga está tomando más tiempo del esperado. Esto puede deberse a problemas de conectividad.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { organization } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Cargando...</h2>
          <p className="text-gray-600">Obteniendo información del usuario</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Render role-specific dashboard with Suspense to prevent webpack module loading errors
  const renderDashboard = () => {
    switch (profile.role) {
      case 'superadmin':
        return <SuperAdminDashboard />;

      case 'admin':
        return <AdminDashboard />;

      case 'doctor':
        return <DoctorDashboard />;

      case 'patient':
        return <PatientDashboard />;

      case 'staff':
        return <StaffDashboard />;

      default:
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Rol no reconocido
              </h1>
              <p className="text-gray-600 mb-6">
                Tu rol "{profile.role}" no tiene un dashboard configurado.
              </p>
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Ver Perfil
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <Suspense fallback={<DashboardLoading />}>
      {renderDashboard()}
    </Suspense>
  );
}
