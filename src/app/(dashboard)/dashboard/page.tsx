'use client';

import { useAuth } from '@/contexts/auth-context';
import { useTenant } from '@/contexts/tenant-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import DoctorDashboard from '@/components/dashboard/DoctorDashboard';
import PatientDashboard from '@/components/dashboard/PatientDashboard';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';

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

  // Render role-specific dashboard
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
}
