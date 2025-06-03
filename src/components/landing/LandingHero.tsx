'use client';

import { Brain, Calendar, MessageSquare, Shield, Zap, Users } from 'lucide-react';

interface LandingHeroProps {
  router: {
    push: (path: string) => void;
  };
}

/**
 * LandingHero Component - Enhanced hero section for AgentSalud
 * Features AI-focused messaging, professional medical branding, and clear CTAs
 * 
 * @param router - Next.js router for navigation
 */
export function LandingHero({ router }: LandingHeroProps) {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="text-center max-w-5xl mx-auto">
        {/* Main Headline */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
              Inteligencia Artificial Médica
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              AgentSalud
            </span>
            <br />
            <span className="text-gray-800">
              Revoluciona tu Práctica Médica
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            La primera plataforma de agendamiento médico con <strong>IA conversacional</strong> que potencia 
            el trabajo de cada profesional de la salud. Desde WhatsApp hasta dashboards inteligentes.
          </p>
        </div>

        {/* Key Features Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            <span>IA Conversacional WhatsApp</span>
          </div>
          <div className="flex items-center space-x-2 bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium">
            <Shield className="h-4 w-4" />
            <span>HIPAA Compliant</span>
          </div>
          <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            <Zap className="h-4 w-4" />
            <span>Agendamiento en 30s</span>
          </div>
          <div className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
            <Users className="h-4 w-4" />
            <span>5 Roles Especializados</span>
          </div>
        </div>

        {/* Primary CTAs */}
        <div className="space-y-4 sm:space-y-0 sm:space-x-6 sm:flex sm:justify-center mb-16">
          <button
            type="button"
            onClick={() => router.push('/register')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-4 px-8 rounded-lg transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Brain className="h-5 w-5" />
            <span>Demo Interactivo Gratis</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-8 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition duration-300 shadow-md hover:shadow-lg"
          >
            <Calendar className="h-5 w-5" />
            <span>Ver Características</span>
          </button>
        </div>

        {/* AI Impact Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="text-3xl font-bold text-blue-600 mb-2">70%</div>
            <div className="text-gray-700 font-medium">Reducción en tiempo de gestión</div>
            <div className="text-sm text-gray-500 mt-1">vs. sistemas tradicionales</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="text-3xl font-bold text-teal-600 mb-2">30s</div>
            <div className="text-gray-700 font-medium">Tiempo promedio de agendamiento</div>
            <div className="text-sm text-gray-500 mt-1">con IA conversacional</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
            <div className="text-gray-700 font-medium">Disponibilidad del sistema</div>
            <div className="text-sm text-gray-500 mt-1">infraestructura empresarial</div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Confiado por organizaciones de salud líderes</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Certificado HIPAA</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">ISO 27001</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">OpenAI Certified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
