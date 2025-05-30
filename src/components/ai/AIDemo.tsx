'use client';

import { useState, useEffect } from 'react';
import styles from './animations.module.css';

interface AIDemoProps {
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function AIDemo({ onClose }: AIDemoProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Demo conversation flow
  const demoFlow = [
    {
      userMessage: "Necesito una cita con cardiología para la próxima semana",
      aiResponse: "¡Perfecto! Te ayudo a agendar una cita con cardiología. Tengo disponibilidad el martes 28 a las 10:00 AM y el jueves 30 a las 2:00 PM. ¿Cuál prefieres?"
    },
    {
      userMessage: "El martes está perfecto",
      aiResponse: "¡Excelente! He agendado tu cita para el martes 28 de enero a las 10:00 AM con el Dr. García en cardiología. Te enviaré un recordatorio 24 horas antes. ¿Necesitas algo más?"
    },
    {
      userMessage: "¿Puedo cambiar la hora a las 2:00 PM?",
      aiResponse: "Por supuesto, déjame verificar la disponibilidad... ✅ Perfecto, he cambiado tu cita al martes 28 de enero a las 2:00 PM. La confirmación ha sido actualizada."
    }
  ];

  useEffect(() => {
    // Start with initial AI greeting
    const initialMessage: Message = {
      id: '1',
      text: "¡Hola! Soy tu asistente de IA para citas médicas. Puedes pedirme que agende, modifique o consulte citas usando lenguaje natural. ¿En qué puedo ayudarte?",
      isUser: false,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, []);

  const simulateTyping = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      setIsTyping(true);
      // Simulate typing delay based on text length
      const delay = Math.min(text.length * 30, 2000);
      setTimeout(() => {
        setIsTyping(false);
        resolve();
      }, delay);
    });
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage = currentInput.trim();
    setCurrentInput('');

    // Add user message
    addMessage(userMessage, true);

    // Simulate AI processing
    await simulateTyping("Procesando tu solicitud...");

    // Check if this matches our demo flow
    if (currentStep < demoFlow.length) {
      const currentFlowStep = demoFlow[currentStep];
      if (currentFlowStep) {
        const expectedMessage = currentFlowStep.userMessage.toLowerCase();
        const userMessageLower = userMessage.toLowerCase();

        if (userMessageLower.includes('cardiología') || userMessageLower.includes('cardio') || currentStep > 0) {
          // Use demo response
          addMessage(currentFlowStep.aiResponse, false);
          setCurrentStep(prev => prev + 1);
        } else {
          // Generic helpful response
          addMessage("Entiendo que quieres agendar una cita. ¿Podrías decirme qué especialidad médica necesitas? Por ejemplo: 'Necesito una cita con cardiología'", false);
        }
      }
    } else {
      // End of demo
      addMessage("¡Excelente! Has visto cómo funciona nuestro asistente de IA. En la versión completa, podrás agendar citas reales con médicos disponibles. ¿Te gustaría registrar tu organización para comenzar?", false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const tryDemoMessage = (message: string) => {
    setCurrentInput(message);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🤖 Demo Interactivo de IA</h2>
              <p className="text-blue-100 mt-1">Prueba cómo funciona nuestro asistente inteligente</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Demo Instructions */}
        <div className="bg-blue-50 p-4 border-b">
          <p className="text-sm text-blue-800 mb-2">
            <strong>💡 Prueba estos mensajes:</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => tryDemoMessage("Necesito una cita con cardiología para la próxima semana")}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full transition duration-200"
            >
              "Necesito una cita con cardiología"
            </button>
            <button
              type="button"
              onClick={() => tryDemoMessage("¿Qué especialidades tienen disponibles?")}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full transition duration-200"
            >
              "¿Qué especialidades tienen?"
            </button>
            <button
              type="button"
              onClick={() => tryDemoMessage("Quiero cancelar mi cita")}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full transition duration-200"
            >
              "Quiero cancelar mi cita"
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg max-w-xs">
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje aquí... (ej: 'Necesito una cita con cardiología')"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTyping}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isTyping || !currentInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              Enviar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Este es un demo simulado. En la versión real, la IA se conecta con el sistema de citas.
          </p>
        </div>
      </div>
    </div>
  );
}
