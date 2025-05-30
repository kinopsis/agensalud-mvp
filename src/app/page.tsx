'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * AgentSalud Landing Page - AI-First Medical Appointment Platform
 * Displays marketing content for unauthenticated users
 * Redirects authenticated users to their dashboard
 */
export default function HomePage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (profile) {
        // User is authenticated, redirect to dashboard
        router.push('/dashboard');
      } else {
        // User is not authenticated, show landing page
        setShowContent(true);
      }
    }
  }, [profile, loading, router]);

  // Show loading state while checking authentication
  if (loading || !showContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Cargando...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-blue-600">🤖</div>
              <span className="text-xl font-bold text-gray-900">Agendalo</span>
            </div>
            <div className="space-x-4">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Agendalo
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Plataforma de Agendamiento Médico AI-First
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Agenda citas médicas mediante lenguaje natural con nuestra plataforma inteligente.
            Simplifica la gestión de citas para pacientes y profesionales de la salud.
          </p>

          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300"
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="inline-block bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg border border-blue-600 transition duration-300"
            >
              Registrarse
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">IA Conversacional</h3>
            <p className="text-gray-600">
              Agenda citas usando lenguaje natural. Solo describe lo que necesitas.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Gestión Inteligente</h3>
            <p className="text-gray-600">
              Sistema multi-tenant para clínicas y consultorios médicos.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Rápido y Seguro</h3>
            <p className="text-gray-600">
              Plataforma moderna con autenticación segura y datos protegidos.
            </p>
          </div>
        </div>

        {/* AI Demo Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Prueba la IA en Acción
            </h2>
            <p className="text-gray-600">
              Experimenta cómo nuestro asistente de IA puede ayudarte a agendar citas médicas
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  👤
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm flex-1">
                  <p className="text-gray-800">
                    "Necesito una cita con un cardiólogo para la próxima semana"
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  🤖
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm flex-1">
                  <p className="text-gray-800">
                    "Perfecto! He encontrado disponibilidad con el Dr. García (cardiólogo) para el martes 28 de enero a las 10:00 AM. ¿Te gustaría confirmar esta cita?"
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300"
              >
                Comenzar Ahora
              </button>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Para Organizaciones de Salud
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="text-green-600 text-xl">✓</div>
                <span className="text-gray-700">Reduce tiempo de gestión de citas en un 70%</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="text-green-600 text-xl">✓</div>
                <span className="text-gray-700">Sistema multi-tenant para múltiples ubicaciones</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="text-green-600 text-xl">✓</div>
                <span className="text-gray-700">Integración con sistemas existentes</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="text-green-600 text-xl">✓</div>
                <span className="text-gray-700">Reportes y analytics en tiempo real</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Para Pacientes
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="text-blue-600 text-xl">✓</div>
                <span className="text-gray-700">Agenda citas 24/7 con lenguaje natural</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="text-blue-600 text-xl">✓</div>
                <span className="text-gray-700">Recordatorios automáticos inteligentes</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="text-blue-600 text-xl">✓</div>
                <span className="text-gray-700">Historial médico organizado</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="text-blue-600 text-xl">✓</div>
                <span className="text-gray-700">Acceso desde cualquier dispositivo</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-blue-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para Revolucionar tu Gestión de Citas?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a las organizaciones de salud que ya están usando IA para mejorar la experiencia de sus pacientes
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition duration-300"
            >
              Registrar Organización
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-3 px-8 rounded-lg transition duration-300"
            >
              Soy Paciente
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="text-2xl">🤖</div>
              <span className="text-xl font-bold">Agendalo</span>
            </div>
            <p className="text-gray-400 mb-4">
              Plataforma de Agendamiento Médico AI-First
            </p>
            <p className="text-gray-500 text-sm">
              © 2025 Agendalo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
