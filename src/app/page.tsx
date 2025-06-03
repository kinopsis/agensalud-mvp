'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LandingHero } from '@/components/landing/LandingHero';
import { AIForProfessionals } from '@/components/landing/AIForProfessionals';
import { EnhancedAIDemo } from '@/components/landing/EnhancedAIDemo';
import { TrustMetrics } from '@/components/landing/TrustMetrics';
import { LandingFooter } from '@/components/landing/LandingFooter';

/**
 * AgentSalud Landing Page - AI-First Medical Appointment Platform
 * Displays marketing content for unauthenticated users
 * Redirects authenticated users to their dashboard
 */
export default function HomePage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && profile) {
      // User is authenticated, redirect to dashboard
      router.push('/dashboard');
    }
  }, [mounted, profile, loading, router]);

  // Show loading state while checking authentication or not mounted
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Cargando...</h2>
        </div>
      </div>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Redirigiendo...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-indigo-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">AS</span>
              </div>
              <span className="text-xl font-bold text-gray-900">AgentSalud</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">AI-Powered</span>
            </div>
            <div className="space-x-4">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-gray-900 font-medium transition duration-200"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg"
              >
                Demo Gratis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <LandingHero router={router} />

      {/* AI for Professionals Section */}
      <AIForProfessionals />

      {/* Enhanced AI Demo Section */}
      <EnhancedAIDemo router={router} />

      {/* Trust Metrics Section */}
      <TrustMetrics />

      {/* Final CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-600 via-teal-600 to-blue-700 rounded-2xl p-8 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para Transformar tu Práctica Médica con IA?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-3xl mx-auto">
            Únete a las organizaciones de salud que ya están usando inteligencia artificial para revolucionar la experiencia de sus pacientes y optimizar sus operaciones
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition duration-300 shadow-lg hover:shadow-xl"
            >
              🏥 Registrar Clínica
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-4 px-8 rounded-lg transition duration-300"
            >
              👤 Soy Paciente
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
