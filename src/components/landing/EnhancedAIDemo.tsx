'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  User, 
  Bot, 
  Calendar, 
  BarChart3, 
  Settings,
  Play,
  RotateCcw
} from 'lucide-react';

interface EnhancedAIDemoProps {
  router: {
    push: (path: string) => void;
  };
}

/**
 * EnhancedAIDemo Component - Interactive demo showcasing AI capabilities for different roles
 * Features multiple scenarios: patient booking, admin queries, schedule optimization
 */
export function EnhancedAIDemo({ router }: EnhancedAIDemoProps) {
  const [mounted, setMounted] = useState(false);
  const [activeScenario, setActiveScenario] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const demoScenarios = [
    {
      title: "Paciente - Agendamiento Natural",
      role: "Paciente",
      icon: User,
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      conversation: [
        {
          type: "user",
          message: "Necesito una cita con un cardiólogo para la próxima semana",
          timestamp: "10:30 AM"
        },
        {
          type: "ai",
          message: "¡Perfecto! He encontrado disponibilidad con el Dr. García (cardiólogo) para el martes 28 de enero a las 10:00 AM y el jueves 30 a las 2:00 PM. ¿Cuál prefieres?",
          timestamp: "10:30 AM",
          features: ["Búsqueda inteligente", "Disponibilidad real", "Opciones múltiples"]
        },
        {
          type: "user",
          message: "El martes está perfecto",
          timestamp: "10:31 AM"
        },
        {
          type: "ai",
          message: "¡Excelente! He agendado tu cita para el martes 28 de enero a las 10:00 AM con el Dr. García. Te enviaré recordatorios automáticos. ¿Necesitas algo más?",
          timestamp: "10:31 AM",
          features: ["Confirmación automática", "Recordatorios IA", "Seguimiento proactivo"]
        }
      ]
    },
    {
      title: "Administrador - Analytics Predictivos",
      role: "Administrador",
      icon: BarChart3,
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
      conversation: [
        {
          type: "user",
          message: "¿Cuántas citas canceladas tuvimos esta semana?",
          timestamp: "2:15 PM"
        },
        {
          type: "ai",
          message: "Esta semana tuvimos 23 cancelaciones (15% del total). El 60% fueron en cardiología los lunes. Te sugiero ajustar la política de confirmación para esa especialidad.",
          timestamp: "2:15 PM",
          features: ["Análisis automático", "Identificación de patrones", "Recomendaciones IA"]
        },
        {
          type: "user",
          message: "¿Qué especialidades tienen mayor demanda?",
          timestamp: "2:16 PM"
        },
        {
          type: "ai",
          message: "Top 3: Cardiología (+40% vs mes anterior), Dermatología (+25%), Neurología (+15%). Recomiendo aumentar horarios de cardiología en 20% para optimizar ingresos.",
          timestamp: "2:16 PM",
          features: ["Predicción de demanda", "Análisis comparativo", "Optimización de recursos"]
        }
      ]
    },
    {
      title: "Doctor - Optimización de Agenda",
      role: "Doctor",
      icon: Calendar,
      color: "teal",
      gradient: "from-teal-500 to-teal-600",
      conversation: [
        {
          type: "user",
          message: "Reorganiza mi agenda para maximizar eficiencia",
          timestamp: "8:45 AM"
        },
        {
          type: "ai",
          message: "He optimizado tu agenda: reagrupé 3 consultas de seguimiento consecutivas (9-11 AM) y dejé la tarde libre para procedimientos. Esto te ahorra 45 minutos de tiempo muerto.",
          timestamp: "8:45 AM",
          features: ["Optimización automática", "Agrupación inteligente", "Ahorro de tiempo"]
        },
        {
          type: "user",
          message: "¿Cuándo tengo el próximo espacio libre?",
          timestamp: "8:46 AM"
        },
        {
          type: "ai",
          message: "Tienes 30 minutos libres hoy a las 3:30 PM y 1 hora mañana a las 11:00 AM. ¿Quieres que programe algo específico o mantengo el tiempo para emergencias?",
          timestamp: "8:46 AM",
          features: ["Análisis de disponibilidad", "Gestión proactiva", "Planificación inteligente"]
        }
      ]
    }
  ];

  const playScenario = () => {
    setIsPlaying(true);
    setCurrentStep(0);
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        if (nextStep >= demoScenarios[activeScenario].conversation.length) {
          setIsPlaying(false);
          clearInterval(interval);
          return prev;
        }
        return nextStep;
      });
    }, 2000);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const currentScenario = demoScenarios[activeScenario];
  const IconComponent = currentScenario.icon;

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                IA en Acción
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Experimenta la IA Conversacional
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Cargando demo interactivo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
              IA en Acción
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Experimenta la IA Conversacional
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Descubre cómo nuestra IA se adapta a diferentes roles profesionales con 
            escenarios reales de uso en el ecosistema médico.
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {demoScenarios.map((scenario, index) => {
            const ScenarioIcon = scenario.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  setActiveScenario(index);
                  resetDemo();
                }}
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeScenario === index
                    ? `bg-gradient-to-r ${scenario.gradient} text-white shadow-lg`
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <ScenarioIcon className="h-5 w-5" />
                <span>{scenario.title}</span>
              </button>
            );
          })}
        </div>

        {/* Demo Interface */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Demo Header */}
          <div className={`bg-gradient-to-r ${currentScenario.gradient} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{currentScenario.title}</h3>
                  <p className="text-white/80">Conversación con IA especializada</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={playScenario}
                  disabled={isPlaying}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition duration-200 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  <span>Reproducir</span>
                </button>
                <button
                  onClick={resetDemo}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reiniciar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
            <div className="space-y-4">
              {currentScenario.conversation.slice(0, currentStep + 1).map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.type === 'ai' && (
                    <div className={`w-8 h-8 bg-gradient-to-br ${currentScenario.gradient} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-md ${message.type === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`p-4 rounded-2xl shadow-sm ${
                        message.type === 'user'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-50 text-gray-800 border border-blue-100'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{message.timestamp}</p>
                    </div>
                    
                    {message.type === 'ai' && message.features && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.features.map((feature, featureIndex) => (
                          <span
                            key={featureIndex}
                            className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${currentScenario.gradient} text-white`}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Demo Footer */}
          <div className="bg-gray-50 p-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                ¿Listo para experimentar la IA conversacional en tu organización?
              </p>
              <button
                onClick={() => router.push('/register')}
                className={`bg-gradient-to-r ${currentScenario.gradient} hover:shadow-lg text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:-translate-y-1`}
              >
                Comenzar Demo Gratis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
