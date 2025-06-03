'use client';

import { 
  Brain, 
  Calendar, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  Shield,
  Stethoscope,
  UserCheck,
  Settings,
  FileText
} from 'lucide-react';

/**
 * AIForProfessionals Component - Showcases AI capabilities for each professional role
 * Highlights specific AI use cases and benefits for Patients, Doctors, Staff, and Administrators
 */
export function AIForProfessionals() {
  const professionalRoles = [
    {
      title: "Pacientes",
      subtitle: "IA que simplifica tu experiencia médica",
      icon: UserCheck,
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-800",
      features: [
        {
          icon: MessageSquare,
          title: "Agendamiento por Lenguaje Natural",
          description: "Agenda citas conversando naturalmente: 'Necesito cardiólogo para la próxima semana'",
          metric: "95% precisión en interpretación"
        },
        {
          icon: Clock,
          title: "Recordatorios Inteligentes",
          description: "IA que aprende tus preferencias y envía recordatorios personalizados automáticamente",
          metric: "60% reducción en no-shows"
        },
        {
          icon: FileText,
          title: "Historial Organizado Automáticamente",
          description: "Tu historial médico se organiza inteligentemente por especialidad y fecha",
          metric: "100% organización automática"
        }
      ]
    },
    {
      title: "Doctores",
      subtitle: "IA que optimiza tu práctica médica",
      icon: Stethoscope,
      color: "teal",
      gradient: "from-teal-500 to-teal-600",
      bgColor: "bg-teal-50",
      textColor: "text-teal-800",
      features: [
        {
          icon: Calendar,
          title: "Optimización Automática de Horarios",
          description: "IA que reorganiza tu agenda para maximizar eficiencia y minimizar tiempos muertos",
          metric: "40% más citas por día"
        },
        {
          icon: TrendingUp,
          title: "Análisis de Patrones de Citas",
          description: "Identifica patrones en cancelaciones, no-shows y preferencias de pacientes",
          metric: "85% predicción de cancelaciones"
        },
        {
          icon: Brain,
          title: "Sugerencias de Disponibilidad",
          description: "Recomendaciones inteligentes de horarios basadas en demanda y historial",
          metric: "30% mejor utilización de tiempo"
        }
      ]
    },
    {
      title: "Staff/Recepcionistas",
      subtitle: "IA que automatiza tareas repetitivas",
      icon: Users,
      color: "green",
      gradient: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-800",
      features: [
        {
          icon: Settings,
          title: "Automatización de Tareas Repetitivas",
          description: "IA maneja confirmaciones, reagendamientos y consultas básicas automáticamente",
          metric: "70% reducción en tareas manuales"
        },
        {
          icon: Calendar,
          title: "Gestión Inteligente de Cancelaciones",
          description: "Reasigna automáticamente citas canceladas optimizando la agenda completa",
          metric: "90% ocupación de agenda"
        },
        {
          icon: TrendingUp,
          title: "Priorización Automática",
          description: "Clasifica automáticamente urgencias y prioriza citas según criterios médicos",
          metric: "100% clasificación correcta"
        }
      ]
    },
    {
      title: "Administradores",
      subtitle: "IA que impulsa decisiones estratégicas",
      icon: BarChart3,
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-800",
      features: [
        {
          icon: BarChart3,
          title: "Analytics Predictivos",
          description: "Predicciones de demanda, análisis de rentabilidad y optimización de recursos",
          metric: "95% precisión en predicciones"
        },
        {
          icon: TrendingUp,
          title: "Optimización de Recursos",
          description: "IA identifica oportunidades de mejora en utilización de consultorios y personal",
          metric: "25% mejora en eficiencia"
        },
        {
          icon: FileText,
          title: "Reportes Automáticos con Insights",
          description: "Reportes inteligentes con recomendaciones automáticas basadas en datos",
          metric: "80% tiempo ahorrado en reportes"
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-20">
      {/* Section Header */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
            IA Especializada
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          IA para cada Profesional
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Nuestra inteligencia artificial se adapta y potencia el trabajo específico de cada rol 
          en el ecosistema médico, desde pacientes hasta administradores.
        </p>
      </div>

      {/* Professional Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {professionalRoles.map((role, index) => {
          const IconComponent = role.icon;
          return (
            <div 
              key={index}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Role Header */}
              <div className={`${role.bgColor} p-6 border-b border-gray-100`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${role.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${role.textColor}`}>
                      {role.title}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      {role.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="p-6 space-y-6">
                {role.features.map((feature, featureIndex) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={featureIndex} className="flex items-start space-x-4">
                      <div className={`w-10 h-10 bg-gradient-to-br ${role.gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <FeatureIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {feature.title}
                        </h4>
                        <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                          {feature.description}
                        </p>
                        <div className={`inline-flex items-center space-x-1 ${role.textColor} bg-gray-50 px-3 py-1 rounded-full text-xs font-medium`}>
                          <TrendingUp className="h-3 w-3" />
                          <span>{feature.metric}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-16">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
              Tecnología Médica Certificada
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            IA Diseñada Específicamente para el Sector Salud
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Cada funcionalidad de IA está desarrollada con estándares médicos, cumplimiento HIPAA 
            y la experiencia de profesionales de la salud.
          </p>
        </div>
      </div>
    </div>
  );
}
