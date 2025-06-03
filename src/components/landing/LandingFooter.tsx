'use client';

import { 
  Brain, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  FileText, 
  Users, 
  MessageSquare,
  Calendar,
  BarChart3
} from 'lucide-react';

/**
 * LandingFooter Component - Professional footer with links, contact info, and trust signals
 * Features organized navigation, contact information, and compliance indicators
 */
export function LandingFooter() {
  const footerSections = [
    {
      title: "Producto",
      links: [
        { name: "Características", href: "#features", icon: Brain },
        { name: "IA Conversacional", href: "#ai-demo", icon: MessageSquare },
        { name: "Agendamiento", href: "#booking", icon: Calendar },
        { name: "Analytics", href: "#analytics", icon: BarChart3 }
      ]
    },
    {
      title: "Soluciones",
      links: [
        { name: "Para Clínicas", href: "#clinics", icon: Users },
        { name: "Para Doctores", href: "#doctors", icon: Users },
        { name: "Para Pacientes", href: "#patients", icon: Users },
        { name: "Integraciones", href: "#integrations", icon: Brain }
      ]
    },
    {
      title: "Recursos",
      links: [
        { name: "Documentación", href: "/docs", icon: FileText },
        { name: "API Reference", href: "/api-docs", icon: FileText },
        { name: "Casos de Éxito", href: "#testimonials", icon: Users },
        { name: "Soporte", href: "#support", icon: MessageSquare }
      ]
    },
    {
      title: "Empresa",
      links: [
        { name: "Acerca de", href: "#about", icon: Users },
        { name: "Seguridad", href: "#security", icon: Shield },
        { name: "Privacidad", href: "#privacy", icon: Shield },
        { name: "Términos", href: "#terms", icon: FileText }
      ]
    }
  ];

  const contactInfo = [
    {
      icon: Mail,
      label: "Email",
      value: "contacto@agentsalud.com",
      href: "mailto:contacto@agentsalud.com"
    },
    {
      icon: Phone,
      label: "Teléfono",
      value: "+1 (555) 123-4567",
      href: "tel:+15551234567"
    },
    {
      icon: MapPin,
      label: "Ubicación",
      value: "Ciudad de México, México",
      href: "#location"
    }
  ];

  const complianceInfo = [
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Protección total de datos médicos"
    },
    {
      icon: Shield,
      title: "ISO 27001",
      description: "Seguridad de la información"
    },
    {
      icon: Brain,
      title: "OpenAI Certified",
      description: "IA médica certificada"
    }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">AS</span>
              </div>
              <div>
                <span className="text-2xl font-bold">AgentSalud</span>
                <div className="text-xs text-blue-400 font-medium">AI-Powered Healthcare</div>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              La primera plataforma de agendamiento médico con inteligencia artificial conversacional. 
              Transformamos la experiencia médica para pacientes y profesionales de la salud.
            </p>

            {/* Contact Information */}
            <div className="space-y-3">
              {contactInfo.map((contact, index) => {
                const IconComponent = contact.icon;
                return (
                  <a
                    key={index}
                    href={contact.href}
                    className="flex items-center space-x-3 text-gray-300 hover:text-white transition duration-200"
                  >
                    <IconComponent className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">{contact.value}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Navigation Sections */}
          {footerSections.map((section, index) => (
            <div key={index} className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4 text-white">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => {
                  const IconComponent = link.icon;
                  return (
                    <li key={linkIndex}>
                      <a
                        href={link.href}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition duration-200 text-sm"
                      >
                        <IconComponent className="h-3 w-3 text-blue-400" />
                        <span>{link.name}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Compliance Section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold mb-4 text-white">Certificaciones y Cumplimiento</h3>
            <p className="text-gray-400 text-sm">Tecnología médica con los más altos estándares de seguridad</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {complianceInfo.map((compliance, index) => {
              const IconComponent = compliance.icon;
              return (
                <div key={index} className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <IconComponent className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-1">{compliance.title}</h4>
                  <p className="text-xs text-gray-400">{compliance.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="bg-gradient-to-r from-blue-600/10 to-teal-600/10 rounded-2xl p-6 border border-blue-600/20">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Mantente Actualizado</h3>
              <p className="text-gray-300 mb-4">Recibe las últimas novedades sobre IA médica y nuevas funcionalidades</p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300">
                  Suscribirse
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              © 2025 AgentSalud. Todos los derechos reservados.
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="#privacy" className="hover:text-white transition duration-200">
                Política de Privacidad
              </a>
              <a href="#terms" className="hover:text-white transition duration-200">
                Términos de Servicio
              </a>
              <a href="#cookies" className="hover:text-white transition duration-200">
                Cookies
              </a>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Brain className="h-4 w-4 text-blue-400" />
              <span>Powered by AI</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
