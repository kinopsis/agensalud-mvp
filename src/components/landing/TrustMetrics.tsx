'use client';

import { 
  Shield, 
  Clock, 
  Users, 
  TrendingUp, 
  Award, 
  CheckCircle,
  Star,
  Building2,
  Zap,
  Heart
} from 'lucide-react';

/**
 * TrustMetrics Component - Displays trust indicators, metrics, and social proof
 * Features security certifications, performance metrics, and customer testimonials
 */
export function TrustMetrics() {
  const trustMetrics = [
    {
      icon: Shield,
      title: "HIPAA Compliant",
      value: "100%",
      description: "Cumplimiento total con estándares de protección de datos médicos",
      color: "blue"
    },
    {
      icon: Clock,
      title: "Uptime Garantizado",
      value: "99.9%",
      description: "Disponibilidad del sistema con infraestructura empresarial",
      color: "green"
    },
    {
      icon: Users,
      title: "Organizaciones Activas",
      value: "50+",
      description: "Clínicas y consultorios confiando en nuestra plataforma",
      color: "purple"
    },
    {
      icon: TrendingUp,
      title: "Mejora en Eficiencia",
      value: "70%",
      description: "Reducción promedio en tiempo de gestión de citas",
      color: "teal"
    }
  ];

  const certifications = [
    {
      icon: Shield,
      title: "HIPAA Certified",
      description: "Protección de datos médicos"
    },
    {
      icon: Award,
      title: "ISO 27001",
      description: "Seguridad de la información"
    },
    {
      icon: CheckCircle,
      title: "OpenAI Partner",
      description: "IA médica certificada"
    },
    {
      icon: Zap,
      title: "SOC 2 Type II",
      description: "Controles de seguridad"
    }
  ];

  const testimonials = [
    {
      quote: "AgentSalud redujo nuestro tiempo de agendamiento en un 70%. La IA conversacional es increíblemente precisa y nuestros pacientes la aman.",
      author: "Dr. María González",
      position: "Directora Médica",
      organization: "Clínica San Rafael",
      rating: 5,
      metric: "70% reducción en tiempo",
      specialty: "Cardiología"
    },
    {
      quote: "La integración con WhatsApp cambió completamente nuestra operación. Ahora los pacientes pueden agendar 24/7 y nosotros optimizamos recursos automáticamente.",
      author: "Carlos Mendoza",
      position: "Administrador",
      organization: "Centro Médico Integral",
      rating: 5,
      metric: "40% más citas por día",
      specialty: "Medicina General"
    },
    {
      quote: "Como doctora, la optimización automática de mi agenda me permite ver más pacientes sin sacrificar calidad. La IA entiende perfectamente mis preferencias.",
      author: "Dra. Ana Rodríguez",
      position: "Especialista",
      organization: "Consultorio Dermatológico",
      rating: 5,
      metric: "30% mejor utilización",
      specialty: "Dermatología"
    }
  ];

  const impactMetrics = [
    {
      category: "Pacientes",
      metrics: [
        { label: "Tiempo promedio de agendamiento", value: "30 segundos", improvement: "vs 5-10 minutos tradicional" },
        { label: "Satisfacción del paciente", value: "4.8/5", improvement: "+25% vs sistemas anteriores" },
        { label: "Reducción en no-shows", value: "60%", improvement: "con recordatorios IA" }
      ]
    },
    {
      category: "Doctores",
      metrics: [
        { label: "Optimización de agenda", value: "40%", improvement: "más citas por día" },
        { label: "Tiempo ahorrado en gestión", value: "2 horas", improvement: "por día promedio" },
        { label: "Predicción de cancelaciones", value: "85%", improvement: "precisión en predicciones" }
      ]
    },
    {
      category: "Administradores",
      metrics: [
        { label: "Reducción en costos operativos", value: "45%", improvement: "vs sistemas tradicionales" },
        { label: "Mejora en utilización de recursos", value: "35%", improvement: "optimización automática" },
        { label: "Tiempo en reportes", value: "80%", improvement: "reducción con IA" }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-20">
      {/* Trust Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {trustMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          const colorClasses = {
            blue: "from-blue-500 to-blue-600 text-blue-600",
            green: "from-green-500 to-green-600 text-green-600",
            purple: "from-purple-500 to-purple-600 text-purple-600",
            teal: "from-teal-500 to-teal-600 text-teal-600"
          };
          
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl transition-all duration-300">
              <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[metric.color as keyof typeof colorClasses].split(' ')[0]} ${colorClasses[metric.color as keyof typeof colorClasses].split(' ')[1]} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div className={`text-3xl font-bold ${colorClasses[metric.color as keyof typeof colorClasses].split(' ')[2]} mb-2`}>
                {metric.value}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{metric.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{metric.description}</p>
            </div>
          );
        })}
      </div>

      {/* Certifications */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 mb-16 border border-gray-200">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Certificaciones y Cumplimiento</h3>
          <p className="text-gray-600">Tecnología médica certificada con los más altos estándares de seguridad</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {certifications.map((cert, index) => {
            const IconComponent = cert.icon;
            return (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
                  <IconComponent className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{cert.title}</h4>
                <p className="text-xs text-gray-600">{cert.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Testimonials */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Star className="h-8 w-8 text-yellow-500" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
              Casos de Éxito
            </span>
          </div>
          <h3 className="text-4xl font-bold text-gray-900 mb-4">Lo que dicen nuestros clientes</h3>
          <p className="text-xl text-gray-600">Profesionales de la salud que ya transformaron su práctica con IA</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              {/* Rating */}
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                ))}
              </div>
              
              {/* Quote */}
              <blockquote className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              
              {/* Metric Highlight */}
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="text-2xl font-bold text-blue-600">{testimonial.metric}</div>
                <div className="text-sm text-blue-800">Mejora medible</div>
              </div>
              
              {/* Author */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-600">{testimonial.position}</div>
                  <div className="text-xs text-blue-600">{testimonial.organization} • {testimonial.specialty}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Impact Metrics by Role */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-8 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">Impacto Medible por Rol Profesional</h3>
          <p className="text-blue-100">Métricas reales de mejora en cada función del ecosistema médico</p>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {impactMetrics.map((category, index) => (
              <div key={index} className="space-y-4">
                <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span>{category.category}</span>
                </h4>
                {category.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                      <span className="text-lg font-bold text-blue-600">{metric.value}</span>
                    </div>
                    <div className="text-xs text-gray-500">{metric.improvement}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
