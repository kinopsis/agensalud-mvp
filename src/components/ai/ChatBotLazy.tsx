'use client';

/**
 * ChatBotLazy Component
 * Lazy-loaded version of ChatBot to avoid build issues with AI SDK
 * Uses dynamic imports to load the ChatBot only when needed
 */

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { MessageCircle, Loader2 } from 'lucide-react';

interface ChatBotLazyProps {
  organizationId?: string;
  userId?: string;
  className?: string;
}

// Dynamic import of the ChatBot component with no SSR
const ChatBot = dynamic(
  () => import('./ChatBot').then(mod => ({ default: mod.ChatBot })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-blue-600 text-white rounded-full p-4 shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    )
  }
);

// Fallback ChatBot component for when AI features are not available
const FallbackChatBot: React.FC<ChatBotLazyProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6" />
            <span className="hidden sm:inline font-medium">Asistente</span>
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
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Asistente</h3>
                <p className="text-xs text-blue-100">Ayuda y soporte</p>
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

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Asistente de Citas
            </h3>
            <p className="text-gray-600 mb-6">
              Para agendar citas, puedes usar el formulario tradicional o contactar directamente.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => window.location.href = '/appointments/book'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Agendar Cita
              </button>
              <button
                type="button"
                onClick={() => window.location.href = '/appointments'}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Ver Mis Citas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatBotLazy(props: ChatBotLazyProps) {
  const [useAI, setUseAI] = useState(false);
  const [aiError, setAiError] = useState(false);

  // Try to load AI ChatBot on first interaction
  const handleEnableAI = () => {
    try {
      setUseAI(true);
    } catch (error) {
      console.error('Error loading AI ChatBot:', error);
      setAiError(true);
    }
  };

  // If AI failed to load or is not enabled, show fallback
  if (aiError || !useAI) {
    return (
      <div className={props.className}>
        <div className="fixed bottom-4 right-4 z-50">
          <button
            type="button"
            onClick={handleEnableAI}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6" />
              <span className="hidden sm:inline font-medium">
                {aiError ? 'Asistente' : 'Asistente IA'}
              </span>
            </div>
          </button>
        </div>
        {aiError && <FallbackChatBot {...props} />}
      </div>
    );
  }

  // Load AI ChatBot with error boundary
  return (
    <Suspense fallback={
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-blue-600 text-white rounded-full p-4 shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    }>
      <ErrorBoundary fallback={<FallbackChatBot {...props} />}>
        <ChatBot {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ChatBot Error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
