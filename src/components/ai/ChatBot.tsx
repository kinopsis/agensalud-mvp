'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './animations.module.css';
import { useChat } from 'ai/react';
import AppointmentFlow from './AppointmentFlow';
import AvailabilityDisplay from './AvailabilityDisplay';
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { AIContextProcessor, type AIContext } from '@/lib/ai/AIContextProcessor';

interface ChatBotProps {
  organizationId?: string;
  userId?: string;
  className?: string;
}

interface AppointmentIntent {
  intent: 'book' | 'reschedule' | 'cancel' | 'inquire' | 'unknown';
  specialty?: string;
  preferredDate?: string;
  preferredTime?: string;
  confidence: number;
  canProceed: boolean;
}

export function ChatBot({ organizationId, userId, className = '' }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAppointmentFlow, setShowAppointmentFlow] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<AppointmentIntent | null>(null);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [aiContext, setAiContext] = useState<AIContext | null>(null);
  const [isProcessingContext, setIsProcessingContext] = useState(false);
  const [showTransitionPrompt, setShowTransitionPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI Context Processor
  const contextProcessor = useRef<AIContextProcessor | null>(null);

  useEffect(() => {
    if (organizationId) {
      contextProcessor.current = new AIContextProcessor(organizationId);
    }
  }, [organizationId]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/ai/chat',
    body: {
      organizationId,
      userId,
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de IA para citas ópticas. Puedo ayudarte a agendar citas con nuestros especialistas en optometría. ¿En qué puedo ayudarte hoy?'
      }
    ],
    onFinish: async (message) => {
      // Process appointment-related messages
      if (message.content.toLowerCase().includes('agendar') ||
          message.content.toLowerCase().includes('cita') ||
          message.content.toLowerCase().includes('reservar')) {
        await processAppointmentMessage(message.content);
      }
    }
  });

  // Enhanced appointment message processing with AI context
  const processAppointmentMessage = async (messageContent: string) => {
    if (!organizationId) return;

    try {
      setIsProcessingContext(true);

      // Process with existing API
      const response = await fetch('/api/ai/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          organizationId,
          userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentIntent(result.intent);

        // Process conversation context with AI Context Processor
        if (contextProcessor.current) {
          const chatMessages = messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt
          }));

          const contextResult = await contextProcessor.current.processConversation(
            chatMessages,
            result.intent,
            { organizationId: organizationId || '', userId }
          );

          setAiContext(contextResult.context);

          // Determine next action based on AI analysis
          if (contextResult.shouldTransitionToVisual) {
            setShowTransitionPrompt(true);

            // Add transition suggestion message
            const transitionMessage = {
              id: `transition-${Date.now()}`,
              role: 'assistant' as const,
              content: `Basado en nuestra conversación, he preparado algunas sugerencias personalizadas para ti. ¿Te gustaría ver las opciones disponibles en una vista más visual?`,
              createdAt: new Date()
            };

            setMessages(prev => [...prev, transitionMessage]);
          } else {
            // Continue with chat-based flow
            handleChatBasedFlow(result, contextResult);
          }
        } else {
          // Fallback to original flow
          handleOriginalFlow(result);
        }
      }
    } catch (error) {
      console.error('Error processing appointment message:', error);
      // Fallback to original flow on error
      if (result?.success) {
        handleOriginalFlow(result);
      }
    } finally {
      setIsProcessingContext(false);
    }
  };

  // Handle chat-based flow continuation
  const handleChatBasedFlow = (result: any, contextResult: any) => {
    if (result.intent.intent === 'book' && result.canProceed) {
      if (result.availability && result.availability.length > 0) {
        setAvailabilityData(result.availability);
        setShowAvailability(true);

        const availabilityMessage = {
          id: `availability-${Date.now()}`,
          role: 'assistant' as const,
          content: `He encontrado ${result.availability.length} horarios disponibles que coinciden con tus preferencias. Puedes seleccionar uno o ver más opciones en la vista visual.`,
          createdAt: new Date()
        };

        setMessages(prev => [...prev, availabilityMessage]);
      }
    }
  };

  // Handle original flow as fallback
  const handleOriginalFlow = (result: any) => {
    if (result.intent.intent === 'book' && result.canProceed) {
      if (result.availability && result.availability.length > 0) {
        setAvailabilityData(result.availability);
        setShowAvailability(true);

        const availabilityMessage = {
          id: `availability-${Date.now()}`,
          role: 'assistant' as const,
          content: `He encontrado ${result.availability.length} horarios disponibles. Puedes ver las opciones abajo o usar el flujo guiado para agendar.`,
          createdAt: new Date()
        };

        setMessages(prev => [...prev, availabilityMessage]);
      } else {
        setShowAppointmentFlow(true);
      }
    } else if (result.intent.intent === 'book') {
      setShowAppointmentFlow(true);
    }
  };

  // Handle transition to visual flow
  const handleTransitionToVisual = () => {
    setShowTransitionPrompt(false);
    setShowAppointmentFlow(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle appointment booking success
  const handleAppointmentBooked = (appointmentId: string) => {
    setShowAppointmentFlow(false);
    setShowAvailability(false);

    const successMessage = {
      id: `success-${Date.now()}`,
      role: 'assistant' as const,
      content: '¡Excelente! Tu cita ha sido agendada exitosamente. Recibirás una confirmación por email con todos los detalles.',
      createdAt: new Date()
    };

    setMessages(prev => [...prev, successMessage]);
  };

  // Handle slot selection from availability display
  const handleSlotSelect = (slot: any) => {
    setShowAvailability(false);
    setShowAppointmentFlow(true);
  };

  // Handle cancellation
  const handleCancel = () => {
    setShowAppointmentFlow(false);
    setShowAvailability(false);
    setCurrentIntent(null);
  };

  // Show appointment flow overlay
  if (showAppointmentFlow) {
    // Validate organizationId before showing appointment flow
    if (!organizationId) {
      return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error de Configuración</h3>
            <p className="text-gray-600 mb-4">
              No se pudo identificar la organización. Por favor, recarga la página e intenta de nuevo.
            </p>
            <button
              type="button"
              onClick={handleCancel}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Cerrar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <AppointmentFlow
          organizationId={organizationId}
          userId={userId}
          onAppointmentBooked={handleAppointmentBooked}
          onCancel={handleCancel}
          initialData={{
            aiContext: aiContext || undefined,
            mode: 'ai'
          }}
          mode="ai"
        />
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🤖</span>
            <span className="hidden sm:inline font-medium">Asistente IA</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🤖</span>
              <div>
                <h3 className="font-semibold">Asistente IA</h3>
                <p className="text-xs text-blue-100">Citas médicas inteligentes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {formatTime(message.createdAt || new Date())}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                </div>
              </div>
            </div>
          )}

          {isProcessingContext && (
            <div className="flex justify-start">
              <div className="bg-purple-50 border border-purple-200 text-purple-800 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span className="text-sm">Analizando preferencias...</span>
                </div>
              </div>
            </div>
          )}

          {showTransitionPrompt && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-gray-800 px-4 py-3 rounded-lg max-w-[90%]">
                <div className="space-y-3">
                  <p className="text-sm font-medium">🎯 Sugerencias listas</p>
                  <p className="text-sm">He analizado tus preferencias y preparé opciones personalizadas.</p>

                  {aiContext && (
                    <div className="text-xs space-y-1 bg-white bg-opacity-50 rounded p-2">
                      {aiContext.suggestedDates && aiContext.suggestedDates.length > 0 && (
                        <div>📅 Fechas sugeridas: {aiContext.suggestedDates.slice(0, 2).join(', ')}</div>
                      )}
                      {aiContext.preferredTimeRange && (
                        <div>🕐 Horario preferido: {
                          aiContext.preferredTimeRange === 'morning' ? 'Mañana' :
                          aiContext.preferredTimeRange === 'afternoon' ? 'Tarde' : 'Noche'
                        }</div>
                      )}
                      {aiContext.urgencyLevel && aiContext.urgencyLevel !== 'medium' && (
                        <div>⚡ Urgencia: {
                          aiContext.urgencyLevel === 'high' ? 'Alta' :
                          aiContext.urgencyLevel === 'low' ? 'Baja' : 'Normal'
                        }</div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleTransitionToVisual}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Ver opciones
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTransitionPrompt(false)}
                      className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
                    >
                      Continuar chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Availability Display */}
        {showAvailability && availabilityData.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="max-h-40 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Horarios Disponibles
              </h4>
              <div className="space-y-2">
                {availabilityData.slice(0, 3).map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    className="w-full text-left p-2 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{slot.start_time}</div>
                        <div className="text-xs text-gray-600">{slot.doctor_name}</div>
                      </div>
                      <div className="text-xs text-green-600">${slot.consultation_fee}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowAppointmentFlow(true)}
                className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                Ver más opciones
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setShowAppointmentFlow(true)}
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-full transition duration-200 flex items-center"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Agendar cita
            </button>
            <button
              type="button"
              onClick={() => handleInputChange({ target: { value: 'Ver mis citas programadas' } } as any)}
              className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-full transition duration-200 flex items-center"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Ver citas
            </button>
            <button
              type="button"
              onClick={() => handleInputChange({ target: { value: 'Necesito cancelar una cita' } } as any)}
              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded-full transition duration-200 flex items-center"
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Cancelar
            </button>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100">
          <div className="flex space-x-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe tu mensaje..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              <span className="text-sm">📤</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatBot;
